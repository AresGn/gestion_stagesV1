// Test spécifique pour l'admin login
import fetch from 'node-fetch';

const BASE_URL = 'https://gestion-stages-v1.vercel.app';

async function testAdminLogin() {
  try {
    console.log(`🧪 Test: Admin Login avec données de test`);
    console.log(`📡 URL: ${BASE_URL}/api/auth/admin/login`);
    
    const response = await fetch(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        matricule: 'admin123',
        password: 'adminpassword'
      })
    });
    
    const data = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Réponse:`, JSON.stringify(data, null, 2));
    
    if (response.status === 401) {
      console.log(`✅ Admin Login test - Comportement attendu (admin non trouvé)`);
    } else if (response.ok) {
      console.log(`✅ Admin Login test - Connexion réussie`);
    } else {
      console.log(`❌ Admin Login test - Erreur inattendue`);
    }
  } catch (error) {
    console.log(`💥 Admin Login test - Exception:`, error.message);
  }
}

testAdminLogin();
