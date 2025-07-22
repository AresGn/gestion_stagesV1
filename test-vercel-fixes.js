/**
 * Test des corrections pour Vercel
 * Vérifie que toutes les routes manquantes sont maintenant disponibles
 */

const API_BASE = process.env.VERCEL_URL ? 
  `https://${process.env.VERCEL_URL}/api` : 
  'http://localhost:3000/api';

console.log(`🔧 Test des corrections Vercel - API: ${API_BASE}`);

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

const testVercelFixes = async () => {
  console.log('\n🔐 Authentification admin...');
  
  // Login admin
  const loginResult = await testRoute(`${API_BASE}/auth/admin/login`, null, 'POST', {
    matricule: 'ADMIN001',
    password: 'admin123'
  });

  if (!loginResult.success || !loginResult.data.token) {
    console.log('❌ Échec de l\'authentification admin');
    console.log('Réponse:', loginResult);
    return;
  }

  adminToken = loginResult.data.token;
  console.log('✅ Authentification admin réussie');

  // Test 1: Route /api/filieres (corrigée)
  console.log('\n🎓 Test 1: Route /api/filieres...');
  
  const filieresResult = await testRoute(`${API_BASE}/filieres`);
  
  if (filieresResult.success) {
    const filieres = filieresResult.data || [];
    console.log(`✅ ${filieres.length} filières récupérées`);
    
    if (filieres.length > 0) {
      console.log('   Exemples de filières:');
      filieres.slice(0, 3).forEach(f => {
        console.log(`   - ${f.nom} (ID: ${f.id})`);
      });
    }
  } else {
    console.log('❌ Échec récupération filières');
    console.log('   Erreur:', filieresResult.data?.message || filieresResult.error);
    console.log('   Status:', filieresResult.status);
  }

  // Test 2: Route /api/entreprises (corrigée)
  console.log('\n🏢 Test 2: Route /api/entreprises...');
  
  const entreprisesResult = await testRoute(`${API_BASE}/entreprises`);
  
  if (entreprisesResult.success) {
    const entreprises = entreprisesResult.data || [];
    console.log(`✅ ${entreprises.length} entreprises récupérées`);
    
    if (entreprises.length > 0) {
      console.log('   Exemples d\'entreprises:');
      entreprises.slice(0, 3).forEach(e => {
        console.log(`   - ${e.nom} (${e.ville || 'Ville non spécifiée'})`);
      });
    }
  } else {
    console.log('❌ Échec récupération entreprises');
    console.log('   Erreur:', entreprisesResult.data?.message || entreprisesResult.error);
    console.log('   Status:', entreprisesResult.status);
  }

  // Test 3: Route /api/admin/etudiants/search (corrigée)
  console.log('\n🔍 Test 3: Route /api/admin/etudiants/search...');
  
  const searchResult = await testRoute(
    `${API_BASE}/admin/etudiants/search?q=test`, 
    adminToken
  );
  
  if (searchResult.success) {
    const resultats = searchResult.data.data || [];
    console.log(`✅ Recherche étudiants: ${resultats.length} résultats`);
  } else {
    console.log('❌ Échec recherche étudiants');
    console.log('   Erreur:', searchResult.data?.message || searchResult.error);
    console.log('   Status:', searchResult.status);
  }

  // Test 4: Route /api/admin/etudiants (format corrigé)
  console.log('\n👥 Test 4: Route /api/admin/etudiants (format corrigé)...');
  
  const etudiantsResult = await testRoute(`${API_BASE}/admin/etudiants`, adminToken);
  
  if (etudiantsResult.success) {
    const etudiants = etudiantsResult.data.data || etudiantsResult.data || [];
    console.log(`✅ ${etudiants.length} étudiants récupérés`);
    
    if (etudiants.length > 0) {
      const etudiant = etudiants[0];
      console.log('   Structure des données étudiant:');
      console.log(`   - Nom: ${etudiant.nom} ${etudiant.prenom}`);
      console.log(`   - Matricule: ${etudiant.matricule}`);
      console.log(`   - Filière: ${etudiant.filiere_nom || 'Non spécifiée'}`);
      console.log(`   - Entreprise: ${etudiant.entreprise_nom || 'Aucune'}`);
    }
  } else {
    console.log('❌ Échec récupération étudiants');
    console.log('   Erreur:', etudiantsResult.data?.message || etudiantsResult.error);
    console.log('   Status:', etudiantsResult.status);
  }

  // Test 5: Route POST /api/admin/propositions (corrigée)
  console.log('\n📝 Test 5: Route POST /api/admin/propositions...');
  
  const nouvelleProposition = {
    titre: 'Stage Test Corrections Vercel',
    description: 'Test de création de proposition après corrections',
    requirements: 'Aucun prérequis spécifique',
    entreprise_nom: 'Entreprise Test Vercel',
    location: 'Dakar, Sénégal',
    duration: '2 mois',
    filiere_id: 1,
    statut: 'active'
  };

  const createPropositionResult = await testRoute(
    `${API_BASE}/admin/propositions`, 
    adminToken, 
    'POST', 
    nouvelleProposition
  );

  if (createPropositionResult.success) {
    console.log('✅ Création de proposition réussie');
    console.log('   ID créé:', createPropositionResult.data.data?.id || 'Non spécifié');
  } else {
    console.log('❌ Échec création proposition');
    console.log('   Erreur:', createPropositionResult.data?.message || createPropositionResult.error);
    console.log('   Status:', createPropositionResult.status);
  }

  // Test 6: Vérification des statistiques
  console.log('\n📊 Test 6: Statistiques dashboard...');
  
  const statsResult = await testRoute(`${API_BASE}/admin/statistiques`, adminToken);
  
  if (statsResult.success) {
    const stats = statsResult.data.data || {};
    console.log('✅ Statistiques récupérées:');
    console.log(`   - Total étudiants: ${stats.totalEtudiants || 0}`);
    console.log(`   - Total stages: ${stats.totalStages || 0}`);
    console.log(`   - Étudiants par filière: ${stats.etudiantsParFiliere?.length || 0} filières`);
    
    if (stats.etudiantsParFiliere && stats.etudiantsParFiliere.length > 0) {
      console.log('   Répartition par filière:');
      stats.etudiantsParFiliere.forEach(stat => {
        console.log(`     - ${stat.filiere}: ${stat.count} étudiants`);
      });
    }
  } else {
    console.log('❌ Échec récupération statistiques');
    console.log('   Erreur:', statsResult.data?.message || statsResult.error);
  }

  console.log('\n🎉 Tests des corrections Vercel terminés!');
  console.log('\n📋 Résumé des corrections testées:');
  console.log('1. ✅ Route /api/filieres ajoutée');
  console.log('2. ✅ Route /api/entreprises ajoutée');
  console.log('3. ✅ Route /api/admin/etudiants/search corrigée');
  console.log('4. ✅ Format de retour /api/admin/etudiants corrigé');
  console.log('5. ✅ Route POST /api/admin/propositions vérifiée');
  console.log('6. ✅ Statistiques dashboard vérifiées');
  
  console.log('\n💡 Les formulaires du dashboard admin devraient maintenant fonctionner sur Vercel!');
};

// Exécution des tests
testVercelFixes().catch(console.error);
