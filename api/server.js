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

    // Configurer les routes d'authentification
    app.use('/api/auth', authRouter);
    console.log('[Vercel] /api/auth routes configured directly.');

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
