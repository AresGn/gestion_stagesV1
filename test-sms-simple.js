#!/usr/bin/env node

/**
 * Script de test SMS simple avec TextBee API
 * Remplacez directement les clés dans ce fichier pour un test rapide
 */

import axios from 'axios';

// 🔧 REMPLACEZ PAR VOS VRAIES CLÉS API TEXTBEE
const API_KEY = 'YOUR_API_KEY';  // Remplacez par votre vraie clé API
const DEVICE_ID = 'YOUR_DEVICE_ID';  // Remplacez par votre vrai Device ID

// Numéro de test
const PHONE_NUMBER = '+229 51885851';

async function sendTestSMS() {
  console.log('📱 Test SMS Simple - TextBee API');
  console.log('=================================');
  
  // Vérifier que les clés sont configurées
  if (API_KEY === 'YOUR_API_KEY' || DEVICE_ID === 'YOUR_DEVICE_ID') {
    console.error('❌ Veuillez remplacer API_KEY et DEVICE_ID par vos vraies clés dans ce fichier');
    console.log('');
    console.log('Éditez test-sms-simple.js et remplacez:');
    console.log('- API_KEY = "YOUR_API_KEY"  par votre vraie clé');
    console.log('- DEVICE_ID = "YOUR_DEVICE_ID"  par votre vrai Device ID');
    return;
  }

  try {
    const message = `🧪 Test SMS INSTI - ${new Date().toLocaleTimeString()} - Ça marche !`;
    
    console.log(`📞 Envoi vers: ${PHONE_NUMBER}`);
    console.log(`📝 Message: ${message}`);
    console.log('📤 Envoi en cours...');

    const response = await axios.post(
      `https://api.textbee.dev/api/v1/gateway/devices/${DEVICE_ID}/send-sms`,
      {
        recipients: [PHONE_NUMBER],
        message: message
      },
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ SMS envoyé avec succès !');
    console.log('📊 Réponse:', response.data);
    console.log('📱 Vérifiez votre téléphone !');

  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('🔧 Vérifiez votre API_KEY');
    } else if (error.response?.status === 404) {
      console.log('🔧 Vérifiez votre DEVICE_ID');
    }
  }
}

sendTestSMS();
