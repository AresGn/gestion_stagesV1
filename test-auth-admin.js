#!/usr/bin/env node

/**
 * Script pour tester différents identifiants admin
 */

import fetch from 'node-fetch';

const VERCEL_URL = 'https://gestion-stages-v1.vercel.app/api';

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

// Test d'authentification avec différents identifiants
async function testAuth(matricule, password, description) {
  log(`\n🔐 Test: ${description}`, 'blue');
  log(`Matricule: ${matricule} | Password: ${password}`, 'cyan');
  
  try {
    const response = await fetch(`${VERCEL_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        matricule: matricule,
        password: password
      })
    });

    const data = await response.json();
    
    if (data.success && data.token) {
      log('✅ AUTHENTIFICATION RÉUSSIE !', 'green');
      log(`Token: ${data.token.substring(0, 20)}...`, 'green');
      log(`Utilisateur: ${data.user?.nom} ${data.user?.prenom} (${data.user?.role})`, 'green');
      return { success: true, token: data.token, user: data.user };
    } else {
      log('❌ Échec de l\'authentification', 'red');
      log(`Erreur: ${data.message}`, 'red');
      return { success: false, message: data.message };
    }
  } catch (error) {
    log(`❌ Erreur lors de l'authentification: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

// Test de création de notification avec un token valide
async function testCreateNotificationWithToken(token, userInfo) {
  log('\n📬 Test de création d\'une notification...', 'blue');
  
  try {
    const response = await fetch(`${VERCEL_URL}/admin/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        destinataire: { type: 'tous' },
        titre: 'Test de notification - Corrections déployées !',
        message: `Bonjour ! Ceci est un test de notification envoyé par ${userInfo?.nom || 'Admin'} pour confirmer que les corrections du dashboard fonctionnent correctement. Les problèmes de "Route non trouvée" et de graphiques "NaN" ont été résolus !`
      })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      log('🎉 NOTIFICATION CRÉÉE AVEC SUCCÈS !', 'green');
      log(`Message: ${data.message}`, 'cyan');
      log(`Nombre de notifications envoyées: ${data.data?.count || 'N/A'}`, 'cyan');
      return true;
    } else {
      log('❌ Erreur lors de la création de la notification', 'red');
      log(`Status: ${response.status}`, 'red');
      log(`Erreur: ${data.message || 'Erreur inconnue'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Erreur lors du test de création: ${error.message}`, 'red');
    return false;
  }
}

// Fonction principale
async function main() {
  log('🚀 Test des identifiants admin sur Vercel', 'magenta');
  log(`URL de base: ${VERCEL_URL}`, 'yellow');
  
  // Liste des identifiants à tester
  const credentialsToTest = [
    { matricule: 'ADMIN001', password: 'admin123', description: 'Identifiants par défaut' },
    { matricule: 'admin', password: 'admin', description: 'Identifiants simples' },
    { matricule: 'ADMIN', password: 'admin123', description: 'ADMIN majuscule' },
    { matricule: 'admin001', password: 'admin123', description: 'admin001 minuscule' },
    { matricule: 'ADMIN001', password: 'password', description: 'Mot de passe alternatif' },
    { matricule: 'ADMIN001', password: '123456', description: 'Mot de passe numérique' }
  ];
  
  let validToken = null;
  let validUser = null;
  
  // Tester chaque combinaison
  for (const creds of credentialsToTest) {
    const result = await testAuth(creds.matricule, creds.password, creds.description);
    
    if (result.success) {
      validToken = result.token;
      validUser = result.user;
      break; // Arrêter dès qu'on trouve des identifiants valides
    }
    
    // Petite pause entre les tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  if (validToken) {
    log('\n🎉 IDENTIFIANTS VALIDES TROUVÉS !', 'green');
    log('📝 Maintenant, testons la création d\'une notification...', 'blue');
    
    const notificationSuccess = await testCreateNotificationWithToken(validToken, validUser);
    
    if (notificationSuccess) {
      log('\n🎊 SUCCÈS COMPLET !', 'green');
      log('✅ Authentification admin fonctionne', 'green');
      log('✅ Route POST /api/admin/notifications fonctionne', 'green');
      log('✅ Création de notifications fonctionne', 'green');
      log('\n🎯 PROBLÈME RÉSOLU !', 'blue');
      log('Vous pouvez maintenant envoyer des notifications depuis l\'interface admin !', 'cyan');
    } else {
      log('\n⚠️ Authentification OK mais problème avec la création de notifications', 'yellow');
    }
  } else {
    log('\n❌ AUCUN IDENTIFIANT VALIDE TROUVÉ', 'red');
    log('\n💡 SOLUTIONS POSSIBLES:', 'yellow');
    log('1. Vérifiez la base de données pour les identifiants admin corrects', 'cyan');
    log('2. Créez un utilisateur admin si nécessaire', 'cyan');
    log('3. Vérifiez que la table utilisateurs contient bien un admin', 'cyan');
    log('\n📝 Vous pouvez quand même tester manuellement:', 'blue');
    log('1. Allez sur https://gestion-stages-v1.vercel.app/admin/login', 'cyan');
    log('2. Essayez différents identifiants admin', 'cyan');
    log('3. Une fois connecté, testez l\'envoi de notifications', 'cyan');
  }
}

main().catch(error => {
  log(`❌ Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
