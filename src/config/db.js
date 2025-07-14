import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Récupération de l'URL de la base de données depuis les variables d'environnement
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL n\'est pas définie dans les variables d\'environnement');
  process.exit(1);
}

// Configuration optimisée pour Neon Database
const pool = new pg.Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false // Nécessaire pour Neon
  },
  max: 10, // Réduit le nombre de connexions
  min: 1, // Minimum de connexions
  idleTimeoutMillis: 20000, // 20 secondes avant de fermer une connexion inactive
  connectionTimeoutMillis: 8000, // 8 secondes pour établir une connexion
  acquireTimeoutMillis: 15000, // 15 secondes pour acquérir une connexion du pool
  statement_timeout: 30000, // 30 secondes pour les requêtes
  query_timeout: 30000, // 30 secondes pour les requêtes
  keepAlive: true, // Maintenir les connexions actives
  keepAliveInitialDelayMillis: 10000, // Délai initial pour keep-alive
});

// Configuration du search_path pour utiliser le schéma public par défaut
pool.on('connect', (client) => {
  client.query('SET search_path TO public')
    .then(() => console.log('✅ Search path configuré sur "public" pour une nouvelle connexion'))
    .catch(err => console.error('❌ Erreur lors de la configuration du search_path:', err));
});

// Gestion des erreurs de pool
pool.on('error', (err) => {
  console.error('❌ Erreur inattendue du pool de connexions:', err);
});

// Test de la connexion avec informations détaillées
const testConnection = async () => {
  try {
    console.log('🔄 Test de connexion à la base de données Neon...');
    const client = await pool.connect();

    // Test de base
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Connexion PostgreSQL réussie !');
    console.log(`📅 Heure serveur: ${result.rows[0].current_time}`);
    console.log(`🗄️  Version PostgreSQL: ${result.rows[0].pg_version.split(' ')[0]}`);

    // Test du schéma
    const schemaResult = await client.query('SELECT current_schema()');
    console.log(`📂 Schéma actuel: ${schemaResult.rows[0].current_schema}`);

    client.release();
    console.log('🎉 Configuration de la base de données terminée avec succès !');
  } catch (err) {
    console.error('❌ Erreur de connexion à PostgreSQL:', err.message);
    console.error('🔍 Détails:', err);
    console.log('⚠️  Le serveur continue sans connexion DB - les requêtes échoueront');
    // Ne pas arrêter le serveur, permettre le démarrage sans DB
  }
};

// Exécuter le test
testConnection();

// Helper pour exécuter les requêtes plus facilement avec gestion d'erreurs améliorée
const query = async (text, params) => {
  let client;
  try {
    client = await pool.connect();
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;

    // Log des requêtes en mode développement (moins verbeux)
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.log(`⚠️ Requête lente (${duration}ms):`, text.substring(0, 50) + '...');
    }

    return result;
  } catch (error) {
    console.error('❌ Erreur DB:', error.message);
    // Ne pas logger les détails en production pour éviter le spam
    if (process.env.NODE_ENV === 'development') {
      console.error('📝 Requête:', text.substring(0, 100) + '...');
    }
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Fonction pour fermer proprement le pool (utile pour les tests ou l'arrêt du serveur)
const closePool = async () => {
  try {
    await pool.end();
    console.log('✅ Pool de connexions fermé proprement');
  } catch (error) {
    console.error('❌ Erreur lors de la fermeture du pool:', error);
  }
};

console.log('🔧 [db.js] Configuration du pool PostgreSQL initialisée');
console.log(`📊 [db.js] Pool configuré avec max: ${pool.options.max} connexions`);

// Exporter pool, query et closePool
export default {
  pool,
  query,
  closePool
};