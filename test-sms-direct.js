#!/usr/bin/env node

/**
 * Script de test SMS direct avec TextBee API
 * Usage: node test-sms-direct.js
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Configuration TextBee - Remplacez par vos vraies clés
const API_KEY = process.env.TEXTBEE_API_KEY || 'YOUR_API_KEY';
const DEVICE_ID = process.env.TEXTBEE_DEVICE_ID || 'YOUR_DEVICE_ID';

// Numéro de test - MAMA Aziz (78004STI22) en format international
const TEST_PHONE_NUMBER = '+229 43053098';

async function testSMSDirect() {
  console.log('📱 Test SMS Direct avec TextBee API');
  console.log('=====================================');
  console.log(`📞 Numéro de test: ${TEST_PHONE_NUMBER}`);
  console.log(`🔑 API Key: ${API_KEY ? API_KEY.substring(0, 10) + '...' : 'NON CONFIGURÉE'}`);
  console.log(`📱 Device ID: ${DEVICE_ID ? DEVICE_ID.substring(0, 10) + '...' : 'NON CONFIGURÉ'}`);
  console.log('');

  // Vérifier que les clés sont configurées
  if (!API_KEY || API_KEY === 'YOUR_API_KEY') {
    console.error('❌ TEXTBEE_API_KEY non configurée dans .env');
    console.log('Ajoutez TEXTBEE_API_KEY=votre_clé_api dans votre fichier .env');
    process.exit(1);
  }

  if (!DEVICE_ID || DEVICE_ID === 'YOUR_DEVICE_ID') {
    console.error('❌ TEXTBEE_DEVICE_ID non configuré dans .env');
    console.log('Ajoutez TEXTBEE_DEVICE_ID=votre_device_id dans votre fichier .env');
    process.exit(1);
  }

  try {
    // Message de test
    const message = `🧪 Test SMS INSTI - ${new Date().toLocaleString('fr-FR', { 
      timeZone: 'Africa/Porto-Novo' 
    })} - Système SMS automatique fonctionnel !`;

    console.log('📤 Envoi du SMS...');
    console.log(`📝 Message: ${message}`);
    console.log('');

    // Appel à l'API TextBee
    const response = await axios.post(
      `https://api.textbee.dev/api/v1/gateway/devices/${DEVICE_ID}/send-sms`,
      {
        recipients: [TEST_PHONE_NUMBER],
        message: message
      },
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 secondes de timeout
      }
    );

    console.log('✅ SMS envoyé avec succès !');
    console.log('📊 Réponse TextBee:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('');
    console.log('📱 Vérifiez votre téléphone pour recevoir le SMS !');

  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi du SMS:');
    
    if (error.response) {
      // Erreur de réponse de l'API
      console.error(`Status: ${error.response.status}`);
      console.error(`Status Text: ${error.response.statusText}`);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
      
      // Messages d'erreur spécifiques
      if (error.response.status === 401) {
        console.log('');
        console.log('🔧 Solution: Vérifiez votre API_KEY TextBee');
      } else if (error.response.status === 404) {
        console.log('');
        console.log('🔧 Solution: Vérifiez votre DEVICE_ID TextBee');
      } else if (error.response.status === 400) {
        console.log('');
        console.log('🔧 Solution: Vérifiez le format du numéro de téléphone');
      }
    } else if (error.request) {
      // Erreur de réseau
      console.error('Erreur réseau:', error.message);
      console.log('');
      console.log('🔧 Solution: Vérifiez votre connexion internet');
    } else {
      // Autre erreur
      console.error('Erreur:', error.message);
    }
    
    process.exit(1);
  }
}

// Test de connectivité à l'API TextBee
async function testConnectivity() {
  console.log('🔗 Test de connectivité à TextBee API...');
  
  try {
    const response = await axios.get('https://api.textbee.dev/api/v1/gateway/devices', {
      headers: {
        'x-api-key': API_KEY
      },
      timeout: 10000
    });
    
    console.log('✅ Connectivité OK');
    console.log(`📱 Appareils disponibles: ${response.data.length || 0}`);
    
    if (response.data.length > 0) {
      console.log('📋 Liste des appareils:');
      response.data.forEach((device, index) => {
        console.log(`  ${index + 1}. ID: ${device.id} - Nom: ${device.name} - Statut: ${device.status}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur de connectivité:', error.message);
    return false;
  }
}

// Fonction principale
async function main() {
  console.log('🚀 Démarrage du test SMS TextBee...');
  console.log('');
  
  // Test de connectivité d'abord
  const isConnected = await testConnectivity();
  console.log('');
  
  if (!isConnected) {
    console.log('❌ Impossible de se connecter à TextBee API');
    process.exit(1);
  }
  
  // Test d'envoi SMS
  await testSMSDirect();
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Erreur non gérée:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exception non capturée:', error);
  process.exit(1);
});

// Exécuter le test
main();
