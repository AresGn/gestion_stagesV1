// Script de diagnostic pour tester la base de données sur Vercel
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const testDatabase = async () => {
  console.log('🔍 Début du diagnostic de la base de données...\n');

  try {
    // Import dynamique de la configuration DB
    const dbModule = await import('./src/config/db.js');
    const db = dbModule.default;

    console.log('✅ Connexion à la base de données établie');

    // Test 1: Vérifier les tables principales
    console.log('\n📋 Test 1: Vérification des tables principales...');
    
    const tables = [
      'utilisateurs',
      'filieres', 
      'stages',
      'entreprises',
      'propositions_stages',
      'projets_realises',
      'administrateurs'
    ];

    for (const table of tables) {
      try {
        const result = await db.query(`SELECT COUNT(*) FROM public.${table}`);
        console.log(`   ✅ Table ${table}: ${result.rows[0].count} enregistrements`);
      } catch (error) {
        console.log(`   ❌ Table ${table}: ERREUR - ${error.message}`);
      }
    }

    // Test 2: Vérifier les données des filières
    console.log('\n📊 Test 2: Données des filières...');
    try {
      const { rows: filieres } = await db.query('SELECT * FROM public.filieres ORDER BY nom');
      console.log(`   ✅ ${filieres.length} filières trouvées:`);
      filieres.forEach(f => console.log(`      - ${f.nom} (ID: ${f.id})`));
    } catch (error) {
      console.log(`   ❌ Erreur filières: ${error.message}`);
    }

    // Test 3: Vérifier les étudiants par filière
    console.log('\n👥 Test 3: Étudiants par filière...');
    try {
      const { rows: stats } = await db.query(`
        SELECT 
          f.nom as filiere,
          COUNT(u.id) as count
        FROM public.filieres f
        LEFT JOIN public.utilisateurs u ON f.id = u.filiere_id AND u.role = 'etudiant'
        GROUP BY f.id, f.nom
        ORDER BY f.nom
      `);
      
      console.log(`   ✅ Statistiques par filière:`);
      stats.forEach(s => console.log(`      - ${s.filiere}: ${s.count} étudiants`));
      
      // Vérifier si on a des données pour le dashboard
      if (stats.length === 0) {
        console.log('   ⚠️  PROBLÈME: Aucune donnée pour les statistiques par filière');
      }
    } catch (error) {
      console.log(`   ❌ Erreur stats filières: ${error.message}`);
    }

    // Test 4: Vérifier les projets réalisés
    console.log('\n🚀 Test 4: Projets réalisés...');
    try {
      const { rows: projets } = await db.query(`
        SELECT 
          pr.*,
          u.nom as etudiant_nom,
          u.prenom as etudiant_prenom,
          f.nom as nom_filiere
        FROM public.projets_realises pr
        LEFT JOIN public.utilisateurs u ON pr.etudiant_id = u.id
        LEFT JOIN public.filieres f ON u.filiere_id = f.id
        ORDER BY pr.created_at DESC
        LIMIT 5
      `);
      
      console.log(`   ✅ ${projets.length} projets trouvés (5 premiers):`);
      projets.forEach(p => console.log(`      - ${p.titre} par ${p.etudiant_prenom} ${p.etudiant_nom}`));
      
      if (projets.length === 0) {
        console.log('   ⚠️  PROBLÈME: Aucun projet réalisé trouvé');
      }
    } catch (error) {
      console.log(`   ❌ Erreur projets: ${error.message}`);
    }

    // Test 5: Vérifier les propositions de thèmes
    console.log('\n💡 Test 5: Propositions de thèmes...');
    try {
      // Vérifier si la table existe
      const tableExists = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'propositions_themes'
        );
      `);
      
      if (tableExists.rows[0].exists) {
        const { rows: propositions } = await db.query(`
          SELECT COUNT(*) as count FROM public.propositions_themes
        `);
        console.log(`   ✅ Table propositions_themes existe: ${propositions[0].count} propositions`);
      } else {
        console.log('   ⚠️  Table propositions_themes n\'existe pas');
      }
    } catch (error) {
      console.log(`   ❌ Erreur propositions: ${error.message}`);
    }

    // Test 6: Vérifier les statistiques entreprises
    console.log('\n🏢 Test 6: Statistiques entreprises...');
    try {
      const { rows: entreprises } = await db.query(`
        SELECT 
          e.nom as entreprise,
          COUNT(s.id) as nb_stages
        FROM public.entreprises e
        LEFT JOIN public.stages s ON e.id = s.entreprise_id
        GROUP BY e.id, e.nom
        HAVING COUNT(s.id) > 0
        ORDER BY nb_stages DESC
        LIMIT 5
      `);
      
      console.log(`   ✅ Top 5 entreprises par nombre de stages:`);
      entreprises.forEach(e => console.log(`      - ${e.entreprise}: ${e.nb_stages} stages`));
      
      if (entreprises.length === 0) {
        console.log('   ⚠️  PROBLÈME: Aucune entreprise avec des stages');
      }
    } catch (error) {
      console.log(`   ❌ Erreur stats entreprises: ${error.message}`);
    }

    // Test 7: Vérifier les activités récentes
    console.log('\n📈 Test 7: Activités récentes...');
    try {
      // Vérifier si la table activites existe
      const tableExists = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'activites'
        );
      `);
      
      if (tableExists.rows[0].exists) {
        const { rows: activites } = await db.query(`
          SELECT * FROM public.activites 
          ORDER BY created_at DESC 
          LIMIT 5
        `);
        console.log(`   ✅ ${activites.length} activités récentes trouvées`);
      } else {
        console.log('   ⚠️  Table activites n\'existe pas');
      }
    } catch (error) {
      console.log(`   ❌ Erreur activités: ${error.message}`);
    }

    console.log('\n✅ Diagnostic terminé!');

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
  }
};

// Exécuter le diagnostic
testDatabase().catch(console.error);
