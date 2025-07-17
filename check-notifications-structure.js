// Script pour vérifier la structure de la table notifications
import dotenv from 'dotenv';

dotenv.config();

const checkNotificationsStructure = async () => {
  console.log('🔍 Vérification de la structure de la table notifications...\n');

  try {
    const dbModule = await import('./src/config/db.js');
    const db = dbModule.default;

    // Vérifier si la table notifications existe
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      );
    `);

    if (tableExists.rows[0].exists) {
      console.log('📋 Structure de la table notifications:');
      const { rows: columns } = await db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'notifications'
        ORDER BY ordinal_position;
      `);

      columns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });

      // Vérifier quelques enregistrements
      console.log('\n📄 Contenu de la table notifications (3 premiers):');
      const { rows: notifications } = await db.query('SELECT * FROM public.notifications LIMIT 3');
      
      if (notifications.length > 0) {
        console.log('Colonnes disponibles:', Object.keys(notifications[0]));
        
        notifications.forEach((notif, index) => {
          console.log(`\nNotification ${index + 1}:`);
          Object.entries(notif).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
          });
        });
      } else {
        console.log('Aucune notification trouvée');
      }
    } else {
      console.log('❌ Table notifications n\'existe pas');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
};

checkNotificationsStructure().catch(console.error);
