#!/usr/bin/env node

/**
 * Script de diagnostic pour l'erreur de connexion JSON
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

// Test de la route de connexion avec les identifiants de l'erreur
async function testLoginWithErrorCredentials() {
  log('\n🔐 Test de connexion avec les identifiants de l\'erreur...', 'blue');
  
  const credentials = {
    matricule: "64036STI45",
    password: "W*W?4quQA7aBTXF"
  };
  
  log(`Matricule: ${credentials.matricule}`, 'cyan');
  log(`Password: ${credentials.password}`, 'cyan');
  
  try {
    const response = await fetch(`${VERCEL_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });

    log(`\nStatus de la réponse: ${response.status}`, 'cyan');
    log(`Content-Type: ${response.headers.get('content-type')}`, 'cyan');
    
    // Lire la réponse comme texte d'abord pour voir ce qui est retourné
    const responseText = await response.text();
    
    log('\n📄 RÉPONSE BRUTE DU SERVEUR:', 'yellow');
    log('=' .repeat(60), 'cyan');
    log(responseText.substring(0, 500), 'cyan');
    if (responseText.length > 500) {
      log('... (tronqué)', 'yellow');
    }
    log('=' .repeat(60), 'cyan');
    
    // Essayer de parser en JSON
    try {
      const data = JSON.parse(responseText);
      log('\n✅ Réponse JSON valide:', 'green');
      log(JSON.stringify(data, null, 2), 'cyan');
      return { success: true, data };
    } catch (jsonError) {
      log('\n❌ ERREUR JSON PARSE:', 'red');
      log(`Erreur: ${jsonError.message}`, 'red');
      log('La réponse n\'est pas du JSON valide !', 'red');
      
      // Analyser le type de réponse
      if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html>')) {
        log('🔍 Type de réponse: Page HTML (probablement une erreur 500)', 'yellow');
      } else if (responseText.includes('Error:') || responseText.includes('error')) {
        log('🔍 Type de réponse: Message d\'erreur en texte brut', 'yellow');
      } else {
        log('🔍 Type de réponse: Inconnu', 'yellow');
      }
      
      return { success: false, error: jsonError.message, responseText };
    }
    
  } catch (error) {
    log(`❌ Erreur lors de la requête: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

// Test de la route de connexion avec des identifiants simples
async function testLoginWithSimpleCredentials() {
  log('\n🔐 Test de connexion avec identifiants simples...', 'blue');
  
  const credentials = {
    matricule: "TEST",
    password: "test"
  };
  
  try {
    const response = await fetch(`${VERCEL_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });

    log(`Status: ${response.status}`, 'cyan');
    log(`Content-Type: ${response.headers.get('content-type')}`, 'cyan');
    
    const responseText = await response.text();
    
    try {
      const data = JSON.parse(responseText);
      log('✅ Réponse JSON valide (même si échec de connexion):', 'green');
      log(JSON.stringify(data, null, 2), 'cyan');
      return true;
    } catch (jsonError) {
      log('❌ Erreur JSON parse même avec identifiants simples:', 'red');
      log(responseText.substring(0, 200), 'red');
      return false;
    }
    
  } catch (error) {
    log(`❌ Erreur lors de la requête: ${error.message}`, 'red');
    return false;
  }
}

// Test de la route de base pour vérifier que l'API fonctionne
async function testApiBase() {
  log('\n🧪 Test de la route de base /api/test...', 'blue');
  
  try {
    const response = await fetch(`${VERCEL_URL}/test`);
    
    log(`Status: ${response.status}`, 'cyan');
    log(`Content-Type: ${response.headers.get('content-type')}`, 'cyan');
    
    const responseText = await response.text();
    
    try {
      const data = JSON.parse(responseText);
      log('✅ Route de base fonctionne correctement:', 'green');
      log(JSON.stringify(data, null, 2), 'cyan');
      return true;
    } catch (jsonError) {
      log('❌ Route de base retourne du non-JSON:', 'red');
      log(responseText.substring(0, 200), 'red');
      return false;
    }
    
  } catch (error) {
    log(`❌ Erreur lors du test de base: ${error.message}`, 'red');
    return false;
  }
}

// Fonction principale
async function main() {
  log('🚀 DIAGNOSTIC DE L\'ERREUR DE CONNEXION JSON', 'magenta');
  log(`URL de base: ${VERCEL_URL}`, 'yellow');
  
  // Tests séquentiels
  const baseApiWorks = await testApiBase();
  const simpleLoginWorks = await testLoginWithSimpleCredentials();
  const errorCredentialsResult = await testLoginWithErrorCredentials();
  
  // Résumé
  log('\n📋 RÉSUMÉ DU DIAGNOSTIC:', 'magenta');
  log(`🧪 API de base: ${baseApiWorks ? '✅ FONCTIONNE' : '❌ PROBLÈME'}`, baseApiWorks ? 'green' : 'red');
  log(`🔐 Login simple: ${simpleLoginWorks ? '✅ JSON VALIDE' : '❌ JSON INVALIDE'}`, simpleLoginWorks ? 'green' : 'red');
  log(`🔐 Login avec identifiants erreur: ${errorCredentialsResult.success ? '✅ JSON VALIDE' : '❌ JSON INVALIDE'}`, errorCredentialsResult.success ? 'green' : 'red');
  
  if (!baseApiWorks) {
    log('\n❌ PROBLÈME MAJEUR: L\'API de base ne fonctionne pas', 'red');
    log('💡 SOLUTIONS:', 'yellow');
    log('1. Vérifiez que le déploiement Vercel s\'est bien passé', 'cyan');
    log('2. Vérifiez les logs Vercel pour les erreurs', 'cyan');
    log('3. Vérifiez la configuration des variables d\'environnement', 'cyan');
  } else if (!simpleLoginWorks) {
    log('\n❌ PROBLÈME: La route de login retourne du HTML au lieu de JSON', 'red');
    log('💡 CAUSES POSSIBLES:', 'yellow');
    log('1. Erreur 500 dans le serveur (problème de base de données)', 'cyan');
    log('2. Problème avec l\'authentification middleware', 'cyan');
    log('3. Erreur dans la route /auth/login', 'cyan');
  } else if (!errorCredentialsResult.success) {
    log('\n⚠️ PROBLÈME SPÉCIFIQUE: Certains identifiants causent des erreurs serveur', 'yellow');
    log('💡 CAUSES POSSIBLES:', 'yellow');
    log('1. Caractères spéciaux dans le mot de passe causent des erreurs SQL', 'cyan');
    log('2. Problème d\'encodage des caractères', 'cyan');
    log('3. Validation insuffisante des entrées', 'cyan');
  } else {
    log('\n✅ Tout semble fonctionner correctement', 'green');
    log('Le problème pourrait être temporaire ou spécifique au navigateur', 'cyan');
  }
}

main().catch(error => {
  log(`❌ Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
