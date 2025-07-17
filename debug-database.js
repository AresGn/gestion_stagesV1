// Script pour examiner la structure de la base de données
import fetch from 'node-fetch';

const BASE_URL = 'https://gestion-stages-v1.vercel.app';

// Fonction pour se connecter et récupérer le token admin
async function getAdminToken() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matricule: 'ADMIN001',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    return response.ok ? data.token : null;
  } catch (error) {
    console.error('Erreur connexion admin:', error);
    return null;
  }
}

// Fonction pour exécuter une requête SQL de debug
async function executeDebugQuery(token, query, description) {
  try {
    console.log(`\n🔍 ${description}`);
    console.log(`📝 Requête: ${query}`);
    
    const response = await fetch(`${BASE_URL}/api/admin/debug`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Résultat:`);
      console.log(JSON.stringify(data.data, null, 2));
    } else {
      console.log(`❌ Erreur: ${data.message}`);
    }
    
    return data;
  } catch (error) {
    console.log(`💥 Exception: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🔍 ANALYSE DE LA BASE DE DONNÉES');
  console.log('=' * 50);
  
  // Récupération du token admin
  console.log('\n🔐 Connexion admin...');
  const adminToken = await getAdminToken();
  
  if (!adminToken) {
    console.log('❌ Impossible de se connecter en tant qu\'admin');
    return;
  }
  
  console.log('✅ Token admin obtenu');
  
  // 1. Examiner les tables existantes
  await executeDebugQuery(adminToken, 
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    "Liste des tables dans le schéma public"
  );
  
  // 2. Examiner la structure de la table filieres
  await executeDebugQuery(adminToken,
    "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'filieres' AND table_schema = 'public'",
    "Structure de la table filieres"
  );
  
  // 3. Examiner le contenu de la table filieres
  await executeDebugQuery(adminToken,
    "SELECT * FROM public.filieres LIMIT 5",
    "Contenu de la table filieres (5 premiers)"
  );
  
  // 4. Examiner la structure de la table stages
  await executeDebugQuery(adminToken,
    "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'stages' AND table_schema = 'public'",
    "Structure de la table stages"
  );
  
  // 5. Examiner le contenu de la table stages
  await executeDebugQuery(adminToken,
    "SELECT * FROM public.stages LIMIT 3",
    "Contenu de la table stages (3 premiers)"
  );
  
  // 6. Vérifier si la table projets_realises existe
  await executeDebugQuery(adminToken,
    "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'projets_realises' AND table_schema = 'public'",
    "Structure de la table projets_realises"
  );
  
  // 7. Examiner le contenu de projets_realises si elle existe
  await executeDebugQuery(adminToken,
    "SELECT * FROM public.projets_realises LIMIT 3",
    "Contenu de la table projets_realises (3 premiers)"
  );
  
  // 8. Vérifier les tables liées aux propositions
  await executeDebugQuery(adminToken,
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%proposition%'",
    "Tables contenant 'proposition'"
  );
  
  // 9. Examiner la structure de propositions_stages
  await executeDebugQuery(adminToken,
    "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'propositions_stages' AND table_schema = 'public'",
    "Structure de la table propositions_stages"
  );
  
  // 10. Statistiques par filière - requête de test
  await executeDebugQuery(adminToken,
    "SELECT f.id, f.nom, COUNT(u.id) as nb_etudiants FROM public.filieres f LEFT JOIN public.utilisateurs u ON f.id = u.filiere_id AND u.role = 'etudiant' GROUP BY f.id, f.nom",
    "Test: Statistiques étudiants par filière"
  );
  
  console.log('\n🎉 Analyse terminée !');
}

main().catch(console.error);
