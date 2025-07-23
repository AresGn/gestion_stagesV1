#!/usr/bin/env node

/**
 * Test de soumission du formulaire de stage
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://gestion-stages-v1.vercel.app';

async function testStageForm() {
  console.log('🧪 Test de soumission du formulaire de stage');
  console.log('============================================');
  
  try {
    // 1. Connexion étudiant (MAMA Aziz - 78004STI22)
    console.log('🔐 Connexion étudiant MAMA Aziz...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        matricule: '78004STI22', 
        password: 'password123' // Mot de passe par défaut
      })
    });
    
    const loginData = await loginResponse.json();
    console.log(`Status: ${loginResponse.status}`);
    console.log('Login result:', loginData);
    
    if (!loginData.success || !loginData.token) {
      console.error('❌ Échec de connexion étudiant');
      return;
    }
    
    const token = loginData.token;
    console.log('✅ Connexion étudiant réussie');
    
    // 2. Test de soumission du formulaire de stage
    console.log('\n📝 Test soumission formulaire de stage...');
    
    const stageData = {
      // Entreprise
      departement: 'Atlantique',
      commune: 'Cotonou',
      quartier: 'Akpakpa',
      nomEntreprise: 'Tech Solutions SARL',
      dateDebutStage: '2025-08-01',
      dateFinStage: '2025-11-30',
      
      // Étudiant
      themeMemoire: 'Développement d\'une application mobile de gestion des stages',
      
      // Maître de stage
      nomMaitreStage: 'JOHNSON',
      prenomMaitreStage: 'Marie',
      telephoneMaitreStage: '97123456',
      emailMaitreStage: 'marie.johnson@techsolutions.bj',
      fonctionMaitreStage: 'Directrice Technique',
      
      // Maître de mémoire
      nomMaitreMemoire: 'Dr. KOUDOU',
      telephoneMaitreMemoire: '96654321',
      emailMaitreMemoire: 'koudou@insti.edu',
      statutMaitreMemoire: 'Professeur'
    };
    
    const submitResponse = await fetch(`${BASE_URL}/api/internships/submit`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(stageData)
    });
    
    const submitResult = await submitResponse.json();
    console.log(`Status: ${submitResponse.status}`);
    console.log('Submit result:', JSON.stringify(submitResult, null, 2));
    
    if (submitResult.success) {
      console.log('\n✅ Formulaire de stage soumis avec succès !');
      
      // 3. Vérifier que les données ont été enregistrées
      console.log('\n🔍 Vérification des données enregistrées...');
      const checkResponse = await fetch(`${BASE_URL}/api/internships/user/${loginData.user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const checkResult = await checkResponse.json();
      console.log(`Status: ${checkResponse.status}`);
      console.log('Check result:', JSON.stringify(checkResult, null, 2));
      
      if (checkResult.success && checkResult.data) {
        console.log('\n✅ Données de stage bien enregistrées !');
        console.log(`   Entreprise: ${checkResult.data.nom_entreprise}`);
        console.log(`   Thème: ${checkResult.data.theme_memoire}`);
        console.log(`   Date début: ${checkResult.data.date_debut}`);
      } else {
        console.log('❌ Données de stage non trouvées après enregistrement');
      }
      
    } else {
      console.log('❌ Échec soumission formulaire:', submitResult.message);
      if (submitResult.errors) {
        console.log('Erreurs de validation:', submitResult.errors);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testStageForm();
