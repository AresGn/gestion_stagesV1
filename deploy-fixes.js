#!/usr/bin/env node

/**
 * Script pour déployer les corrections sur Vercel
 */

import { execSync } from 'child_process';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  log(`\n🔄 ${description}...`, 'blue');
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'inherit' });
    log(`✅ ${description} terminé`, 'green');
    return true;
  } catch (error) {
    log(`❌ Erreur lors de ${description}`, 'red');
    log(`Erreur: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('🚀 Déploiement des corrections du dashboard sur Vercel', 'magenta');

  // Vérifier que nous sommes dans le bon répertoire
  try {
    execSync('ls package.json', { stdio: 'ignore' });
  } catch {
    log('❌ Erreur: package.json non trouvé. Assurez-vous d\'être dans le répertoire du projet.', 'red');
    process.exit(1);
  }

  // Construire le projet pour vérifier qu'il n'y a pas d'erreurs
  if (!runCommand('npm run build', 'Construction du projet (vérification)')) {
    log('❌ Échec de la construction. Corrigez les erreurs avant de continuer.', 'red');
    process.exit(1);
  }

  // Ajouter les fichiers modifiés
  if (!runCommand('git add .', 'Ajout des fichiers modifiés')) {
    log('❌ Échec de l\'ajout des fichiers.', 'red');
    process.exit(1);
  }

  // Commit des changements
  if (!runCommand('git commit -m "Fix: Corrections dashboard - routes notifications, données étudiants, styles Tailwind v4"', 'Commit des corrections')) {
    log('❌ Échec du commit.', 'red');
    process.exit(1);
  }

  // Push vers le repository (déploiement automatique sur Vercel)
  if (!runCommand('git push', 'Push vers le repository (déploiement automatique)')) {
    log('❌ Échec du push.', 'red');
    process.exit(1);
  }

  log('\n🎉 Push terminé avec succès!', 'magenta');
  log('⏳ Vercel va automatiquement déployer les changements...', 'yellow');
  log('🔗 Surveillez le déploiement sur: https://vercel.com/dashboard', 'cyan');
  log('🌐 Application disponible sur: https://gestion-stages-v1.vercel.app', 'cyan');
  
  log('\n📋 Résumé des corrections déployées:', 'yellow');
  log('✅ Route POST /api/notifications ajoutée', 'green');
  log('✅ Requête SQL étudiants corrigée avec données complètes', 'green');
  log('✅ Configuration Tailwind CSS v4 corrigée', 'green');
  log('✅ Configuration PostCSS mise à jour', 'green');
  
  log('\n🧪 Pour tester les corrections:', 'blue');
  log('1. Connectez-vous en tant qu\'admin', 'cyan');
  log('2. Vérifiez l\'onglet étudiants - toutes les données doivent s\'afficher', 'cyan');
  log('3. Testez l\'envoi de notifications depuis l\'admin', 'cyan');
  log('4. Vérifiez que les styles s\'affichent correctement', 'cyan');
}

main().catch(error => {
  log(`❌ Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
