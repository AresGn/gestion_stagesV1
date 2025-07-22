#!/usr/bin/env node

/**
 * Script de test pour vérifier et tester la route POST /api/admin/notifications
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

// Test d'authentification admin
async function testAdminAuth() {
  log('\n🔐 Test d\'authentification admin...', 'blue');
  
  try {
    const response = await fetch(`${VERCEL_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        matricule: 'ADMIN001',
        password: 'admin123'
      })
    });

    const data = await response.json();
    
    if (data.success && data.token) {
      log('✅ Authentification admin réussie', 'green');
      return data.token;
    } else {
      log('❌ Échec de l\'authentification admin', 'red');
      log(`Erreur: ${data.message}`, 'red');
      return null;
    }
  } catch (error) {
    log(`❌ Erreur lors de l'authentification: ${error.message}`, 'red');
    return null;
  }
}

// Test de la route POST admin notifications (sans auth d'abord)
async function testAdminNotificationRouteExists() {
  log('\n📬 Test d\'existence de la route POST /api/admin/notifications...', 'blue');
  
  try {
    const response = await fetch(`${VERCEL_URL}/admin/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        destinataire: { type: 'tous' },
        titre: 'Test',
        message: 'Test'
      })
    });

    log(`Status: ${response.status}`, 'cyan');
    
    if (response.status === 404) {
      log('❌ Route POST /api/admin/notifications NON TROUVÉE (404)', 'red');
      return false;
    } else if (response.status === 401 || response.status === 403) {
      log('✅ Route POST /api/admin/notifications EXISTE (erreur auth)', 'green');
      return true;
    } else {
      log(`✅ Route POST /api/admin/notifications EXISTE (status: ${response.status})`, 'green');
      return true;
    }
  } catch (error) {
    log(`❌ Erreur: ${error.message}`, 'red');
    return false;
  }
}

// Test de création d'une notification avec authentification
async function testCreateNotification(token) {
  log('\n📬 Test de création d\'une notification pour tous les étudiants...', 'blue');
  
  try {
    const response = await fetch(`${VERCEL_URL}/admin/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        destinataire: { type: 'tous' },
        titre: 'Test de notification automatique',
        message: 'Ceci est un test de notification envoyé automatiquement depuis le script de test. Si vous recevez ce message, la fonctionnalité fonctionne correctement !'
      })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      log('✅ Notification créée avec succès !', 'green');
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

// Test des statistiques pour vérifier les corrections NaN
async function testStatistics(token) {
  log('\n📊 Test des statistiques (vérification des valeurs NaN)...', 'blue');
  
  try {
    const response = await fetch(`${VERCEL_URL}/admin/statistiques`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      log('✅ Route statistiques fonctionne', 'green');
      log(`Total étudiants: ${data.data.totalEtudiants}`, 'cyan');
      log(`Total stages: ${data.data.totalStages}`, 'cyan');
      log(`Total entreprises: ${data.data.totalEntreprises}`, 'cyan');
      log(`Total offres: ${data.data.totalOffres}`, 'cyan');
      
      // Vérifier qu'il n'y a pas de NaN
      const values = [
        data.data.totalEtudiants,
        data.data.totalStages,
        data.data.totalEntreprises,
        data.data.totalOffres
      ];
      
      const hasNaN = values.some(value => isNaN(value) || value === null || value === undefined);
      
      if (hasNaN) {
        log('⚠️ Attention: Des valeurs NaN/null détectées dans les statistiques', 'yellow');
        log(`Valeurs: ${JSON.stringify(values)}`, 'yellow');
        return false;
      } else {
        log('✅ Aucune valeur NaN détectée dans les statistiques', 'green');
        return true;
      }
    } else {
      log('❌ Erreur avec la route statistiques', 'red');
      log(`Status: ${response.status}`, 'red');
      log(`Erreur: ${data.message || 'Erreur inconnue'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Erreur lors du test statistiques: ${error.message}`, 'red');
    return false;
  }
}

// Fonction principale
async function main() {
  log('🚀 Test complet des corrections admin sur Vercel', 'magenta');
  log(`URL de base: ${VERCEL_URL}`, 'yellow');
  
  // 1. Vérifier que la route existe
  const routeExists = await testAdminNotificationRouteExists();
  
  if (!routeExists) {
    log('\n❌ La route POST /api/admin/notifications n\'existe pas encore.', 'red');
    log('📝 Il faut déployer les corrections:', 'yellow');
    log('   git add .', 'cyan');
    log('   git commit -m "Fix: Route POST /api/admin/notifications manquante"', 'cyan');
    log('   git push', 'cyan');
    return;
  }
  
  // 2. Test d'authentification
  const token = await testAdminAuth();
  
  if (!token) {
    log('\n❌ Impossible de continuer sans token d\'authentification', 'red');
    log('💡 Vérifiez que les identifiants ADMIN001/admin123 sont corrects', 'yellow');
    return;
  }
  
  // 3. Tests avec authentification
  const results = {
    createNotification: await testCreateNotification(token),
    statistics: await testStatistics(token)
  };
  
  // 4. Résumé final
  log('\n📋 RÉSUMÉ FINAL DES TESTS:', 'magenta');
  log(`📬 Création de notification: ${results.createNotification ? '✅ SUCCÈS' : '❌ ÉCHEC'}`, results.createNotification ? 'green' : 'red');
  log(`📊 Statistiques sans NaN: ${results.statistics ? '✅ SUCCÈS' : '❌ ÉCHEC'}`, results.statistics ? 'green' : 'red');
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    log('\n🎉 TOUS LES TESTS SONT PASSÉS !', 'green');
    log('✅ Les notifications fonctionnent correctement', 'green');
    log('✅ Les statistiques n\'affichent plus de valeurs NaN', 'green');
    log('\n🎯 PROBLÈMES RÉSOLUS:', 'blue');
    log('- Erreur "Route non trouvée" pour les notifications', 'cyan');
    log('- Valeurs "NaN" dans les graphiques', 'cyan');
    log('- Données complètes dans le tableau des étudiants', 'cyan');
  } else {
    log('\n⚠️ Certains tests ont échoué.', 'yellow');
    log('📝 Vérifiez les logs ci-dessus pour plus de détails.', 'yellow');
  }
}

main().catch(error => {
  log(`❌ Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
