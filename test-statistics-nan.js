#!/usr/bin/env node

/**
 * Script de test pour diagnostiquer les valeurs NaN dans les statistiques
 */

import fetch from 'node-fetch';

const VERCEL_URL = 'https://gestion-stages-v1.vercel.app/api';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test d'authentification admin
async function testAdminAuth() {
  log('\n🔐 Test d\'authentification admin...', 'blue');
  
  try {
    const response = await fetch(`${VERCEL_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        matricule: 'ADMIN001',
        password: 'admin123'
      })
    });

    const data = await response.json();
    
    if (data.success && data.token) {
      log('✅ Authentification admin réussie', 'green');
      return data.token;
    } else {
      log('❌ Échec de l\'authentification admin', 'red');
      log(`Erreur: ${data.message}`, 'red');
      return null;
    }
  } catch (error) {
    log(`❌ Erreur lors de l'authentification: ${error.message}`, 'red');
    return null;
  }
}

// Test des statistiques générales
async function testStatistiquesGenerales(token) {
  log('\n📊 Test de la route GET /api/admin/statistiques...', 'blue');
  
  try {
    const response = await fetch(`${VERCEL_URL}/admin/statistiques`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      log('✅ Route statistiques générales fonctionne', 'green');
      
      // Analyser les données reçues
      log('\n📋 DONNÉES REÇUES:', 'yellow');
      log(`Total étudiants: ${data.data.totalEtudiants} (type: ${typeof data.data.totalEtudiants})`, 'cyan');
      log(`Total stages: ${data.data.totalStages} (type: ${typeof data.data.totalStages})`, 'cyan');
      log(`Total entreprises: ${data.data.totalEntreprises} (type: ${typeof data.data.totalEntreprises})`, 'cyan');
      log(`Total offres: ${data.data.totalOffres} (type: ${typeof data.data.totalOffres})`, 'cyan');
      
      if (data.data.etudiantsParFiliere) {
        log(`\nÉtudiants par filière (${data.data.etudiantsParFiliere.length} filières):`, 'cyan');
        data.data.etudiantsParFiliere.forEach((item, index) => {
          log(`  ${index + 1}. ${item.filiere}: ${item.count} (type: ${typeof item.count})`, 'cyan');
        });
      } else {
        log('⚠️ Pas de données etudiantsParFiliere', 'yellow');
      }
      
      // Vérifier les valeurs NaN
      const values = [
        data.data.totalEtudiants,
        data.data.totalStages,
        data.data.totalEntreprises,
        data.data.totalOffres
      ];
      
      const hasNaN = values.some(value => isNaN(value) || value === null || value === undefined);
      
      if (hasNaN) {
        log('\n❌ VALEURS NaN DÉTECTÉES !', 'red');
        log(`Valeurs problématiques: ${JSON.stringify(values)}`, 'red');
        return false;
      } else {
        log('\n✅ Aucune valeur NaN dans les statistiques générales', 'green');
        return true;
      }
    } else {
      log('❌ Erreur avec la route statistiques générales', 'red');
      log(`Status: ${response.status}`, 'red');
      log(`Erreur: ${data.message || 'Erreur inconnue'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Erreur lors du test statistiques générales: ${error.message}`, 'red');
    return false;
  }
}

// Test des statistiques par entreprise
async function testStatistiquesEntreprise(token) {
  log('\n🏢 Test de la route GET /api/admin/statistiques/entreprise...', 'blue');
  
  try {
    const response = await fetch(`${VERCEL_URL}/admin/statistiques/entreprise`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      log('✅ Route statistiques entreprise fonctionne', 'green');
      
      if (data.data && data.data.length > 0) {
        log(`\nStatistiques par entreprise (${data.data.length} entreprises):`, 'cyan');
        data.data.forEach((item, index) => {
          log(`  ${index + 1}. ${item.entreprise}: ${item.nb_stages} stages (type: ${typeof item.nb_stages})`, 'cyan');
        });
        
        // Vérifier les valeurs NaN
        const hasNaN = data.data.some(item => isNaN(item.nb_stages) || item.nb_stages === null || item.nb_stages === undefined);
        
        if (hasNaN) {
          log('\n❌ VALEURS NaN DÉTECTÉES dans les stats entreprise !', 'red');
          return false;
        } else {
          log('\n✅ Aucune valeur NaN dans les statistiques entreprise', 'green');
          return true;
        }
      } else {
        log('⚠️ Aucune donnée d\'entreprise trouvée', 'yellow');
        return true; // Pas d'erreur, juste pas de données
      }
    } else {
      log('❌ Erreur avec la route statistiques entreprise', 'red');
      log(`Status: ${response.status}`, 'red');
      log(`Erreur: ${data.message || 'Erreur inconnue'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Erreur lors du test statistiques entreprise: ${error.message}`, 'red');
    return false;
  }
}

// Test des paramètres par filière
async function testParametresFiliere(token) {
  log('\n📚 Test de la route GET /api/admin/parametres/filiere...', 'blue');
  
  try {
    const response = await fetch(`${VERCEL_URL}/admin/parametres/filiere`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      log('✅ Route paramètres filière fonctionne', 'green');
      
      if (data.data && data.data.length > 0) {
        log(`\nParamètres par filière (${data.data.length} filières):`, 'cyan');
        data.data.forEach((item, index) => {
          log(`  ${index + 1}. ${item.filiere_nom}: ${item.nb_etudiants} étudiants, ${item.nb_stages_trouves || 0} stages`, 'cyan');
        });
        return true;
      } else {
        log('⚠️ Aucune donnée de paramètres filière trouvée', 'yellow');
        return true;
      }
    } else {
      log('❌ Erreur avec la route paramètres filière', 'red');
      log(`Status: ${response.status}`, 'red');
      log(`Erreur: ${data.message || 'Erreur inconnue'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Erreur lors du test paramètres filière: ${error.message}`, 'red');
    return false;
  }
}

// Fonction principale
async function main() {
  log('🚀 Diagnostic des valeurs NaN dans les statistiques', 'magenta');
  log(`URL de base: ${VERCEL_URL}`, 'yellow');
  
  // Test d'authentification
  const token = await testAdminAuth();
  
  if (!token) {
    log('\n❌ Impossible de continuer sans token d\'authentification', 'red');
    log('💡 Utilisez vos vrais identifiants admin pour tester manuellement', 'yellow');
    return;
  }
  
  // Tests des différentes routes de statistiques
  const results = {
    statistiquesGenerales: await testStatistiquesGenerales(token),
    statistiquesEntreprise: await testStatistiquesEntreprise(token),
    parametresFiliere: await testParametresFiliere(token)
  };
  
  // Résumé final
  log('\n📋 RÉSUMÉ DU DIAGNOSTIC:', 'magenta');
  log(`📊 Statistiques générales: ${results.statistiquesGenerales ? '✅ OK' : '❌ PROBLÈME'}`, results.statistiquesGenerales ? 'green' : 'red');
  log(`🏢 Statistiques entreprise: ${results.statistiquesEntreprise ? '✅ OK' : '❌ PROBLÈME'}`, results.statistiquesEntreprise ? 'green' : 'red');
  log(`📚 Paramètres filière: ${results.parametresFiliere ? '✅ OK' : '❌ PROBLÈME'}`, results.parametresFiliere ? 'green' : 'red');
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    log('\n🎉 AUCUN PROBLÈME NaN DÉTECTÉ !', 'green');
    log('Les corrections ont fonctionné. Si vous voyez encore des NaN:', 'cyan');
    log('1. Videz le cache de votre navigateur', 'cyan');
    log('2. Rechargez la page admin', 'cyan');
    log('3. Vérifiez la console du navigateur pour d\'autres erreurs', 'cyan');
  } else {
    log('\n⚠️ Des problèmes persistent avec les statistiques.', 'yellow');
    log('📝 Les corrections doivent être déployées.', 'yellow');
  }
}

main().catch(error => {
  log(`❌ Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
