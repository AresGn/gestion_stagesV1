// Vercel Serverless Function Handler
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Create express app
const app = express();

// Configuration CORS pour Vercel
const corsOptions = {
  origin: [
    'https://gestion-stages-v1.vercel.app',
    'https://*.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));
app.use(express.json());

// Middleware pour logger les requêtes
app.use((req, res, next) => {
  console.log(`[Vercel] ${req.method} ${req.url}`);
  console.log('DATABASE_URL présente:', !!process.env.DATABASE_URL);
  console.log('JWT_SECRET présente:', !!process.env.JWT_SECRET);
  next();
});

// Test route simple
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API Vercel fonctionne!',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    hasDatabase: !!process.env.DATABASE_URL,
    hasJWT: !!process.env.JWT_SECRET
  });
});

// Route de debug pour tester les imports
app.get('/api/debug', async (req, res) => {
  const debugInfo = {
    success: true,
    message: 'Debug info',
    timestamp: new Date().toISOString(),
    imports: {}
  };

  try {
    const authRoutesModule = await import('../src/routes/auth.js');
    debugInfo.imports.auth = {
      imported: true,
      hasDefault: !!authRoutesModule.default,
      type: typeof authRoutesModule.default
    };
  } catch (error) {
    debugInfo.imports.auth = {
      imported: false,
      error: error.message
    };
  }

  res.json(debugInfo);
});

// Route de test pour les variables d'environnement
app.get('/api/env-check', (req, res) => {
  res.json({
    success: true,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      hasDatabase: !!process.env.DATABASE_URL,
      hasJWT: !!process.env.JWT_SECRET,
      databasePrefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'Non définie'
    }
  });
});

