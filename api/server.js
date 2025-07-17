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
            ps.duree,
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
            e.nom as entreprise_nom,
            e.ville as entreprise_ville
          FROM public.stages s
          LEFT JOIN public.entreprises e ON s.entreprise_id = e.id
          WHERE s.etudiant_id = $1
          ORDER BY s.created_at DESC
        `, [userId]);

        res.json({
          success: true,
          data: internships
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

        res.json({
          success: true,
          data: {
            totalEtudiants: parseInt(totalEtudiants),
            totalStages: parseInt(totalStages),
            totalEntreprises: parseInt(totalEntreprises),
            totalOffres: parseInt(totalOffres)
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

    // Route pour lister les étudiants
    adminRouter.get('/etudiants', requireAdmin, async (req, res) => {
      try {
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        const { rows: etudiants } = await db.query(`
          SELECT
            u.id,
            u.nom,
            u.prenom,
            u.matricule,
            u.email,
            u.telephone,
            u.created_at,
            f.nom as filiere_nom
          FROM public.utilisateurs u
          LEFT JOIN public.filieres f ON u.filiere_id = f.id
          WHERE u.role = 'etudiant'
          ORDER BY u.nom, u.prenom
        `);

        res.json({
          success: true,
          data: etudiants
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
          data: stats
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
            e.id,
            e.nom,
            e.ville,
            COUNT(s.id) as nombre_stages,
            COUNT(ps.id) as nombre_offres
          FROM public.entreprises e
          LEFT JOIN public.stages s ON e.id = s.entreprise_id
          LEFT JOIN public.propositions_stages ps ON e.id = ps.entreprise_id
          GROUP BY e.id, e.nom, e.ville
          ORDER BY nombre_stages DESC, nombre_offres DESC
          LIMIT 10
        `);

        res.json({
          success: true,
          data: stats
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

        const { rows: activites } = await db.query(`
          SELECT
            'stage' as type,
            s.id,
            s.titre,
            s.created_at,
            u.nom as etudiant_nom,
            u.prenom as etudiant_prenom,
            e.nom as entreprise_nom
          FROM public.stages s
          JOIN public.utilisateurs u ON s.etudiant_id = u.id
          LEFT JOIN public.entreprises e ON s.entreprise_id = e.id
          ORDER BY s.created_at DESC
          LIMIT 10
        `);

        res.json({
          success: true,
          data: activites
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
            f.description,
            COUNT(u.id) as nombre_etudiants
          FROM public.filieres f
          LEFT JOIN public.utilisateurs u ON f.id = u.filiere_id AND u.role = 'etudiant'
          GROUP BY f.id, f.nom, f.description
          ORDER BY f.nom
        `);

        res.json({
          success: true,
          data: filieres
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

    // Route pour les propositions de thèmes
    adminRouter.get('/propositions-themes', requireAdmin, async (req, res) => {
      try {
        const dbModule = await import('../src/config/db.js');
        const db = dbModule.default;

        const { rows: themes } = await db.query(`
          SELECT
            pt.*,
            f.nom as filiere_nom
          FROM public.propositions_themes pt
          LEFT JOIN public.filieres f ON pt.filiere_id = f.id
          ORDER BY pt.created_at DESC
        `);

        res.json({
          success: true,
          data: themes
        });
      } catch (error) {
        console.error('[Vercel] Propositions themes error:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des propositions de thèmes',
          error: error.message
        });
      }
    });

    // Route pour les notifications admin
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

    app.use('/api/admin', adminRouter);
    console.log('[Vercel] /api/admin routes configured.');

  } catch (error) {
    console.error('[Vercel] Error setting up routes:', error);
  }
};

// Setup routes de manière asynchrone
setupRoutes().catch(console.error);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Vercel] Server error:', err);
  return res.status(500).json({
    success: false,
    message: 'Erreur serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Erreur interne'
  });
});

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
