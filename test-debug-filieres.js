/**
 * Test de diagnostic pour la route /api/filieres
 * Identifie pourquoi elle retourne une erreur 500
 */

let VERCEL_URL = process.argv[2] || 'https://gestion-stages-v1.vercel.app';
VERCEL_URL = VERCEL_URL.replace(/\/+$/, '');
const API_BASE = `${VERCEL_URL}/api`;

console.log(`🔍 Diagnostic route /api/filieres: ${VERCEL_URL}`);

const testRoute = async (url, token = null, method = 'GET', body = null) => {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body && method !== 'GET') options.body = JSON.stringify(body);

    console.log(`🔍 Testing: ${method} ${url}`);
    const response = await fetch(url, options);
    
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      const text = await response.text();
      console.log('❌ Erreur parsing JSON, réponse brute:', text.substring(0, 500));
      return { success: false, status: response.status, error: 'Invalid JSON response', rawResponse: text };
    }
    
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const debugFilieres = async () => {
  console.log('\n🔐 Authentification admin...');
  
  const loginResult = await testRoute(`${API_BASE}/auth/admin/login`, null, 'POST', {
    matricule: 'ADMIN001',
    password: 'admin123'
  });

  let adminToken = null;
  if (loginResult.success) {
    adminToken = loginResult.data.token;
    console.log('✅ Authentification réussie');
  } else {
    console.log('❌ Authentification échouée');
    return;
  }

  console.log('\n🎓 === DIAGNOSTIC ROUTE /api/filieres ===');

  // Test 1: Route directe /api/filieres
  console.log('\n1. Test route directe /api/filieres...');
  const directResult = await testRoute(`${API_BASE}/filieres`);
  
  console.log('Status:', directResult.status);
  console.log('Success:', directResult.success);
  
  if (!directResult.success) {
    console.log('❌ Erreur détaillée:');
    console.log('   Message:', directResult.data?.message || 'Aucun message');
    console.log('   Error:', directResult.data?.error || directResult.error);
    
    if (directResult.rawResponse) {
      console.log('   Réponse brute:', directResult.rawResponse.substring(0, 200));
    }
  } else {
    console.log('✅ Route fonctionne, données:', directResult.data?.length || 0, 'filières');
  }

  // Test 2: Route alternative via admin
  console.log('\n2. Test route admin /api/admin/parametres/filiere...');
  const adminResult = await testRoute(`${API_BASE}/admin/parametres/filiere`, adminToken);
  
  console.log('Status:', adminResult.status);
  console.log('Success:', adminResult.success);
  
  if (adminResult.success) {
    const filieres = adminResult.data?.data || [];
    console.log('✅ Route admin fonctionne:', filieres.length, 'filières');
    
    if (filieres.length > 0) {
      console.log('   Exemple de filière:');
      const filiere = filieres[0];
      console.log('   -', filiere.filiere_nom, '(ID:', filiere.filiere_id + ')');
    }
  } else {
    console.log('❌ Route admin échoue aussi');
  }

  // Test 3: Test de la base de données directement
  console.log('\n3. Test requête SQL via une autre route...');
  const statsResult = await testRoute(`${API_BASE}/admin/statistiques`, adminToken);
  
  if (statsResult.success) {
    const stats = statsResult.data?.data || {};
    const etudiantsParFiliere = stats.etudiantsParFiliere || [];
    
    console.log('✅ Base de données accessible via statistiques');
    console.log('   Filières trouvées dans les stats:', etudiantsParFiliere.length);
    
    if (etudiantsParFiliere.length > 0) {
      console.log('   Filières disponibles:');
      etudiantsParFiliere.forEach(stat => {
        console.log(`   - ${stat.filiere} (${stat.count} étudiants)`);
      });
    }
  } else {
    console.log('❌ Problème général avec la base de données');
  }

  // Test 4: Test des autres routes publiques
  console.log('\n4. Test route /api/entreprises (pour comparaison)...');
  const entreprisesResult = await testRoute(`${API_BASE}/entreprises`);
  
  if (entreprisesResult.success) {
    console.log('✅ Route entreprises fonctionne:', entreprisesResult.data?.length || 0, 'entreprises');
  } else {
    console.log('❌ Route entreprises échoue aussi');
    console.log('   Erreur:', entreprisesResult.data?.message || entreprisesResult.error);
  }

  // Test 5: Test route de diagnostic
  console.log('\n5. Test route de diagnostic...');
  const diagnosticResult = await testRoute(`${API_BASE}/test-routes`);
  
  if (diagnosticResult.success) {
    console.log('✅ Route de diagnostic fonctionne');
    console.log('   Routes listées:', Object.keys(diagnosticResult.data?.routes || {}));
  } else {
    console.log('❌ Route de diagnostic échoue');
  }

  console.log('\n🔍 === ANALYSE DES RÉSULTATS ===');
  
  const tests = [
    { nom: 'Route /api/filieres', success: directResult.success },
    { nom: 'Route admin filières', success: adminResult.success },
    { nom: 'Base de données (stats)', success: statsResult.success },
    { nom: 'Route /api/entreprises', success: entreprisesResult.success },
    { nom: 'Route diagnostic', success: diagnosticResult.success }
  ];

  tests.forEach(test => {
    const icon = test.success ? '✅' : '❌';
    console.log(`${icon} ${test.nom}`);
  });

  console.log('\n💡 RECOMMANDATIONS:');
  
  if (!directResult.success && adminResult.success) {
    console.log('1. 🔧 La route admin fonctionne, problème avec la route publique');
    console.log('2. 🔍 Vérifier l\'ordre des routes dans api/server.js');
    console.log('3. 🔄 Utiliser la route admin comme fallback');
  }
  
  if (!directResult.success && !entreprisesResult.success) {
    console.log('1. 🚨 Problème général avec les routes publiques');
    console.log('2. 🔍 Vérifier la configuration du routeur projetsPublicsRouter');
  }
  
  if (directResult.success) {
    console.log('1. ✅ La route fonctionne maintenant !');
    console.log('2. 🎉 Problème résolu');
  }

  console.log('\n🎯 SOLUTION PROPOSÉE:');
  if (!directResult.success && adminResult.success) {
    console.log('Utiliser la route admin comme source de données pour les filières');
    console.log('Modifier le frontend pour utiliser /api/admin/parametres/filiere');
  }
};

debugFilieres().catch(console.error);