// Import et setup des routes de manière conditionnelle
const setupRoutes = async () => {
  try {
    console.log('[Vercel] Starting setupRoutes...');

    // Vérification des variables d'environnement
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL manquante');
      return;
    }

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET manquante');
      return;
    }

    console.log('✅ Variables d\'environnement OK');

    // Créer les routes d'authentification directement ici pour éviter les problèmes d'import
    const authRouter = express.Router();

    // Route de test pour l'authentification
    authRouter.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Routes d\'authentification disponibles',
        routes: ['/login', '/admin/login', '/register', '/me']
      });
    });

    // Route de login simple pour test
    authRouter.post('/login', async (req, res) => {
      try {
        console.log('[Vercel] Login attempt:', req.body);

        // Import dynamique de la configuration DB
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        const { matricule, password } = req.body;

        if (!matricule || !password) {
          return res.status(400).json({
            success: false,
            message: 'Matricule et mot de passe requis'
          });
        }

        // Test de connexion DB
        const testResult = await db.query('SELECT COUNT(*) FROM public.utilisateurs');
        console.log('[Vercel] DB test - Nombre d\'utilisateurs:', testResult.rows[0].count);

        // Recherche utilisateur
        const { rows: users } = await db.query(
          'SELECT * FROM public.utilisateurs WHERE matricule = $1',
          [matricule.trim()]
        );

        if (users.length === 0) {
          return res.status(401).json({
            success: false,
            message: 'Identifiants invalides'
          });
        }

        // Import bcrypt et jwt
        const bcrypt = await import('bcrypt');
        const jwt = await import('jsonwebtoken');

        const user = users[0];
        const isMatch = await bcrypt.default.compare(password, user.mot_de_passe);

        if (!isMatch) {
          return res.status(401).json({
            success: false,
            message: 'Identifiants invalides'
          });
        }

        // Générer token
        const token = jwt.default.sign(
          { id: user.id, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        const userData = {...user};
        delete userData.mot_de_passe;

        res.json({
          success: true,
          message: 'Connexion réussie',
          token,
          user: userData
        });

      } catch (error) {
        console.error('[Vercel] Login error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la connexion',
          error: error.message
        });
      }
    });

    // Route d'admin login
    authRouter.post('/admin/login', async (req, res) => {
      try {
        console.log('[Vercel] Admin login attempt:', req.body);

        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        const { matricule, password } = req.body;

        if (!matricule || !password) {
          return res.status(400).json({
            success: false,
            message: 'Matricule et mot de passe requis'
          });
        }

        // Recherche admin dans la table administrateurs
        const { rows: admins } = await db.query(
          'SELECT * FROM public.administrateurs WHERE matricule = $1',
          [matricule.trim()]
        );

        let user = null;
        if (admins.length > 0) {
          user = admins[0];
        } else {
          // Recherche dans la table utilisateurs avec rôle admin
          const { rows: adminUsers } = await db.query(
            'SELECT * FROM public.utilisateurs WHERE matricule = $1 AND role = $2',
            [matricule.trim(), 'admin']
          );

          if (adminUsers.length > 0) {
            user = adminUsers[0];
          }
        }

        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'Matricule ou mot de passe incorrect'
          });
        }

        const bcrypt = await import('bcrypt');
        const jwt = await import('jsonwebtoken');

        const isMatch = await bcrypt.default.compare(password, user.mot_de_passe);

        if (!isMatch) {
          return res.status(401).json({
            success: false,
            message: 'Matricule ou mot de passe incorrect'
          });
        }

        const token = jwt.default.sign(
          { id: user.id, role: 'admin', matricule: user.matricule },
          process.env.JWT_SECRET,
          { expiresIn: '12h' }
        );

        res.json({
          success: true,
          message: 'Connexion réussie',
          token,
          user: {
            id: user.id,
            matricule: user.matricule,
            role: 'admin'
          }
        });

      } catch (error) {
        console.error('[Vercel] Admin login error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la connexion',
          error: error.message
        });
      }
    });

    // Route /me pour récupérer les informations de l'utilisateur connecté
    authRouter.get('/me', async (req, res) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            success: false,
            message: 'Token manquant'
          });
        }

        const token = authHeader.substring(7);
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET);

        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        // Pour les admins, chercher d'abord dans la table administrateurs
        if (decoded.role === 'admin') {
          const { rows: admins } = await db.query(
            'SELECT id, matricule FROM public.administrateurs WHERE matricule = $1',
            [decoded.matricule]
          );

          if (admins.length > 0) {
            return res.status(200).json({
              success: true,
              data: {
                id: admins[0].id,
                matricule: admins[0].matricule,
                role: 'admin'
              }
            });
          }
        }

        // Pour tous les autres utilisateurs ou admins non trouvés dans administrateurs
        if (decoded.id) {
          const { rows: users } = await db.query(
            'SELECT id, nom, prenom, email, matricule, telephone, filiere_id, role FROM public.utilisateurs WHERE id = $1',
            [decoded.id]
          );

          if (users.length === 0) {
            return res.status(404).json({
              success: false,
              message: 'Utilisateur non trouvé'
            });
          }

          return res.status(200).json({
            success: true,
            data: users[0]
          });
        } else {
          return res.status(404).json({
            success: false,
            message: 'Informations utilisateur incomplètes'
          });
        }
      } catch (error) {
        console.error('[Vercel] /me error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des informations utilisateur',
          error: error.message
        });
      }
    });

    // Configurer les routes d'authentification
    app.use('/api/auth', authRouter);
    console.log('[Vercel] /api/auth routes configured directly.');

    // Créer les routes pour les stages/internships
    const internshipsRouter = express.Router();

    // Middleware d'authentification pour les routes internships
    const authenticateToken = async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            success: false,
            message: 'Token manquant'
          });
        }

        const token = authHeader.substring(7);
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Token invalide'
        });
      }
    };

    // Route pour récupérer les offres de stage
    internshipsRouter.get('/offers', authenticateToken, async (req, res) => {
      try {
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        const { rows: offers } = await db.query(`
          SELECT
            ps.id,
            ps.titre,
            ps.description,
            ps.entreprise_id,
            ps.remuneration,
            ps.competences_requises,
            ps.date_limite_candidature,
            ps.statut,
            ps.created_at,
            e.nom as entreprise_nom,
            e.ville
          FROM public.propositions_stages ps
          LEFT JOIN public.entreprises e ON ps.entreprise_id = e.id
          WHERE ps.statut = 'active'
          ORDER BY ps.created_at DESC
        `);

        res.json({
          success: true,
          data: offers
        });
      } catch (error) {
        console.error('[Vercel] Offers error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des offres de stage',
          error: error.message
        });
      }
    });

    // Route pour récupérer les informations de stage d'un utilisateur
    internshipsRouter.get('/user/:userId', authenticateToken, async (req, res) => {
      try {
        const userId = req.params.userId;

        // Vérifier si l'utilisateur est autorisé
        if (req.user.id != userId && req.user.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'Non autorisé à accéder à ces informations'
          });
        }

        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        const { rows: internships } = await db.query(`
          SELECT
            s.*,
            e.nom as nom_entreprise,
            e.ville as entreprise_ville,
            e.departement,
            e.commune,
            e.quartier,
            e.email as email_entreprise,
            e.telephone as telephone_entreprise,
            ms.nom as nom_maitre_stage,
            ms.prenom as prenom_maitre_stage,
            ms.telephone as telephone_maitre_stage,
            ms.email as email_maitre_stage,
            ms.fonction as fonction_maitre_stage,
            mm.nom as nom_maitre_memoire,
            mm.telephone as telephone_maitre_memoire,
            mm.email as email_maitre_memoire,
            mm.statut as statut_maitre_memoire
          FROM public.stages s
          LEFT JOIN public.entreprises e ON s.entreprise_id = e.id
          LEFT JOIN public.maitres_stage ms ON s.maitre_stage_id = ms.id
          LEFT JOIN public.maitres_memoire mm ON s.maitre_memoire_id = mm.id
          WHERE s.etudiant_id = $1
          ORDER BY s.created_at DESC
        `, [userId]);

        // Retourner le premier stage s'il existe, sinon null
        const stageData = internships.length > 0 ? internships[0] : null;

        res.json({
          success: true,
          data: stageData
        });
      } catch (error) {
        console.error('[Vercel] User internships error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des informations de stage',
          error: error.message
        });
      }
    });

    // Route pour soumettre/modifier les informations de stage
    internshipsRouter.post('/submit', authenticateToken, async (req, res) => {
      try {
        console.log('[Vercel] 📝 Soumission formulaire stage');

        const {
          departement,
          commune,
          quartier,
          nomEntreprise,
          dateDebutStage,
          dateFinStage,
          themeMemoire,
          nomMaitreStage,
          prenomMaitreStage,
          telephoneMaitreStage,
          emailMaitreStage,
          fonctionMaitreStage,
          nomMaitreMemoire,
          telephoneMaitreMemoire,
          emailMaitreMemoire,
          statutMaitreMemoire
        } = req.body;

        // Validation des champs requis
        if (!departement || !commune || !quartier || !nomEntreprise || !dateDebutStage || !themeMemoire) {
          return res.status(400).json({
            success: false,
            message: 'Tous les champs obligatoires doivent être remplis',
            errors: [
              { path: 'departement', msg: 'Le département est requis' },
              { path: 'commune', msg: 'La commune est requise' },
              { path: 'quartier', msg: 'Le quartier est requis' },
              { path: 'nomEntreprise', msg: 'Le nom de l\'entreprise est requis' },
              { path: 'dateDebutStage', msg: 'La date de début est requise' },
              { path: 'themeMemoire', msg: 'Le thème de mémoire est requis' }
            ]
          });
        }

        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;
        const client = await db.connect();

        try {
          await client.query('BEGIN');

          // 1. Créer ou récupérer l'entreprise
          let entrepriseResult = await client.query(
            'SELECT id FROM entreprises WHERE nom = $1',
            [nomEntreprise]
          );

          let entrepriseId;
          if (entrepriseResult.rows.length === 0) {
            const newEntreprise = await client.query(
              'INSERT INTO entreprises (nom, departement, commune, quartier) VALUES ($1, $2, $3, $4) RETURNING id',
              [nomEntreprise, departement, commune, quartier]
            );
            entrepriseId = newEntreprise.rows[0].id;
          } else {
            entrepriseId = entrepriseResult.rows[0].id;
          }

          // 2. Créer ou récupérer le maître de stage
          let maitreStageId = null;
          if (nomMaitreStage && prenomMaitreStage) {
            let maitreStageResult = await client.query(
              'SELECT id FROM maitres_stage WHERE nom = $1 AND prenom = $2 AND entreprise_id = $3',
              [nomMaitreStage, prenomMaitreStage, entrepriseId]
            );

            if (maitreStageResult.rows.length === 0) {
              const newMaitreStage = await client.query(
                'INSERT INTO maitres_stage (nom, prenom, telephone, email, fonction, entreprise_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                [nomMaitreStage, prenomMaitreStage, telephoneMaitreStage, emailMaitreStage, fonctionMaitreStage, entrepriseId]
              );
              maitreStageId = newMaitreStage.rows[0].id;
            } else {
              maitreStageId = maitreStageResult.rows[0].id;
            }
          }

          // 3. Créer ou récupérer le maître de mémoire
          let maitreMemoireId = null;
          if (nomMaitreMemoire) {
            let maitreMemoireResult = await client.query(
              'SELECT id FROM maitres_memoire WHERE nom = $1',
              [nomMaitreMemoire]
            );

            if (maitreMemoireResult.rows.length === 0) {
              const newMaitreMemoire = await client.query(
                'INSERT INTO maitres_memoire (nom, telephone, email, statut) VALUES ($1, $2, $3, $4) RETURNING id',
                [nomMaitreMemoire, telephoneMaitreMemoire, emailMaitreMemoire, statutMaitreMemoire]
              );
              maitreMemoireId = newMaitreMemoire.rows[0].id;
            } else {
              maitreMemoireId = maitreMemoireResult.rows[0].id;
            }
          }

          // 4. Vérifier si un stage existe déjà pour cet étudiant
          const existingStage = await client.query(
            'SELECT id FROM stages WHERE etudiant_id = $1',
            [req.user.id]
          );

          if (existingStage.rows.length === 0) {
            // Créer un nouveau stage
            await client.query(
              'INSERT INTO stages (etudiant_id, entreprise_id, maitre_stage_id, maitre_memoire_id, date_debut, date_fin, theme_memoire) VALUES ($1, $2, $3, $4, $5, $6, $7)',
              [req.user.id, entrepriseId, maitreStageId, maitreMemoireId, dateDebutStage, dateFinStage || null, themeMemoire]
            );
          } else {
            // Mettre à jour le stage existant
            const stageId = existingStage.rows[0].id;
            await client.query(
              'UPDATE stages SET entreprise_id = $1, maitre_stage_id = $2, maitre_memoire_id = $3, date_debut = $4, date_fin = $5, theme_memoire = $6 WHERE id = $7',
              [entrepriseId, maitreStageId, maitreMemoireId, dateDebutStage, dateFinStage || null, themeMemoire, stageId]
            );
          }

          await client.query('COMMIT');

          console.log('[Vercel] ✅ Stage enregistré avec succès pour utilisateur:', req.user.id);

          res.status(200).json({
            success: true,
            message: 'Informations de stage enregistrées avec succès'
          });

        } catch (dbError) {
          await client.query('ROLLBACK');
          throw dbError;
        } finally {
          client.release();
        }

      } catch (error) {
        console.error('[Vercel] ❌ Erreur soumission stage:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de l\'enregistrement des informations de stage',
          error: error.message
        });
      }
    });

    app.use('/api/internships', internshipsRouter);
    console.log('[Vercel] /api/internships routes configured.');

    // Créer les routes admin de base
    const adminRouter = express.Router();

    // Middleware pour vérifier le rôle admin
    const requireAdmin = async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            success: false,
            message: 'Token manquant'
          });
        }

        const token = authHeader.substring(7);
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'Accès refusé - Droits administrateur requis'
          });
        }

        req.user = decoded;
        next();
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Token invalide'
        });
      }
    };

    // Route pour les statistiques générales
    adminRouter.get('/statistiques', requireAdmin, async (req, res) => {
      try {
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        // Statistiques de base
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

        // Ajouter les statistiques par filière pour le dashboard
        const { rows: etudiantsParFiliere } = await db.query(`
          SELECT
            f.nom as filiere,
            COUNT(u.id) as count
          FROM public.filieres f
          LEFT JOIN public.utilisateurs u ON f.id = u.filiere_id AND u.role = 'etudiant'
          GROUP BY f.id, f.nom
          ORDER BY f.nom
        `);

        console.log('[Vercel] Statistiques brutes:', {
          totalEtudiants,
          totalStages,
          totalEntreprises,
          totalOffres,
          etudiantsParFiliere: etudiantsParFiliere.map(item => ({
            filiere: item.filiere,
            count: item.count,
            countType: typeof item.count
          }))
        });

        res.json({
          success: true,
          data: {
            totalEtudiants: parseInt(totalEtudiants) || 0,
            totalStages: parseInt(totalStages) || 0,
            totalEntreprises: parseInt(totalEntreprises) || 0,
            totalOffres: parseInt(totalOffres) || 0,
            etudiantsParFiliere: etudiantsParFiliere.map(item => ({
              ...item,
              count: parseInt(item.count) || 0
            }))
          }
        });
      } catch (error) {
        console.error('[Vercel] Admin stats error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des statistiques',
          error: error.message
        });
      }
    });

    // Route pour lister les étudiants avec pagination
    adminRouter.get('/etudiants', requireAdmin, async (req, res) => {
      try {
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        // Paramètres de pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Filtres
        const filiere = req.query.filiere;
        const search = req.query.search || req.query.recherche; // Support des deux noms
        const statut = req.query.statut;
        const entreprise_nom = req.query.entreprise_nom;
        const maitre_stage_nom = req.query.maitre_stage_nom;
        const maitre_memoire_nom = req.query.maitre_memoire_nom;

        let whereClause = "WHERE u.role = 'etudiant'";
        let queryParams = [];
        let paramIndex = 1;

        if (filiere && filiere !== 'all') {
          whereClause += ` AND u.filiere_id = $${paramIndex}`;
          queryParams.push(filiere);
          paramIndex++;
        }

        if (search) {
          whereClause += ` AND (u.nom ILIKE $${paramIndex} OR u.prenom ILIKE $${paramIndex} OR u.matricule ILIKE $${paramIndex})`;
          queryParams.push(`%${search}%`);
          paramIndex++;
        }

        if (statut) {
          whereClause += ` AND s.statut = $${paramIndex}`;
          queryParams.push(statut);
          paramIndex++;
        }

        if (entreprise_nom) {
          whereClause += ` AND s.entreprise_nom ILIKE $${paramIndex}`;
          queryParams.push(`%${entreprise_nom}%`);
          paramIndex++;
        }

        if (maitre_stage_nom) {
          whereClause += ` AND s.maitre_stage_nom ILIKE $${paramIndex}`;
          queryParams.push(`%${maitre_stage_nom}%`);
          paramIndex++;
        }

        if (maitre_memoire_nom) {
          whereClause += ` AND s.maitre_memoire_nom ILIKE $${paramIndex}`;
          queryParams.push(`%${maitre_memoire_nom}%`);
          paramIndex++;
        }

        // Requête pour compter le total
        const countQuery = `
          SELECT COUNT(DISTINCT u.id) as total
          FROM public.utilisateurs u
          LEFT JOIN public.filieres f ON u.filiere_id = f.id
          LEFT JOIN public.stages s ON s.etudiant_id = u.id
          LEFT JOIN public.entreprises e ON s.entreprise_id = e.id
          LEFT JOIN public.utilisateurs ms ON s.maitre_stage_id = ms.id
          LEFT JOIN public.utilisateurs mm ON s.maitre_memoire_id = mm.id
          ${whereClause}
        `;

        // Requête pour récupérer les étudiants avec toutes les informations nécessaires
        const dataQuery = `
          SELECT
            u.id,
            u.nom,
            u.prenom,
            u.matricule,
            u.email,
            u.telephone,
            u.created_at,
            u.filiere_id,
            f.nom as filiere_nom,
            s.theme_memoire as stage_sujet,
            s.date_debut as stage_date_debut,
            s.date_fin as stage_date_fin,
            COALESCE(s.statut, 'non_defini') as statut,
            e.nom as entreprise_nom,
            e.adresse as entreprise_adresse,
            e.telephone as entreprise_telephone,
            e.email as entreprise_email,
            e.departement as entreprise_departement,
            e.commune as entreprise_commune,
            e.quartier as entreprise_quartier,
            ms.nom as maitre_stage_nom,
            ms.prenom as maitre_stage_prenom,
            ms.email as maitre_stage_email,
            ms.telephone as maitre_stage_telephone,
            mm.nom as maitre_memoire_nom,
            mm.prenom as maitre_memoire_prenom,
            mm.email as maitre_memoire_email
          FROM public.utilisateurs u
          LEFT JOIN public.filieres f ON u.filiere_id = f.id
          LEFT JOIN public.stages s ON s.etudiant_id = u.id
          LEFT JOIN public.entreprises e ON s.entreprise_id = e.id
          LEFT JOIN public.utilisateurs ms ON s.maitre_stage_id = ms.id
          LEFT JOIN public.utilisateurs mm ON s.maitre_memoire_id = mm.id
          ${whereClause}
          ORDER BY u.nom, u.prenom
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        queryParams.push(limit, offset);

        const [countResult, dataResult] = await Promise.all([
          db.query(countQuery, queryParams.slice(0, -2)),
          db.query(dataQuery, queryParams)
        ]);

        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);

        res.json({
          success: true,
          data: dataResult.rows, // Retourner directement le tableau pour compatibilité
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        });
      } catch (error) {
        console.error('[Vercel] Admin etudiants error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des étudiants',
          error: error.message
        });
      }
    });

    // Route pour la recherche d'étudiants
    adminRouter.get('/etudiants/search', requireAdmin, async (req, res) => {
      try {
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        const { q: term } = req.query;

        if (!term || term.trim() === '') {
          return res.status(400).json({
            success: false,
            message: 'Le terme de recherche ne peut pas être vide.'
          });
        }

        const searchTerm = `%${term}%`;
        const { rows: etudiants } = await db.query(`
          SELECT
            u.id,
            u.matricule,
            u.nom,
            u.prenom,
            f.nom as filiere
          FROM
            public.utilisateurs u
          LEFT JOIN
            public.filieres f ON u.filiere_id = f.id
          WHERE
            u.role = 'etudiant' AND
            (u.nom ILIKE $1 OR u.prenom ILIKE $1 OR u.matricule ILIKE $1)
          ORDER BY u.nom, u.prenom
          LIMIT 10
        `, [searchTerm]);

        res.json({
          success: true,
          data: etudiants
        });
      } catch (error) {
        console.error('[Vercel] Search etudiants error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la recherche des étudiants',
          error: error.message
        });
      }
    });

    // Route pour les statistiques par filière
    adminRouter.get('/statistiques/filiere', requireAdmin, async (req, res) => {
      try {
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        const { rows: stats } = await db.query(`
          SELECT
            f.id as filiere_id,
            f.nom as filiere_nom,
            COUNT(u.id) as nombre_etudiants,
            COUNT(s.id) as nombre_stages
          FROM public.filieres f
          LEFT JOIN public.utilisateurs u ON f.id = u.filiere_id AND u.role = 'etudiant'
          LEFT JOIN public.stages s ON u.id = s.etudiant_id
          GROUP BY f.id, f.nom
          ORDER BY f.nom
        `);

        res.json({
          success: true,
          data: stats.map(item => ({
            ...item,
            nombre_etudiants: parseInt(item.nombre_etudiants) || 0,
            nombre_stages: parseInt(item.nombre_stages) || 0
          }))
        });
      } catch (error) {
        console.error('[Vercel] Stats filiere error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des statistiques par filière',
          error: error.message
        });
      }
    });

    // Route pour les statistiques par entreprise
    adminRouter.get('/statistiques/entreprise', requireAdmin, async (req, res) => {
      try {
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        const { rows: stats } = await db.query(`
          SELECT
            e.nom as entreprise,
            COUNT(s.id) as nb_stages
          FROM public.entreprises e
          LEFT JOIN public.stages s ON e.id = s.entreprise_id
          GROUP BY e.id, e.nom
          HAVING COUNT(s.id) > 0
          ORDER BY nb_stages DESC
          LIMIT 10
        `);

        console.log('[Vercel] Statistiques entreprises brutes:', stats.map(item => ({
          entreprise: item.entreprise,
          nb_stages: item.nb_stages,
          nb_stages_type: typeof item.nb_stages
        })));

        res.json({
          success: true,
          data: stats.map(item => ({
            entreprise: item.entreprise,
            nb_stages: parseInt(item.nb_stages) || 0
          }))
        });
      } catch (error) {
        console.error('[Vercel] Stats entreprise error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des statistiques par entreprise',
          error: error.message
        });
      }
    });

    // Route pour les activités récentes
    adminRouter.get('/activites', requireAdmin, async (req, res) => {
      try {
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        // Créer des activités factices basées sur les données existantes
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

        // Convertir en format attendu par le frontend avec les bons types
        stages.forEach((stage, index) => {
          activites.push({
            id: stage.id + 1000, // Éviter les conflits d'ID
            type_activite: 'convention', // Type reconnu par le frontend (couleur purple)
            description: `Stage "${stage.theme_memoire || 'Sans titre'}" par ${stage.etudiant_prenom} ${stage.etudiant_nom}`,
            valeur: stage.entreprise_nom || null,
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

        projets.forEach((projet, index) => {
          activites.push({
            id: projet.id + 2000, // Éviter les conflits d'ID
            type_activite: 'memoire', // Type reconnu par le frontend (couleur indigo)
            description: `Projet "${projet.titre || 'Sans titre'}" par ${projet.auteur || 'Auteur inconnu'}`,
            valeur: null,
            date_activite: projet.created_at,
            user_id: null
          });
        });

        // Ajouter quelques activités d'inscription récentes pour plus de variété
        const { rows: inscriptions } = await db.query(`
          SELECT
            id,
            nom,
            prenom,
            created_at
          FROM public.utilisateurs
          WHERE role = 'etudiant'
          ORDER BY created_at DESC
          LIMIT 2
        `);

        inscriptions.forEach((user, index) => {
          activites.push({
            id: user.id + 3000, // Éviter les conflits d'ID
            type_activite: 'inscription', // Type reconnu par le frontend (couleur green)
            description: `Inscription de ${user.prenom} ${user.nom}`,
            valeur: null,
            date_activite: user.created_at,
            user_id: user.id
          });
        });

        // Trier par date décroissante
        activites.sort((a, b) => new Date(b.date_activite) - new Date(a.date_activite));

        res.json({
          success: true,
          data: activites.slice(0, 10)
        });
      } catch (error) {
        console.error('[Vercel] Activites error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des activités récentes',
          error: error.message
        });
      }
    });

    // Route pour les paramètres par filière
    adminRouter.get('/parametres/filiere', requireAdmin, async (req, res) => {
      try {
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        const { rows: filieres } = await db.query(`
          SELECT
            f.id as filiere_id,
            f.nom as filiere_nom,
            COUNT(DISTINCT u.id) as nb_etudiants,
            COUNT(DISTINCT s.id) as nb_stages_trouves
          FROM public.filieres f
          LEFT JOIN public.utilisateurs u ON f.id = u.filiere_id AND u.role = 'etudiant'
          LEFT JOIN public.stages s ON u.id = s.etudiant_id
          GROUP BY f.id, f.nom
          ORDER BY f.nom
        `);

        console.log('[Vercel] Paramètres filière bruts:', filieres.map(item => ({
          filiere_nom: item.filiere_nom,
          nb_etudiants: item.nb_etudiants,
          nb_stages_trouves: item.nb_stages_trouves,
          types: {
            nb_etudiants: typeof item.nb_etudiants,
            nb_stages_trouves: typeof item.nb_stages_trouves
          }
        })));

        res.json({
          success: true,
          data: filieres.map(item => ({
            filiere_id: item.filiere_id,
            filiere_nom: item.filiere_nom,
            nb_etudiants: parseInt(item.nb_etudiants) || 0,
            nb_stages_trouves: parseInt(item.nb_stages_trouves) || 0
          }))
        });
      } catch (error) {
        console.error('[Vercel] Parametres filiere error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des paramètres par filière',
          error: error.message
        });
      }
    });

    // Route pour les propositions de stage
    adminRouter.get('/propositions', requireAdmin, async (req, res) => {
      try {
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        const { rows: propositions } = await db.query(`
          SELECT
            ps.*,
            e.nom as entreprise_nom,
            e.ville as entreprise_ville
          FROM public.propositions_stages ps
          LEFT JOIN public.entreprises e ON ps.entreprise_id = e.id
          ORDER BY ps.created_at DESC
        `);

        res.json({
          success: true,
          data: {
            propositions: propositions
          }
        });
      } catch (error) {
        console.error('[Vercel] Propositions error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des propositions',
          error: error.message
        });
      }
    });

    // Route POST pour créer une proposition de stage
    adminRouter.post('/propositions', requireAdmin, async (req, res) => {
      try {
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        const {
          titre,
          description,
          requirements,
          entreprise_nom,
          entreprise_id,
          location,
          duration,
          filiere_id,
          statut = 'active'
        } = req.body;

        // Validation des données
        if (!titre || !description || !entreprise_nom) {
          return res.status(400).json({
            success: false,
            message: 'Le titre, la description et le nom de l\'entreprise sont requis'
          });
        }

        const { rows: result } = await db.query(`
          INSERT INTO public.propositions_stages (
            titre,
            description,
            requirements,
            entreprise_nom,
            entreprise_id,
            location,
            duration,
            filiere_id,
            statut,
            date_publication,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), NOW())
          RETURNING *
        `, [titre, description, requirements, entreprise_nom, entreprise_id, location, duration, filiere_id, statut]);

        res.status(201).json({
          success: true,
          message: 'Proposition de stage créée avec succès',
          data: {
            id: result[0].id,
            proposition: result[0]
          }
        });
      } catch (error) {
        console.error('[Vercel] Create proposition error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la création de la proposition de stage',
          error: error.message
        });
      }
    });

    // Route pour les propositions de thèmes (données factices basées sur les propositions de stages)
    adminRouter.get('/propositions-themes', requireAdmin, async (req, res) => {
      try {
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        // Récupérer les propositions de stages et les convertir en propositions de thèmes
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

        // Convertir en format attendu pour les propositions de thèmes
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
          date_soumission: prop.created_at,
          created_at: prop.created_at,
          updated_at: prop.created_at
        }));

        res.json(propositionsThemes);
      } catch (error) {
        console.error('[Vercel] Propositions themes error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des propositions de thèmes',
          error: error.message
        });
      }
    });

    // Route pour les notifications admin - GET
    adminRouter.get('/notifications', requireAdmin, async (req, res) => {
      try {
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        const { rows: notifications } = await db.query(`
          SELECT
            n.*,
            u.nom,
            u.prenom,
            u.email,
            u.telephone
          FROM public.notifications n
          JOIN public.utilisateurs u ON n.utilisateur_id = u.id
          ORDER BY n.created_at DESC
          LIMIT 100
        `);

        res.json({
          success: true,
          data: notifications
        });
      } catch (error) {
        console.error('[Vercel] Notifications admin error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des notifications',
          error: error.message
        });
      }
    });

    // Route pour les notifications admin - POST (créer une notification)
    adminRouter.post('/notifications', requireAdmin, async (req, res) => {
      try {
        const { destinataire, titre, message } = req.body;
        console.log('[Vercel] Creating admin notification:', { destinataire, titre, message });

        if (!destinataire || !destinataire.type || !message || !titre) {
          return res.status(400).json({
            success: false,
            message: 'Le type de destinataire, le titre et le message sont requis.'
          });
        }

        const { type, id: destinataireId } = destinataire;
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        let userIdsToNotify = [];

        if (type === 'etudiant') {
          if (!destinataireId) {
            return res.status(400).json({
              success: false,
              message: 'L\'utilisateur_id est requis pour le type "etudiant".'
            });
          }
          userIdsToNotify.push(destinataireId);
        } else if (type === 'filiere') {
          if (!destinataireId) {
            return res.status(400).json({
              success: false,
              message: 'Le filiere_id est requis pour le type "filiere".'
            });
          }
          const { rows: usersInFiliere } = await db.query(
            "SELECT id FROM public.utilisateurs WHERE role = 'etudiant' AND filiere_id = $1",
            [destinataireId]
          );
          userIdsToNotify = usersInFiliere.map(user => user.id);
          if (userIdsToNotify.length === 0) {
            return res.status(404).json({
              success: false,
              message: 'Aucun étudiant trouvé pour cette filière.'
            });
          }
        } else if (type === 'tous') {
          const { rows: allEtudiants } = await db.query(
            "SELECT id FROM public.utilisateurs WHERE role = 'etudiant'"
          );
          userIdsToNotify = allEtudiants.map(user => user.id);
          if (userIdsToNotify.length === 0) {
            return res.status(404).json({
              success: false,
              message: 'Aucun étudiant trouvé.'
            });
          }
        } else {
          return res.status(400).json({
            success: false,
            message: 'Type de destinataire invalide.'
          });
        }

        // Insérer les notifications en base
        const client = await db.pool.connect();
        try {
          await client.query('BEGIN');

          const insertPromises = userIdsToNotify.map(userId => {
            // Programmer SMS 10 secondes après création
            const scheduledSmsAt = new Date(Date.now() + 10 * 1000);
            return client.query(
              `INSERT INTO public.notifications (utilisateur_id, titre, message, scheduled_sms_at, escalation_level)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING id`,
              [userId, titre, message, scheduledSmsAt, 0]
            );
          });

          const results = await Promise.all(insertPromises);
          const createdCount = results.reduce((count, result) => count + result.rowCount, 0);

          await client.query('COMMIT');

          res.status(201).json({
            success: true,
            message: `${createdCount} notification(s) créée(s) avec succès.`,
            data: {
              count: createdCount
            }
          });

        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }

      } catch (error) {
        console.error('[Vercel] Create admin notification error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la création de la notification',
          error: error.message
        });
      }
    });

    // Routes pour les projets réalisés
    adminRouter.get('/projets-realises', requireAdmin, async (req, res) => {
      try {
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        const { rows: projets } = await db.query(`
          SELECT
            pr.*,
            f.nom as nom_filiere
          FROM public.projets_realises pr
          LEFT JOIN public.filieres f ON pr.filiere_id = f.id
          ORDER BY pr.created_at DESC
        `);

        res.json({
          success: true,
          data: projets
        });
      } catch (error) {
        console.error('[Vercel] Projets realises error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des projets réalisés',
          error: error.message
        });
      }
    });

    // Route pour créer un projet réalisé
    adminRouter.post('/projets-realises', requireAdmin, async (req, res) => {
      try {
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        const { titre, description, etudiant_id, technologies, url_demo, url_repo } = req.body;

        const { rows: result } = await db.query(`
          INSERT INTO public.projets_realises
          (titre, description, etudiant_id, technologies, url_demo, url_repo, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          RETURNING *
        `, [titre, description, etudiant_id, technologies, url_demo, url_repo]);

        res.status(201).json({
          success: true,
          data: result[0],
          message: 'Projet réalisé créé avec succès'
        });
      } catch (error) {
        console.error('[Vercel] Create projet error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la création du projet',
          error: error.message
        });
      }
    });

    // Route pour récupérer un projet par ID
    adminRouter.get('/projets-realises/:id', requireAdmin, async (req, res) => {
      try {
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        const { rows: projet } = await db.query(`
          SELECT
            pr.*,
            u.nom as etudiant_nom,
            u.prenom as etudiant_prenom,
            u.matricule as etudiant_matricule,
            f.nom as filiere_nom
          FROM public.projets_realises pr
          LEFT JOIN public.utilisateurs u ON pr.etudiant_id = u.id
          LEFT JOIN public.filieres f ON u.filiere_id = f.id
          WHERE pr.id = $1
        `, [req.params.id]);

        if (projet.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Projet non trouvé'
          });
        }

        res.json({
          success: true,
          data: projet[0]
        });
      } catch (error) {
        console.error('[Vercel] Get projet error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération du projet',
          error: error.message
        });
      }
    });

    // Route de debug SQL pour les administrateurs
    adminRouter.post('/debug', requireAdmin, async (req, res) => {
      try {
        const { query } = req.body;

        if (!query) {
          return res.status(400).json({
            success: false,
            message: 'La requête SQL est requise'
          });
        }

        // Vérifier que la requête est de type SELECT ou SHOW pour des raisons de sécurité
        const firstWord = query.trim().split(' ')[0].toUpperCase();
        if (!['SELECT', 'SHOW', 'DESCRIBE', 'DESC'].includes(firstWord)) {
          return res.status(403).json({
            success: false,
            message: 'Seules les requêtes SELECT, SHOW et DESCRIBE sont autorisées pour le débogage'
          });
        }

        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        const result = await db.query(query);

        res.json({
          success: true,
          data: result.rows,
          rowCount: result.rowCount
        });

      } catch (error) {
        console.error('[Vercel] Debug query error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de l\'exécution de la requête',
          error: error.message
        });
      }
    });

    // Route de debug pour exécuter des requêtes SQL (admin seulement)
    adminRouter.post('/debug', requireAdmin, async (req, res) => {
      try {
        const { query } = req.body;

        if (!query) {
          return res.status(400).json({
            success: false,
            message: 'La requête SQL est requise'
          });
        }

        // Vérifier que la requête est de type SELECT, SHOW ou DESCRIBE pour la sécurité
        const firstWord = query.trim().split(' ')[0].toUpperCase();
        if (!['SELECT', 'SHOW', 'DESCRIBE', 'DESC'].includes(firstWord)) {
          return res.status(403).json({
            success: false,
            message: 'Seules les requêtes SELECT, SHOW et DESCRIBE sont autorisées pour le débogage'
          });
        }

        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        const result = await db.query(query);

        res.json({
          success: true,
          data: result.rows,
          rowCount: result.rowCount
        });

      } catch (error) {
        console.error('[Vercel] Debug query error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de l\'exécution de la requête',
          error: error.message
        });
      }
    });

    app.use('/api/admin', adminRouter);
    console.log('[Vercel] /api/admin routes configured.');

    // ========================================
    // ROUTES POUR LES ÉTUDIANTS
    // ========================================

    // Routes pour les notifications
    const notificationsRouter = express.Router();

    // Middleware d'authentification pour les notifications
    const authenticateNotifications = async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            success: false,
            message: 'Token manquant'
          });
        }

        const token = authHeader.substring(7);
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Token invalide'
        });
      }
    };

    // GET /api/notifications
    notificationsRouter.get('/', authenticateNotifications, async (req, res) => {
      try {
        console.log('[Vercel] Fetching notifications for user:', req.user.id);

        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        // Vérifier d'abord si la table notifications existe
        const tableExists = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'notifications'
          );
        `);

        if (!tableExists.rows[0].exists) {
          console.log('[Vercel] Table notifications does not exist, returning empty array');
          return res.json({
            success: true,
            data: []
          });
        }

        const { rows: notifications } = await db.query(`
          SELECT
            id,
            titre,
            message,
            type,
            lue as is_read,
            utilisateur_id as user_id,
            created_at,
            priority,
            target_url,
            expires_at
          FROM public.notifications
          WHERE utilisateur_id = $1 OR utilisateur_id IS NULL
          ORDER BY created_at DESC
          LIMIT 20
        `, [req.user.id]);

        console.log('[Vercel] Found notifications:', notifications.length);

        res.json({
          success: true,
          data: notifications
        });
      } catch (error) {
        console.error('[Vercel] Notifications error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des notifications',
          error: error.message
        });
      }
    });

    // PUT /api/notifications/:id/read
    notificationsRouter.put('/:id/read', authenticateNotifications, async (req, res) => {
      try {
        const notificationId = req.params.id;
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        await db.query(`
          UPDATE public.notifications
          SET lue = true
          WHERE id = $1 AND (utilisateur_id = $2 OR utilisateur_id IS NULL)
        `, [notificationId, req.user.id]);

        res.json({
          success: true,
          message: 'Notification marquée comme lue'
        });
      } catch (error) {
        console.error('[Vercel] Mark notification read error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la mise à jour de la notification',
          error: error.message
        });
      }
    });

    // PUT /api/notifications/read-all
    notificationsRouter.put('/read-all', authenticateNotifications, async (req, res) => {
      try {
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        await db.query(`
          UPDATE public.notifications
          SET lue = true
          WHERE (utilisateur_id = $1 OR utilisateur_id IS NULL) AND lue = false
        `, [req.user.id]);

        res.json({
          success: true,
          message: 'Toutes les notifications marquées comme lues'
        });
      } catch (error) {
        console.error('[Vercel] Mark all notifications read error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la mise à jour des notifications',
          error: error.message
        });
      }
    });

    // POST /api/notifications - Créer une nouvelle notification (admin seulement)
    notificationsRouter.post('/', authenticateNotifications, async (req, res) => {
      try {
        // Vérifier que l'utilisateur est admin
        if (req.user.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'Accès refusé. Seuls les administrateurs peuvent créer des notifications.'
          });
        }

        const { destinataire, titre, message } = req.body;
        console.log('[Vercel] Creating notification:', { destinataire, titre, message });

        if (!destinataire || !destinataire.type || !message || !titre) {
          return res.status(400).json({
            success: false,
            message: 'Le type de destinataire, le titre et le message sont requis.'
          });
        }

        const { type, id: destinataireId } = destinataire;
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        let userIdsToNotify = [];

        if (type === 'etudiant') {
          if (!destinataireId) {
            return res.status(400).json({
              success: false,
              message: 'L\'utilisateur_id est requis pour le type "etudiant".'
            });
          }
          userIdsToNotify.push(destinataireId);
        } else if (type === 'filiere') {
          if (!destinataireId) {
            return res.status(400).json({
              success: false,
              message: 'Le filiere_id est requis pour le type "filiere".'
            });
          }
          const { rows: usersInFiliere } = await db.query(
            "SELECT id FROM public.utilisateurs WHERE role = 'etudiant' AND filiere_id = $1",
            [destinataireId]
          );
          userIdsToNotify = usersInFiliere.map(user => user.id);
          if (userIdsToNotify.length === 0) {
            return res.status(404).json({
              success: false,
              message: 'Aucun étudiant trouvé pour cette filière.'
            });
          }
        } else if (type === 'tous') {
          const { rows: allEtudiants } = await db.query(
            "SELECT id FROM public.utilisateurs WHERE role = 'etudiant'"
          );
          userIdsToNotify = allEtudiants.map(user => user.id);
          if (userIdsToNotify.length === 0) {
            return res.status(404).json({
              success: false,
              message: 'Aucun étudiant trouvé.'
            });
          }
        } else {
          return res.status(400).json({
            success: false,
            message: 'Type de destinataire invalide.'
          });
        }

        // Insérer les notifications en base
        const client = await db.pool.connect();
        try {
          await client.query('BEGIN');

          const insertPromises = userIdsToNotify.map(userId => {
            // Programmer SMS 10 secondes après création
            const scheduledSmsAt = new Date(Date.now() + 10 * 1000);
            return client.query(
              `INSERT INTO public.notifications (utilisateur_id, titre, message, scheduled_sms_at, escalation_level)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING id`,
              [userId, titre, message, scheduledSmsAt, 0]
            );
          });

          const results = await Promise.all(insertPromises);
          const createdCount = results.reduce((count, result) => count + result.rowCount, 0);

          await client.query('COMMIT');

          res.status(201).json({
            success: true,
            message: `${createdCount} notification(s) créée(s) avec succès.`,
            data: {
              count: createdCount
            }
          });

        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }

      } catch (error) {
        console.error('[Vercel] Create notification error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la création de la notification',
          error: error.message
        });
      }
    });

    app.use('/api/notifications', notificationsRouter);
    console.log('[Vercel] /api/notifications routes configured.');

    // Routes pour les projets publics
    const projetsPublicsRouter = express.Router();

    // Route pour récupérer tous les projets réalisés (publique)
    projetsPublicsRouter.get('/projets-realises', async (req, res) => {
      try {
        console.log('[Vercel] Fetching projets-realises...');

        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        const { rows: projets } = await db.query(`
          SELECT
            pr.id,
            pr.titre,
            pr.description,
            pr.auteur,
            pr.annee,
            pr.filiere_id,
            f.nom as nom_filiere,
            pr.technologies,
            pr.points_forts,
            pr.points_amelioration,
            pr.date_publication,
            pr.created_at,
            pr.updated_at
          FROM public.projets_realises pr
          LEFT JOIN public.filieres f ON pr.filiere_id = f.id
          ORDER BY pr.created_at DESC
        `);

        console.log('[Vercel] Found projets:', projets.length);

        // Retourner dans le format attendu par le frontend
        res.json({
          success: true,
          data: projets
        });
      } catch (error) {
        console.error('[Vercel] Projets publics error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des projets',
          error: error.message
        });
      }
    });

    // Route pour récupérer toutes les propositions de stages (publique)
    projetsPublicsRouter.get('/propositions-stages', async (req, res) => {
      try {
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        const { rows: propositions } = await db.query(`
          SELECT
            id,
            entreprise_nom,
            titre,
            location,
            description,
            requirements,
            duration,
            filiere_id,
            created_at,
            updated_at,
            date_publication,
            statut,
            entreprise_id
          FROM public.propositions_stages
          ORDER BY date_publication DESC, created_at DESC
        `);

        res.json(propositions);
      } catch (error) {
        console.error('[Vercel] Propositions stages error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des propositions de stages',
          error: error.message
        });
      }
    });

    // Route pour récupérer toutes les propositions de thèmes (publique)
    projetsPublicsRouter.get('/propositions-themes', async (req, res) => {
      try {
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        // Récupérer les propositions de stages et les convertir en propositions de thèmes
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

        // Convertir en format attendu pour les propositions de thèmes avec plus de variété
        const difficultes = ['Facile', 'Intermédiaire', 'Difficile', 'Non spécifiée'];
        const auteurTypes = ['entreprise', 'enseignant', 'etudiant'];
        const technologies = [
          ['React', 'Node.js', 'MongoDB'],
          ['Vue.js', 'Express', 'PostgreSQL'],
          ['Angular', 'Spring Boot', 'MySQL'],
          ['Python', 'Django', 'SQLite'],
          ['PHP', 'Laravel', 'MariaDB']
        ];

        const propositionsThemes = propositions.map((prop, index) => ({
          id: prop.id,
          titre: prop.titre,
          description: prop.description,
          auteur_nom: prop.entreprise_nom || `Auteur ${index + 1}`,
          auteur_type: auteurTypes[index % auteurTypes.length],
          filiere_id: null,
          nom_filiere: null,
          entreprise_nom: prop.entreprise_nom,
          email_contact: prop.email_contact,
          difficulte: difficultes[index % difficultes.length],
          technologies_suggerees: technologies[index % technologies.length],
          objectifs_pedagogiques: prop.description,
          est_validee: true,
          statut: 'approuvee',
          date_soumission: prop.created_at,
          created_at: prop.created_at,
          updated_at: prop.created_at
        }));

        res.json(propositionsThemes);
      } catch (error) {
        console.error('[Vercel] Propositions themes publiques error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des propositions de thèmes',
          error: error.message
        });
      }
    });

    // Route pour récupérer les filières (publique) - CORRIGÉE
    projetsPublicsRouter.get('/filieres', async (req, res) => {
      try {
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        // Requête corrigée sans la colonne description qui n'existe pas
        const { rows: filieres } = await db.query(`
          SELECT id, nom
          FROM public.filieres
          ORDER BY nom
        `);

        res.json(filieres);
      } catch (error) {
        console.error('[Vercel] Filieres error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des filières',
          error: error.message
        });
      }
    });

    // Route pour récupérer les entreprises (publique)
    projetsPublicsRouter.get('/entreprises', async (req, res) => {
      try {
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        const { rows: entreprises } = await db.query(`
          SELECT id, nom, secteur, ville, adresse, telephone, email, site_web
          FROM public.entreprises
          ORDER BY nom
        `);

        res.json(entreprises);
      } catch (error) {
        console.error('[Vercel] Entreprises error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des entreprises',
          error: error.message
        });
      }
    });

    // Route directe pour les filières (pour éviter les conflits de routage)
    app.get('/api/filieres', async (req, res) => {
      try {
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        // Vérifier d'abord la structure de la table
        const { rows: columns } = await db.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'filieres' AND table_schema = 'public'
        `);

        console.log('[Vercel] Colonnes disponibles dans filieres:', columns.map(c => c.column_name));

        // Requête adaptée selon les colonnes disponibles
        const hasDescription = columns.some(c => c.column_name === 'description');

        const selectClause = hasDescription ?
          'SELECT id, nom, description FROM public.filieres' :
          'SELECT id, nom FROM public.filieres';

        const { rows: filieres } = await db.query(`
          ${selectClause}
          ORDER BY nom
        `);

        res.json(filieres);
      } catch (error) {
        console.error('[Vercel] Direct filieres error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des filières',
          error: error.message
        });
      }
    });

    // Route de test pour diagnostiquer les problèmes de routage
    app.get('/api/test-routes', (req, res) => {
      res.json({
        success: true,
        message: 'Routes de test disponibles',
        routes: {
          filieres: '/api/filieres',
          entreprises: '/api/entreprises',
          propositions_stages: '/api/propositions-stages',
          propositions_themes: '/api/propositions-themes'
        },
        timestamp: new Date().toISOString()
      });
    });

    app.use('/api', projetsPublicsRouter);
    console.log('[Vercel] /api (projets publics) routes configured.');

  } catch (error) {
    console.error('[Vercel] Error setting up routes:', error);
  }
};

// Setup routes et démarrer le scheduler de manière asynchrone
async function initializeServer() {
  try {
    await setupRoutes();

    // Démarrer le SMS Scheduler pour test (10 secondes)
    console.log('[Vercel] Démarrage du SMS Scheduler TEST (10 secondes)...');
    const SMSSchedulerModule = await import('../src/schedulers/SMSScheduler.js');
    if (SMSSchedulerModule && SMSSchedulerModule.default) {
      SMSSchedulerModule.default.start();
      console.log('✅ SMS Scheduler TEST démarré avec succès (délai 10s, vérification 10s)');
    } else {
      console.error('❌ Impossible de charger le SMS Scheduler');
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error.message);
  }
}

initializeServer();

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Vercel] Server error:', err);
  return res.status(500).json({
    success: false,
    message: 'Erreur serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Erreur interne'
  });
});

// Routes pour les notifications push
const pushRouter = express.Router();

// Route pour obtenir la clé VAPID publique
pushRouter.get('/vapid-key', (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(500).json({
      success: false,
      message: 'Clé VAPID publique non configurée'
    });
  }

  res.json({
    success: true,
    publicKey: publicKey
  });
});

// Route pour s'abonner aux notifications push
pushRouter.post('/subscribe', async (req, res) => {
  try {
    // Pour l'instant, utiliser un userId par défaut (à corriger plus tard avec l'auth)
    const userId = req.body.userId || 1;
    const subscription = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({
        success: false,
        message: 'Données d\'abonnement invalides'
      });
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    const dbModule = await import('../src/config/db.js');
    const db = dbModule.default;

    // Vérifier si l'abonnement existe déjà
    const { rows: existing } = await db.query(
      'SELECT id FROM push_subscriptions WHERE utilisateur_id = $1 AND endpoint = $2',
      [userId, endpoint]
    );

    if (existing.length > 0) {
      // Mettre à jour l'abonnement existant
      await db.query(
        `UPDATE push_subscriptions
         SET p256dh_key = $1, auth_key = $2, updated_at = CURRENT_TIMESTAMP, is_active = TRUE
         WHERE utilisateur_id = $3 AND endpoint = $4`,
        [p256dh, auth, userId, endpoint]
      );
    } else {
      // Créer un nouvel abonnement
      await db.query(
        `INSERT INTO push_subscriptions (utilisateur_id, endpoint, p256dh_key, auth_key, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, endpoint, p256dh, auth, 'Web Browser']
      );
    }

    res.json({
      success: true,
      message: 'Abonnement push enregistré avec succès',
      data: { userId, endpoint }
    });

  } catch (error) {
    console.error('[Vercel] Push subscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'abonnement push',
      error: error.message
    });
  }
});

