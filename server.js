// server.js
// =================================================================================================
// ===                                                                                         ===
// ===                          PAPYRUSDB SERVER - BACKEND LOGIC                               ===
// ===                                                                                         ===
// =================================================================================================
//
// 🚧 IMPORTANT: This backend is designed for seamless integration with the proprietary Papyrus client.
// Modifying the underlying logic without expert knowledge is strongly discouraged.
// This server is your personal, self-hostable "sync point" for your notes.
//

// --- DEPENDENCIES ---
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION LOADING ---
let config;
try {
  config = require('./config');
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('./config')) {
    console.error("FATAL: 'config.js' not found. This file is essential for the server.");
    console.error("It seems the setup assistant has not been run yet.");
    console.error("To get started, please run `npm run build` in your terminal.");
    process.exit(1); 
  } else {
    throw error;
  }
}

// --- DATABASE INITIALIZATION ---
// Currently, only a simple JSON database is supported, ideal for lightweight self-hosting.
// This is a major extension point for contributors (e.g., SQL, MongoDB).
let db;
if (config.dbType === 'json') {
  const LitejsonDB = require('litejsondb');
  db = new LitejsonDB({ dbDir: config.json.dbDir, filename: config.json.dbFile });
  if (!db.has('notes')) db.set('notes', {});
  if (!db.has('categories')) db.set('categories', {});
  console.log(`🎉 JSON database loaded successfully from: ${path.join(config.json.dbDir, config.json.dbFile)}`);
} else {
  throw new Error(`Database type '${config.dbType}' is not yet implemented. Contributions are welcome!`);
}

// --- DATA MIGRATION ---
console.log('Checking for necessary data migrations...');
const categoriesToMigrate = db.get('categories') || {};
let migrationPerformed = false;
for (const catName in categoriesToMigrate) {
    if (Object.prototype.hasOwnProperty.call(categoriesToMigrate, catName)) {
        const category = categoriesToMigrate[catName];
        if (!category.id) {
            category.id = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            db.set(`categories/${catName}`, category);
            console.log(`  [MIGRATE] Added unique ID to category: '${catName}'`);
            migrationPerformed = true;
        }
    }
}
if (migrationPerformed) {
    db.saveNow();
    console.log('Data migration complete.');
}

// --- EXPRESS APP SETUP ---
const app = express();

// --- MIDDLEWARES ---

// CORS (Cross-Origin Resource Sharing) Configuration
// This is required for the Papyrus client to connect to this self-hosted server.
if (config.cors === true) {
  app.use(cors());
} else {
  app.use(cors({ origin: false }));
  console.log("❌ CORS is disabled. The Papyrus application will not be able to communicate with this server.");
}

app.use(bodyParser.json());

// Authentication Middleware
// The serverKey from config.js is required to authorize a device.
app.use((req, res, next) => {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: "Authentication required." });
  }
  const token = auth.split(' ')[1];
  if (token === config.serverKey) {
    return next();
  }
  return res.status(403).json({ ok: false, error: "Invalid server key. Check your configuration in the Papyrus app and on your server." });
});

// --- HELPERS & NORMALIZERS ---
// These functions ensure data consistency and apply default values.

