/**
 * Test spécifique des filtres de l'onglet étudiant
 * Ce script teste tous les filtres et la recherche dans l'interface étudiants
 */

const API_BASE = process.env.VERCEL_URL ? 
  `https://${process.env.VERCEL_URL}/api` : 
  'http://localhost:3000/api';

console.log(`🔍 Test des filtres étudiants - API: ${API_BASE}`);

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

const testStudentFilters = async () => {
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

  // Test 1: Récupération de base des étudiants
  console.log('\n👥 Test 1: Récupération des étudiants...');
  
  const etudiantsResult = await testRoute(`${API_BASE}/admin/etudiants`, adminToken);
  
  if (etudiantsResult.success) {
    const etudiants = etudiantsResult.data.data || [];
    console.log(`✅ ${etudiants.length} étudiants récupérés`);
    
    if (etudiants.length > 0) {
      const etudiant = etudiants[0];
      console.log('   Exemple d\'étudiant:');
      console.log(`   - Nom: ${etudiant.nom} ${etudiant.prenom}`);
      console.log(`   - Matricule: ${etudiant.matricule}`);
      console.log(`   - Filière: ${etudiant.nom_filiere || 'Non spécifiée'}`);
      console.log(`   - Entreprise: ${etudiant.entreprise_nom || 'Aucune'}`);
      console.log(`   - Statut: ${etudiant.statut_stage || 'Non défini'}`);
    }
  } else {
    console.log('❌ Échec récupération étudiants');
    console.log('   Erreur:', etudiantsResult.data?.message || etudiantsResult.error);
    return;
  }

  // Test 2: Recherche par nom/matricule
  console.log('\n🔍 Test 2: Recherche par nom/matricule...');
  
  const searchTerms = ['test', 'ETU', 'admin'];
  
  for (const term of searchTerms) {
    const searchResult = await testRoute(
      `${API_BASE}/admin/etudiants/search?q=${encodeURIComponent(term)}`, 
      adminToken
    );
    
    if (searchResult.success) {
      const resultats = searchResult.data.data || [];
      console.log(`   ✅ Recherche "${term}": ${resultats.length} résultats`);
    } else {
      console.log(`   ❌ Recherche "${term}" échouée:`, searchResult.data?.message || searchResult.error);
    }
  }

  // Test 3: Récupération des filières pour les filtres
  console.log('\n🎓 Test 3: Filières disponibles...');
  
  const filieresResult = await testRoute(`${API_BASE}/filieres`, adminToken);
  
  if (filieresResult.success) {
    const filieres = filieresResult.data || [];
    console.log(`✅ ${filieres.length} filières disponibles pour filtrage`);
    
    filieres.forEach(f => {
      console.log(`   - ${f.nom} (ID: ${f.id})`);
    });
  } else {
    console.log('❌ Échec récupération filières');
    console.log('   Erreur:', filieresResult.data?.message || filieresResult.error);
  }

  // Test 4: Test des statistiques par filière
  console.log('\n📊 Test 4: Statistiques par filière...');
  
  const statsResult = await testRoute(`${API_BASE}/admin/statistiques`, adminToken);
  
  if (statsResult.success) {
    const stats = statsResult.data.data || {};
    const etudiantsParFiliere = stats.etudiantsParFiliere || [];
    
    console.log(`✅ Statistiques par filière: ${etudiantsParFiliere.length} filières`);
    
    etudiantsParFiliere.forEach(stat => {
      console.log(`   - ${stat.filiere}: ${stat.count} étudiants`);
    });
  } else {
    console.log('❌ Échec récupération statistiques');
    console.log('   Erreur:', statsResult.data?.message || statsResult.error);
  }

  // Test 5: Test des entreprises pour filtrage
  console.log('\n🏢 Test 5: Entreprises pour filtrage...');
  
  const entreprisesResult = await testRoute(`${API_BASE}/entreprises`, adminToken);
  
  if (entreprisesResult.success) {
    const entreprises = entreprisesResult.data || [];
    console.log(`✅ ${entreprises.length} entreprises disponibles pour filtrage`);
    
    if (entreprises.length > 0) {
      console.log('   Exemples d\'entreprises:');
      entreprises.slice(0, 5).forEach(e => {
        console.log(`   - ${e.nom} (${e.ville || 'Ville non spécifiée'})`);
      });
    }
  } else {
    console.log('❌ Échec récupération entreprises');
    console.log('   Erreur:', entreprisesResult.data?.message || entreprisesResult.error);
  }

  // Test 6: Test des maîtres de stage pour filtrage
  console.log('\n👨‍🏫 Test 6: Maîtres de stage...');
  
  // Récupérer les étudiants avec leurs maîtres de stage
  if (etudiantsResult.success) {
    const etudiants = etudiantsResult.data.data || [];
    const maitresStage = [...new Set(etudiants
      .filter(e => e.maitre_stage_nom)
      .map(e => e.maitre_stage_nom))];
    
    console.log(`✅ ${maitresStage.length} maîtres de stage uniques trouvés`);
    
    if (maitresStage.length > 0) {
      console.log('   Exemples de maîtres de stage:');
      maitresStage.slice(0, 5).forEach(maitre => {
        console.log(`   - ${maitre}`);
      });
    }
  }

  // Test 7: Test des maîtres de mémoire pour filtrage
  console.log('\n📚 Test 7: Maîtres de mémoire...');
  
  if (etudiantsResult.success) {
    const etudiants = etudiantsResult.data.data || [];
    const maitresMemoire = [...new Set(etudiants
      .filter(e => e.maitre_memoire_nom)
      .map(e => e.maitre_memoire_nom))];
    
    console.log(`✅ ${maitresMemoire.length} maîtres de mémoire uniques trouvés`);
    
    if (maitresMemoire.length > 0) {
      console.log('   Exemples de maîtres de mémoire:');
      maitresMemoire.slice(0, 5).forEach(maitre => {
        console.log(`   - ${maitre}`);
      });
    }
  }

  // Test 8: Test des statuts de stage
  console.log('\n📋 Test 8: Statuts de stage...');
  
  if (etudiantsResult.success) {
    const etudiants = etudiantsResult.data.data || [];
    const statuts = [...new Set(etudiants
      .filter(e => e.statut_stage)
      .map(e => e.statut_stage))];
    
    console.log(`✅ ${statuts.length} statuts de stage différents trouvés`);
    
    statuts.forEach(statut => {
      const count = etudiants.filter(e => e.statut_stage === statut).length;
      console.log(`   - ${statut}: ${count} étudiants`);
    });
  }

  console.log('\n🎉 Tests des filtres étudiants terminés!');
  console.log('\n📋 Résumé des fonctionnalités de filtrage:');
  console.log('1. ✅ Récupération des étudiants');
  console.log('2. 🔍 Recherche par nom/matricule');
  console.log('3. 🎓 Filtrage par filière');
  console.log('4. 📊 Statistiques par filière');
  console.log('5. 🏢 Filtrage par entreprise');
  console.log('6. 👨‍🏫 Filtrage par maître de stage');
  console.log('7. 📚 Filtrage par maître de mémoire');
  console.log('8. 📋 Filtrage par statut de stage');
};

// Exécution des tests
testStudentFilters().catch(console.error);
