#!/usr/bin/env node

/**
 * Test du bouton SMS automatique pour l'étudiant 78004STI22
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://gestion-stages-v1.vercel.app';

async function testSMSButton() {
  console.log('🧪 Test du bouton SMS automatique pour 78004STI22');
  console.log('================================================');
  
  try {
    // 1. Connexion admin
    console.log('🔐 Connexion admin...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        matricule: 'ADMIN001', 
        password: 'admin123' 
      })
    });
    
    const loginData = await loginResponse.json();
    if (!loginData.success || !loginData.token) {
      console.error('❌ Échec de connexion admin');
      return;
    }
    
    const token = loginData.token;
    console.log('✅ Connexion admin réussie');
    
    // 2. Envoyer une notification à l'étudiant 78004STI22 (comme le bouton)
    console.log('\n📱 Envoi notification à 78004STI22...');
    const notificationResponse = await fetch(`${BASE_URL}/api/admin/notifications`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({
        destinataire: {
          type: 'etudiant',
          id: 30  // ID de l'étudiant 78004STI22 (MAMA Aziz)
        },
        titre: '🧪 Test SMS Automatique',
        message: `Test de notification avec SMS automatique après 10 secondes si non lue. Envoyé à ${new Date().toLocaleTimeString()}`
      }),
    });
    
    const notificationData = await notificationResponse.json();
    console.log(`Status: ${notificationResponse.status}`);
    console.log('Résultat:', JSON.stringify(notificationData, null, 2));
    
    if (notificationData.success) {
      console.log('\n✅ Notification envoyée avec succès !');
      console.log('📱 L\'étudiant MAMA Aziz (78004STI22) devrait recevoir la notification');
      console.log('⏰ Dans 10 secondes, si non lue → SMS automatique vers 0143053098');
      console.log('\n⏳ Attendez 15 secondes puis vérifiez si le SMS est arrivé...');
    } else {
      console.log('❌ Échec envoi notification:', notificationData.message);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testSMSButton();
