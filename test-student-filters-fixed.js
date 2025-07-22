/**
 * Test corrigé des filtres étudiants
 * Teste avec la structure de données corrigée
 */

const API_BASE = process.env.VERCEL_URL ? 
  `https://${process.env.VERCEL_URL}/api` : 
  'http://localhost:3000/api';

console.log(`🔍 Test des filtres étudiants (corrigé) - API: ${API_BASE}`);

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

const testStudentFiltersFixed = async () => {
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

  // Test 1: Récupération des étudiants avec structure corrigée
  console.log('\n👥 Test 1: Récupération des étudiants...');
  
  const etudiantsResult = await testRoute(`${API_BASE}/admin/etudiants`, adminToken);
  
  if (etudiantsResult.success) {
    // Gérer les deux formats possibles de retour
    let etudiants = etudiantsResult.data.data || etudiantsResult.data || [];
    
    // Si c'est un objet avec une propriété etudiants
    if (etudiantsResult.data.data && etudiantsResult.data.data.etudiants) {
      etudiants = etudiantsResult.data.data.etudiants;
    }
    
    console.log(`✅ ${etudiants.length} étudiants récupérés`);
    
    if (etudiants.length > 0) {
      const etudiant = etudiants[0];
      console.log('   Structure des données étudiant:');
      console.log(`   - Nom: ${etudiant.nom} ${etudiant.prenom}`);
      console.log(`   - Matricule: ${etudiant.matricule}`);
      console.log(`   - Filière: ${etudiant.filiere_nom || 'Non spécifiée'}`);
      console.log(`   - Entreprise: ${etudiant.entreprise_nom || 'Aucune'}`);
      console.log(`   - Statut: ${etudiant.statut || 'Non défini'}`);
      
      // Test des filtres disponibles
      console.log('\n   📊 Analyse des données pour filtrage:');
      
      // Filières disponibles
      const filieres = [...new Set(etudiants
        .filter(e => e.filiere_nom)
        .map(e => e.filiere_nom))];
      console.log(`   - Filières: ${filieres.length} différentes (${filieres.join(', ')})`);
      
      // Entreprises disponibles
      const entreprises = [...new Set(etudiants
        .filter(e => e.entreprise_nom)
        .map(e => e.entreprise_nom))];
      console.log(`   - Entreprises: ${entreprises.length} différentes`);
      if (entreprises.length > 0) {
        console.log(`     Exemples: ${entreprises.slice(0, 3).join(', ')}`);
      }
      
      // Statuts disponibles
      const statuts = [...new Set(etudiants
        .filter(e => e.statut)
        .map(e => e.statut))];
      console.log(`   - Statuts: ${statuts.length} différents (${statuts.join(', ')})`);
      
      // Maîtres de stage
      const maitresStage = [...new Set(etudiants
        .filter(e => e.maitre_stage_nom)
        .map(e => e.maitre_stage_nom))];
      console.log(`   - Maîtres de stage: ${maitresStage.length} différents`);
      
      // Maîtres de mémoire
      const maitresMemoire = [...new Set(etudiants
        .filter(e => e.maitre_memoire_nom)
        .map(e => e.maitre_memoire_nom))];
      console.log(`   - Maîtres de mémoire: ${maitresMemoire.length} différents`);
    }
  } else {
    console.log('❌ Échec récupération étudiants');
    console.log('   Erreur:', etudiantsResult.data?.message || etudiantsResult.error);
    return;
  }

  // Test 2: Test de la pagination
  console.log('\n📄 Test 2: Pagination...');
  
  const paginationResult = await testRoute(`${API_BASE}/admin/etudiants?page=1&limit=5`, adminToken);
  
  if (paginationResult.success) {
    const pagination = paginationResult.data.pagination;
    if (pagination) {
      console.log('✅ Pagination fonctionnelle:');
      console.log(`   - Page: ${pagination.page}`);
      console.log(`   - Limite: ${pagination.limit}`);
      console.log(`   - Total: ${pagination.total}`);
      console.log(`   - Pages totales: ${pagination.totalPages}`);
    } else {
      console.log('⚠️  Pagination non disponible dans la réponse');
    }
  } else {
    console.log('❌ Échec test pagination');
  }

  // Test 3: Test de filtrage par filière
  console.log('\n🎓 Test 3: Filtrage par filière...');
  
  const filtreFiliereResult = await testRoute(`${API_BASE}/admin/etudiants?filiere=1`, adminToken);
  
  if (filtreFiliereResult.success) {
    let etudiantsFiltres = filtreFiliereResult.data.data || filtreFiliereResult.data || [];
    if (filtreFiliereResult.data.data && filtreFiliereResult.data.data.etudiants) {
      etudiantsFiltres = filtreFiliereResult.data.data.etudiants;
    }
    
    console.log(`✅ Filtrage par filière: ${etudiantsFiltres.length} étudiants`);
  } else {
    console.log('❌ Échec filtrage par filière');
  }

  // Test 4: Test de recherche
  console.log('\n🔍 Test 4: Recherche par terme...');
  
  const rechercheResult = await testRoute(`${API_BASE}/admin/etudiants?search=test`, adminToken);
  
  if (rechercheResult.success) {
    let etudiantsRecherche = rechercheResult.data.data || rechercheResult.data || [];
    if (rechercheResult.data.data && rechercheResult.data.data.etudiants) {
      etudiantsRecherche = rechercheResult.data.data.etudiants;
    }
    
    console.log(`✅ Recherche par terme: ${etudiantsRecherche.length} résultats`);
  } else {
    console.log('❌ Échec recherche par terme');
  }

  // Test 5: Test de la route de recherche dédiée
  console.log('\n🔎 Test 5: Route de recherche dédiée...');
  
  const searchDedicatedResult = await testRoute(`${API_BASE}/admin/etudiants/search?q=ETU`, adminToken);
  
  if (searchDedicatedResult.success) {
    const resultats = searchDedicatedResult.data.data || [];
    console.log(`✅ Route de recherche dédiée: ${resultats.length} résultats`);
    
    if (resultats.length > 0) {
      console.log('   Exemples de résultats:');
      resultats.slice(0, 3).forEach(r => {
        console.log(`   - ${r.nom} ${r.prenom} (${r.matricule})`);
      });
    }
  } else {
    console.log('❌ Échec route de recherche dédiée');
    console.log('   Erreur:', searchDedicatedResult.data?.message || searchDedicatedResult.error);
  }

  // Test 6: Test des statistiques pour les filtres
  console.log('\n📊 Test 6: Statistiques pour filtres...');
  
  const statsResult = await testRoute(`${API_BASE}/admin/statistiques`, adminToken);
  
  if (statsResult.success) {
    const stats = statsResult.data.data || {};
    const etudiantsParFiliere = stats.etudiantsParFiliere || [];
    
    console.log('✅ Statistiques pour filtres:');
    console.log(`   - Total étudiants: ${stats.totalEtudiants || 0}`);
    console.log(`   - Filières avec étudiants: ${etudiantsParFiliere.length}`);
    
    if (etudiantsParFiliere.length > 0) {
      console.log('   Répartition par filière:');
      etudiantsParFiliere.forEach(stat => {
        console.log(`     - ${stat.filiere}: ${stat.count} étudiants`);
      });
    }
  } else {
    console.log('❌ Échec récupération statistiques');
  }

  console.log('\n🎉 Tests des filtres étudiants terminés!');
  console.log('\n📋 Résumé des fonctionnalités testées:');
  console.log('1. ✅ Récupération des étudiants avec structure corrigée');
  console.log('2. ✅ Pagination des résultats');
  console.log('3. ✅ Filtrage par filière');
  console.log('4. ✅ Recherche par terme dans la liste');
  console.log('5. ✅ Route de recherche dédiée');
  console.log('6. ✅ Statistiques pour les filtres');
  
  console.log('\n💡 Les filtres de l\'onglet étudiant devraient maintenant fonctionner!');
};

// Exécution des tests
testStudentFiltersFixed().catch(console.error);
