// Script de test pour l'API Vercel
import fetch from 'node-fetch';

const BASE_URL = 'https://gestion-stages-v1.vercel.app';

async function testAPI(endpoint, description) {
  try {
    console.log(`\n🧪 Test: ${description}`);
    console.log(`📡 URL: ${BASE_URL}${endpoint}`);
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${description} - OK (${response.status})`);
      console.log(`📄 Réponse:`, JSON.stringify(data, null, 2));
    } else {
      console.log(`❌ ${description} - Erreur (${response.status})`);
      console.log(`📄 Réponse:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`💥 ${description} - Exception:`, error.message);
  }
}

async function testLogin() {
  try {
    console.log(`\n🧪 Test: Login avec données de test`);
    console.log(`📡 URL: ${BASE_URL}/api/auth/login`);
    
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        matricule: 'test123',
        password: 'testpassword'
      })
    });
    
    const data = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Réponse:`, JSON.stringify(data, null, 2));
    
    if (response.status === 401) {
      console.log(`✅ Login test - Comportement attendu (utilisateur non trouvé)`);
    } else if (response.ok) {
      console.log(`✅ Login test - Connexion réussie`);
    } else {
      console.log(`❌ Login test - Erreur inattendue`);
    }
  } catch (error) {
    console.log(`💥 Login test - Exception:`, error.message);
  }
}

async function main() {
  console.log('🚀 Test de l\'API Vercel - Gestion des Stages');
  console.log('=' * 50);
  
  // Test de base
  await testAPI('/api/test', 'Route de test');
  
  // Test des routes d'authentification
  await testAPI('/api/auth', 'Route d\'authentification (base)');
  await testLogin();
  
  // Test des autres routes
  await testAPI('/api/admin', 'Route d\'administration');
  await testAPI('/api/internships', 'Route des stages');
  await testAPI('/api/notifications', 'Route des notifications');
  
  console.log('\n🎉 Tests terminés !');
}

main().catch(console.error);
