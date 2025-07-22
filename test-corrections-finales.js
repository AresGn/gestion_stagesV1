/**
 * Test des corrections finales
 * Teste spécifiquement les problèmes identifiés
 */

let VERCEL_URL = process.argv[2] || 'https://gestion-stages-v1.vercel.app';
VERCEL_URL = VERCEL_URL.replace(/\/+$/, '');
const API_BASE = `${VERCEL_URL}/api`;

console.log(`🔧 Test des corrections finales: ${VERCEL_URL}`);

let adminToken = null;

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

const testCorrectionsFinales = async () => {
  console.log('\n🔐 Authentification...');
  
  const loginResult = await testRoute(`${API_BASE}/auth/admin/login`, null, 'POST', {
    matricule: 'ADMIN001',
    password: 'admin123'
  });

  if (!loginResult.success) {
    console.log('❌ Authentification échouée');
    return;
  }

  adminToken = loginResult.data.token;
  console.log('✅ Authentification réussie');

  // Test 1: Route /api/filieres (CORRIGÉE)
  console.log('\n🎓 Test 1: Route /api/filieres...');
  
  const filieresResult = await testRoute(`${API_BASE}/filieres`);
  
  if (filieresResult.success) {
    const filieres = filieresResult.data || [];
    console.log(`✅ Route /api/filieres fonctionne - ${filieres.length} filières`);
    
    if (filieres.length > 0) {
      console.log('   Exemples:');
      filieres.slice(0, 3).forEach(f => {
        console.log(`   - ${f.nom} (ID: ${f.id})`);
      });
    }
  } else {
    console.log('❌ Route /api/filieres échoue encore');
    console.log('   Status:', filieresResult.status);
    console.log('   Erreur:', filieresResult.data?.message || filieresResult.error);
  }

  // Test 2: Création de notification (CORRIGÉE)
  console.log('\n🔔 Test 2: Création de notification...');
  
  const notificationTest = {
    destinataire: {
      type: 'tous'
    },
    titre: 'Test Correction Finale',
    message: 'Test de création de notification avec le bon format'
  };

  const createNotifResult = await testRoute(`${API_BASE}/admin/notifications`, adminToken, 'POST', notificationTest);
  
  if (createNotifResult.success) {
    console.log('✅ Création de notification réussie');
    console.log('   ID:', createNotifResult.data.data?.id || 'Non spécifié');
  } else {
    console.log('❌ Création de notification échoue encore');
    console.log('   Erreur:', createNotifResult.data?.message || createNotifResult.error);
  }

  // Test 3: Filtres étudiants (CORRIGÉS)
  console.log('\n👥 Test 3: Filtres étudiants...');
  
  // Test récupération de base
  const etudiantsBase = await testRoute(`${API_BASE}/admin/etudiants`, adminToken);
  
  if (etudiantsBase.success) {
    const etudiants = etudiantsBase.data.data || [];
    console.log(`✅ Récupération étudiants de base: ${etudiants.length} étudiants`);
    
    // Test filtre par filière
    const filtreFiliere = await testRoute(`${API_BASE}/admin/etudiants?filiere=1`, adminToken);
    
    if (filtreFiliere.success) {
      const etudiantsFiltres = filtreFiliere.data.data || [];
      console.log(`✅ Filtre par filière: ${etudiantsFiltres.length} étudiants`);
    } else {
      console.log('❌ Filtre par filière échoue');
    }
    
    // Test recherche
    const rechercheTest = await testRoute(`${API_BASE}/admin/etudiants?recherche=test`, adminToken);
    
    if (rechercheTest.success) {
      const etudiantsRecherche = rechercheTest.data.data || [];
      console.log(`✅ Recherche étudiants: ${etudiantsRecherche.length} résultats`);
    } else {
      console.log('❌ Recherche étudiants échoue');
    }
    
    // Test filtre par statut
    const filtreStatut = await testRoute(`${API_BASE}/admin/etudiants?statut=en_cours`, adminToken);
    
    if (filtreStatut.success) {
      const etudiantsStatut = filtreStatut.data.data || [];
      console.log(`✅ Filtre par statut: ${etudiantsStatut.length} étudiants`);
    } else {
      console.log('❌ Filtre par statut échoue');
    }
    
  } else {
    console.log('❌ Récupération étudiants de base échoue');
  }

  // Test 4: Test complet avec tous les filtres
  console.log('\n🔍 Test 4: Test complet des filtres...');
  
  const filtresComplets = await testRoute(
    `${API_BASE}/admin/etudiants?page=1&limit=5&filiere=1&recherche=&statut=&entreprise_nom=&maitre_stage_nom=&maitre_memoire_nom=`, 
    adminToken
  );
  
  if (filtresComplets.success) {
    const resultats = filtresComplets.data.data || [];
    const pagination = filtresComplets.data.pagination || {};
    console.log(`✅ Filtres complets: ${resultats.length} étudiants`);
    console.log(`   Pagination: page ${pagination.page}/${pagination.totalPages}, total: ${pagination.total}`);
  } else {
    console.log('❌ Filtres complets échouent');
    console.log('   Erreur:', filtresComplets.data?.message || filtresComplets.error);
  }

  // Test 5: Vérification route de diagnostic
  console.log('\n🔍 Test 5: Route de diagnostic...');
  
  const diagnosticResult = await testRoute(`${API_BASE}/test-routes`);
  
  if (diagnosticResult.success) {
    console.log('✅ Route de diagnostic disponible');
    console.log('   Routes listées:', Object.keys(diagnosticResult.data.routes || {}).join(', '));
  } else {
    console.log('❌ Route de diagnostic non disponible');
  }

  console.log('\n🎯 === RÉSUMÉ DES CORRECTIONS ===');
  
  const corrections = [
    { nom: 'Route /api/filieres', status: filieresResult.success },
    { nom: 'Création notifications', status: createNotifResult.success },
    { nom: 'Récupération étudiants', status: etudiantsBase.success },
    { nom: 'Filtres étudiants', status: filtresComplets.success },
    { nom: 'Route diagnostic', status: diagnosticResult.success }
  ];

  const correctionsPassed = corrections.filter(c => c.status).length;
  const correctionsTotal = corrections.length;

  console.log(`✅ Corrections réussies: ${correctionsPassed}/${correctionsTotal}`);
  
  corrections.forEach(correction => {
    const icon = correction.status ? '✅' : '❌';
    console.log(`${icon} ${correction.nom}`);
  });

  const successRate = ((correctionsPassed / correctionsTotal) * 100).toFixed(1);
  console.log(`📊 Taux de réussite: ${successRate}%`);

  if (correctionsPassed === correctionsTotal) {
    console.log('\n🎉 TOUTES LES CORRECTIONS SONT OPÉRATIONNELLES !');
    console.log('✅ Le dashboard admin est parfaitement fonctionnel');
  } else if (correctionsPassed >= correctionsTotal * 0.8) {
    console.log('\n✅ LA MAJORITÉ DES CORRECTIONS FONCTIONNENT');
    console.log('⚠️  Quelques ajustements mineurs restent à faire');
  } else {
    console.log('\n❌ PLUSIEURS CORRECTIONS NÉCESSITENT ENCORE DU TRAVAIL');
  }

  console.log('\n🚀 Prêt pour les tests manuels sur le dashboard !');
  console.log(`🔗 ${VERCEL_URL}/admin`);
  console.log('🔑 ADMIN001 / admin123');
};

testCorrectionsFinales().catch(console.error);
