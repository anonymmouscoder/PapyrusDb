// server.js

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// 🚧 AVERTISSEMENT IMPORTANT : 
// Ce backend est conçu pour s'intégrer harmonieusement avec le client Papyrus tel quel.
// Modifier la logique sous-jacente sans connaissance approfondie est fortement déconseillé.

// Ce fichier (server.js) et le reste du backend sont open-source et auto-hébergeables !
// Cela signifie que vous, l'utilisateur avancé, pouvez gérer vos notes de manière
// totalement décentralisée. Ce serveur est votre "point de synchronisation" personnel.

// --- Configuration Initiale ---

let config;
try {
  config = require('./config');
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('./config')) {
    console.error("Oops ! Le fichier 'config.js' est introuvable. C'est la base de notre serveur !");
    console.error("Il semble que l'assistant d'installation n'ait pas encore été exécuté.");
    console.error("Pour démarrer, veuillez lancer `npm run build` dans votre terminal.");
    process.exit(1); 
  } else {
    throw error;
  }
}

// --- Gestion de la Base de Données ---

// C'est ici que nous gérons notre persistance de données.
// Actuellement, nous supportons une base de données JSON simple, idéale pour l'auto-hébergement léger.
// 💡 Envie d'ajouter une nouvelle base de données (SQL, MongoDB, etc.) ?
// C'est l'endroit idéal pour le faire ! Pensez à une interface commune
// pour les opérations CRUD (Create, Read, Update, Delete) afin de garder notre code propre
// et de permettre à d'autres types de bases de données de s'intégrer facilement ici.
let db;
if (config.dbType === 'json') {
  const LitejsonDB = require('litejsondb');
  db = new LitejsonDB({ dbDir: config.json.dbDir, filename: config.json.dbFile });
  if (!db.has('notes')) db.set('notes', {});
  if (!db.has('categories')) db.set('categories', {});
  console.log(`🎉 Base de données JSON chargée avec succès depuis : ${path.join(config.json.dbDir, config.json.dbFile)}`);
} else {
  // Actuellement, nous ne supportons que le type 'json'.
  // 🚧 C'est un point d'extension majeur pour les contributeurs !
  // Pour une meilleure modularité, nous pourrions créer un dossier 'db_handlers'
  // avec des fichiers comme json_handler.js, sql_handler.js, etc.
  // Chaque handler exposerait des fonctions comme init(), get(), set(), delete().
  throw new Error(`Le type de base de données '${config.dbType}' n'est pas encore implémenté. Envie de contribuer ?`);
}

const app = express();

// --- Configuration CORS (Cross-Origin Resource Sharing) ---

// 📡 Le front-end de l'application Papyrus est une application propriétaire.
// Cependant, ce backend est conçu pour être open-cloud et auto-hébergeable.
// Cela signifie que vous pouvez connecter votre application Papyrus à ce serveur !
// Pour que l'application Papyrus puisse communiquer avec ce serveur personnel,
// nous devons configurer CORS (Cross-Origin Resource Sharing).
// Cette configuration permet la synchronisation de vos notes de manière décentralisée
// sur différents appareils connectés à votre serveur.

if (config.cors === true) {
  app.use(cors());
} else {
  // Si config.cors est false ou autre, CORS est désactivé.
  // Le serveur n'acceptera alors que les requêtes du même domaine, ce qui est très restrictif
  // et empêchera l'application Papyrus de se connecter.
  app.use(cors({ origin: false }));
  console.log("❌ L'application Papyrus ne pourra pas communiquer avec ce serveur dans cette configuration.");
}

app.use(bodyParser.json());

// --- Middleware d'Authentification ---

// Middleware d'authentification : la porte d'entrée de l'API de votre serveur Papyrus.
// 🗝️ La serverKey définie dans config.js est utilisée pour connecter un appareil Papyrus à votre service personnel.
// Elle doit être renseignée dans votre application Papyrus pour activer la synchronisation.
// Vous pouvez la partager entre vos propres appareils (mobile, tablette) si vous utilisez le même serveur.
// Sans la bonne clé toute tentative de communication avec l'API sera rejetée.

app.use((req, res, next) => {
  const auth = req.headers['authorization'];

  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({
      ok: false,
      error: "Authentification requise.",
    });
  }

  const token = auth.split(' ')[1];

  if (token === config.serverKey) {
    return next();
  }

  // ❌ Clé incorrecte. Rejette la requête.
  return res.status(403).json({
    ok: false,
    error: "Clé serveur invalide. Vérifiez votre configuration dans l'application Papyrus et sur votre serveur.",
  });
});

