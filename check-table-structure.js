// Script pour vérifier la structure des tables
import dotenv from 'dotenv';

dotenv.config();

const checkTableStructure = async () => {
  console.log('🔍 Vérification de la structure des tables...\n');

  try {
    const dbModule = await import('./src/config/db.js');
    const db = dbModule.default;

    // Vérifier la structure de la table projets_realises
    console.log('📋 Structure de la table projets_realises:');
    const { rows: columns } = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'projets_realises'
      ORDER BY ordinal_position;
    `);

    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Vérifier quelques enregistrements
    console.log('\n📄 Contenu de la table projets_realises:');
    const { rows: projets } = await db.query('SELECT * FROM public.projets_realises LIMIT 3');
    console.log('Colonnes disponibles:', Object.keys(projets[0] || {}));
    
    projets.forEach((projet, index) => {
      console.log(`\nProjet ${index + 1}:`);
      Object.entries(projet).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    });

    // Vérifier si la table propositions_themes existe et sa structure
    console.log('\n\n📋 Vérification de la table propositions_themes:');
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'propositions_themes'
      );
    `);

    if (tableExists.rows[0].exists) {
      const { rows: propColumns } = await db.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'propositions_themes'
        ORDER BY ordinal_position;
      `);
      
      console.log('Structure de propositions_themes:');
      propColumns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('❌ Table propositions_themes n\'existe pas');
    }

    // Vérifier la table activites
    console.log('\n\n📋 Vérification de la table activites:');
    const activitesExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'activites'
      );
    `);

    if (activitesExists.rows[0].exists) {
      const { rows: actColumns } = await db.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'activites'
        ORDER BY ordinal_position;
      `);
      
      console.log('Structure de activites:');
      actColumns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('❌ Table activites n\'existe pas');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
};

checkTableStructure().catch(console.error);
