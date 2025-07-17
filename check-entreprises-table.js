// Script pour vérifier la structure de la table entreprises
import dotenv from 'dotenv';

dotenv.config();

const checkEntreprisesTable = async () => {
  console.log('🔍 Vérification de la structure de la table entreprises...\n');

  try {
    const dbModule = await import('./src/config/db.js');
    const db = dbModule.default;

    // Vérifier la structure de la table entreprises
    console.log('📋 Structure de la table entreprises:');
    const { rows: columns } = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'entreprises'
      ORDER BY ordinal_position;
    `);

    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Vérifier quelques enregistrements
    console.log('\n📄 Contenu de la table entreprises (3 premiers):');
    const { rows: entreprises } = await db.query('SELECT * FROM public.entreprises LIMIT 3');
    
    if (entreprises.length > 0) {
      console.log('Colonnes disponibles:', Object.keys(entreprises[0]));
      
      entreprises.forEach((entreprise, index) => {
        console.log(`\nEntreprise ${index + 1}:`);
        Object.entries(entreprise).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      });
    } else {
      console.log('Aucune entreprise trouvée');
    }

    // Vérifier aussi la structure de la table stages pour voir les colonnes disponibles
    console.log('\n\n📋 Structure de la table stages:');
    const { rows: stageColumns } = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stages'
      ORDER BY ordinal_position;
    `);

    stageColumns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    // Vérifier un stage avec ses données d'entreprise
    console.log('\n📄 Exemple de stage avec entreprise:');
    const { rows: stageExample } = await db.query(`
      SELECT 
        s.*,
        e.*
      FROM public.stages s
      LEFT JOIN public.entreprises e ON s.entreprise_id = e.id
      LIMIT 1
    `);

    if (stageExample.length > 0) {
      console.log('Toutes les colonnes disponibles dans la jointure:');
      Object.keys(stageExample[0]).forEach(key => {
        console.log(`   - ${key}: ${stageExample[0][key]}`);
      });
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
};

checkEntreprisesTable().catch(console.error);
