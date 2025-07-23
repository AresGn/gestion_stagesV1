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

    // Essayer plusieurs approches de recherche
    let searchData = null;

    // Approche 1: Recherche par matricule complet
    console.log('   Tentative 1: Recherche par matricule complet...');
    let searchResponse = await fetch(`${BASE_URL}/api/admin/etudiants/search?term=${encodeURIComponent('78004STI22')}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    searchData = await searchResponse.json();
    console.log(`   Status: ${searchResponse.status}`);

    if (!searchData.success) {
      // Approche 2: Recherche par partie du matricule
      console.log('   Tentative 2: Recherche par "78004"...');
      searchResponse = await fetch(`${BASE_URL}/api/admin/etudiants/search?term=${encodeURIComponent('78004')}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      searchData = await searchResponse.json();
      console.log(`   Status: ${searchResponse.status}`);
    }

    if (!searchData.success) {
      // Approche 3: Recherche par "STI22"
      console.log('   Tentative 3: Recherche par "STI22"...');
      searchResponse = await fetch(`${BASE_URL}/api/admin/etudiants/search?term=${encodeURIComponent('STI22')}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      searchData = await searchResponse.json();
      console.log(`   Status: ${searchResponse.status}`);
    }

    console.log('Résultat final:', JSON.stringify(searchData, null, 2));
    
    if (searchData.success && searchData.data && searchData.data.length > 0) {
      // Chercher spécifiquement 78004STI22 dans les résultats
      const targetStudent = searchData.data.find(student => student.matricule === '78004STI22');

      if (targetStudent) {
        console.log('\n✅ Étudiant 78004STI22 trouvé:');
        console.log(`   Nom: ${targetStudent.nom} ${targetStudent.prenom}`);
        console.log(`   Matricule: ${targetStudent.matricule}`);
        console.log(`   Email: ${targetStudent.email}`);
        console.log(`   Téléphone: ${targetStudent.telephone || 'NON RENSEIGNÉ'}`);
        console.log(`   ID: ${targetStudent.id}`);

        if (!targetStudent.telephone) {
          console.log('\n⚠️  ATTENTION: Aucun numéro de téléphone enregistré pour cet étudiant!');
          console.log('   Le SMS automatique ne pourra pas être envoyé.');
        } else {
          console.log('\n✅ Numéro de téléphone disponible pour SMS automatique');
        }
      } else {
        console.log('\n❌ Étudiant 78004STI22 non trouvé spécifiquement');
        console.log(`   Mais ${searchData.data.length} autres étudiants trouvés:`);
        searchData.data.slice(0, 3).forEach((student, index) => {
          console.log(`   ${index + 1}. ${student.matricule} - ${student.nom} ${student.prenom}`);
        });
      }
    } else {
      console.log('\n❌ Aucun étudiant trouvé dans la base de données');
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
