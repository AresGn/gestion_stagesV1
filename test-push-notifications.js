#!/usr/bin/env node

/**
 * Script de diagnostic pour les notifications push
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

// Test de la configuration VAPID
async function testVapidConfig() {
  log('\n🔑 Test de la configuration VAPID...', 'blue');
  
  try {
    const response = await fetch(`${VERCEL_URL}/push/vapid-key`);
    const data = await response.json();
    
    if (response.ok && data.success && data.publicKey) {
      log('✅ Clé VAPID publique disponible', 'green');
      log(`Clé publique: ${data.publicKey.substring(0, 20)}...`, 'cyan');
      return true;
    } else {
      log('❌ Problème avec la configuration VAPID', 'red');
      log(`Erreur: ${data.message || 'Clé VAPID manquante'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Erreur lors du test VAPID: ${error.message}`, 'red');
    return false;
  }
}

// Test des abonnements push existants
async function testPushSubscriptions(token) {
  log('\n📱 Test des abonnements push...', 'blue');
  
  try {
    const response = await fetch(`${VERCEL_URL}/push/subscriptions`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      log('✅ Route des abonnements fonctionne', 'green');
      log(`Nombre d'abonnements actifs: ${data.data?.length || 0}`, 'cyan');
      
      if (data.data && data.data.length > 0) {
        data.data.forEach((sub, index) => {
          log(`  ${index + 1}. User ID: ${sub.utilisateur_id}, Endpoint: ${sub.endpoint.substring(0, 50)}...`, 'cyan');
        });
        return true;
      } else {
        log('⚠️ Aucun abonnement push trouvé', 'yellow');
        log('💡 Les utilisateurs doivent s\'abonner aux notifications push', 'yellow');
        return false;
      }
    } else {
      log('❌ Problème avec les abonnements push', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Erreur lors du test abonnements: ${error.message}`, 'red');
    return false;
  }
}

// Test d'envoi de notification push
async function testSendPushNotification(token) {
  log('\n🚀 Test d\'envoi de notification push...', 'blue');
  
  try {
    const response = await fetch(`${VERCEL_URL}/push/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message: 'Test de notification push depuis le script de diagnostic'
      })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      log('✅ Test de notification push envoyé', 'green');
      log(`Message: ${data.message}`, 'cyan');
      log(`Résultats: ${JSON.stringify(data.results || {})}`, 'cyan');
      return true;
    } else {
      log('❌ Échec de l\'envoi de notification push', 'red');
      log(`Erreur: ${data.message}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Erreur lors du test push: ${error.message}`, 'red');
    return false;
  }
}

// Test de création de notification avec push
async function testCreateNotificationWithPush(token) {
  log('\n📬 Test de création de notification avec push...', 'blue');
  
  try {
    const response = await fetch(`${VERCEL_URL}/admin/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        destinataire: { type: 'tous' },
        titre: 'Test Push - Diagnostic complet',
        message: 'Cette notification devrait apparaître comme une notification push sur votre téléphone si tout est configuré correctement.'
      })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      log('✅ Notification créée avec succès', 'green');
      log(`Message: ${data.message}`, 'cyan');
      log('📱 Vérifiez votre téléphone pour la notification push !', 'yellow');
      return true;
    } else {
      log('❌ Échec de la création de notification', 'red');
      log(`Erreur: ${data.message}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Erreur lors de la création: ${error.message}`, 'red');
    return false;
  }
}

// Fonction principale
async function main() {
  log('🚀 DIAGNOSTIC DES NOTIFICATIONS PUSH', 'magenta');
  log(`URL de base: ${VERCEL_URL}`, 'yellow');
  
  // Tests séquentiels
  const vapidOk = await testVapidConfig();
  
  if (!vapidOk) {
    log('\n❌ Configuration VAPID manquante - Les notifications push ne peuvent pas fonctionner', 'red');
    log('\n💡 SOLUTIONS:', 'yellow');
    log('1. Vérifiez que les variables d\'environnement VAPID sont définies sur Vercel', 'cyan');
    log('2. VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT', 'cyan');
    return;
  }
  
  const token = await testAdminAuth();
  
  if (!token) {
    log('\n❌ Impossible de continuer sans authentification', 'red');
    return;
  }
  
  const hasSubscriptions = await testPushSubscriptions(token);
  
  if (!hasSubscriptions) {
    log('\n⚠️ Aucun abonnement push trouvé', 'yellow');
    log('\n💡 ÉTAPES POUR RÉSOUDRE:', 'blue');
    log('1. Ouvrez l\'application sur votre téléphone', 'cyan');
    log('2. Connectez-vous en tant qu\'étudiant', 'cyan');
    log('3. Autorisez les notifications quand demandé', 'cyan');
    log('4. Vérifiez que l\'abonnement push est créé', 'cyan');
  }
  
  await testSendPushNotification(token);
  await testCreateNotificationWithPush(token);
  
  log('\n📋 RÉSUMÉ DU DIAGNOSTIC:', 'magenta');
  log(`🔑 Configuration VAPID: ${vapidOk ? '✅ OK' : '❌ MANQUANTE'}`, vapidOk ? 'green' : 'red');
  log(`📱 Abonnements push: ${hasSubscriptions ? '✅ PRÉSENTS' : '⚠️ AUCUN'}`, hasSubscriptions ? 'green' : 'yellow');
  
  if (vapidOk && hasSubscriptions) {
    log('\n🎉 Configuration technique OK - Vérifiez votre téléphone !', 'green');
    log('\n🔍 SI LES NOTIFICATIONS N\'APPARAISSENT PAS:', 'blue');
    log('1. Vérifiez les paramètres de notification du navigateur', 'cyan');
    log('2. Assurez-vous que le site est autorisé à envoyer des notifications', 'cyan');
    log('3. Testez sur un autre appareil/navigateur', 'cyan');
    log('4. Vérifiez que le service worker est actif (F12 > Application > Service Workers)', 'cyan');
  } else {
    log('\n❌ Configuration incomplète - Les notifications push ne peuvent pas fonctionner', 'red');
  }
}

main().catch(error => {
  log(`❌ Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
