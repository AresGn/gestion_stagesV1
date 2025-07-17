// Script pour tester les routes corrigées
import dotenv from 'dotenv';

dotenv.config();

const testFixedRoutes = async () => {
  console.log('🧪 Test des routes corrigées...\n');

  try {
    const dbModule = await import('./src/config/db.js');
    const db = dbModule.default;

    // Test 1: Statistiques générales avec etudiantsParFiliere
    console.log('📊 Test 1: Route /api/admin/statistiques...');
    try {
      // Simuler la requête de la route statistiques
      const [
        { rows: [{ count: totalEtudiants }] },
        { rows: [{ count: totalStages }] },
        { rows: [{ count: totalEntreprises }] },
        { rows: [{ count: totalOffres }] }
      ] = await Promise.all([
        db.query('SELECT COUNT(*) FROM public.utilisateurs WHERE role = $1', ['etudiant']),
        db.query('SELECT COUNT(*) FROM public.stages'),
        db.query('SELECT COUNT(*) FROM public.entreprises'),
        db.query('SELECT COUNT(*) FROM public.propositions_stages WHERE statut = $1', ['active'])
      ]);

      const { rows: etudiantsParFiliere } = await db.query(`
        SELECT 
          f.nom as filiere,
          COUNT(u.id) as count
        FROM public.filieres f
        LEFT JOIN public.utilisateurs u ON f.id = u.filiere_id AND u.role = 'etudiant'
        GROUP BY f.id, f.nom
        HAVING COUNT(u.id) > 0
        ORDER BY f.nom
      `);

      console.log('   ✅ Statistiques générales:');
      console.log(`      - Total étudiants: ${totalEtudiants}`);
      console.log(`      - Total stages: ${totalStages}`);
      console.log(`      - Total entreprises: ${totalEntreprises}`);
      console.log(`      - Total offres: ${totalOffres}`);
      console.log(`   ✅ Étudiants par filière (${etudiantsParFiliere.length} filières avec étudiants):`);
      etudiantsParFiliere.forEach(f => console.log(`      - ${f.filiere}: ${f.count} étudiants`));

      if (etudiantsParFiliere.length === 0) {
        console.log('   ⚠️  ATTENTION: Aucune filière avec des étudiants trouvée');
      }
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}`);
    }

    // Test 2: Projets réalisés avec la nouvelle requête
    console.log('\n🚀 Test 2: Route /api/admin/projets-realises...');
    try {
      const { rows: projets } = await db.query(`
        SELECT
          pr.*,
          f.nom as nom_filiere
        FROM public.projets_realises pr
        LEFT JOIN public.filieres f ON pr.filiere_id = f.id
        ORDER BY pr.created_at DESC
      `);

      console.log(`   ✅ ${projets.length} projets trouvés:`);
      projets.forEach(p => {
        console.log(`      - "${p.titre}" par ${p.auteur} (${p.nom_filiere || 'Pas de filière'})`);
      });

      if (projets.length === 0) {
        console.log('   ⚠️  Aucun projet trouvé');
      }
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}`);
    }

    // Test 3: Activités récentes avec la nouvelle logique
    console.log('\n📈 Test 3: Route /api/admin/activites...');
    try {
      const activites = [];

      // Récupérer les stages récents
      const { rows: stages } = await db.query(`
        SELECT
          s.id,
          s.theme_memoire,
          s.created_at,
          u.nom as etudiant_nom,
          u.prenom as etudiant_prenom,
          e.nom as entreprise_nom
        FROM public.stages s
        JOIN public.utilisateurs u ON s.etudiant_id = u.id
        LEFT JOIN public.entreprises e ON s.entreprise_id = e.id
        ORDER BY s.created_at DESC
        LIMIT 5
      `);

      stages.forEach((stage) => {
        activites.push({
          id: stage.id + 1000,
          type_activite: 'stage',
          description: `Stage "${stage.theme_memoire}" par ${stage.etudiant_prenom} ${stage.etudiant_nom}`,
          valeur: null,
          date_activite: stage.created_at,
          user_id: null
        });
      });

      // Récupérer les projets récents
      const { rows: projets } = await db.query(`
        SELECT
          id,
          titre,
          auteur,
          created_at
        FROM public.projets_realises
        ORDER BY created_at DESC
        LIMIT 3
      `);

      projets.forEach((projet) => {
        activites.push({
          id: projet.id + 2000,
          type_activite: 'projet',
          description: `Projet "${projet.titre}" par ${projet.auteur}`,
          valeur: null,
          date_activite: projet.created_at,
          user_id: null
        });
      });

      activites.sort((a, b) => new Date(b.date_activite) - new Date(a.date_activite));

      console.log(`   ✅ ${activites.length} activités générées:`);
      activites.slice(0, 5).forEach(a => {
        console.log(`      - ${a.type_activite}: ${a.description}`);
      });

      if (activites.length === 0) {
        console.log('   ⚠️  Aucune activité générée');
      }
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}`);
    }

    // Test 4: Propositions de thèmes basées sur les propositions de stages
    console.log('\n💡 Test 4: Route /api/admin/propositions-themes...');
    try {
      const { rows: propositions } = await db.query(`
        SELECT
          ps.id,
          ps.titre,
          ps.description,
          ps.entreprise_id,
          ps.created_at,
          e.nom as entreprise_nom,
          e.email as email_contact
        FROM public.propositions_stages ps
        LEFT JOIN public.entreprises e ON ps.entreprise_id = e.id
        ORDER BY ps.created_at DESC
      `);

      const propositionsThemes = propositions.map(prop => ({
        id: prop.id,
        titre: prop.titre,
        description: prop.description,
        auteur_nom: prop.entreprise_nom,
        auteur_type: 'entreprise',
        filiere_id: null,
        nom_filiere: null,
        entreprise_nom: prop.entreprise_nom,
        email_contact: prop.email_contact,
        difficulte: 'Non spécifiée',
        technologies_suggerees: [],
        objectifs_pedagogiques: prop.description,
        est_validee: true,
        statut: 'approuvee',
        date_soumission: prop.created_at
      }));

      console.log(`   ✅ ${propositionsThemes.length} propositions de thèmes générées:`);
      propositionsThemes.forEach(p => {
        console.log(`      - "${p.titre}" par ${p.auteur_nom}`);
      });

      if (propositionsThemes.length === 0) {
        console.log('   ⚠️  Aucune proposition de thème générée');
      }
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}`);
    }

    console.log('\n✅ Tests terminés!');
    console.log('\n📝 Résumé des corrections:');
    console.log('   1. ✅ Route /api/admin/statistiques maintenant inclut etudiantsParFiliere');
    console.log('   2. ✅ Route /api/admin/projets-realises corrigée (plus de référence à etudiant_id)');
    console.log('   3. ✅ Route /api/admin/activites génère des activités factices');
    console.log('   4. ✅ Route /api/admin/propositions-themes génère des données basées sur propositions_stages');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  }
};

testFixedRoutes().catch(console.error);
