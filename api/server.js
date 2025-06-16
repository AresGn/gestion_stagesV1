// Vercel Serverless Function Handler
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

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

    // Import conditionnel des routes
    try {
      const authRoutesModule = await import('../src/routes/auth.js');
      if (authRoutesModule && authRoutesModule.default) {
        app.use('/api/auth', authRoutesModule.default);
        console.log('[Vercel] /api/auth routes configured.');
      }
    } catch (error) {
      console.error('[Vercel] Erreur import auth routes:', error.message);
    }

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
