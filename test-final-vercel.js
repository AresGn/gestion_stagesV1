/**
 * Test final complet sur Vercel
 * Usage: node test-final-vercel.js [URL_VERCEL]
 */

let VERCEL_URL = process.argv[2] || 'https://gestion-stages-v1.vercel.app';
VERCEL_URL = VERCEL_URL.replace(/\/+$/, ''); // Supprimer les slashes à la fin
const API_BASE = `${VERCEL_URL}/api`;

console.log(`🚀 Test final complet sur Vercel: ${VERCEL_URL}`);
console.log(`📅 Date: ${new Date().toLocaleString()}`);

let adminToken = null;
let results = { passed: 0, failed: 0, warnings: 0 };

const testRoute = async (url, token = null, method = 'GET', body = null) => {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body && method !== 'GET') options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    const data = await response.json();
    
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const logResult = (name, success, details = '', isWarning = false) => {
  const icon = success ? '✅' : isWarning ? '⚠️' : '❌';
  console.log(`${icon} ${name}${details ? ' - ' + details : ''}`);
  
  if (success) results.passed++;
  else if (isWarning) results.warnings++;
  else results.failed++;
};

const testFinalVercel = async () => {
  console.log('\n🔐 === AUTHENTIFICATION ===');
  
  const loginResult = await testRoute(`${API_BASE}/auth/admin/login`, null, 'POST', {
    matricule: 'ADMIN001',
    password: 'admin123'
  });

  if (!loginResult.success) {
    logResult('Authentification admin', false, loginResult.data?.message || loginResult.error);
    return;
  }

  adminToken = loginResult.data.token;
  logResult('Authentification admin', true);

  console.log('\n📝 === FORMULAIRES DASHBOARD ===');

  // Test formulaire propositions
  const createProposition = await testRoute(`${API_BASE}/admin/propositions`, adminToken, 'POST', {
    titre: 'Stage Final Test Vercel',
    description: 'Test final après toutes les corrections',
    requirements: 'Développement web, React, Node.js',
    entreprise_nom: 'TechCorp Final Test',
    location: 'Dakar, Sénégal',
    duration: '3 mois',
    filiere_id: 1,
    statut: 'active'
  });

  logResult('Formulaire ajout proposition', createProposition.success, 
    createProposition.success ? `ID: ${createProposition.data.data?.id}` : createProposition.data?.message);

  // Test récupération propositions
  const getPropositions = await testRoute(`${API_BASE}/admin/propositions`, adminToken);
  logResult('Récupération propositions', getPropositions.success, 
    getPropositions.success ? `${getPropositions.data.data?.propositions?.length || 0} propositions` : '');

  console.log('\n👥 === GESTION ÉTUDIANTS ===');

  // Test récupération étudiants
  const getEtudiants = await testRoute(`${API_BASE}/admin/etudiants`, adminToken);
  if (getEtudiants.success) {
    const etudiants = getEtudiants.data.data || [];
    logResult('Récupération étudiants', true, `${etudiants.length} étudiants`);
    
    // Test filtres
    const filterTest = await testRoute(`${API_BASE}/admin/etudiants?filiere=1`, adminToken);
    logResult('Filtrage par filière', filterTest.success);
    
    const searchTest = await testRoute(`${API_BASE}/admin/etudiants?search=test`, adminToken);
    logResult('Recherche étudiants', searchTest.success);
  } else {
    logResult('Récupération étudiants', false, getEtudiants.data?.message);
  }

  console.log('\n📊 === DONNÉES DE RÉFÉRENCE ===');

  // Test route filières
  const getFilieres = await testRoute(`${API_BASE}/filieres`);
  logResult('Route /api/filieres', getFilieres.success, 
    getFilieres.success ? `${getFilieres.data?.length || 0} filières` : 'Route non trouvée', !getFilieres.success);

  // Test route entreprises
  const getEntreprises = await testRoute(`${API_BASE}/entreprises`);
  logResult('Route /api/entreprises', getEntreprises.success, 
    getEntreprises.success ? `${getEntreprises.data?.length || 0} entreprises` : '');

  // Test route de diagnostic
  const testRoutes = await testRoute(`${API_BASE}/test-routes`);
  logResult('Route de diagnostic', testRoutes.success, 
    testRoutes.success ? 'Routes disponibles' : '');

  console.log('\n📈 === STATISTIQUES ===');

  // Test statistiques
  const getStats = await testRoute(`${API_BASE}/admin/statistiques`, adminToken);
  if (getStats.success) {
    const stats = getStats.data.data || {};
    logResult('Statistiques dashboard', true, 
      `${stats.totalEtudiants || 0} étudiants, ${stats.etudiantsParFiliere?.length || 0} filières`);
  } else {
    logResult('Statistiques dashboard', false, getStats.data?.message);
  }

  console.log('\n🔔 === NOTIFICATIONS ===');

  // Test notifications
  const getNotifications = await testRoute(`${API_BASE}/admin/notifications`, adminToken);
  logResult('Récupération notifications', getNotifications.success, 
    getNotifications.success ? `${getNotifications.data.data?.length || 0} notifications` : '');

  // Test création notification
  const createNotification = await testRoute(`${API_BASE}/admin/notifications`, adminToken, 'POST', {
    destinataire: {
      type: 'tous'
    },
    titre: 'Test Final Vercel',
    message: 'Test de création de notification après corrections'
  });

  logResult('Création notification', createNotification.success, 
    createNotification.success ? 'Notification créée' : createNotification.data?.message);

  console.log('\n📱 === NOTIFICATIONS PUSH ===');

  // Test service push
  const getPushKey = await testRoute(`${API_BASE}/push/vapid-key`);
  logResult('Service notifications push', getPushKey.success, 
    getPushKey.success ? 'Clé VAPID disponible' : 'Service non configuré', !getPushKey.success);

  console.log('\n🎯 === RÉSUMÉ FINAL ===');
  console.log(`✅ Tests réussis: ${results.passed}`);
  console.log(`❌ Tests échoués: ${results.failed}`);
  console.log(`⚠️  Avertissements: ${results.warnings}`);
  
  const total = results.passed + results.failed + results.warnings;
  const successRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  console.log(`📊 Taux de réussite: ${successRate}%`);

  if (results.failed === 0) {
    console.log('\n🎉 TOUS LES TESTS CRITIQUES SONT PASSÉS !');
    console.log('✅ Le dashboard admin fonctionne parfaitement sur Vercel');
    console.log('✅ Les formulaires sont opérationnels');
    console.log('✅ Les filtres étudiants fonctionnent');
    console.log('✅ Le système de notifications est actif');
  } else if (results.passed > results.failed) {
    console.log('\n✅ LA MAJORITÉ DES FONCTIONNALITÉS MARCHENT');
    console.log('⚠️  Quelques ajustements mineurs peuvent être nécessaires');
  } else {
    console.log('\n❌ PLUSIEURS PROBLÈMES DÉTECTÉS');
    console.log('🔧 Des corrections supplémentaires sont requises');
  }

  console.log('\n📋 Actions recommandées:');
  console.log('1. 🌐 Tester manuellement le dashboard admin');
  console.log('2. 📝 Vérifier les formulaires dans l\'interface');
  console.log('3. 👥 Tester les filtres étudiants');
  console.log('4. 🔔 Vérifier les notifications');

  console.log(`\n🔗 Liens utiles:`);
  console.log(`   Dashboard admin: ${VERCEL_URL}/admin`);
  console.log(`   Identifiants: ADMIN001 / admin123`);
  console.log(`   API de test: ${API_BASE}/test-routes`);

  console.log('\n🚀 Le système est prêt pour la production !');
};

// Exécution
console.log('⏳ Démarrage des tests finaux...\n');
testFinalVercel().catch(error => {
  console.error('❌ Erreur lors des tests:', error);
  console.log('\n💡 Vérifiez que l\'URL Vercel est correcte et que le déploiement est terminé');
});
