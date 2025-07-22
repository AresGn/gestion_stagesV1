#!/usr/bin/env node

/**
 * Script de test pour vérifier que les routes existent sur Vercel
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

// Test de la route POST notifications (sans auth)
async function testNotificationRoute() {
  log('\n📬 Test de la route POST /api/notifications...', 'blue');
  
  try {
    const response = await fetch(`${VERCEL_URL}/notifications`, {
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
      log('❌ Route POST notifications NON TROUVÉE (404)', 'red');
      return false;
    } else if (response.status === 401 || response.status === 403) {
      log('✅ Route POST notifications EXISTE (erreur auth)', 'green');
      return true;
    } else {
      log(`✅ Route POST notifications EXISTE (status: ${response.status})`, 'green');
      return true;
    }
  } catch (error) {
    log(`❌ Erreur: ${error.message}`, 'red');
    return false;
  }
}

// Test de la route GET notifications (sans auth)
async function testGetNotificationRoute() {
  log('\n📬 Test de la route GET /api/notifications...', 'blue');
  
  try {
    const response = await fetch(`${VERCEL_URL}/notifications`);
    log(`Status: ${response.status}`, 'cyan');
    
    if (response.status === 404) {
      log('❌ Route GET notifications NON TROUVÉE (404)', 'red');
      return false;
    } else {
      log('✅ Route GET notifications EXISTE', 'green');
      return true;
    }
  } catch (error) {
    log(`❌ Erreur: ${error.message}`, 'red');
    return false;
  }
}

// Test de la route admin statistiques
async function testStatisticsRoute() {
  log('\n📊 Test de la route GET /api/admin/statistiques...', 'blue');
  
  try {
    const response = await fetch(`${VERCEL_URL}/admin/statistiques`);
    log(`Status: ${response.status}`, 'cyan');
    
    if (response.status === 404) {
      log('❌ Route statistiques NON TROUVÉE (404)', 'red');
      return false;
    } else {
      log('✅ Route statistiques EXISTE', 'green');
      return true;
    }
  } catch (error) {
    log(`❌ Erreur: ${error.message}`, 'red');
    return false;
  }
}

// Test de la route admin étudiants
async function testStudentsRoute() {
  log('\n👥 Test de la route GET /api/admin/etudiants...', 'blue');
  
  try {
    const response = await fetch(`${VERCEL_URL}/admin/etudiants`);
    log(`Status: ${response.status}`, 'cyan');
    
    if (response.status === 404) {
      log('❌ Route étudiants NON TROUVÉE (404)', 'red');
      return false;
    } else {
      log('✅ Route étudiants EXISTE', 'green');
      return true;
    }
  } catch (error) {
    log(`❌ Erreur: ${error.message}`, 'red');
    return false;
  }
}

// Test de la route auth login
async function testAuthRoute() {
  log('\n🔐 Test de la route POST /api/auth/login...', 'blue');
  
  try {
    const response = await fetch(`${VERCEL_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        matricule: 'TEST',
        password: 'test'
      })
    });

    log(`Status: ${response.status}`, 'cyan');
    
    if (response.status === 404) {
      log('❌ Route auth login NON TROUVÉE (404)', 'red');
      return false;
    } else {
      log('✅ Route auth login EXISTE', 'green');
      return true;
    }
  } catch (error) {
    log(`❌ Erreur: ${error.message}`, 'red');
    return false;
  }
}

// Fonction principale
async function main() {
  log('🚀 Test de l\'existence des routes sur Vercel', 'magenta');
  log(`URL de base: ${VERCEL_URL}`, 'yellow');
  
  const results = {
    authLogin: await testAuthRoute(),
    notificationsPost: await testNotificationRoute(),
    notificationsGet: await testGetNotificationRoute(),
    statistics: await testStatisticsRoute(),
    students: await testStudentsRoute()
  };
  
  log('\n📋 RÉSUMÉ DES TESTS:', 'magenta');
  log(`🔐 Route auth/login: ${results.authLogin ? '✅ EXISTE' : '❌ MANQUANTE'}`, results.authLogin ? 'green' : 'red');
  log(`📬 Route POST notifications: ${results.notificationsPost ? '✅ EXISTE' : '❌ MANQUANTE'}`, results.notificationsPost ? 'green' : 'red');
  log(`📬 Route GET notifications: ${results.notificationsGet ? '✅ EXISTE' : '❌ MANQUANTE'}`, results.notificationsGet ? 'green' : 'red');
  log(`📊 Route statistiques: ${results.statistics ? '✅ EXISTE' : '❌ MANQUANTE'}`, results.statistics ? 'green' : 'red');
  log(`👥 Route étudiants: ${results.students ? '✅ EXISTE' : '❌ MANQUANTE'}`, results.students ? 'green' : 'red');
  
  if (results.notificationsPost) {
    log('\n🎉 La route POST notifications existe ! Le problème principal est résolu.', 'green');
  } else {
    log('\n❌ La route POST notifications est toujours manquante.', 'red');
    log('📝 Il faut déployer les corrections:', 'yellow');
    log('   git add .', 'cyan');
    log('   git commit -m "Fix: Route POST notifications manquante"', 'cyan');
    log('   git push', 'cyan');
  }
}

main().catch(error => {
  log(`❌ Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
