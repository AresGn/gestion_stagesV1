// Script pour tester les endpoints API corrigés
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api';

// Token admin pour les tests (vous devrez vous connecter d'abord)
let adminToken = null;

const testEndpoints = async () => {
  console.log('🧪 Test des endpoints API corrigés...\n');

  try {
    // Test 1: Login admin pour obtenir un token
    console.log('🔐 Test 1: Login admin...');
    try {
      const loginResponse = await fetch(`${API_BASE}/auth/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          matricule: 'ADMIN001',
          password: 'admin123'
        })
      });

      const loginData = await loginResponse.json();
      
      if (loginData.success && loginData.token) {
        adminToken = loginData.token;
        console.log('   ✅ Login admin réussi');
      } else {
        console.log('   ❌ Login admin échoué:', loginData.message);
        return;
      }
    } catch (error) {
      console.log('   ❌ Erreur login:', error.message);
      return;
    }

    // Test 2: Statistiques générales avec etudiantsParFiliere
    console.log('\n📊 Test 2: /api/admin/statistiques...');
    try {
      const response = await fetch(`${API_BASE}/admin/statistiques`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('   ✅ Statistiques récupérées:');
        console.log(`      - Total étudiants: ${data.data.totalEtudiants}`);
        console.log(`      - Total stages: ${data.data.totalStages}`);
        console.log(`      - Total entreprises: ${data.data.totalEntreprises}`);
        console.log(`      - Total offres: ${data.data.totalOffres}`);
        
        if (data.data.etudiantsParFiliere) {
          console.log(`      - Étudiants par filière: ${data.data.etudiantsParFiliere.length} filières`);
          data.data.etudiantsParFiliere.forEach(f => {
            console.log(`        * ${f.filiere}: ${f.count} étudiants`);
          });
        } else {
          console.log('   ⚠️  etudiantsParFiliere manquant');
        }
      } else {
        console.log('   ❌ Erreur:', data.message);
      }
    } catch (error) {
      console.log('   ❌ Erreur:', error.message);
    }

    // Test 3: Projets réalisés
    console.log('\n🚀 Test 3: /api/admin/projets-realises...');
    try {
      const response = await fetch(`${API_BASE}/admin/projets-realises`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        console.log(`   ✅ ${data.data.length} projets récupérés:`);
        data.data.slice(0, 3).forEach(p => {
          console.log(`      - "${p.titre}" par ${p.auteur} (${p.nom_filiere || 'Pas de filière'})`);
        });
      } else {
        console.log('   ❌ Erreur:', data.message);
      }
    } catch (error) {
      console.log('   ❌ Erreur:', error.message);
    }

    // Test 4: Activités récentes
    console.log('\n📈 Test 4: /api/admin/activites...');
    try {
      const response = await fetch(`${API_BASE}/admin/activites`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        console.log(`   ✅ ${data.data.length} activités récupérées:`);
        data.data.slice(0, 3).forEach(a => {
          console.log(`      - ${a.type_activite}: ${a.description.substring(0, 60)}...`);
        });
      } else {
        console.log('   ❌ Erreur:', data.message);
      }
    } catch (error) {
      console.log('   ❌ Erreur:', error.message);
    }

    // Test 5: Propositions de thèmes
    console.log('\n💡 Test 5: /api/admin/propositions-themes...');
    try {
      const response = await fetch(`${API_BASE}/admin/propositions-themes`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      const data = await response.json();
      
      if (Array.isArray(data)) {
        console.log(`   ✅ ${data.length} propositions de thèmes récupérées:`);
        data.slice(0, 3).forEach(p => {
          console.log(`      - "${p.titre}" par ${p.auteur_nom || 'Auteur inconnu'}`);
        });
      } else {
        console.log('   ❌ Format de réponse inattendu:', data);
      }
    } catch (error) {
      console.log('   ❌ Erreur:', error.message);
    }

    // Test 6: Statistiques par entreprise
    console.log('\n🏢 Test 6: /api/admin/statistiques/entreprise...');
    try {
      const response = await fetch(`${API_BASE}/admin/statistiques/entreprise`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        console.log(`   ✅ ${data.data.length} statistiques d'entreprises récupérées:`);
        data.data.slice(0, 3).forEach(e => {
          console.log(`      - ${e.nom}: ${e.nombre_stages} stages`);
        });
      } else {
        console.log('   ❌ Erreur:', data.message);
      }
    } catch (error) {
      console.log('   ❌ Erreur:', error.message);
    }

    console.log('\n✅ Tests des endpoints terminés!');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
};

testEndpoints().catch(console.error);
