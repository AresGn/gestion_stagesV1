#!/usr/bin/env node

/**
 * Script de test pour vérifier les corrections du dashboard
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'https://gestion-stages-v1.vercel.app/api';

// Couleurs pour les logs
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

// Fonction pour tester l'authentification admin
async function testAdminAuth() {
  log('\n🔐 Test d\'authentification admin...', 'blue');
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        matricule: 'ADMIN001', // Remplacez par votre matricule admin
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

// Test de la route POST pour les notifications
async function testNotificationRoute(token) {
  log('\n📬 Test de la route POST /api/notifications...', 'blue');
  
  try {
    const response = await fetch(`${API_BASE_URL}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        destinataire: { type: 'tous' },
        titre: 'Test notification',
        message: 'Ceci est un test de notification depuis le script de test'
      })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      log('✅ Route POST notifications fonctionne', 'green');
      log(`Message: ${data.message}`, 'cyan');
    } else {
      log('❌ Erreur avec la route POST notifications', 'red');
      log(`Erreur: ${data.message}`, 'red');
    }
  } catch (error) {
    log(`❌ Erreur lors du test notifications: ${error.message}`, 'red');
  }
}

// Test de la route GET pour les étudiants avec données complètes
async function testStudentsRoute(token) {
  log('\n👥 Test de la route GET /api/admin/etudiants...', 'blue');
  
  try {
    const response = await fetch(`${API_BASE_URL}/admin/etudiants?page=1&limit=5`, {
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
        log('\n📊 Données du premier étudiant:', 'yellow');
        log(`- Nom: ${student.nom} ${student.prenom}`, 'cyan');
        log(`- Matricule: ${student.matricule}`, 'cyan');
        log(`- Filière: ${student.filiere_nom || 'N/A'}`, 'cyan');
        log(`- Entreprise: ${student.entreprise_nom || 'N/A'}`, 'cyan');
        log(`- Statut stage: ${student.statut || 'N/A'}`, 'cyan');
        log(`- Maître de stage: ${student.maitre_stage_nom ? `${student.maitre_stage_nom} ${student.maitre_stage_prenom}` : 'N/A'}`, 'cyan');
      }
    } else {
      log('❌ Erreur avec la route étudiants', 'red');
      log(`Erreur: ${data.message}`, 'red');
    }
  } catch (error) {
    log(`❌ Erreur lors du test étudiants: ${error.message}`, 'red');
  }
}

// Test de la route GET pour les notifications admin
async function testAdminNotificationsRoute(token) {
  log('\n📋 Test de la route GET /api/notifications/admin...', 'blue');
  
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/admin`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      log('✅ Route notifications admin fonctionne', 'green');
      log(`Nombre de notifications: ${data.data.length}`, 'cyan');
    } else {
      log('❌ Erreur avec la route notifications admin', 'red');
      log(`Erreur: ${data.message}`, 'red');
    }
  } catch (error) {
    log(`❌ Erreur lors du test notifications admin: ${error.message}`, 'red');
  }
}

// Fonction principale
async function main() {
  log('🚀 Début des tests des corrections du dashboard', 'magenta');
  log(`URL de base: ${API_BASE_URL}`, 'yellow');
  
  // Test d'authentification
  const token = await testAdminAuth();
  
  if (!token) {
    log('\n❌ Impossible de continuer sans token d\'authentification', 'red');
    process.exit(1);
  }
  
  // Tests des routes
  await testNotificationRoute(token);
  await testStudentsRoute(token);
  await testAdminNotificationsRoute(token);
  
  log('\n🎉 Tests terminés!', 'magenta');
}

// Exécution
main().catch(error => {
  log(`❌ Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
