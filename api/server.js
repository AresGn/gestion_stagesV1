// Vercel Serverless Function Handler
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Vérifier les variables d'environnement critiques
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL n\'est pas définie dans les variables d\'environnement');
  throw new Error('DATABASE_URL is required');
}

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET n\'est pas définie dans les variables d\'environnement');
  throw new Error('JWT_SECRET is required');
}

console.log('✅ Variables d\'environnement chargées pour Vercel');
console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'production'}`);

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
  next();
});

// Middleware pour gérer les erreurs de parsing JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Erreur de parsing JSON:', err);
    return res.status(400).json({ 
      success: false, 
      message: 'JSON invalide' 
    });
  }
  next(err);
});

// Import routes dynamically
const setupRoutes = async () => {
  try {
    console.log('[Vercel] Starting setupRoutes...');
    
    // Routes for auth
    const authRoutesModule = await import('../src/routes/auth.js');
    if (authRoutesModule && authRoutesModule.default) {
      app.use('/api/auth', authRoutesModule.default);
      console.log('[Vercel] /api/auth routes configured.');
    }
    
    // Routes for internships
    const internshipsRoutesModule = await import('../src/routes/internships.js');
    if (internshipsRoutesModule && internshipsRoutesModule.default) {
      app.use('/api/internships', internshipsRoutesModule.default);
      console.log('[Vercel] /api/internships routes configured.');
    }
    
    // Routes for admin
    const adminRoutesModule = await import('../src/routes/admin.js');
    if (adminRoutesModule && adminRoutesModule.default) {
      app.use('/api/admin', adminRoutesModule.default);
      console.log('[Vercel] /api/admin routes configured.');
    }
    
    // Routes for notifications
    const notificationsRoutesModule = await import('../src/routes/notifications.js');
    if (notificationsRoutesModule && notificationsRoutesModule.default) {
      app.use('/api/notifications', notificationsRoutesModule.default);
      console.log('[Vercel] /api/notifications routes configured.');
    }
    
    // Routes for public projects
    const projetsPublicsRoutesModule = await import('../src/routes/projetsPublics.js');
    if (projetsPublicsRoutesModule && projetsPublicsRoutesModule.default) {
      app.use('/api', projetsPublicsRoutesModule.default);
      console.log('[Vercel] /api (projetsPublics) routes configured.');
    }
    
    // Routes for SMS
    const smsRoutesModule = await import('../src/routes/sms.js');
    if (smsRoutesModule && smsRoutesModule.default) {
      app.use('/api/sms', smsRoutesModule.default);
      console.log('[Vercel] /api/sms routes configured.');
    }

    // Test route
    app.get('/api/test', (req, res) => {
      res.json({ 
        success: true, 
        message: 'API Vercel fonctionne!',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV
      });
    });

  } catch (error) {
    console.error('[Vercel] Error setting up routes:', error);
    throw error;
  }
};

// Setup routes
await setupRoutes();

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
