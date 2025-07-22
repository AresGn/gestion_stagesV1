#!/usr/bin/env node

/**
 * Script de test pour vérifier les corrections sur Vercel
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

// Test de la route POST notifications avec authentification
async function testNotificationRoute(token) {
  log('\n📬 Test de la route POST /api/notifications...', 'blue');

  try {
    const response = await fetch(`${VERCEL_URL}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        destinataire: { type: 'tous' },
        titre: 'Test notification depuis script',
        message: 'Ceci est un test pour vérifier que la route POST fonctionne'
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      log('✅ Route POST notifications fonctionne !', 'green');
      log(`Message: ${data.message}`, 'cyan');
      return true;
    } else if (response.status === 404) {
      log('❌ Route POST notifications non trouvée (erreur 404)', 'red');
      return false;
    } else {
      log('❌ Erreur avec la route POST notifications', 'red');
      log(`Status: ${response.status}`, 'red');
      log(`Erreur: ${data.message || 'Erreur inconnue'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Erreur lors du test notifications: ${error.message}`, 'red');
    return false;
  }
}

// Test des statistiques avec authentification
async function testStatisticsRoute(token) {
  log('\n📊 Test de la route GET /api/admin/statistiques...', 'blue');

  try {
    const response = await fetch(`${VERCEL_URL}/admin/statistiques`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok && data.success) {
      log('✅ Route statistiques fonctionne', 'green');
      log(`Total étudiants: ${data.data.totalEtudiants}`, 'cyan');
      log(`Total stages: ${data.data.totalStages}`, 'cyan');
      log(`Total entreprises: ${data.data.totalEntreprises}`, 'cyan');
      log(`Total offres: ${data.data.totalOffres}`, 'cyan');

      // Vérifier qu'il n'y a pas de NaN
      const values = [
        data.data.totalEtudiants,
        data.data.totalStages,
        data.data.totalEntreprises,
        data.data.totalOffres
      ];

      const hasNaN = values.some(value => isNaN(value));

      if (hasNaN) {
        log('⚠️ Attention: Des valeurs NaN détectées dans les statistiques', 'yellow');
        log(`Valeurs: ${JSON.stringify(values)}`, 'yellow');
        return false;
      } else {
        log('✅ Aucune valeur NaN détectée', 'green');
        return true;
      }
    } else {
      log('❌ Erreur avec la route statistiques', 'red');
      log(`Status: ${response.status}`, 'red');
      log(`Erreur: ${data.message || 'Erreur inconnue'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Erreur lors du test statistiques: ${error.message}`, 'red');
    return false;
  }
}

// Test des données étudiants avec authentification
async function testStudentsRoute(token) {
  log('\n👥 Test de la route GET /api/admin/etudiants...', 'blue');

  try {
    const response = await fetch(`${VERCEL_URL}/admin/etudiants?page=1&limit=3`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok && data.success) {
      log('✅ Route étudiants fonctionne', 'green');
      log(`Nombre d'étudiants récupérés: ${data.data.etudiants.length}`, 'cyan');

      if (data.data.etudiants.length > 0) {
        const student = data.data.etudiants[0];
        log('\n📋 Données du premier étudiant:', 'yellow');
        log(`- Nom: ${student.nom} ${student.prenom}`, 'cyan');
        log(`- Matricule: ${student.matricule}`, 'cyan');
        log(`- Filière: ${student.filiere_nom || 'N/A'}`, 'cyan');
        log(`- Entreprise: ${student.entreprise_nom || 'N/A'}`, 'cyan');
        log(`- Statut stage: ${student.statut || 'N/A'}`, 'cyan');
        log(`- Maître de stage: ${student.maitre_stage_nom ? `${student.maitre_stage_nom} ${student.maitre_stage_prenom || ''}` : 'N/A'}`, 'cyan');

        // Vérifier que les données complètes sont présentes
        const hasCompleteData = student.entreprise_nom || student.maitre_stage_nom || student.statut;
        if (hasCompleteData) {
          log('✅ Données complètes récupérées', 'green');
          return true;
        } else {
          log('⚠️ Données incomplètes - vérifiez les jointures SQL', 'yellow');
          return false;
        }
      } else {
        log('⚠️ Aucun étudiant trouvé', 'yellow');
        return false;
      }
    } else {
      log('❌ Erreur avec la route étudiants', 'red');
      log(`Status: ${response.status}`, 'red');
      log(`Erreur: ${data.message || 'Erreur inconnue'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Erreur lors du test étudiants: ${error.message}`, 'red');
    return false;
  }
}

// Fonction principale
async function main() {
  log('🚀 Test des corrections sur Vercel avec authentification', 'magenta');
  log(`URL de base: ${VERCEL_URL}`, 'yellow');

  // Test d'authentification
  const token = await testAdminAuth();

  if (!token) {
    log('\n❌ Impossible de continuer sans token d\'authentification', 'red');
    log('💡 Vérifiez que les identifiants ADMIN001/admin123 sont corrects', 'yellow');
    process.exit(1);
  }

  // Tests des corrections avec authentification
  const results = {
    notifications: await testNotificationRoute(token),
    statistics: await testStatisticsRoute(token),
    students: await testStudentsRoute(token)
  };

  // Résumé
  log('\n📋 RÉSUMÉ DES TESTS:', 'magenta');
  log(`📬 Notifications POST: ${results.notifications ? '✅ FONCTIONNE' : '❌ ÉCHEC'}`, results.notifications ? 'green' : 'red');
  log(`📊 Statistiques (graphiques): ${results.statistics ? '✅ FONCTIONNE' : '❌ ÉCHEC'}`, results.statistics ? 'green' : 'red');
  log(`👥 Données étudiants: ${results.students ? '✅ FONCTIONNE' : '❌ ÉCHEC'}`, results.students ? 'green' : 'red');

  const allPassed = Object.values(results).every(result => result);

  if (allPassed) {
    log('\n🎉 Tous les tests sont passés ! Les corrections fonctionnent sur Vercel.', 'green');
    log('\n✅ PROBLÈMES RÉSOLUS:', 'blue');
    log('- Route POST notifications disponible', 'cyan');
    log('- Graphiques sans valeurs NaN', 'cyan');
    log('- Données étudiants complètes', 'cyan');
  } else {
    log('\n⚠️ Certains tests ont échoué. Les corrections doivent être déployées.', 'yellow');
    log('\n📝 ÉTAPES SUIVANTES:', 'blue');
    log('1. Commitez et pushez les changements:', 'cyan');
    log('   git add .', 'cyan');
    log('   git commit -m "Fix: Route POST notifications + corrections graphiques NaN"', 'cyan');
    log('   git push', 'cyan');
    log('2. Attendez le déploiement automatique Vercel', 'cyan');
    log('3. Relancez ce test pour vérifier', 'cyan');
  }
}

// Exécution
main().catch(error => {
  log(`❌ Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
