// Script pour vérifier la structure de la table stages
import dotenv from 'dotenv';

dotenv.config();

const checkStagesTable = async () => {
  console.log('🔍 Vérification de la structure de la table stages...\n');

  try {
    const dbModule = await import('./src/config/db.js');
    const db = dbModule.default;

    // Vérifier la structure de la table stages
    console.log('📋 Structure de la table stages:');
    const { rows: columns } = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stages'
      ORDER BY ordinal_position;
    `);

    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Vérifier quelques enregistrements
    console.log('\n📄 Contenu de la table stages (3 premiers):');
    const { rows: stages } = await db.query('SELECT * FROM public.stages LIMIT 3');
    
    if (stages.length > 0) {
      console.log('Colonnes disponibles:', Object.keys(stages[0]));
      
      stages.forEach((stage, index) => {
        console.log(`\nStage ${index + 1}:`);
        Object.entries(stage).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      });
    } else {
      console.log('Aucun stage trouvé');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
};

checkStagesTable().catch(console.error);
