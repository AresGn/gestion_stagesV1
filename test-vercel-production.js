/**
 * Test des corrections sur Vercel en production
 * Utilise l'URL Vercel et les identifiants admin fournis
 */

// URL Vercel - automatiquement détectée ou configurée
let VERCEL_URL = process.env.VERCEL_URL ?
  `https://${process.env.VERCEL_URL}` :
  process.argv[2] ||
  'https://gestion-stages-v1.vercel.app'; // URL par défaut - remplacez par la vôtre

// Nettoyer l'URL pour éviter les doubles slashes
VERCEL_URL = VERCEL_URL.replace(/\/+$/, ''); // Supprimer les slashes à la fin

const API_BASE = `${VERCEL_URL}/api`;

// Identifiants admin fournis
const ADMIN_CREDENTIALS = {
  matricule: 'ADMIN001',
  password: 'admin123'
};

console.log(`🌐 Test des corrections sur Vercel Production`);
console.log(`🔗 URL: ${VERCEL_URL}`);
console.log(`📅 Date: ${new Date().toLocaleString()}`);

let adminToken = null;
let testResults = {
  passed: 0,
  failed: 0,
  warnings: 0
};

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

    console.log(`   🔍 Testing: ${method} ${url}`);
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

const logResult = (name, success, details = '') => {
  if (success) {
    testResults.passed++;
    console.log(`✅ ${name} ${details ? '- ' + details : ''}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name} ${details ? '- ' + details : ''}`);
  }
};