// Route pour lister les abonnements push
pushRouter.get('/subscriptions', async (req, res) => {
  try {
    const dbModule = await import('../src/config/db.js');
    const db = dbModule.default;

    const { rows: subscriptions } = await db.query(`
      SELECT
        ps.id,
        ps.utilisateur_id,
        ps.endpoint,
        ps.is_active,
        ps.created_at,
        u.nom,
        u.prenom,
        u.email
      FROM push_subscriptions ps
      JOIN utilisateurs u ON ps.utilisateur_id = u.id
      WHERE ps.is_active = TRUE
      ORDER BY ps.created_at DESC
    `);

    res.json({
      success: true,
      data: subscriptions
    });

  } catch (error) {
    console.error('[Vercel] Push subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des abonnements',
      error: error.message
    });
  }
});

// Route pour tester les notifications push avec authentification
pushRouter.post('/test', async (req, res) => {
  try {
    console.log('[Vercel] 🧪 Test notification push demandé');

    // Vérification de l'authentification
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant'
      });
    }

    const token = authHeader.substring(7);
    const jwt = await import('jsonwebtoken');
    let decoded;

    try {
      decoded = jwt.default.verify(token, process.env.JWT_SECRET);
      console.log('[Vercel] 🔐 Token valide pour utilisateur:', decoded.id);
    } catch (jwtError) {
      console.error('[Vercel] ❌ Token invalide:', jwtError.message);
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification invalide'
      });
    }

    const userId = decoded.id;

    // Import du service de notifications push avec gestion d'erreur
    let PushNotificationService;
    try {
      const PushNotificationServiceModule = await import('../src/services/PushNotificationService.js');
      PushNotificationService = PushNotificationServiceModule.default;
      console.log('[Vercel] ✅ PushNotificationService importé avec succès');
    } catch (importError) {
      console.error('[Vercel] ❌ Erreur import PushNotificationService:', importError);
      return res.status(500).json({
        success: false,
        message: 'Service push non configuré - Erreur d\'import',
        error: importError.message
      });
    }

    // Vérifier que le service est bien configuré
    if (!PushNotificationService) {
      console.error('[Vercel] ❌ PushNotificationService non disponible');
      return res.status(500).json({
        success: false,
        message: 'Service push non configuré - Service non disponible'
      });
    }

    console.log('[Vercel] 📡 Envoi notification de test pour utilisateur:', userId);

    // Version simplifiée du test de notification directement dans Vercel
    try {
      console.log('[Vercel] 🔄 Étape 1: Import web-push...');
      // Import de webpush
      const webpush = await import('web-push');
      console.log('[Vercel] ✅ Étape 1: web-push importé');

      console.log('[Vercel] 🔄 Étape 2: Configuration VAPID...');
      // Configuration VAPID
      if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.default.setVapidDetails(
          process.env.VAPID_SUBJECT || 'mailto:admin@insti.edu',
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );
        console.log('[Vercel] ✅ Étape 2: Configuration VAPID réussie');
      } else {
        console.warn('[Vercel] ⚠️ Étape 2: Clés VAPID manquantes');
        return res.status(500).json({
          success: false,
          message: 'Clés VAPID non configurées'
        });
      }

      console.log('[Vercel] 🔄 Étape 3: Import base de données...');
      // Récupérer les abonnements de l'utilisateur
      const dbModule = await import('../src/config/db.js');
      const db = dbModule.default;
      console.log('[Vercel] ✅ Étape 3: Base de données importée');

      console.log('[Vercel] 🔄 Étape 4: Requête abonnements pour userId:', userId);
      const { rows: subscriptions } = await db.query(
        'SELECT * FROM push_subscriptions WHERE utilisateur_id = $1 AND is_active = TRUE',
        [userId]
      );
      console.log('[Vercel] ✅ Étape 4: Requête terminée, abonnements trouvés:', subscriptions.length);

      if (subscriptions.length === 0) {
        console.log('[Vercel] ⚠️ Aucun abonnement actif trouvé pour userId:', userId);
        return res.status(400).json({
          success: false,
          message: 'Aucun abonnement push actif trouvé'
        });
      }

      console.log('[Vercel] 🔄 Étape 5: Préparation payload...');
      // Payload de test
      const testPayload = {
        title: '🎓 Test INSTI',
        message: 'Test de notification push depuis Vercel - ' + new Date().toLocaleTimeString(),
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-urgent.png',
        targetUrl: '/student/dashboard'
      };
      console.log('[Vercel] ✅ Étape 5: Payload préparé:', testPayload);

      let sent = 0;
      let failed = 0;
      const results = [];

      console.log('[Vercel] 🔄 Étape 6: Envoi aux abonnements...');
      // Envoyer à tous les abonnements
      for (const subscription of subscriptions) {
        try {
          console.log('[Vercel] 🔄 Envoi vers:', subscription.endpoint.substring(0, 50) + '...');
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh_key,
              auth: subscription.auth_key
            }
          };

          await webpush.default.sendNotification(pushSubscription, JSON.stringify(testPayload));
          sent++;
          results.push({ endpoint: subscription.endpoint.substring(0, 50) + '...', success: true });
          console.log('[Vercel] ✅ Notification envoyée vers:', subscription.endpoint.substring(0, 50) + '...');
        } catch (error) {
          failed++;
          results.push({ endpoint: subscription.endpoint.substring(0, 50) + '...', success: false, error: error.message });
          console.error('[Vercel] ❌ Erreur envoi vers:', subscription.endpoint.substring(0, 50) + '...', error.message);
        }
      }

      console.log('[Vercel] ✅ Étape 6: Envoi terminé - Sent:', sent, 'Failed:', failed);

      console.log('[Vercel] 🔄 Étape 7: Préparation réponse...');
      res.json({
        success: sent > 0,
        message: `Test terminé: ${sent} envoyées, ${failed} échouées`,
        data: {
          userId: userId,
          sent: sent,
          failed: failed,
          total: subscriptions.length,
          results: results
        }
      });
      console.log('[Vercel] ✅ Étape 7: Réponse envoyée avec succès');

    } catch (testError) {
      console.error('[Vercel] ❌ Erreur test notification:', testError);
      console.error('[Vercel] ❌ Stack trace:', testError.stack);
      console.error('[Vercel] ❌ Erreur détaillée:', {
        name: testError.name,
        message: testError.message,
        code: testError.code,
        statusCode: testError.statusCode
      });

      res.status(500).json({
        success: false,
        message: 'Erreur lors du test de notification',
        error: testError.message,
        errorName: testError.name,
        errorCode: testError.code,
        stack: process.env.NODE_ENV === 'development' ? testError.stack : undefined
      });
    }

  } catch (error) {
    console.error('[Vercel] ❌ Erreur test push:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de la notification de test',
      error: error.message
    });
  }
});

