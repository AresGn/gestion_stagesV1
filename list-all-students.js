#!/usr/bin/env node

/**
 * Lister tous les étudiants pour identifier le problème
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://gestion-stages-v1.vercel.app';

async function listAllStudents() {
  console.log('📋 Liste de tous les étudiants');
  console.log('==============================');
  
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
    
    // 2. Essayer différentes routes pour lister les étudiants
    console.log('\n📋 Tentative 1: /api/admin/etudiants...');
    let response = await fetch(`${BASE_URL}/api/admin/etudiants`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log('Données reçues:', JSON.stringify(data, null, 2));
      
      if (data.success && data.data && Array.isArray(data.data)) {
        console.log(`\n✅ ${data.data.length} étudiants trouvés:`);
        data.data.forEach((student, index) => {
          console.log(`${index + 1}. ${student.matricule || 'N/A'} - ${student.nom || 'N/A'} ${student.prenom || 'N/A'} - Tel: ${student.telephone || 'N/A'} - Email: ${student.email || 'N/A'}`);
        });
        
        // Chercher spécifiquement 78004STI22
        const target = data.data.find(s => s.matricule === '78004STI22');
        if (target) {
          console.log('\n🎯 ÉTUDIANT 78004STI22 TROUVÉ:');
          console.log(JSON.stringify(target, null, 2));
        } else {
          console.log('\n❌ Étudiant 78004STI22 non trouvé dans la liste');
          console.log('Matricules disponibles:');
          data.data.slice(0, 10).forEach(s => console.log(`   - ${s.matricule}`));
        }
      }
      return;
    }
    
    // 3. Essayer une autre route
    console.log('\n📋 Tentative 2: /api/admin/users...');
    response = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log('Données reçues:', JSON.stringify(data, null, 2));
      return;
    }
    
    // 4. Essayer la route de recherche avec un terme générique
    console.log('\n📋 Tentative 3: Recherche avec terme "a"...');
    response = await fetch(`${BASE_URL}/api/admin/etudiants/search?term=a`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`Status: ${response.status}`);
    const searchData = await response.json();
    console.log('Données recherche:', JSON.stringify(searchData, null, 2));
    
    if (searchData.success && searchData.data) {
      console.log(`\n✅ ${searchData.data.length} étudiants trouvés via recherche:`);
      searchData.data.slice(0, 20).forEach((student, index) => {
        console.log(`${index + 1}. ${student.matricule || 'N/A'} - ${student.nom || 'N/A'} ${student.prenom || 'N/A'} - Tel: ${student.telephone || 'N/A'}`);
      });
      
      // Chercher 78004STI22
      const target = searchData.data.find(s => s.matricule === '78004STI22');
      if (target) {
        console.log('\n🎯 ÉTUDIANT 78004STI22 TROUVÉ VIA RECHERCHE:');
        console.log(JSON.stringify(target, null, 2));
      }
    }
    
    // 5. Lister les routes disponibles
    console.log('\n📋 Tentative 4: Routes disponibles...');
    response = await fetch(`${BASE_URL}/api/admin`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Routes admin disponibles:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

listAllStudents();
