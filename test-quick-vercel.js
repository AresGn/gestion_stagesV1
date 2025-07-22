/**
 * Test rapide des fonctionnalités principales sur Vercel
 * Usage: node test-quick-vercel.js [URL_VERCEL]
 */

const VERCEL_URL = process.argv[2] || 'https://votre-app.vercel.app';
const API_BASE = `${VERCEL_URL}/api`;

console.log(`🚀 Test rapide Vercel: ${VERCEL_URL}`);

const testQuick = async () => {
  try {
    // Test 1: Authentification admin
    console.log('\n🔐 Test authentification admin...');
    const loginResponse = await fetch(`${API_BASE}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matricule: 'ADMIN001',
        password: 'admin123'
      })
    });

    const loginData = await loginResponse.json();
    
    if (!loginData.success || !loginData.token) {
      console.log('❌ Authentification échouée:', loginData.message);
      return;
    }
    
    console.log('✅ Authentification réussie');
    const token = loginData.token;

    // Test 2: Création proposition de stage
    console.log('\n📝 Test création proposition de stage...');
    const createResponse = await fetch(`${API_BASE}/admin/propositions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        titre: 'Stage Test Vercel Quick',
        description: 'Test rapide de création',
        requirements: 'Aucun',
        entreprise_nom: 'Test Corp',
        location: 'Dakar',
        duration: '2 mois',
        filiere_id: 1,
        statut: 'active'
      })
    });

    const createData = await createResponse.json();
    
    if (createData.success) {
      console.log('✅ Proposition créée, ID:', createData.data?.id);
    } else {
      console.log('❌ Échec création:', createData.message);
    }

    // Test 3: Récupération étudiants
    console.log('\n👥 Test récupération étudiants...');
    const etudiantsResponse = await fetch(`${API_BASE}/admin/etudiants`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const etudiantsData = await etudiantsResponse.json();
    
    if (etudiantsData.success) {
      const etudiants = etudiantsData.data || [];
      console.log(`✅ ${etudiants.length} étudiants récupérés`);
    } else {
      console.log('❌ Échec récupération étudiants:', etudiantsData.message);
    }

    // Test 4: Route filières
    console.log('\n🎓 Test route filières...');
    const filieresResponse = await fetch(`${API_BASE}/filieres`);
    
    if (filieresResponse.ok) {
      const filieres = await filieresResponse.json();
      console.log(`✅ ${filieres.length} filières récupérées`);
    } else {
      console.log('❌ Route filières non trouvée');
    }

    // Test 5: Route entreprises
    console.log('\n🏢 Test route entreprises...');
    const entreprisesResponse = await fetch(`${API_BASE}/entreprises`);
    
    if (entreprisesResponse.ok) {
      const entreprises = await entreprisesResponse.json();
      console.log(`✅ ${entreprises.length} entreprises récupérées`);
    } else {
      console.log('❌ Route entreprises non trouvée');
    }

    console.log('\n🎉 Tests rapides terminés !');
    console.log(`\n🌐 Accédez au dashboard: ${VERCEL_URL}/admin`);
    console.log('🔑 Identifiants: ADMIN001 / admin123');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('\n💡 Vérifiez que l\'URL Vercel est correcte');
    console.log('Usage: node test-quick-vercel.js https://votre-app.vercel.app');
  }
};

testQuick();