/**
 * ⚠️ AVERTISSEMENT CRITIQUE : NE PAS MODIFIER LA LOGIQUE INTERNE DE CES FONCTIONS ET DES ROUTES APIS ⚠️
 *
 * Ces fonctions sont vitales pour
 * l'intégrité et la stabilité de l'application cliente Papyrus.
 * L'application propriétaire Papyrus repose sur une structure de données et une logique
 * d'interaction strictes avec ce backend.
 *
 * 🔐 TOUTE MODIFICATION, MÊME MINEURE, DE CES FONCTIONS OU DE LA STRUCTURE DES OBJETS GÉRÉS
 * (notes, catégories) POURRAIT :
 *   - Casser la synchronisation entre vos appareils.
 *   - Entraîner des pertes de données (temporaires ou permanentes).
 *   - Rendre vos notes illisibles ou inaccessibles dans l'application.
 *   - Créer des incohérences qui sont difficiles à résoudre.
 *
 * Le client Papyrus attend un format très précis de données. Altérer ce format revient à
 * changer le langage que parlent le client et le serveur, les rendant incompatibles.
 *
 * Ce backend est un point de synchronisation. Les autres parties de l'application Papyrus
 * (UI, UX, logique locale de gestion des notes) ne doivent JAMAIS être altérées ou
 * contournées en modifiant ce code. Concentrez-vous sur l'hébergement et la maintenance.
 *
 * Si vous êtes curieux de comprendre, analysez ces fonctions, mais ABSTENEZ-VOUS DE LES MODIFIER.
 */

