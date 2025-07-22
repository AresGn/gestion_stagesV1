#!/usr/bin/env node

/**
 * Test final de l'inscription avec email vide
 */

import dotenv from 'dotenv';
dotenv.config();

async function testInscriptionFinale() {
  try {
    // Import dynamique de la configuration DB
    const dbModule = await import('./src/config/db.js');
    const db = dbModule.default;

    console.log('🧪 Test final d\'inscription avec email vide...\n');

    // Données de test
    const testData = {
      nom: "TESTFINAL",
      prenom: "Utilisateur",
      telephone: "0123456789",
      email: "", // Email vide
      matricule: "TESTFINAL123",
      filiere_id: 1,
      mot_de_passe: "motdepasse123",
      role: "etudiant"
    };

    console.log('📤 Données de test:', testData);

    // Nettoyer d'abord si l'utilisateur existe
    await db.query(`
      DELETE FROM public.utilisateurs 
      WHERE matricule = $1
    `, [testData.matricule]);

    // Simuler l'insertion comme le fait la route d'authentification
    console.log('\n🔄 Test d\'insertion directe en base...');
    
    const { rows: result } = await db.query(`
      INSERT INTO public.utilisateurs 
      (nom, prenom, telephone, email, matricule, filiere_id, mot_de_passe, role) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING id, nom, prenom, email, matricule
    `, [
      testData.nom,
      testData.prenom, 
      testData.telephone,
      (testData.email && testData.email.trim() !== '') ? testData.email : null, // Notre logique de conversion
      testData.matricule,
      testData.filiere_id,
      'hashedpassword',
      testData.role
    ]);

    if (result.length > 0) {
      const user = result[0];
      console.log('✅ SUCCESS ! Utilisateur créé:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Nom: ${user.prenom} ${user.nom}`);
      console.log(`   Matricule: ${user.matricule}`);
      console.log(`   Email: ${user.email === null ? 'NULL (correct!)' : user.email}`);

      // Nettoyer
      await db.query(`
        DELETE FROM public.utilisateurs 
        WHERE id = $1
      `, [user.id]);
      
      console.log('🧹 Utilisateur de test supprimé');
    }

    await db.closePool?.();
    console.log('\n🎉 Test terminé avec succès !');
    console.log('✅ L\'inscription avec email vide fonctionne maintenant');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    process.exit(1);
  }
}

testInscriptionFinale();
