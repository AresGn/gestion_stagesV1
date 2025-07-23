#!/usr/bin/env node

/**
 * Vérifier les notifications dans la base de données
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://gestion-stages-v1.vercel.app';

async function checkNotificationsDB() {
  console.log('🔍 Vérification des notifications en base de données');
  console.log('==================================================');
  
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
    
    // 2. Récupérer les notifications récentes
    console.log('\n📋 Récupération des notifications récentes...');
    const notificationsResponse = await fetch(`${BASE_URL}/api/admin/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const notificationsData = await notificationsResponse.json();
    console.log(`Status: ${notificationsResponse.status}`);
    
    if (notificationsData.success && notificationsData.data) {
      console.log(`\n✅ ${notificationsData.data.length} notifications trouvées`);
      
      // Chercher les notifications récentes pour MAMA Aziz (utilisateur_id = 30)
      const recentNotifications = notificationsData.data
        .filter(n => n.utilisateur_id === 30)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
      
      console.log(`\n🎯 ${recentNotifications.length} notifications récentes pour MAMA Aziz (ID: 30):`);
      
      recentNotifications.forEach((notif, index) => {
        console.log(`\n${index + 1}. Notification ID: ${notif.id}`);
        console.log(`   Titre: ${notif.titre}`);
        console.log(`   Message: ${notif.message.substring(0, 50)}...`);
        console.log(`   Créée: ${notif.created_at}`);
        console.log(`   Lue: ${notif.is_read ? 'OUI' : 'NON'}`);
        console.log(`   SMS programmé: ${notif.scheduled_sms_at || 'NON PROGRAMMÉ'}`);
        console.log(`   SMS envoyé: ${notif.sms_sent_at || 'NON ENVOYÉ'}`);
        console.log(`   Escalation: ${notif.escalation_level || 0}`);
        
        // Vérifier si le SMS aurait dû être envoyé
        if (notif.scheduled_sms_at && !notif.sms_sent_at && !notif.is_read) {
          const scheduledTime = new Date(notif.scheduled_sms_at);
          const now = new Date();
          const timeDiff = now - scheduledTime;
          
          if (timeDiff > 0) {
            console.log(`   ⚠️  SMS AURAIT DÛ ÊTRE ENVOYÉ il y a ${Math.floor(timeDiff / 1000)} secondes !`);
          } else {
            console.log(`   ⏰ SMS programmé dans ${Math.floor(-timeDiff / 1000)} secondes`);
          }
        }
      });
      
      // Statistiques globales
      const totalPending = notificationsData.data.filter(n => 
        n.scheduled_sms_at && 
        !n.sms_sent_at && 
        !n.is_read &&
        new Date(n.scheduled_sms_at) < new Date()
      ).length;
      
      console.log(`\n📊 Statistiques:`);
      console.log(`   Total notifications: ${notificationsData.data.length}`);
      console.log(`   SMS en attente d'envoi: ${totalPending}`);
      
    } else {
      console.log('❌ Impossible de récupérer les notifications');
      console.log('Données:', JSON.stringify(notificationsData, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

checkNotificationsDB();
