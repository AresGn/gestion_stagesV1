#!/usr/bin/env node

/**
 * Script pour modifier la colonne email pour permettre les valeurs NULL
 */

import dotenv from 'dotenv';
dotenv.config();

async function fixEmailColumn() {
  try {
    // Import dynamique de la configuration DB
    const dbModule = await import('./src/config/db.js');
    const db = dbModule.default;

    console.log('🔧 Modification de la colonne email pour permettre NULL...\n');

    // 1. Vérifier l'état actuel
    console.log('📋 État actuel de la colonne email:');
    const { rows: beforeColumns } = await db.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'utilisateurs' 
      AND table_schema = 'public' 
      AND column_name = 'email'
    `);

    if (beforeColumns.length > 0) {
      const col = beforeColumns[0];
      console.log(`   Type: ${col.data_type}, Nullable: ${col.is_nullable}`);
    }

    // 2. Modifier la colonne pour permettre NULL
    console.log('\n🔄 Modification de la contrainte...');
    await db.query(`
      ALTER TABLE public.utilisateurs 
      ALTER COLUMN email DROP NOT NULL
    `);

    console.log('✅ Contrainte NOT NULL supprimée de la colonne email');

    // 3. Vérifier le résultat
    console.log('\n📋 État après modification:');
    const { rows: afterColumns } = await db.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'utilisateurs' 
      AND table_schema = 'public' 
      AND column_name = 'email'
    `);

    if (afterColumns.length > 0) {
      const col = afterColumns[0];
      console.log(`   Type: ${col.data_type}, Nullable: ${col.is_nullable}`);
    }

    // 4. Test d'insertion avec email NULL
    console.log('\n🧪 Test d\'insertion avec email NULL...');
    
    // D'abord, supprimer l'utilisateur de test s'il existe
    await db.query(`
      DELETE FROM public.utilisateurs 
      WHERE matricule = 'TEST_NULL_EMAIL'
    `);

    // Insérer un utilisateur de test avec email NULL
    const { rows: testResult } = await db.query(`
      INSERT INTO public.utilisateurs 
      (nom, prenom, telephone, email, matricule, filiere_id, mot_de_passe, role) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING id, email
    `, [
      'TEST', 
      'User', 
      '0123456789', 
      null, // Email NULL
      'TEST_NULL_EMAIL', 
      1, 
      'hashedpassword', 
      'etudiant'
    ]);

    if (testResult.length > 0) {
      console.log(`✅ Test réussi ! Utilisateur créé avec ID ${testResult[0].id} et email: ${testResult[0].email}`);
      
      // Nettoyer - supprimer l'utilisateur de test
      await db.query(`
        DELETE FROM public.utilisateurs 
        WHERE id = $1
      `, [testResult[0].id]);
      
      console.log('🧹 Utilisateur de test supprimé');
    }

    await db.closePool?.();
    console.log('\n🎉 Modification terminée avec succès !');
    console.log('📧 La colonne email peut maintenant accepter les valeurs NULL');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

fixEmailColumn();