// Route pour s'abonner aux notifications push avec authentification
pushRouter.post('/subscribe', async (req, res) => {
  try {
    console.log('[Vercel] 📱 Demande d\'abonnement push');

    // Vérification de l'authentification
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant'
      });
    }

    const token = authHeader.substring(7);
    const jwt = await import('jsonwebtoken');
    let decoded;

    try {
      decoded = jwt.default.verify(token, process.env.JWT_SECRET);
      console.log('[Vercel] 🔐 Token valide pour utilisateur:', decoded.id);
    } catch (jwtError) {
      console.error('[Vercel] ❌ Token invalide:', jwtError.message);
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification invalide'
      });
    }

    const userId = decoded.id;
    const subscription = req.body;

    // Validation de l'abonnement
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({
        success: false,
        message: 'Données d\'abonnement invalides'
      });
    }

    console.log('[Vercel] 💾 Enregistrement abonnement pour utilisateur:', userId);

    // Import du service de notifications push avec gestion d'erreur
    let PushNotificationService;
    try {
      const PushNotificationServiceModule = await import('../src/services/PushNotificationService.js');
      PushNotificationService = PushNotificationServiceModule.default;
      console.log('[Vercel] ✅ PushNotificationService importé pour abonnement');
    } catch (importError) {
      console.error('[Vercel] ❌ Erreur import PushNotificationService pour abonnement:', importError);
      return res.status(500).json({
        success: false,
        message: 'Service push non configuré pour abonnement',
        error: importError.message
      });
    }

    const result = await PushNotificationService.subscribe(userId, subscription);

    console.log('[Vercel] ✅ Abonnement enregistré:', result);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { userId, endpoint: subscription.endpoint }
    });

  } catch (error) {
    console.error('[Vercel] ❌ Erreur abonnement push:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'abonnement aux notifications push',
      error: error.message
    });
  }
});

