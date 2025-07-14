// Test avec les vrais identifiants
import fetch from 'node-fetch';

const BASE_URL = 'https://gestion-stages-v1.vercel.app';

async function testStudentLogin() {
  try {
    console.log(`\n🎓 Test: Connexion Étudiant`);
    console.log(`📡 URL: ${BASE_URL}/api/auth/login`);
    console.log(`👤 Matricule: 64036STI45`);
    
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        matricule: '64036STI45',
        password: 'W*W?4quQA7aBTXF'
      })
    });
    
    const data = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Réponse:`, JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log(`✅ Connexion étudiant RÉUSSIE !`);
      return data.token;
    } else {
      console.log(`❌ Connexion étudiant ÉCHOUÉE`);
      return null;
    }
  } catch (error) {
    console.log(`💥 Erreur connexion étudiant:`, error.message);
    return null;
  }
}

async function testAdminLogin() {
  try {
    console.log(`\n👑 Test: Connexion Admin`);
    console.log(`📡 URL: ${BASE_URL}/api/auth/admin/login`);
    console.log(`👤 Matricule: ADMIN001`);
    
    const response = await fetch(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        matricule: 'ADMIN001',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Réponse:`, JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log(`✅ Connexion admin RÉUSSIE !`);
      return data.token;
    } else {
      console.log(`❌ Connexion admin ÉCHOUÉE`);
      return null;
    }
  } catch (error) {
    console.log(`💥 Erreur connexion admin:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Test des connexions avec vrais identifiants');
  console.log('=' * 60);
  
  // Test connexion étudiant
  const studentToken = await testStudentLogin();
  
  // Test connexion admin
  const adminToken = await testAdminLogin();
  
  console.log('\n📋 RÉSUMÉ:');
  console.log(`🎓 Étudiant (64036STI45): ${studentToken ? '✅ CONNECTÉ' : '❌ ÉCHEC'}`);
  console.log(`👑 Admin (ADMIN001): ${adminToken ? '✅ CONNECTÉ' : '❌ ÉCHEC'}`);
  
  if (studentToken || adminToken) {
    console.log('\n🎉 Au moins une connexion fonctionne !');
  } else {
    console.log('\n⚠️ Aucune connexion n\'a fonctionné - vérifiez les identifiants en base');
  }
}

main().catch(console.error);
