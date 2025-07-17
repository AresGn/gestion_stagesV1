// Script pour tester les routes sur Vercel
import fetch from 'node-fetch';

const VERCEL_URL = 'https://gestion-stages-v1.vercel.app'; // Remplacez par votre URL Vercel
const API_BASE = `${VERCEL_URL}/api`;

const testVercelRoutes = async () => {
  console.log('🧪 Test des routes sur Vercel...\n');
  console.log(`🌐 URL de base: ${API_BASE}\n`);

  // Test 1: Route de test de base
  console.log('🔍 Test 1: Route de test de base');
  try {
    const response = await fetch(`${API_BASE}/test`);
    const data = await response.json();
    console.log('   ✅ /api/test:', data.message);
  } catch (error) {
    console.log('   ❌ /api/test:', error.message);
  }

  // Test 2: Routes d'authentification
  console.log('\n🔐 Test 2: Routes d\'authentification');
  try {
    const response = await fetch(`${API_BASE}/auth`);
    const data = await response.json();
    console.log('   ✅ /api/auth:', data.message);
  } catch (error) {
    console.log('   ❌ /api/auth:', error.message);
  }

  // Test 3: Routes projets publics
  console.log('\n📚 Test 3: Routes projets publics');
  try {
    const response = await fetch(`${API_BASE}/projets-realises`);
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ /api/projets-realises: ${Array.isArray(data) ? data.length : 'Format inattendu'} projets`);
    } else {
      console.log(`   ❌ /api/projets-realises: ${response.status} - ${response.statusText}`);
    }
  } catch (error) {
    console.log('   ❌ /api/projets-realises:', error.message);
  }

  // Test 4: Routes propositions de stages
  console.log('\n🔍 Test 4: Routes propositions de stages');
  try {
    const response = await fetch(`${API_BASE}/propositions-stages`);
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ /api/propositions-stages: ${Array.isArray(data) ? data.length : 'Format inattendu'} propositions`);
    } else {
      console.log(`   ❌ /api/propositions-stages: ${response.status} - ${response.statusText}`);
    }
  } catch (error) {
    console.log('   ❌ /api/propositions-stages:', error.message);
  }

  // Test 5: Routes propositions de thèmes
  console.log('\n💡 Test 5: Routes propositions de thèmes');
  try {
    const response = await fetch(`${API_BASE}/propositions-themes`);
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ /api/propositions-themes: ${Array.isArray(data) ? data.length : 'Format inattendu'} thèmes`);
    } else {
      console.log(`   ❌ /api/propositions-themes: ${response.status} - ${response.statusText}`);
    }
  } catch (error) {
    console.log('   ❌ /api/propositions-themes:', error.message);
  }

  // Test 6: Routes notifications (nécessite authentification)
  console.log('\n🔔 Test 6: Routes notifications');
  try {
    const response = await fetch(`${API_BASE}/notifications`);
    console.log(`   ℹ️  /api/notifications: ${response.status} - ${response.statusText} (authentification requise)`);
  } catch (error) {
    console.log('   ❌ /api/notifications:', error.message);
  }

  // Test 7: Routes internships (nécessite authentification)
  console.log('\n📋 Test 7: Routes internships');
  try {
    const response = await fetch(`${API_BASE}/internships/user/1`);
    console.log(`   ℹ️  /api/internships/user/1: ${response.status} - ${response.statusText} (authentification requise)`);
  } catch (error) {
    console.log('   ❌ /api/internships/user/1:', error.message);
  }

  // Test 8: Routes admin (nécessite authentification admin)
  console.log('\n👨‍💼 Test 8: Routes admin');
  try {
    const response = await fetch(`${API_BASE}/admin/statistiques`);
    console.log(`   ℹ️  /api/admin/statistiques: ${response.status} - ${response.statusText} (authentification admin requise)`);
  } catch (error) {
    console.log('   ❌ /api/admin/statistiques:', error.message);
  }

  console.log('\n📋 === RÉSUMÉ ===');
  console.log('Les routes publiques devraient fonctionner (200 OK)');
  console.log('Les routes protégées devraient retourner 401 (Unauthorized)');
  console.log('Si vous voyez des erreurs 404, cela signifie que les routes ne sont pas configurées sur Vercel');
  
  console.log('\n🔧 Pour tester avec authentification:');
  console.log('1. Connectez-vous sur l\'interface web');
  console.log('2. Récupérez le token depuis localStorage');
  console.log('3. Utilisez le token dans les headers Authorization');
};

testVercelRoutes().catch(console.error);