// Route pour nettoyer les anciens abonnements
pushRouter.post('/clean-subscriptions', async (req, res) => {
  try {
    console.log('[Vercel] 🧹 Nettoyage des anciens abonnements');

    // Vérification de l'authentification
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant'
      });
    }

    const token = authHeader.substring(7);
    const jwt = await import('jsonwebtoken');
    let decoded;

    try {
      decoded = jwt.default.verify(token, process.env.JWT_SECRET);
      console.log('[Vercel] 🔐 Token valide pour utilisateur:', decoded.id);
    } catch (jwtError) {
      console.error('[Vercel] ❌ Token invalide:', jwtError.message);
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification invalide'
      });
    }

    const userId = decoded.id;

    // Import de la base de données
    const dbModule = await import('../src/config/db.js');
    const db = dbModule.default;

    // Désactiver les anciens abonnements pour cet utilisateur
    const result = await db.query(
      'UPDATE push_subscriptions SET is_active = FALSE WHERE utilisateur_id = $1',
      [userId]
    );

    console.log('[Vercel] 🗑️ Abonnements nettoyés pour utilisateur:', userId, 'Lignes affectées:', result.rowCount);

    res.json({
      success: true,
      message: 'Anciens abonnements nettoyés',
      cleaned: result.rowCount
    });

  } catch (error) {
    console.error('[Vercel] ❌ Erreur nettoyage abonnements:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du nettoyage des abonnements',
      error: error.message
    });
  }
});

