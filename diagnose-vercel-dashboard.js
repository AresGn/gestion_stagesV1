/**
 * Diagnostic spécifique pour les problèmes du dashboard étudiant sur Vercel
 */

import fetch from 'node-fetch';

const VERCEL_URL = 'https://gestion-stages-v1.vercel.app';
const LOCAL_URL = 'http://localhost:3000';

// Identifiants de test
const STUDENT_CREDENTIALS = {
  matricule: '64036STI45',
  password: 'W*W?4quQA7aBTXF'
};

async function login(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(STUDENT_CREDENTIALS)
    });
    
    const data = await response.json();
    return response.ok ? data.token : null;
  } catch (error) {
    console.error(`Erreur connexion ${baseUrl}:`, error.message);
    return null;
  }
}

async function testEndpoint(baseUrl, endpoint, token, description) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    
    const response = await fetch(`${baseUrl}${endpoint}`, { headers });
    const data = await response.json();
    
    console.log(`\n📍 ${description}`);
    console.log(`🌐 URL: ${baseUrl}${endpoint}`);
    console.log(`📊 Status: ${response.status} ${response.ok ? '✅' : '❌'}`);
    
    if (response.ok) {
      // Analyser la structure des données
      if (Array.isArray(data)) {
        console.log(`📦 Type: Array (${data.length} éléments)`);
        if (data.length > 0) {
          console.log(`🔍 Premier élément:`, Object.keys(data[0]));
        }
      } else if (data && typeof data === 'object') {
        console.log(`📦 Type: Object`);
        console.log(`🔍 Clés:`, Object.keys(data));
        if (data.data) {
          console.log(`🔍 data.data type:`, Array.isArray(data.data) ? `Array(${data.data.length})` : typeof data.data);
        }
      }
    } else {
      console.log(`❌ Erreur:`, data.message || data.error || 'Erreur inconnue');
    }
    
    return { ok: response.ok, data, status: response.status };
  } catch (error) {
    console.log(`💥 Exception: ${error.message}`);
    return { ok: false, error: error.message };
  }
}

async function compareEndpoints() {
  console.log('🔍 DIAGNOSTIC DASHBOARD ÉTUDIANT - VERCEL vs LOCAL');
  console.log('='.repeat(60));
  
  // Connexion aux deux environnements
  console.log('\n🔐 Connexion aux environnements...');
  const vercelToken = await login(VERCEL_URL);
  const localToken = await login(LOCAL_URL);
  
  console.log(`🌐 Vercel: ${vercelToken ? '✅ Connecté' : '❌ Échec'}`);
  console.log(`🏠 Local: ${localToken ? '✅ Connecté' : '❌ Échec'}`);
  
  if (!vercelToken) {
    console.log('\n❌ Impossible de se connecter à Vercel. Arrêt du diagnostic.');
    return;
  }
  
  // Endpoints critiques pour le dashboard étudiant
  const endpoints = [
    { path: '/api/auth/me', desc: 'Informations utilisateur' },
    { path: '/api/internships/user/2', desc: 'Informations de stage' },
    { path: '/api/projets-realises', desc: 'Projets réalisés' },
    { path: '/api/propositions-themes', desc: 'Propositions de thèmes' },
    { path: '/api/propositions-stages', desc: 'Offres de stage' }
  ];
  
  for (const endpoint of endpoints) {
    console.log('\n' + '='.repeat(50));
    console.log(`🧪 TEST: ${endpoint.desc}`);
    
    // Test Vercel
    const vercelResult = await testEndpoint(VERCEL_URL, endpoint.path, vercelToken, `VERCEL - ${endpoint.desc}`);
    
    // Test Local (si disponible)
    if (localToken) {
      const localResult = await testEndpoint(LOCAL_URL, endpoint.path, localToken, `LOCAL - ${endpoint.desc}`);
      
      // Comparaison
      if (vercelResult.ok && localResult.ok) {
        console.log('\n🔄 COMPARAISON:');
        if (JSON.stringify(vercelResult.data) === JSON.stringify(localResult.data)) {
          console.log('✅ Données identiques');
        } else {
          console.log('⚠️ Données différentes');
          console.log('📊 Vercel data keys:', Object.keys(vercelResult.data || {}));
          console.log('📊 Local data keys:', Object.keys(localResult.data || {}));
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 DIAGNOSTIC TERMINÉ');
  console.log('\n💡 ACTIONS RECOMMANDÉES:');
  console.log('1. Vérifiez les variables d\'environnement sur Vercel');
  console.log('2. Vérifiez les logs de déploiement Vercel');
  console.log('3. Forcez un redéploiement complet si nécessaire');
  console.log('4. Vérifiez la configuration de la base de données');
}

// Test spécifique pour les filtres des propositions de thèmes
async function testPropositionsFilters() {
  console.log('\n🔍 TEST SPÉCIFIQUE: Filtres Propositions de Thèmes');
  console.log('='.repeat(50));
  
  const token = await login(VERCEL_URL);
  if (!token) {
    console.log('❌ Impossible de se connecter pour tester les filtres');
    return;
  }
  
  const result = await testEndpoint(VERCEL_URL, '/api/propositions-themes', token, 'Propositions de thèmes');
  
  if (result.ok && result.data) {
    const propositions = Array.isArray(result.data) ? result.data : result.data.data || [];
    
    console.log(`\n📊 Analyse des données pour les filtres:`);
    console.log(`📦 Nombre de propositions: ${propositions.length}`);
    
    if (propositions.length > 0) {
      const sample = propositions[0];
      console.log(`🔍 Structure d'une proposition:`, Object.keys(sample));
      
      // Vérifier les champs nécessaires pour les filtres
      const requiredFields = ['auteur_type', 'difficulte', 'technologies_suggerees'];
      requiredFields.forEach(field => {
        const hasField = sample.hasOwnProperty(field);
        const value = sample[field];
        console.log(`📋 ${field}: ${hasField ? '✅' : '❌'} ${hasField ? `(${typeof value})` : 'MANQUANT'}`);
      });
      
      // Analyser les valeurs uniques pour les filtres
      const auteurTypes = [...new Set(propositions.map(p => p.auteur_type).filter(Boolean))];
      const difficultes = [...new Set(propositions.map(p => p.difficulte).filter(Boolean))];
      
      console.log(`🏷️ Types d'auteur disponibles:`, auteurTypes);
      console.log(`📊 Difficultés disponibles:`, difficultes);
    }
  }
}

async function main() {
  await compareEndpoints();
  await testPropositionsFilters();
}

main().catch(console.error);
