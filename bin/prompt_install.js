#!/usr/bin/env node

const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ora = require('ora');
const chalk = require('chalk'); 
const figlet = require('figlet');

function clearScreen() {
  process.stdout.write(process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H');
}

function generateServerKey() {
  return crypto.randomBytes(32).toString('hex');
}

async function showWelcome() {
  clearScreen();
  console.log(
    chalk.cyan(
      figlet.textSync('PapyrusDb', { horizontalLayout: 'default' })
    )
  );
  console.log(chalk.gray('────────────────────────────────────────────'));
  console.log(chalk.white('Bienvenue dans l’installeur de ') + chalk.yellow('PapyrusDb'));
  console.log(chalk.gray('────────────────────────────────────────────\n'));
}

async function promptInstallation() {
  await showWelcome();

  const spinner = ora('Chargement du questionnaire...').start();
  await new Promise(res => setTimeout(res, 800));
  spinner.succeed('Prêt à configurer.\n');

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'dbType',
      message: 'Type de base de données :',
      choices: [
        { name: 'JSON (simple, rapide)', value: 'json' },
        { name: 'SQL (non disponible)', value: 'sql', disabled: 'non implémenté' },
        { name: 'MongoDB (non disponible)', value: 'mongodb', disabled: 'non implémenté' }
      ],
      default: 'json'
    },
    {
      type: 'input',
      name: 'jsonDbDir',
      message: 'Répertoire des fichiers JSON :',
      default: 'papyrusdb',
      when: (a) => a.dbType === 'json'
    },
    {
      type: 'input',
      name: 'jsonDbFile',
      message: 'Nom du fichier JSON :',
      default: 'papyrus-data.json',
      when: (a) => a.dbType === 'json'
    },
    {
      type: 'input',
      name: 'serverKey',
      message: 'Clé serveur API (laisser vide pour générer automatiquement) :',
      default: generateServerKey()
    },
    {
      type: 'confirm',
      name: 'cors',
      message: 'Autoriser CORS ?',
      default: true
    },
    {
      type: 'input',
      name: 'port',
      message: 'Port du serveur :',
      default: 3000,
      validate: (v) => {
        const p = parseInt(v);
        return p > 0 && p <= 65535 || 'Numéro de port invalide (1-65535)';
      }
    },
    {
      type: 'input',
      name: 'bindAddress',
      message: 'Adresse IP d\'écoute :',
      default: '0.0.0.0'
    }
  ]);

  const configPath = path.join(__dirname, '..', 'config.js');
  const configContent = `module.exports = {
  dbType: '${answers.dbType}',

  json: {
    dbDir: '${answers.jsonDbDir || 'papyrusdb'}',
    dbFile: '${answers.jsonDbFile || 'papyrus-data.json'}'
  },

  /* Non disponible pour l'instant
  sql: {
    host: '${answers.sqlHost || 'localhost'}',
    port: ${parseInt(answers.sqlPort || 3306)},
    user: '${answers.sqlUser || 'root'}',
    password: '${answers.sqlPassword || ''}',
    database: '${answers.sqlDatabase || 'papyrus'}'
  },
  */

  serverKey: '${answers.serverKey}',
  cors: ${answers.cors},
  port: ${parseInt(answers.port)},
  bindAddress: '${answers.bindAddress}'
};`;

  const saveSpinner = ora('Écriture du fichier config.js...').start();
  await new Promise(r => setTimeout(r, 600));

  try {
    fs.writeFileSync(configPath, configContent.trim());
    saveSpinner.succeed('Configuration enregistrée.\n');
    console.log(chalk.green('Fichier config.js généré avec succès.'));
    console.log('Chemin : ' + chalk.cyan(configPath));
    console.log('\nDémarre ton serveur avec : ' + chalk.bold('npm start'));
    console.log('Pense à garder ta serverKey secrète.\n');
  } catch (err) {
    saveSpinner.fail('Erreur lors de l\'enregistrement.');
    console.error(chalk.red('Erreur : ' + err.message));
    process.exit(1);
  }
}

promptInstallation();