// Route de diagnostic pour identifier le problème exact
pushRouter.get('/diagnostic', async (req, res) => {
  try {
    console.log('[Vercel] 🔍 Diagnostic push notifications');

    const diagnostic = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      vapid: {
        publicKey: !!process.env.VAPID_PUBLIC_KEY,
        privateKey: !!process.env.VAPID_PRIVATE_KEY,
        subject: !!process.env.VAPID_SUBJECT
      },
      database: !!process.env.DATABASE_URL,
      jwt: !!process.env.JWT_SECRET
    };

    // Test import web-push
    try {
      const webpush = await import('web-push');
      diagnostic.webpush = {
        imported: true,
        version: webpush.default ? 'default available' : 'no default'
      };
    } catch (webpushError) {
      diagnostic.webpush = {
        imported: false,
        error: webpushError.message
      };
    }

    // Test import database
    try {
      const dbModule = await import('../src/config/db.js');
      diagnostic.database_import = {
        imported: true,
        hasDefault: !!dbModule.default
      };
    } catch (dbError) {
      diagnostic.database_import = {
        imported: false,
        error: dbError.message
      };
    }

    console.log('[Vercel] 📊 Diagnostic complet:', diagnostic);

    res.json({
      success: true,
      message: 'Diagnostic des notifications push',
      data: diagnostic
    });

  } catch (error) {
    console.error('[Vercel] ❌ Erreur diagnostic:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du diagnostic',
      error: error.message,
      stack: error.stack
    });
  }
});

