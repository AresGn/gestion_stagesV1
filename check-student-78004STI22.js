#!/usr/bin/env node

/**
 * Vérifier les données de l'étudiant 78004STI22
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://gestion-stages-v1.vercel.app';

async function checkStudent() {
  console.log('🔍 Vérification de l\'étudiant 78004STI22');
  console.log('==========================================');
  
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
    
    // 2. Rechercher l'étudiant 78004STI22
    console.log('\n🔍 Recherche de l\'étudiant 78004STI22...');
    const searchResponse = await fetch(`${BASE_URL}/api/admin/etudiants/search?term=${encodeURIComponent('78004STI22')}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const searchData = await searchResponse.json();
    console.log(`Status: ${searchResponse.status}`);
    console.log('Résultat recherche:', JSON.stringify(searchData, null, 2));
    
    if (searchData.success && searchData.data && searchData.data.length > 0) {
      const student = searchData.data[0];
      console.log('\n✅ Étudiant trouvé:');
      console.log(`   Nom: ${student.nom} ${student.prenom}`);
      console.log(`   Matricule: ${student.matricule}`);
      console.log(`   Email: ${student.email}`);
      console.log(`   Téléphone: ${student.telephone || 'NON RENSEIGNÉ'}`);
      console.log(`   ID: ${student.id}`);
      
      if (!student.telephone) {
        console.log('\n⚠️  ATTENTION: Aucun numéro de téléphone enregistré pour cet étudiant!');
        console.log('   Le SMS automatique ne pourra pas être envoyé.');
      } else {
        console.log('\n✅ Numéro de téléphone disponible pour SMS automatique');
      }
    } else {
      console.log('\n❌ Étudiant 78004STI22 non trouvé dans la base de données');
    }
    
    // 3. Lister quelques étudiants pour voir la structure
    console.log('\n📋 Liste de quelques étudiants (pour référence):');
    const listResponse = await fetch(`${BASE_URL}/api/admin/etudiants/search?term=STI`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const listData = await listResponse.json();
    if (listData.success && listData.data) {
      listData.data.slice(0, 5).forEach((student, index) => {
        console.log(`   ${index + 1}. ${student.matricule} - ${student.nom} ${student.prenom} - Tel: ${student.telephone || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

checkStudent();
