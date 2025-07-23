#!/usr/bin/env node

/**
 * Test des routes SMS du dashboard admin
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://gestion-stages-v1.vercel.app';

async function testDashboardSMS() {
  console.log('🧪 Test des routes SMS du dashboard admin');
  console.log('==========================================');
  
  try {
    // 1. Test de connexion admin
    console.log('🔐 1. Test de connexion admin...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        matricule: 'ADMIN001', 
        password: 'admin123' 
      })
    });
    
    const loginData = await loginResponse.json();
    console.log(`   Status: ${loginResponse.status}`);
    console.log(`   Success: ${loginData.success}`);
    
    if (!loginData.success || !loginData.token) {
      console.error('❌ Échec de connexion admin');
      return;
    }
    
    const token = loginData.token;
    console.log('✅ Connexion admin réussie');
    
    // 2. Test route ping SMS
    console.log('\n📡 2. Test route /api/sms/ping...');
    const pingResponse = await fetch(`${BASE_URL}/api/sms/ping`);
    const pingData = await pingResponse.json();
    console.log(`   Status: ${pingResponse.status}`);
    console.log(`   Data:`, pingData);
    
    // 3. Test route SMS avec authentification
    console.log('\n📱 3. Test route /api/sms/test avec auth...');
    const smsResponse = await fetch(`${BASE_URL}/api/sms/test`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        phoneNumber: '+229 51885851', 
        message: '🧪 Test SMS depuis dashboard admin - ' + new Date().toLocaleTimeString()
      })
    });
    
    const smsData = await smsResponse.json();
    console.log(`   Status: ${smsResponse.status}`);
    console.log(`   Data:`, JSON.stringify(smsData, null, 2));
    
    if (smsData.success) {
      console.log('✅ SMS envoyé avec succès depuis le dashboard !');
    } else {
      console.log('❌ Échec envoi SMS:', smsData.message);
    }
    
    // 4. Test route scheduler status
    console.log('\n📊 4. Test route /api/sms/scheduler/status...');
    const statusResponse = await fetch(`${BASE_URL}/api/sms/scheduler/status`, {
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    
    const statusData = await statusResponse.json();
    console.log(`   Status: ${statusResponse.status}`);
    console.log(`   Data:`, JSON.stringify(statusData, null, 2));
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

testDashboardSMS();
