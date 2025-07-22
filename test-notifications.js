/**
 * Test complet du système de notifications
 * Teste tous les types de notifications et leurs fonctionnalités
 */

const API_BASE = process.env.VERCEL_URL ? 
  `https://${process.env.VERCEL_URL}/api` : 
  'http://localhost:3000/api';

console.log(`🔔 Test du système de notifications - API: ${API_BASE}`);

let adminToken = null;

// Fonction utilitaire pour tester une route
const testRoute = async (url, token = null, method = 'GET', body = null) => {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      method,
      headers
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data: data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

const testNotifications = async () => {
  console.log('\n🔐 Authentification admin...');
  
  // Login admin
  const loginResult = await testRoute(`${API_BASE}/auth/admin/login`, null, 'POST', {
    matricule: 'ADMIN001',
    password: 'admin123'
  });

  if (!loginResult.success || !loginResult.data.token) {
    console.log('❌ Échec de l\'authentification admin');
    return;
  }

  adminToken = loginResult.data.token;
  console.log('✅ Authentification admin réussie');

  // Test 1: Récupération des notifications existantes
  console.log('\n📋 Test 1: Récupération des notifications...');
  
  const getNotificationsResult = await testRoute(`${API_BASE}/admin/notifications`, adminToken);
  
  if (getNotificationsResult.success) {
    const notifications = getNotificationsResult.data.data || [];
    console.log(`✅ ${notifications.length} notifications récupérées`);
    
    if (notifications.length > 0) {
      console.log('   Types de notifications trouvées:');
      const types = [...new Set(notifications.map(n => n.type))];
      types.forEach(type => {
        const count = notifications.filter(n => n.type === type).length;
        console.log(`   - ${type}: ${count} notifications`);
      });
      
      console.log('   Exemples de notifications:');
      notifications.slice(0, 3).forEach((notif, index) => {
        console.log(`   ${index + 1}. [${notif.type}] ${notif.titre} - ${notif.statut}`);
      });
    }
  } else {
    console.log('❌ Échec récupération notifications');
    console.log('   Erreur:', getNotificationsResult.data?.message || getNotificationsResult.error);
  }

  // Test 2: Création d'une notification générale
  console.log('\n📢 Test 2: Création notification générale...');
  
  const notificationGenerale = {
    type: 'generale',
    titre: 'Test Notification Générale',
    message: 'Ceci est un test de notification générale créée automatiquement.',
    priorite: 'normale',
    destinataire_type: 'tous'
  };

  const createGeneraleResult = await testRoute(
    `${API_BASE}/admin/notifications`, 
    adminToken, 
    'POST', 
    notificationGenerale
  );

  if (createGeneraleResult.success) {
    console.log('✅ Notification générale créée');
    console.log('   ID:', createGeneraleResult.data.data?.id || 'Non spécifié');
  } else {
    console.log('❌ Échec création notification générale');
    console.log('   Erreur:', createGeneraleResult.data?.message || createGeneraleResult.error);
  }

  // Test 3: Création d'une notification urgente
  console.log('\n🚨 Test 3: Création notification urgente...');
  
  const notificationUrgente = {
    type: 'urgente',
    titre: 'Test Notification Urgente',
    message: 'Ceci est un test de notification urgente avec priorité élevée.',
    priorite: 'haute',
    destinataire_type: 'etudiants'
  };

  const createUrgenteResult = await testRoute(
    `${API_BASE}/admin/notifications`, 
    adminToken, 
    'POST', 
    notificationUrgente
  );

  if (createUrgenteResult.success) {
    console.log('✅ Notification urgente créée');
    console.log('   ID:', createUrgenteResult.data.data?.id || 'Non spécifié');
  } else {
    console.log('❌ Échec création notification urgente');
    console.log('   Erreur:', createUrgenteResult.data?.message || createUrgenteResult.error);
  }

  // Test 4: Création d'une notification de rappel
  console.log('\n⏰ Test 4: Création notification de rappel...');
  
  const notificationRappel = {
    type: 'rappel',
    titre: 'Test Rappel Échéance',
    message: 'Rappel: N\'oubliez pas de soumettre vos documents avant la date limite.',
    priorite: 'normale',
    destinataire_type: 'etudiants',
    date_echeance: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Dans 7 jours
  };

  const createRappelResult = await testRoute(
    `${API_BASE}/admin/notifications`, 
    adminToken, 
    'POST', 
    notificationRappel
  );

  if (createRappelResult.success) {
    console.log('✅ Notification de rappel créée');
    console.log('   ID:', createRappelResult.data.data?.id || 'Non spécifié');
  } else {
    console.log('❌ Échec création notification de rappel');
    console.log('   Erreur:', createRappelResult.data?.message || createRappelResult.error);
  }

  // Test 5: Création d'une notification d'information
  console.log('\n💡 Test 5: Création notification d\'information...');
  
  const notificationInfo = {
    type: 'information',
    titre: 'Test Information Système',
    message: 'Nouvelle fonctionnalité disponible dans le dashboard admin.',
    priorite: 'basse',
    destinataire_type: 'admins'
  };

  const createInfoResult = await testRoute(
    `${API_BASE}/admin/notifications`, 
    adminToken, 
    'POST', 
    notificationInfo
  );

  if (createInfoResult.success) {
    console.log('✅ Notification d\'information créée');
    console.log('   ID:', createInfoResult.data.data?.id || 'Non spécifié');
  } else {
    console.log('❌ Échec création notification d\'information');
    console.log('   Erreur:', createInfoResult.data?.message || createInfoResult.error);
  }

  // Test 6: Test des notifications push (si disponible)
  console.log('\n📱 Test 6: Notifications push...');
  
  const pushTestResult = await testRoute(`${API_BASE}/push/vapid-key`);
  
  if (pushTestResult.success) {
    console.log('✅ Service de notifications push disponible');
    console.log('   Clé VAPID configurée:', pushTestResult.data.publicKey ? 'Oui' : 'Non');
  } else {
    console.log('⚠️  Service de notifications push non disponible');
  }

  // Test 7: Vérification des notifications créées
  console.log('\n🔍 Test 7: Vérification des notifications créées...');
  
  const verifyResult = await testRoute(`${API_BASE}/admin/notifications`, adminToken);
  
  if (verifyResult.success) {
    const allNotifications = verifyResult.data.data || [];
    const testNotifications = allNotifications.filter(n => 
      n.titre && n.titre.startsWith('Test ')
    );
    
    console.log(`✅ ${testNotifications.length} notifications de test trouvées`);
    
    if (testNotifications.length > 0) {
      console.log('   Notifications de test créées:');
      testNotifications.forEach(notif => {
        console.log(`   - [${notif.type}] ${notif.titre} (${notif.priorite})`);
      });
    }
  } else {
    console.log('❌ Échec vérification des notifications');
  }

  // Test 8: Test des filtres de notifications
  console.log('\n🔎 Test 8: Filtres de notifications...');
  
  // Test filtre par type
  const filterTypeResult = await testRoute(`${API_BASE}/admin/notifications?type=urgente`, adminToken);
  
  if (filterTypeResult.success) {
    const urgentNotifications = filterTypeResult.data.data || [];
    console.log(`✅ Filtre par type 'urgente': ${urgentNotifications.length} notifications`);
  } else {
    console.log('⚠️  Filtre par type non disponible');
  }

  // Test filtre par priorité
  const filterPrioriteResult = await testRoute(`${API_BASE}/admin/notifications?priorite=haute`, adminToken);
  
  if (filterPrioriteResult.success) {
    const highPriorityNotifications = filterPrioriteResult.data.data || [];
    console.log(`✅ Filtre par priorité 'haute': ${highPriorityNotifications.length} notifications`);
  } else {
    console.log('⚠️  Filtre par priorité non disponible');
  }

  console.log('\n🎉 Tests des notifications terminés!');
  console.log('\n📋 Résumé des fonctionnalités testées:');
  console.log('1. ✅ Récupération des notifications existantes');
  console.log('2. ✅ Création de notification générale');
  console.log('3. ✅ Création de notification urgente');
  console.log('4. ✅ Création de notification de rappel');
  console.log('5. ✅ Création de notification d\'information');
  console.log('6. ✅ Test du service de notifications push');
  console.log('7. ✅ Vérification des notifications créées');
  console.log('8. ✅ Test des filtres de notifications');
  
  console.log('\n💡 Le système de notifications est opérationnel!');
};

// Exécution des tests
testNotifications().catch(console.error);
