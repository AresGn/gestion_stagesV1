/**
 * Test complet des formulaires du dashboard admin
 * Ce script teste tous les formulaires et leurs soumissions
 */

const API_BASE = process.env.VERCEL_URL ? 
  `https://${process.env.VERCEL_URL}/api` : 
  'http://localhost:3000/api';

console.log(`🧪 Test des formulaires dashboard admin - API: ${API_BASE}`);

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

const testDashboardForms = async () => {
  console.log('\n🔐 Étape 1: Authentification admin...');
  
  // Test de login admin
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

  // Test 1: Formulaire d'ajout de proposition de stage
  console.log('\n📝 Test 1: Formulaire d\'ajout de proposition de stage...');
  
  const nouvelleProposition = {
    titre: 'Stage Test Développement Web',
    description: 'Stage de développement d\'applications web modernes avec React et Node.js',
    requirements: 'Connaissances en JavaScript, React, Node.js',
    entreprise_nom: 'TechCorp Solutions',
    entreprise_id: null,
    location: 'Dakar, Sénégal',
    duration: '3 mois',
    filiere_id: 1,
    statut: 'active'
  };

  const propositionResult = await testRoute(
    `${API_BASE}/admin/propositions`, 
    adminToken, 
    'POST', 
    nouvelleProposition
  );

  if (propositionResult.success) {
    console.log('✅ Ajout de proposition de stage réussi');
    console.log('   ID créé:', propositionResult.data.data?.id || 'Non spécifié');
  } else {
    console.log('❌ Échec ajout proposition de stage');
    console.log('   Erreur:', propositionResult.data?.message || propositionResult.error);
    console.log('   Status:', propositionResult.status);
  }

  // Test 2: Récupération des propositions pour vérifier
  console.log('\n📋 Test 2: Récupération des propositions...');
  
  const getPropositionsResult = await testRoute(`${API_BASE}/admin/propositions`, adminToken);
  
  if (getPropositionsResult.success) {
    const propositions = getPropositionsResult.data.data?.propositions || [];
    console.log(`✅ ${propositions.length} propositions récupérées`);
    
    if (propositions.length > 0) {
      console.log('   Dernière proposition:');
      const derniere = propositions[0];
      console.log(`   - Titre: ${derniere.titre}`);
      console.log(`   - Entreprise: ${derniere.entreprise_nom}`);
      console.log(`   - Statut: ${derniere.statut}`);
    }
  } else {
    console.log('❌ Échec récupération propositions');
    console.log('   Erreur:', getPropositionsResult.data?.message || getPropositionsResult.error);
  }

  // Test 3: Test des filtres étudiants
  console.log('\n👥 Test 3: Filtres étudiants...');
  
  // Test récupération des étudiants
  const etudiantsResult = await testRoute(`${API_BASE}/admin/etudiants`, adminToken);
  
  if (etudiantsResult.success) {
    const etudiants = etudiantsResult.data.data || [];
    console.log(`✅ ${etudiants.length} étudiants récupérés`);
    
    // Test recherche d'étudiants
    const searchResult = await testRoute(
      `${API_BASE}/admin/etudiants/search?q=test`, 
      adminToken
    );
    
    if (searchResult.success) {
      console.log('✅ Fonction de recherche étudiants opérationnelle');
    } else {
      console.log('❌ Problème avec la recherche étudiants');
      console.log('   Erreur:', searchResult.data?.message || searchResult.error);
    }
  } else {
    console.log('❌ Échec récupération étudiants');
    console.log('   Erreur:', etudiantsResult.data?.message || etudiantsResult.error);
  }

  // Test 4: Test des filières pour les filtres
  console.log('\n🎓 Test 4: Récupération des filières...');
  
  const filieresResult = await testRoute(`${API_BASE}/filieres`, adminToken);
  
  if (filieresResult.success) {
    const filieres = filieresResult.data || [];
    console.log(`✅ ${filieres.length} filières récupérées`);
    
    if (filieres.length > 0) {
      console.log('   Filières disponibles:');
      filieres.slice(0, 3).forEach(f => {
        console.log(`   - ${f.nom} (ID: ${f.id})`);
      });
    }
  } else {
    console.log('❌ Échec récupération filières');
    console.log('   Erreur:', filieresResult.data?.message || filieresResult.error);
  }

  // Test 5: Test des statistiques du dashboard
  console.log('\n📊 Test 5: Statistiques dashboard...');
  
  const statsResult = await testRoute(`${API_BASE}/admin/statistiques`, adminToken);
  
  if (statsResult.success) {
    const stats = statsResult.data.data || {};
    console.log('✅ Statistiques récupérées:');
    console.log(`   - Total étudiants: ${stats.totalEtudiants || 0}`);
    console.log(`   - Total stages: ${stats.totalStages || 0}`);
    console.log(`   - Étudiants par filière: ${stats.etudiantsParFiliere?.length || 0} filières`);
  } else {
    console.log('❌ Échec récupération statistiques');
    console.log('   Erreur:', statsResult.data?.message || statsResult.error);
  }

  // Test 6: Test des notifications
  console.log('\n🔔 Test 6: Notifications admin...');
  
  const notificationsResult = await testRoute(`${API_BASE}/admin/notifications`, adminToken);
  
  if (notificationsResult.success) {
    const notifications = notificationsResult.data.data || [];
    console.log(`✅ ${notifications.length} notifications récupérées`);
  } else {
    console.log('❌ Échec récupération notifications');
    console.log('   Erreur:', notificationsResult.data?.message || notificationsResult.error);
  }

  console.log('\n🎉 Tests des formulaires terminés!');
  console.log('\n📋 Résumé des tests:');
  console.log('1. ✅ Authentification admin');
  console.log('2. 📝 Formulaire ajout proposition de stage');
  console.log('3. 📋 Récupération des propositions');
  console.log('4. 👥 Filtres et recherche étudiants');
  console.log('5. 🎓 Récupération des filières');
  console.log('6. 📊 Statistiques dashboard');
  console.log('7. 🔔 Notifications admin');
};

// Exécution des tests
testDashboardForms().catch(console.error);
