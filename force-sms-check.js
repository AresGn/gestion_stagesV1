#!/usr/bin/env node

/**
 * Forcer la vérification des SMS en attente
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://gestion-stages-v1.vercel.app';

async function forceSMSCheck() {
  console.log('🔄 Force vérification SMS automatique');
  console.log('====================================');
  
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
    
    // 2. Forcer la vérification du scheduler
    console.log('\n🔄 Force vérification scheduler...');
    const forceResponse = await fetch(`${BASE_URL}/api/sms/scheduler/force-check`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    
    const forceData = await forceResponse.json();
    console.log(`Status: ${forceResponse.status}`);
    console.log('Résultat:', JSON.stringify(forceData, null, 2));
    
    if (forceData.success) {
      console.log('\n✅ Vérification forcée exécutée');
      console.log('📱 Si il y avait des SMS en attente, ils ont été traités');
    } else {
      console.log('❌ Échec vérification forcée');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

forceSMSCheck();
