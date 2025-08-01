// Test des routes nécessaires pour le dashboard
import fetch from 'node-fetch';

const BASE_URL = 'https://gestion-stages-v1.vercel.app';

// Fonction pour se connecter et récupérer le token
async function getStudentToken() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matricule: '64036STI45',
        password: 'W*W?4quQA7aBTXF'
      })
    });
    
    const data = await response.json();
    return response.ok ? data.token : null;
  } catch (error) {
    console.error('Erreur connexion étudiant:', error);
    return null;
  }
}

async function getAdminToken() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matricule: 'ADMIN001',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    return response.ok ? data.token : null;
  } catch (error) {
    console.error('Erreur connexion admin:', error);
    return null;
  }
}

async function testRoute(url, token, description) {
  try {
    console.log(`\n🧪 Test: ${description}`);
    console.log(`📡 URL: ${url}`);
    
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await fetch(url, { headers });
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${description} - OK (${response.status})`);
      console.log(`📄 Données:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
    } else {
      console.log(`❌ ${description} - Erreur (${response.status})`);
      console.log(`📄 Erreur:`, JSON.stringify(data, null, 2));
    }
    
    return response.ok;
  } catch (error) {
    console.log(`💥 ${description} - Exception:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Test des routes Dashboard - Gestion des Stages');
  console.log('=' * 60);
  
  // Récupération des tokens
  console.log('\n🔐 Récupération des tokens...');
  const studentToken = await getStudentToken();
  const adminToken = await getAdminToken();
  
  console.log(`🎓 Token étudiant: ${studentToken ? '✅ Obtenu' : '❌ Échec'}`);
  console.log(`👑 Token admin: ${adminToken ? '✅ Obtenu' : '❌ Échec'}`);
  
  if (!studentToken && !adminToken) {
    console.log('\n❌ Impossible de récupérer les tokens. Arrêt des tests.');
    return;
  }
  
  // Tests avec token étudiant
  if (studentToken) {
    console.log('\n📚 === TESTS ROUTES ÉTUDIANT ===');
    await testRoute(`${BASE_URL}/api/auth/me`, studentToken, 'Informations utilisateur (/me)');
    await testRoute(`${BASE_URL}/api/internships/offers`, studentToken, 'Offres de stage');
    await testRoute(`${BASE_URL}/api/internships/user/2`, studentToken, 'Stages de l\'étudiant');
  }
  
  // Tests avec token admin
  if (adminToken) {
    console.log('\n👑 === TESTS ROUTES ADMIN ===');
    await testRoute(`${BASE_URL}/api/auth/me`, adminToken, 'Informations admin (/me)');
    await testRoute(`${BASE_URL}/api/admin/statistiques`, adminToken, 'Statistiques générales');
    await testRoute(`${BASE_URL}/api/admin/statistiques/filiere`, adminToken, 'Statistiques par filière');
    await testRoute(`${BASE_URL}/api/admin/statistiques/entreprise`, adminToken, 'Statistiques par entreprise');
    await testRoute(`${BASE_URL}/api/admin/activites`, adminToken, 'Activités récentes');
    await testRoute(`${BASE_URL}/api/admin/parametres/filiere`, adminToken, 'Paramètres par filière');
    await testRoute(`${BASE_URL}/api/admin/etudiants`, adminToken, 'Liste des étudiants');
    await testRoute(`${BASE_URL}/api/admin/propositions`, adminToken, 'Propositions de stage');
    await testRoute(`${BASE_URL}/api/admin/propositions-themes`, adminToken, 'Propositions de thèmes');
    await testRoute(`${BASE_URL}/api/admin/notifications`, adminToken, 'Notifications admin');
  }
  
  console.log('\n🎉 Tests terminés !');
  console.log('\n💡 Si toutes les routes fonctionnent, les erreurs dashboard devraient être résolues.');
}

main().catch(console.error);