app.use('/api/push', pushRouter);

// Routes SMS pour Vercel
const smsRouter = express.Router();

// Route pour tester l'envoi SMS direct
smsRouter.post('/test', async (req, res) => {
  try {
    console.log('[Vercel] 📱 Test SMS direct demandé');

    // Vérification de l'authentification
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant'
      });
    }

    const token = authHeader.substring(7);
    const jwt = await import('jsonwebtoken');
    let decoded;

    try {
      decoded = jwt.default.verify(token, process.env.JWT_SECRET);
      console.log('[Vercel] 🔐 Token valide pour test SMS');
    } catch (jwtError) {
      console.error('[Vercel] ❌ Token invalide:', jwtError.message);
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification invalide'
      });
    }

    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        message: 'Numéro de téléphone et message requis'
      });
    }

    // Utiliser directement l'API TextBee comme le script qui fonctionne
    const API_KEY = process.env.TEXTBEE_API_KEY;
    const DEVICE_ID = process.env.TEXTBEE_DEVICE_ID;

    if (!API_KEY || !DEVICE_ID) {
      return res.status(500).json({
        success: false,
        message: 'Clés API TextBee non configurées'
      });
    }

    console.log('[Vercel] 📤 Envoi SMS direct vers:', phoneNumber);
    console.log('[Vercel] 📝 Message:', message);

    // Import axios pour l'appel API
    const axios = await import('axios');

    // Appel direct à l'API TextBee (comme le script qui fonctionne)
    const response = await axios.default.post(
      `https://api.textbee.dev/api/v1/gateway/devices/${DEVICE_ID}/send-sms`,
      {
        recipients: [phoneNumber],
        message: message
      },
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('[Vercel] ✅ Réponse TextBee:', response.data);

    res.json({
      success: true,
      message: 'SMS envoyé avec succès via TextBee API',
      data: {
        phoneNumber: phoneNumber,
        messageLength: message.length,
        textbeeResponse: response.data
      }
    });

  } catch (error) {
    console.error('[Vercel] ❌ Erreur test SMS:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du test SMS',
      error: error.message
    });
  }
});

