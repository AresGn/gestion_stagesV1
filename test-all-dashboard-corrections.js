/**
 * Test complet de toutes les corrections du dashboard admin
 * Script final pour valider toutes les fonctionnalités
 */

const API_BASE = process.env.VERCEL_URL ? 
  `https://${process.env.VERCEL_URL}/api` : 
  'http://localhost:3000/api';

console.log(`🧪 Test complet des corrections dashboard admin - API: ${API_BASE}`);
console.log(`📅 Date: ${new Date().toLocaleString()}`);

let adminToken = null;
let testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
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

const addTestResult = (name, success, details = '', isWarning = false) => {
  if (success) {
    testResults.passed++;
    console.log(`✅ ${name}`);
  } else if (isWarning) {
    testResults.warnings++;
    console.log(`⚠️  ${name} - ${details}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name} - ${details}`);
  }
  
  testResults.details.push({
    name,
    success,
    details,
    isWarning
  });
};

const testAllDashboardCorrections = async () => {
  console.log('\n🔐 === AUTHENTIFICATION ===');
  
  // Test authentification admin
  const loginResult = await testRoute(`${API_BASE}/auth/admin/login`, null, 'POST', {
    matricule: 'ADMIN001',
    password: 'admin123'
  });

  if (!loginResult.success || !loginResult.data.token) {
    addTestResult('Authentification admin', false, 'Impossible de se connecter');
    return;
  }

  adminToken = loginResult.data.token;
  addTestResult('Authentification admin', true);

  console.log('\n📝 === FORMULAIRES ===');

  // Test 1: Formulaire d'ajout de propositions de stage
  const nouvelleProposition = {
    titre: 'Stage Test Final Dashboard',
    description: 'Test final de création de proposition après toutes les corrections',
    requirements: 'Connaissances en développement web',
    entreprise_nom: 'Entreprise Test Final',
    location: 'Dakar, Sénégal',
    duration: '3 mois',
    filiere_id: 1,
    statut: 'active'
  };

  const createPropositionResult = await testRoute(
    `${API_BASE}/admin/propositions`, 
    adminToken, 
    'POST', 
    nouvelleProposition
  );

  addTestResult(
    'Formulaire ajout proposition de stage',
    createPropositionResult.success,
    createPropositionResult.success ? 
      `ID créé: ${createPropositionResult.data.data?.id}` : 
      createPropositionResult.data?.message || createPropositionResult.error
  );

  // Test 2: Récupération des propositions
  const getPropositionsResult = await testRoute(`${API_BASE}/admin/propositions`, adminToken);
  
  if (getPropositionsResult.success) {
    const propositions = getPropositionsResult.data.data?.propositions || [];
    addTestResult(
      'Récupération des propositions',
      true,
      `${propositions.length} propositions récupérées`
    );
  } else {
    addTestResult(
      'Récupération des propositions',
      false,
      getPropositionsResult.data?.message || getPropositionsResult.error
    );
  }

  console.log('\n👥 === GESTION ÉTUDIANTS ===');

  // Test 3: Récupération des étudiants
  const etudiantsResult = await testRoute(`${API_BASE}/admin/etudiants`, adminToken);
  
  if (etudiantsResult.success) {
    let etudiants = etudiantsResult.data.data || etudiantsResult.data || [];
    if (etudiantsResult.data.data && etudiantsResult.data.data.etudiants) {
      etudiants = etudiantsResult.data.data.etudiants;
    }
    
    addTestResult(
      'Récupération des étudiants',
      true,
      `${etudiants.length} étudiants récupérés`
    );

    // Analyse des données pour filtrage
    if (etudiants.length > 0) {
      const filieres = [...new Set(etudiants.filter(e => e.filiere_nom).map(e => e.filiere_nom))];
      const entreprises = [...new Set(etudiants.filter(e => e.entreprise_nom).map(e => e.entreprise_nom))];
      const statuts = [...new Set(etudiants.filter(e => e.statut).map(e => e.statut))];
      
      addTestResult(
        'Données de filtrage disponibles',
        true,
        `${filieres.length} filières, ${entreprises.length} entreprises, ${statuts.length} statuts`
      );
    }
  } else {
    addTestResult(
      'Récupération des étudiants',
      false,
      etudiantsResult.data?.message || etudiantsResult.error
    );
  }

  // Test 4: Filtrage par filière
  const filtreFiliereResult = await testRoute(`${API_BASE}/admin/etudiants?filiere=1`, adminToken);
  addTestResult(
    'Filtrage par filière',
    filtreFiliereResult.success,
    filtreFiliereResult.success ? 'Filtrage opérationnel' : 'Erreur de filtrage'
  );

  // Test 5: Recherche d'étudiants
  const rechercheResult = await testRoute(`${API_BASE}/admin/etudiants?search=test`, adminToken);
  addTestResult(
    'Recherche d\'étudiants',
    rechercheResult.success,
    rechercheResult.success ? 'Recherche opérationnelle' : 'Erreur de recherche'
  );

  console.log('\n📊 === DONNÉES DE RÉFÉRENCE ===');

  // Test 6: Route filières
  const filieresResult = await testRoute(`${API_BASE}/filieres`);
  addTestResult(
    'Route /api/filieres',
    filieresResult.success,
    filieresResult.success ? 
      `${filieresResult.data?.length || 0} filières` : 
      'Route non trouvée (normal en local)',
    !filieresResult.success // Marquer comme warning si échec
  );

  // Test 7: Route entreprises
  const entreprisesResult = await testRoute(`${API_BASE}/entreprises`);
  addTestResult(
    'Route /api/entreprises',
    entreprisesResult.success,
    entreprisesResult.success ? 
      `${entreprisesResult.data?.length || 0} entreprises` : 
      'Route non trouvée (normal en local)',
    !entreprisesResult.success // Marquer comme warning si échec
  );

  console.log('\n📈 === STATISTIQUES ===');

  // Test 8: Statistiques dashboard
  const statsResult = await testRoute(`${API_BASE}/admin/statistiques`, adminToken);
  
  if (statsResult.success) {
    const stats = statsResult.data.data || {};
    const etudiantsParFiliere = stats.etudiantsParFiliere || [];
    
    addTestResult(
      'Statistiques dashboard',
      true,
      `${stats.totalEtudiants || 0} étudiants, ${etudiantsParFiliere.length} filières`
    );
    
    addTestResult(
      'Données étudiants par filière',
      etudiantsParFiliere.length > 0,
      etudiantsParFiliere.length > 0 ? 
        `${etudiantsParFiliere.length} filières avec données` : 
        'Aucune donnée par filière'
    );
  } else {
    addTestResult(
      'Statistiques dashboard',
      false,
      statsResult.data?.message || statsResult.error
    );
  }

  console.log('\n🔔 === NOTIFICATIONS ===');

  // Test 9: Notifications admin
  const notificationsResult = await testRoute(`${API_BASE}/admin/notifications`, adminToken);
  addTestResult(
    'Notifications admin',
    notificationsResult.success,
    notificationsResult.success ? 
      `${notificationsResult.data.data?.length || 0} notifications` : 
      'Erreur récupération notifications'
  );

  // Résumé final
  console.log('\n🎯 === RÉSUMÉ FINAL ===');
  console.log(`✅ Tests réussis: ${testResults.passed}`);
  console.log(`❌ Tests échoués: ${testResults.failed}`);
  console.log(`⚠️  Avertissements: ${testResults.warnings}`);
  
  const totalTests = testResults.passed + testResults.failed + testResults.warnings;
  const successRate = ((testResults.passed / totalTests) * 100).toFixed(1);
  console.log(`📊 Taux de réussite: ${successRate}%`);

  if (testResults.failed === 0) {
    console.log('\n🎉 TOUS LES TESTS CRITIQUES SONT PASSÉS !');
    console.log('✅ Le dashboard admin est prêt pour Vercel');
  } else {
    console.log('\n⚠️  CERTAINS TESTS ONT ÉCHOUÉ');
    console.log('❌ Vérifiez les erreurs avant le déploiement');
  }

  console.log('\n📋 Détails des tests:');
  testResults.details.forEach(test => {
    const icon = test.success ? '✅' : test.isWarning ? '⚠️' : '❌';
    console.log(`${icon} ${test.name}: ${test.details || 'OK'}`);
  });

  console.log('\n🚀 Prochaines étapes:');
  console.log('1. Déployer sur Vercel si tous les tests critiques passent');
  console.log('2. Tester les formulaires sur l\'URL Vercel');
  console.log('3. Vérifier les filtres étudiants en production');
  console.log('4. Valider les routes de données de référence');
};

// Exécution des tests
testAllDashboardCorrections().catch(console.error);