const normalizeNote = (note) => {  const content = note.content || '';  return {    id: note.id,    title: note.title || content.substring(0, 60).replace(/^[#*-\s>!`]+|[\n\r]+$/g, '').trim() + (content.length > 60 ? '...' : ''),    content: content || 'Pas de contenu',    timestamp: note.timestamp || new Date().toISOString(),    category: note.category || 'Général',    pinned: typeof note.pinned === 'boolean' ? note.pinned : false,    protected: typeof note.protected === 'boolean' ? note.protected : false,    password: note.password || null,    isDeleted: !!note.isDeleted,    deleteSession: note.deleteSession || null,    isTask: false,    bg: typeof note.bg === 'string' && note.bg ? note.bg : null   };};

const normalizeTask = (task) => ({
  id: task.id,
  title: task.title || 'Nouvelle tâche',
  items: Array.isArray(task.items) ? task.items.map(item => ({ text: item.text || '', checked: !!item.checked })) : [],
  isTask: true,
  timestamp: task.timestamp || new Date().toISOString(),
  category: task.category || 'Tâches',
  pinned: typeof task.pinned === 'boolean' ? task.pinned : false,
  protected: typeof task.protected === 'boolean' ? task.protected : false,
  password: task.password || null,
  isDeleted: !!task.isDeleted,
  deleteSession: task.deleteSession || null,
  bg: typeof task.bg === 'string' && task.bg ? task.bg : 'task.webp'
});

const normalizeCategory = (cat) => ({
  id: cat.id,
  name: cat.name,
  icon: cat.icon || 'ri-folder-line', 
  color: cat.color || 'bg-gray-500', 
  userDefined: typeof cat.userDefined === 'boolean' ? cat.userDefined : true, 
  isDeleted: !!cat.isDeleted, 
  deleteSession: cat.deleteSession || null 
});

const categoryExists = (name) => {
  const cat = db.get(`categories/${name}`);
  return cat && !cat.isDeleted;
};

// =================================================================================================
// ===                                                                                         ===
// ===                          🚨 CRITICAL API SECTION - DO NOT MODIFY 🚨                       ===
// ===                                                                                         ===
// =================================================================================================
//
// The following API routes are the core of the synchronization logic with the Papyrus client.
// They are intentionally compact and lack extensive comments on their internal workings.
//
// ANY MODIFICATION, HOWEVER SMALL, TO THE LOGIC, PARAMETERS, OR RETURNED OBJECT STRUCTURE
// OF THESE ROUTES WILL IRREVERSIBLY BREAK CLIENT COMPATIBILITY.
//
// This can lead to:
//   - Complete synchronization failure.
//   - Permanent data loss or corruption.
//   - Unpredictable application behavior.
//
// This code is not a playground. It is a stable interface. Do not attempt to reverse-engineer
// or "improve" it. You have been warned.
//
// =================================================================================================

// --- API ROUTES ---

app.get('/verifystatus',(req,res)=>{const t=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');if(!t)return res.status(400).json({ok:!1,error:'Token manquant dans l\'Authorization header.'});return t===config.serverKey?res.json({ok:!0,status:'connected',message:'Clé valide ✅'}):res.status(401).json({ok:!1,status:'unauthorized',message:'Clé invalide ❌'});});

app.get('/getAll',(_,res)=>res.json({ok:!0,notes:Object.values(db.get('notes')||{}).map(n=>n.isTask?normalizeTask(n):normalizeNote(n)),categories:Object.values(db.get('categories')||{}).map(normalizeCategory)}));

app.post('/addCategory',(req,res)=>{const d=req.body;if(!d.name)return res.status(400).json({ok:!1,error:'Nom requis.'});if(categoryExists(d.name))return res.status(409).json({ok:!1,error:`La catégorie nommée "${d.name}" existe déjà.`});const catId=d.id||`cat_${Date.now()}_${Math.random().toString(36).substring(2,9)}`;const newCatData={...d,id:catId};const n=normalizeCategory(newCatData);const e=db.get(`categories/${d.name}`);if(e&&e.isDeleted){n.isDeleted=!1;n.deleteSession=null;console.log(`Catégorie "${d.name}" réactivée.`);}db.set(`categories/${d.name}`,n);db.saveNow();res.status(201).json({ok:!0,message:"Catégorie ajoutée/réactivée.",newId:catId});});

app.delete('/deleteCategory/:name',(req,res)=>{const{name}=req.params,s=req.query.session,p=req.query.deleteforever==='true';if(!db.has(`categories/${name}`))return res.status(404).json({ok:!1,error:'Catégorie non trouvée.'});const c=db.get(`categories/${name}`);if(p){if(s&&c.deleteSession&&s===c.deleteSession)return res.json({ok:!1,ignored:!0,reason:'Opération ignorée (même session).'});db.delete(`categories/${name}`);db.saveNow();return res.json({ok:!0,deleted:'permanent',message:`Catégorie "${name}" supprimée.`});}c.isDeleted=!0;c.deleteSession=s||null;db.set(`categories/${name}`,c);db.saveNow();res.json({ok:!0,deleted:'soft',message:`Catégorie "${name}" marquée supprimée.`});});

app.delete('/deleteNote/:id',(req,res)=>{const{id}=req.params,p=req.query.deleteforever==='true',s=req.query.session;if(!db.has(`notes/${id}`))return res.status(404).json({ok:!1,error:'Note non trouvée.'});const n=db.get(`notes/${id}`);if(p){if(s&&n.deleteSession&&s===n.deleteSession)return res.json({ok:!1,ignored:!0,reason:'Opération ignorée (même session).'});db.delete(`notes/${id}`);db.saveNow();return res.json({ok:!0,deleted:'permanent',message:`Note ID "${id}" supprimée.`});}n.isDeleted=!0;n.deleteSession=s||null;db.set(`notes/${id}`,n);db.saveNow();res.json({ok:!0,deleted:'soft',message:`Note ID "${id}" marquée supprimée.`});});

app.delete('/deleteTask/:id',(req,res)=>{const{id}=req.params,p=req.query.deleteforever==='true',s=req.query.session;if(!db.has(`notes/${id}`))return res.status(404).json({ok:!1,error:'Tâche non trouvée.'});const n=db.get(`notes/${id}`);if(p){if(s&&n.deleteSession&&s===n.deleteSession)return res.json({ok:!1,ignored:!0,reason:'Opération ignorée (même session).'});db.delete(`notes/${id}`);db.saveNow();return res.json({ok:!0,deleted:'permanent',message:`Tâche ID "${id}" supprimée.`});}n.isDeleted=!0;n.deleteSession=s||null;db.set(`notes/${id}`,n);db.saveNow();res.json({ok:!0,deleted:'soft',message:`Tâche ID "${id}" marquée supprimée.`});});

app.post('/addNote',(req,res)=>{const{id,...noteData}=req.body;if(typeof noteData.content!=='string')return res.status(400).json({ok:!1,error:'Contenu note requis.'});const noteId=id||(Date.now()+'_'+Math.random().toString(36).substring(2,6));const existingNote=db.get(`notes/${noteId}`);if(existingNote&&existingNote.isDeleted)return res.status(409).json({ok:!1,error:`Note ID "${noteId}" est supprimée et ne peut être modifiée.`,conflict:'deleted'});let finalNote,message;if(existingNote){const updatePayload={...noteData};if(updatePayload.protected===undefined){updatePayload.protected=!1;updatePayload.password=null;}finalNote=normalizeNote({...existingNote,...updatePayload,id:noteId});message=`Note ID "${noteId}" mise à jour.`;}else{finalNote=normalizeNote({...noteData,id:noteId});message=`Note ID "${noteId}" ajoutée.`;}db.set(`notes/${noteId}`,finalNote);db.saveNow();res.json({ok:!0,id:noteId,message:message});});

app.post('/addTask',(req,res)=>{const{id,...taskData}=req.body;if(!taskData.title&&(!taskData.items||taskData.items.length===0))return res.status(400).json({ok:!1,error:'Une tâche doit avoir un titre ou des éléments.'});const taskId=id||(Date.now()+'_'+Math.random().toString(36).substring(2,6));const existingTask=db.get(`notes/${taskId}`);if(existingTask&&existingTask.isDeleted)return res.status(409).json({ok:!1,error:`Tâche ID "${taskId}" est supprimée et ne peut être modifiée.`,conflict:'deleted'});let finalTask,message;if(existingTask){const updatePayload={...taskData};if(updatePayload.protected===undefined){updatePayload.protected=!1;updatePayload.password=null;}finalTask=normalizeTask({...existingTask,...updatePayload,id:taskId});message=`Tâche ID "${taskId}" mise à jour.`;}else{finalTask=normalizeTask({...taskData,id:taskId});message=`Tâche ID "${taskId}" ajoutée.`;}db.set(`notes/${taskId}`,finalTask);db.saveNow();res.json({ok:!0,id:taskId,message:message});});

app.put('/updateCategory/:oldName',(req,res)=>{const{oldName}=req.params,{newName}=req.body;if(!db.has(`categories/${oldName}`))return res.status(404).json({ok:!1,error:'Catégorie à renommer non trouvée.'});if(!newName)return res.status(400).json({ok:!1,error:'Nouveau nom de catégorie obligatoire.'});if(categoryExists(newName))return res.status(409).json({ok:!1,error:`Nouveau nom "${newName}" existe déjà.`});const oC=db.get(`categories/${oldName}`),nC={...oC,name:newName};db.delete(`categories/${oldName}`);db.set(`categories/${newName}`,nC);Object.values(db.get('notes')||{}).forEach(n=>{if(n.category===oldName){n.category=newName;db.set(`notes/${n.id}`,n);}});db.saveNow();res.json({ok:!0,message:`Catégorie "${oldName}" renommée en "${newName}" et notes mises à jour.`});});

app.delete('/deleteAll',(req,res)=>{const s=req.query.session;if(!s)return res.status(400).json({ok:!1,error:'ID de session manquant.'});const n=db.get('notes')||{},c=db.get('categories')||{};for(const nId in n){const item=n[nId];if(!item.password){const merged={...item,isDeleted:!0,deleteSession:s};db.set(`notes/${nId}`,merged.isTask?normalizeTask(merged):normalizeNote(merged));}}for(const cN in c){const ct=c[cN];ct.isDeleted=!0;ct.deleteSession=s;db.set(`categories/${cN}`,normalizeCategory(ct));}db.saveNow();res.json({ok:!0,message:"Notes (non protégées), tâches et catégories marquées supprimées logiquement."});});

// --- SERVER LAUNCH ---
app.listen(config.port, config.bindAddress, () => {
  console.log(`\n🎉 PapyrusDb is online! Access its API via http://${config.bindAddress}:${config.port}`);
  console.log(`🔑 Your server key: ${config.serverKey} (Keep it SECRET! It's used to connect the Papyrus app to your server)`);
});