// Cela inclut la gestion des champs obligatoires et l'ajout de valeurs par défaut si nécessaire.
const normalizeNote = (note) => {
  const content = note.content || '';
  return {
    id: note.id,
    title: note.title || content.substring(0, 60).replace(/^[#*-\s>!`]+|[\n\r]+$/g, '').trim() + (content.length > 60 ? '...' : ''),
    content: content || 'Pas de contenu',
    timestamp: note.timestamp || new Date().toISOString(), 
    category: note.category || 'Général', 
    pinned: typeof note.pinned === 'boolean' ? note.pinned : false, 
    protected: typeof note.protected === 'boolean' ? note.protected : false, 
    password: note.password || null, // LE MOT DE PASSE DU NOTE EST ENCODÉE SUR L'APPLICATION.
    isDeleted: !!note.isDeleted, 
    deleteSession: note.deleteSession || null // Papyrus auto-génère une sessionId pour vos appareils
  };
};

const normalizeCategory = (cat) => ({
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

// CE CODE EST LA SEULE INTERFACE AVEC LA LOGIQUE INTERNE DE L'APPLICATION.
// TOUTE MODIFICATION, MÊME MINEURE, PEUT BRISER LA SYNCHRONISATION, ENTRAÎNER UNE PERTE DE DONNÉES,
// OU RENDRE L'APPLICATION CLIENTE INUTILISABLE AVEC CE BACKEND.
// CE N'EST PAS LE LIEU POUR DE LA REVERSE ENGINEERING OU DU DÉTOURNAILLEMENT.
// POUR VOTRE SÉCURITÉ ET CELLE DE VOS DONNÉES, NE PAS TOUCHER.
// POUR LES CURIEUX : CE SONT LES ROUTES API. LEUR LOGIQUE EST MINIMALE POUR LA STABILITÉ.


app.get('/getAll', (_, res) => res.json({ok:!0,notes:Object.values(db.get('notes')||{}).map(normalizeNote),categories:Object.values(db.get('categories')||{}).map(normalizeCategory)}));

app.post('/addCategory', (req, res) => {
  const d=req.body;
  if(!d.name)return res.status(400).json({ok:!1,error:'Nom requis.'});
  if(categoryExists(d.name))return res.status(409).json({ok:!1,error:'Catégorie active existe déjà.'});
  const n=normalizeCategory(d),e=db.get(`categories/${d.name}`);
  if(e&&e.isDeleted){n.isDeleted=!1;n.deleteSession=null;console.log(`Catégorie "${d.name}" réactivée.`);}
  db.set(`categories/${d.name}`,n);db.saveNow();
  res.status(201).json({ok:!0,message:"Catégorie ajoutée/réactivée."});
});

app.delete('/deleteCategory/:name', (req, res) => {
  const {name}=req.params,s=req.query.session,p=req.query.deleteforever==='true';
  if(!db.has(`categories/${name}`))return res.status(404).json({ok:!1,error:'Catégorie non trouvée.'});
  const c=db.get(`categories/${name}`);
  if(p){if(s&&c.deleteSession&&s===c.deleteSession)return res.json({ok:!1,ignored:!0,reason:'Opération ignorée (même session).'});
    db.delete(`categories/${name}`);db.saveNow();
    return res.json({ok:!0,deleted:'permanent',message:`Catégorie "${name}" supprimée.`});}
  c.isDeleted=!0;c.deleteSession=s||null;
  db.set(`categories/${name}`,c);db.saveNow();
  res.json({ok:!0,deleted:'soft',message:`Catégorie "${name}" marquée supprimée.`});
});

app.delete('/deleteNote/:id', (req, res) => {
  const {id}=req.params,p=req.query.deleteforever==='true',s=req.query.session;
  if(!db.has(`notes/${id}`))return res.status(404).json({ok:!1,error:'Note non trouvée.'});
  const n=db.get(`notes/${id}`);
  if(p){if(s&&n.deleteSession&&s===n.deleteSession)return res.json({ok:!1,ignored:!0,reason:'Opération ignorée (même session).'});
    db.delete(`notes/${id}`);db.saveNow();
    return res.json({ok:!0,deleted:'permanent',message:`Note ID "${id}" supprimée.`});}
  n.isDeleted=!0;n.deleteSession=s||null;
  db.set(`notes/${id}`,n);db.saveNow();
  res.json({ok:!0,deleted:'soft',message:`Note ID "${id}" marquée supprimée.`});
});

app.post('/addNote', (req, res) => {
  const {id,title,content,timestamp,category,pinned,protected,password}=req.body;
  if(typeof content!=='string')return res.status(400).json({ok:!1,error:'Contenu note requis.'});
  const nId=id||(Date.now()+'_'+Math.random().toString(36).substring(2,6)),fN=normalizeNote({id:nId,title,content,timestamp,category,pinned,protected,password});
  const eN=db.get(`notes/${nId}`);
  if(eN&&eN.isDeleted){fN.isDeleted=!1;fN.deleteSession=null;console.log(`Note ID "${nId}" réactivée.`);}
  db.set(`notes/${nId}`,fN);db.saveNow();
  res.json({ok:!0,id:nId,message:`Note ID "${nId}" ajoutée/mise à jour.`});
});

app.put('/updateCategory/:oldName', (req, res) => {
  const {oldName}=req.params,{newName}=req.body;
  if(!db.has(`categories/${oldName}`))return res.status(404).json({ok:!1,error:'Catégorie à renommer non trouvée.'});
  if(!newName)return res.status(400).json({ok:!1,error:'Nouveau nom de catégorie obligatoire.'});
  if(categoryExists(newName))return res.status(409).json({ok:!1,error:`Nouveau nom "${newName}" existe déjà.`});
  const oC=db.get(`categories/${oldName}`),nC={...oC,name:newName};
  db.delete(`categories/${oldName}`);db.set(`categories/${newName}`,nC);
  Object.values(db.get('notes')||{}).forEach(n=>{if(n.category===oldName){n.category=newName;db.set(`notes/${n.id}`,n);}});
  db.saveNow();
  res.json({ok:!0,message:`Catégorie "${oldName}" renommée en "${newName}" et notes mises à jour.`});
});

app.delete('/deleteAll', (req, res) => {
  const s=req.query.session;
  if(!s)return res.status(400).json({ok:!1,error:'ID de session manquant.'});
  const n=db.get('notes')||{},c=db.get('categories')||{};
  for(const nId in n){const nt=n[nId];if(!nt.password){nt.isDeleted=!0;nt.deleteSession=s;db.set(`notes/${nId}`,normalizeNote(nt));}}
  for(const cN in c){const ct=c[cN];ct.isDeleted=!0;ct.deleteSession=s;db.set(`categories/${cN}`,normalizeCategory(ct));}
  db.saveNow();
  res.json({ok:!0,message:"Notes (non protégées) et catégories marquées supprimées logiquement."});
});


// --- Lancement du Serveur ---
app.listen(config.port, config.bindAddress, () => {
  console.log(`\n🎉 PapyrusDb est en ligne ! Accédez à son API via http://${config.bindAddress}:${config.port}`);
  console.log(`🔑 Votre clé serveur : ${config.serverKey} (Gardez-la SECRÈTE ! Elle permet la connexion à votre serveur)`);
});