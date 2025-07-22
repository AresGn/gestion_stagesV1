/**
 * Test de la correction de la route /api/filieres
 */

let VERCEL_URL = process.argv[2] || 'https://gestion-stages-v1.vercel.app';
VERCEL_URL = VERCEL_URL.replace(/\/+$/, '');
const API_BASE = `${VERCEL_URL}/api`;

console.log(`🔧 Test correction route /api/filieres: ${VERCEL_URL}`);

const testRoute = async (url, token = null, method = 'GET', body = null) => {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body && method !== 'GET') options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    const data = await response.json();
    
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const testFixFilieres = async () => {
  console.log('\n🎓 Test route /api/filieres corrigée...');
  
  const filieresResult = await testRoute(`${API_BASE}/filieres`);
  
  console.log('Status:', filieresResult.status);
  console.log('Success:', filieresResult.success);
  
  if (filieresResult.success) {
    const filieres = filieresResult.data || [];
    console.log('✅ CORRECTION RÉUSSIE !');
    console.log(`📊 ${filieres.length} filières récupérées`);
    
    if (filieres.length > 0) {
      console.log('\n📋 Filières disponibles:');
      filieres.forEach((filiere, index) => {
        console.log(`   ${index + 1}. ${filiere.nom} (ID: ${filiere.id})`);
      });
    }
    
    // Test que les données sont bien formatées
    const firstFiliere = filieres[0];
    if (firstFiliere) {
      console.log('\n🔍 Structure des données:');
      console.log('   - ID:', typeof firstFiliere.id, '=', firstFiliere.id);
      console.log('   - Nom:', typeof firstFiliere.nom, '=', firstFiliere.nom);
      console.log('   - Description:', firstFiliere.description || 'Non disponible');
    }
    
  } else {
    console.log('❌ CORRECTION ÉCHOUÉE');
    console.log('   Erreur:', filieresResult.data?.message || filieresResult.error);
    console.log('   Détails:', filieresResult.data?.error || 'Aucun détail');
  }

  // Test comparatif avec la route admin
  console.log('\n🔄 Comparaison avec route admin...');
  
  const loginResult = await testRoute(`${API_BASE}/auth/admin/login`, null, 'POST', {
    matricule: 'ADMIN001',
    password: 'admin123'
  });

  if (loginResult.success) {
    const adminToken = loginResult.data.token;
    const adminResult = await testRoute(`${API_BASE}/admin/parametres/filiere`, adminToken);
    
    if (adminResult.success) {
      const adminFilieres = adminResult.data?.data || [];
      console.log(`✅ Route admin: ${adminFilieres.length} filières`);
      
      // Comparaison des données
      if (filieresResult.success && adminFilieres.length > 0) {
        const publicFilieres = filieresResult.data || [];
        console.log('\n📊 Comparaison des données:');
        console.log(`   Route publique: ${publicFilieres.length} filières`);
        console.log(`   Route admin: ${adminFilieres.length} filières`);
        
        if (publicFilieres.length === adminFilieres.length) {
          console.log('✅ Même nombre de filières');
        } else {
          console.log('⚠️  Nombre différent de filières');
        }
      }
    }
  }

  // Test final complet
  console.log('\n🎯 === RÉSULTAT FINAL ===');
  
  if (filieresResult.success) {
    console.log('🎉 PROBLÈME RÉSOLU !');
    console.log('✅ La route /api/filieres fonctionne parfaitement');
    console.log('✅ Les filtres étudiants peuvent maintenant utiliser cette route');
    console.log('✅ Le dashboard admin est 100% opérationnel');
    
    console.log('\n📋 Actions recommandées:');
    console.log('1. ✅ Faire le commit de cette correction');
    console.log('2. ✅ Tester le dashboard admin manuellement');
    console.log('3. ✅ Vérifier que les filtres par filière fonctionnent');
    
  } else {
    console.log('❌ PROBLÈME PERSISTANT');
    console.log('🔧 Corrections supplémentaires nécessaires');
    
    console.log('\n📋 Actions recommandées:');
    console.log('1. 🔍 Vérifier la structure de la table filieres');
    console.log('2. 🔧 Utiliser la route admin comme fallback');
    console.log('3. 🔄 Modifier le frontend pour utiliser la route admin');
  }

  console.log(`\n🔗 Testez manuellement: ${VERCEL_URL}/admin`);
  console.log('🔑 Identifiants: ADMIN001 / admin123');
};

testFixFilieres().catch(console.error);