const testVercelProduction = async () => {
  console.log('\n🔐 === AUTHENTIFICATION ADMIN ===');
  
  // Test authentification admin
  const loginResult = await testRoute(
    `${API_BASE}/auth/admin/login`, 
    null, 
    'POST', 
    ADMIN_CREDENTIALS
  );

  if (!loginResult.success || !loginResult.data.token) {
    logResult('Authentification admin', false, loginResult.data?.message || loginResult.error);
    console.log('\n❌ Impossible de continuer sans authentification');
    return;
  }

  adminToken = loginResult.data.token;
  logResult('Authentification admin', true, 'Token obtenu');

  console.log('\n📝 === TEST FORMULAIRE PROPOSITIONS DE STAGE ===');

  // Test création d'une proposition de stage
  const nouvelleProposition = {
    titre: 'Stage Test Production Vercel',
    description: 'Test de création de proposition sur Vercel en production',
    requirements: 'Connaissances en développement web, React, Node.js',
    entreprise_nom: 'TechCorp Vercel Test',
    location: 'Dakar, Sénégal',
    duration: '3 mois',
    filiere_id: 1,
    statut: 'active'
  };

  const createResult = await testRoute(
    `${API_BASE}/admin/propositions`, 
    adminToken, 
    'POST', 
    nouvelleProposition
  );

  logResult(
    'Création proposition de stage',
    createResult.success,
    createResult.success ? 
      `ID: ${createResult.data.data?.id}` : 
      createResult.data?.message || createResult.error
  );

  // Test récupération des propositions
  const getPropositionsResult = await testRoute(`${API_BASE}/admin/propositions`, adminToken);
  
  if (getPropositionsResult.success) {
    const propositions = getPropositionsResult.data.data?.propositions || [];
    logResult('Récupération propositions', true, `${propositions.length} propositions`);
  } else {
    logResult('Récupération propositions', false, getPropositionsResult.data?.message);
  }

  console.log('\n👥 === TEST FILTRES ÉTUDIANTS ===');

  // Test récupération des étudiants
  const etudiantsResult = await testRoute(`${API_BASE}/admin/etudiants`, adminToken);
  
  if (etudiantsResult.success) {
    let etudiants = etudiantsResult.data.data || etudiantsResult.data || [];
    if (etudiantsResult.data.data && etudiantsResult.data.data.etudiants) {
      etudiants = etudiantsResult.data.data.etudiants;
    }
    
    logResult('Récupération étudiants', true, `${etudiants.length} étudiants`);

    // Test des filtres si on a des étudiants
    if (etudiants.length > 0) {
      // Test filtrage par filière
      const filtreFiliereResult = await testRoute(`${API_BASE}/admin/etudiants?filiere=1`, adminToken);
      logResult('Filtrage par filière', filtreFiliereResult.success);

      // Test recherche
      const rechercheResult = await testRoute(`${API_BASE}/admin/etudiants?search=test`, adminToken);
      logResult('Recherche étudiants', rechercheResult.success);

      // Test pagination
      const paginationResult = await testRoute(`${API_BASE}/admin/etudiants?page=1&limit=5`, adminToken);
      logResult('Pagination étudiants', paginationResult.success);
    }
  } else {
    logResult('Récupération étudiants', false, etudiantsResult.data?.message);
  }

  // Test route de recherche dédiée
  const searchResult = await testRoute(`${API_BASE}/admin/etudiants/search?q=test`, adminToken);
  logResult('Route recherche dédiée', searchResult.success, 
    searchResult.success ? `${searchResult.data.data?.length || 0} résultats` : searchResult.data?.message);

  console.log('\n📊 === TEST DONNÉES DE RÉFÉRENCE ===');

  // Test route filières
  const filieresResult = await testRoute(`${API_BASE}/filieres`);
  logResult('Route /api/filieres', filieresResult.success, 
    filieresResult.success ? `${filieresResult.data?.length || 0} filières` : 'Route non trouvée');

  // Test route entreprises
  const entreprisesResult = await testRoute(`${API_BASE}/entreprises`);
  logResult('Route /api/entreprises', entreprisesResult.success, 
    entreprisesResult.success ? `${entreprisesResult.data?.length || 0} entreprises` : 'Route non trouvée');

  console.log('\n📈 === TEST STATISTIQUES DASHBOARD ===');

  // Test statistiques
  const statsResult = await testRoute(`${API_BASE}/admin/statistiques`, adminToken);
  
  if (statsResult.success) {
    const stats = statsResult.data.data || {};
    const etudiantsParFiliere = stats.etudiantsParFiliere || [];
    
    logResult('Statistiques dashboard', true, 
      `${stats.totalEtudiants || 0} étudiants, ${etudiantsParFiliere.length} filières`);
    
    logResult('Données par filière', etudiantsParFiliere.length > 0, 
      etudiantsParFiliere.length > 0 ? 'Données disponibles' : 'Aucune donnée');
  } else {
    logResult('Statistiques dashboard', false, statsResult.data?.message);
  }

  console.log('\n🔔 === TEST NOTIFICATIONS ===');

  // Test notifications
  const notificationsResult = await testRoute(`${API_BASE}/admin/notifications`, adminToken);
  logResult('Notifications admin', notificationsResult.success, 
    notificationsResult.success ? `${notificationsResult.data.data?.length || 0} notifications` : 'Erreur');

  // Résumé final
  console.log('\n🎯 === RÉSUMÉ FINAL ===');
  console.log(`✅ Tests réussis: ${testResults.passed}`);
  console.log(`❌ Tests échoués: ${testResults.failed}`);
  
  const totalTests = testResults.passed + testResults.failed;
  const successRate = totalTests > 0 ? ((testResults.passed / totalTests) * 100).toFixed(1) : 0;
  console.log(`📊 Taux de réussite: ${successRate}%`);

  if (testResults.failed === 0) {
    console.log('\n🎉 TOUS LES TESTS SONT PASSÉS !');
    console.log('✅ Les corrections fonctionnent parfaitement sur Vercel');
    console.log('✅ Le formulaire d\'ajout de propositions de stage est opérationnel');
    console.log('✅ Les filtres de l\'onglet étudiant fonctionnent');
  } else if (testResults.passed > testResults.failed) {
    console.log('\n✅ LA MAJORITÉ DES TESTS SONT PASSÉS');
    console.log('⚠️  Quelques fonctionnalités nécessitent encore des ajustements');
  } else {
    console.log('\n❌ PLUSIEURS TESTS ONT ÉCHOUÉ');
    console.log('🔧 Des corrections supplémentaires sont nécessaires');
  }

  console.log('\n📋 Actions recommandées:');
  if (testResults.failed === 0) {
    console.log('1. ✅ Tester manuellement le dashboard admin sur Vercel');
    console.log('2. ✅ Vérifier les formulaires dans l\'interface utilisateur');
    console.log('3. ✅ Tester les filtres étudiants dans l\'interface');
  } else {
    console.log('1. 🔍 Analyser les erreurs dans les logs Vercel');
    console.log('2. 🔧 Corriger les routes qui échouent encore');
    console.log('3. 🧪 Re-tester après corrections');
  }

  console.log(`\n🌐 Dashboard admin: ${VERCEL_URL}/admin`);
  console.log(`🔑 Identifiants: ${ADMIN_CREDENTIALS.matricule} / ${ADMIN_CREDENTIALS.password}`);
};

// Exécution des tests
console.log('⏳ Démarrage des tests sur Vercel...\n');
testVercelProduction().catch(error => {
  console.error('❌ Erreur lors des tests:', error);
  console.log('\n💡 Vérifiez:');
  console.log('1. Que l\'URL Vercel est correcte');
  console.log('2. Que le déploiement est terminé');
  console.log('3. Que les variables d\'environnement sont configurées');
});