// Route pour obtenir le statut du scheduler SMS
smsRouter.get('/scheduler/status', async (req, res) => {
  try {
    console.log('[Vercel] 📊 Statut scheduler SMS demandé');

    // Vérification de l'authentification
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant'
      });
    }

    const token = authHeader.substring(7);
    const jwt = await import('jsonwebtoken');

    try {
      jwt.default.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification invalide'
      });
    }

    // Statut simulé pour test
    const status = {
      isRunning: true,
      lastCheck: new Date().toISOString(),
      stats: {
        totalChecks: 42,
        smsProcessed: 5,
        smsSuccessful: 4,
        smsFailed: 1
      }
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('[Vercel] ❌ Erreur statut scheduler:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut',
      error: error.message
    });
  }
});

// Route pour test SMS direct avec TextBee API
smsRouter.post('/test-direct', async (req, res) => {
  try {
    console.log('[Vercel] 📱 Test SMS direct avec TextBee API');

    // Vérification de l'authentification
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant'
      });
    }

    const token = authHeader.substring(7);
    const jwt = await import('jsonwebtoken');

    try {
      jwt.default.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification invalide'
      });
    }

    // Configuration TextBee avec vos clés API
    const API_KEY = process.env.TEXTBEE_API_KEY;
    const DEVICE_ID = process.env.TEXTBEE_DEVICE_ID;

    if (!API_KEY || !DEVICE_ID) {
      return res.status(500).json({
        success: false,
        message: 'Clés API TextBee non configurées'
      });
    }

    // Numéro de test et message
    const phoneNumber = '+229 51885851';
    const message = `🧪 Test SMS INSTI - ${new Date().toLocaleTimeString()} - Système SMS automatique fonctionnel !`;

    console.log('[Vercel] 📤 Envoi SMS direct vers:', phoneNumber);
    console.log('[Vercel] 📝 Message:', message);

    // Import axios pour l'appel API
    const axios = await import('axios');

    // Appel direct à l'API TextBee
    const response = await axios.default.post(
      `https://api.textbee.dev/api/v1/gateway/devices/${DEVICE_ID}/send-sms`,
      {
        recipients: [phoneNumber],
        message: message
      },
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('[Vercel] ✅ Réponse TextBee:', response.data);

    res.json({
      success: true,
      message: 'SMS envoyé avec succès via TextBee API',
      data: {
        phoneNumber: phoneNumber,
        messageLength: message.length,
        textbeeResponse: response.data
      }
    });

  } catch (error) {
    console.error('[Vercel] ❌ Erreur test SMS direct:', error);

    let errorMessage = 'Erreur lors de l\'envoi du SMS';
    if (error.response) {
      errorMessage = `Erreur TextBee: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`;
      console.error('[Vercel] ❌ Réponse erreur TextBee:', error.response.data);
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message
    });
  }
});

// Route pour forcer une vérification du scheduler
smsRouter.post('/scheduler/force-check', async (req, res) => {
  try {
    console.log('[Vercel] 🔄 Vérification forcée scheduler SMS');

    // Vérification de l'authentification
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant'
      });
    }

    const token = authHeader.substring(7);
    const jwt = await import('jsonwebtoken');

    try {
      jwt.default.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification invalide'
      });
    }

    // Test SMS direct au lieu de simuler
    console.log('[Vercel] 📱 Envoi SMS de test au lieu de vérification forcée');

    // Rediriger vers le test SMS direct
    const testResponse = await fetch(`${req.protocol}://${req.get('host')}/api/sms/test-direct`, {
      method: 'POST',
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json'
      }
    });

    const testResult = await testResponse.json();

    res.json({
      success: testResult.success,
      message: testResult.success ? 'SMS de test envoyé au lieu de vérification forcée' : testResult.message,
      data: testResult.data
    });

  } catch (error) {
    console.error('[Vercel] ❌ Erreur vérification forcée:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification forcée',
      error: error.message
    });
  }
});

// Route de test SMS simple (sans auth pour debug)
smsRouter.get('/ping', (req, res) => {
  res.json({
    success: true,
    message: 'Routes SMS fonctionnelles',
    timestamp: new Date().toISOString(),
    routes: ['/test', '/test-direct', '/scheduler/status', '/scheduler/force-check']
  });
});

app.use('/api/sms', smsRouter);

// 404 handler
app.use((req, res) => {
  console.log(`[Vercel] Route non trouvée: ${req.method} ${req.url}`);
  return res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Export for Vercel
export default app;
