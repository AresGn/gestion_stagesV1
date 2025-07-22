#!/usr/bin/env node

/**
 * Script de test pour vérifier que l'inscription fonctionne avec un email vide
 */

import fetch from 'node-fetch';

const testData = {
  nom: "TEST",
  prenom: "Utilisateur",
  telephone: "0123456789",
  email: "", // Email vide - c'est ce qui causait l'erreur
  matricule: "TEST123",
  filiere_id: 1,
  mot_de_passe: "motdepasse123",
  role: "etudiant"
};

async function testInscription() {
  console.log('🧪 Test d\'inscription avec email vide...');
  console.log('📤 Données envoyées:', testData);
  
  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    
    console.log('📥 Réponse du serveur:');
    console.log('   Status:', response.status);
    console.log('   Data:', result);
    
    if (response.ok) {
      console.log('✅ SUCCESS: Inscription réussie avec email vide !');
      
      // Nettoyer - supprimer l'utilisateur de test
      console.log('🧹 Nettoyage de l\'utilisateur de test...');
      // Note: Vous pourriez ajouter ici une requête DELETE si nécessaire
      
    } else {
      console.log('❌ FAILED: Inscription échouée');
      console.log('   Erreur:', result.message || result.error);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

// Exécuter le test
testInscription();
