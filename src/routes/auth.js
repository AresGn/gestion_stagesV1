import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
const { query } = db;
import dotenv from 'dotenv';
import { protect } from '../middleware/auth.js';

// Load environment variables
dotenv.config();

const router = express.Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'votre_clef_secrete_très_longue_et_complexe';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

// Register Endpoint
router.post('/register', [
  // Validation
  body('nom').notEmpty().withMessage('Le nom est requis'),
  body('prenom').notEmpty().withMessage('Le prénom est requis'),
  body('telephone').notEmpty().withMessage('Le numéro de téléphone est requis'),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Email invalide'),
  body('matricule').notEmpty().withMessage('Le matricule est requis'),
  body('filiere_id').isInt().withMessage('La filière est requise'),
  body('mot_de_passe').isLength({ min: 6 }).withMessage('Mot de passe doit contenir au moins 6 caractères'),
  body('whatsapp').optional(),
], async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { nom, prenom, telephone, email, matricule, filiere_id, mot_de_passe, whatsapp } = req.body;

    // Check if user already exists with matricule
    const { rows: existingUsers } = await query(
      'SELECT * FROM public.utilisateurs WHERE matricule = $1',
      [matricule]
    );

    // Vérifie l'email seulement si il est fourni
    if (email && email.trim() !== '') {
      const { rows: existingEmails } = await query(
        'SELECT * FROM public.utilisateurs WHERE email = $1',
        [email]
      );

      if (existingEmails.length > 0) {
        return res.status(400).json({
          message: 'Un utilisateur avec cet email existe déjà'
        });
      }
    }

    if (existingUsers.length > 0) {
      return res.status(400).json({
        message: 'Un utilisateur avec ce matricule existe déjà'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(mot_de_passe, salt);

    // Insert user - convertir les chaînes vides en null pour email et whatsapp
    const { rows: result } = await query(
      'INSERT INTO public.utilisateurs (nom, prenom, telephone, email, matricule, filiere_id, mot_de_passe, whatsapp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [nom, prenom, telephone, (email && email.trim() !== '') ? email : null, matricule, filiere_id, hashedPassword, (whatsapp && whatsapp.trim() !== '') ? whatsapp : null]
    );

    // Generate JWT
    const token = jwt.sign(
      { id: result[0].id, role: 'etudiant' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    // Return success
    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'inscription',
      error: error.message
    });
  }
});

// Login Endpoint
router.post('/login', async (req, res) => {
  try {
    console.log('Body de la requête login:', req.body);
    const { matricule, password, mot_de_passe } = req.body;
    
    // Vérifier qu'au moins un des deux champs est présent
    if (!matricule) {
      return res.status(400).json({ 
        success: false, 
        message: 'Le matricule est requis' 
      });
    }

    if (!password && !mot_de_passe) {
      return res.status(400).json({ 
        success: false, 
        message: 'Le mot de passe est requis' 
      });
    }

    // Utiliser le mot de passe fourni (accepte les deux formats)
    const passwordToCheck = password || mot_de_passe;
    const cleanMatricule = matricule.trim();
    
    console.log('Tentative de connexion pour:', { matricule: cleanMatricule, passwordProvided: !!passwordToCheck });

    // LOGS AJOUTÉS POUR DIAGNOSTIC
    console.log('[auth.js login] Contenu de db importé:', db);
    console.log('[auth.js login] Type de query (avant appel):', typeof query);
    // Fin des LOGS AJOUTÉS

    // Test direct pour voir si on peut lire depuis public.utilisateurs
    const testResult = await db.query('SELECT COUNT(*) FROM public.utilisateurs');
    console.log('Test - Nombre d\'utilisateurs (public.utilisateurs):', testResult.rows[0].count);

    // Find user
    const { rows: users } = await query(
      'SELECT * FROM public.utilisateurs WHERE matricule = $1', 
      [cleanMatricule]
    );

    if (users.length === 0) {
      console.log('Utilisateur non trouvé avec matricule:', cleanMatricule);
      return res.status(401).json({ 
        success: false, 
        message: 'Identifiants invalides' 
      });
    }

    const user = users[0];
    console.log('Utilisateur trouvé:', { id: user.id, matricule: user.matricule });

    // Check password
    const isMatch = await bcrypt.compare(passwordToCheck, user.mot_de_passe);
    console.log('Résultat de la comparaison de mot de passe:', isMatch);
    
    if (!isMatch) {
      console.log('Mot de passe incorrect pour l\'utilisateur:', cleanMatricule);
      return res.status(401).json({ 
        success: false, 
        message: 'Identifiants invalides' 
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    // Return success with user data (excluding password)
    const userData = {...user};
    delete userData.mot_de_passe;
    
    console.log('Connexion réussie pour l\'utilisateur:', cleanMatricule);
    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la connexion',
      error: error.message
    });
  }
});

// Admin Login Endpoint
router.post('/admin/login', async (req, res) => {
  try {
    console.log('Body de la requête admin login:', req.body);
    const { matricule, password, mot_de_passe } = req.body;
    
    // Vérifier qu'au moins un des deux champs est présent
    if (!matricule) {
      return res.status(400).json({ 
        success: false, 
        message: 'Le matricule est requis' 
      });
    }

    if (!password && !mot_de_passe) {
      return res.status(400).json({ 
        success: false, 
        message: 'Le mot de passe est requis' 
      });
    }

    // Utiliser le mot de passe fourni (accepte les deux formats)
    const passwordToCheck = password || mot_de_passe;
    const cleanMatricule = matricule.trim();
    
    console.log('Tentative de connexion admin pour:', { matricule: cleanMatricule, passwordProvided: !!passwordToCheck });

    // Find admin
    console.log('Recherche dans la table administrateurs...');
    const { rows: admins } = await query(
      'SELECT * FROM public.administrateurs WHERE matricule = $1', 
      [cleanMatricule]
    );

    console.log('Résultat de la recherche admin:', { count: admins.length, found: admins.length > 0 });
    
    if (admins.length === 0) {
      console.log('Admin non trouvé dans la table administrateurs avec matricule:', cleanMatricule);
      
      // Essayer de trouver dans la table utilisateurs avec rôle admin
      console.log('Recherche dans la table utilisateurs avec rôle admin...');
      const { rows: adminUsers } = await query(
        'SELECT * FROM public.utilisateurs WHERE matricule = $1 AND role = $2', 
        [cleanMatricule, 'admin']
      );
      
      console.log('Résultat de la recherche utilisateur admin:', { count: adminUsers.length, found: adminUsers.length > 0 });
      
      if (adminUsers.length === 0) {
        return res.status(401).json({ 
          success: false, 
          message: 'Matricule ou mot de passe incorrect' 
        });
      }
      
      // Utiliser l'admin de la table utilisateurs
      const adminUser = adminUsers[0];
      console.log('Admin trouvé dans la table utilisateurs:', { id: adminUser.id, matricule: adminUser.matricule });
      
      // Check password
      const isMatch = await bcrypt.compare(passwordToCheck, adminUser.mot_de_passe);
      console.log('Résultat de la comparaison de mot de passe admin utilisateur:', isMatch);
      
      if (!isMatch) {
        console.log('Mot de passe incorrect pour admin utilisateur:', cleanMatricule);
        return res.status(401).json({ 
          success: false, 
          message: 'Matricule ou mot de passe incorrect' 
        });
      }
      
      // Generate JWT
      const token = jwt.sign(
        { id: adminUser.id, role: 'admin', matricule: adminUser.matricule },
        JWT_SECRET,
        { expiresIn: '12h' }
      );
      
      console.log('Connexion admin réussie depuis table utilisateurs pour:', cleanMatricule);
      return res.status(200).json({
        success: true,
        message: 'Connexion réussie',
        token,
        user: { 
          id: adminUser.id,
          nom: adminUser.nom,
          prenom: adminUser.prenom,
          email: adminUser.email,
          matricule: adminUser.matricule,
          role: 'admin'
        }
      });
    }

    const admin = admins[0];
    console.log('Admin trouvé dans table administrateurs:', { id: admin.id, matricule: admin.matricule });

    // Check password
    const isMatch = await bcrypt.compare(passwordToCheck, admin.mot_de_passe);
    console.log('Résultat de la comparaison de mot de passe admin:', isMatch);
    
    if (!isMatch) {
      console.log('Mot de passe incorrect pour admin:', cleanMatricule);
      return res.status(401).json({ 
        success: false, 
        message: 'Matricule ou mot de passe incorrect' 
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: admin.id, role: 'admin', matricule: admin.matricule },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    console.log('Connexion admin réussie pour:', cleanMatricule);
    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      token,
      user: { role: 'admin', matricule: admin.matricule }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la connexion',
      error: error.message
    });
  }
});

// Endpoint pour récupérer les informations de l'utilisateur connecté
router.get('/me', protect, async (req, res) => {
  try {
    console.log('Récupération des informations utilisateur:', req.user);

    // Pour les admins, chercher d'abord dans la table administrateurs
    if (req.user.role === 'admin') {
      console.log('Admin détecté, recherche dans la table administrateurs avec matricule:', req.user.matricule);
      const { rows: admins } = await query(
        'SELECT id, matricule FROM public.administrateurs WHERE matricule = $1', 
        [req.user.matricule]
      );
      
      if (admins.length > 0) {
        console.log('Admin trouvé dans la table administrateurs:', admins[0]);
        return res.status(200).json({
          success: true,
          data: {
            id: admins[0].id,
            matricule: admins[0].matricule,
            role: 'admin'
          }
        });
      } else {
        console.log('Admin non trouvé dans la table administrateurs, recherche dans utilisateurs');
      }
    }

    // Pour tous les autres utilisateurs ou admins non trouvés dans administrateurs
    if (req.user.id) {
      console.log('Recherche utilisateur avec ID:', req.user.id);
      const { rows: users } = await query(
        'SELECT id, nom, prenom, email, matricule, telephone, filiere_id, role FROM public.utilisateurs WHERE id = $1',
        [req.user.id]
      );

      if (users.length === 0) {
        console.log('Aucun utilisateur trouvé avec ID:', req.user.id);
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      console.log('Utilisateur trouvé dans la table utilisateurs:', users[0]);
      return res.status(200).json({
        success: true,
        data: users[0]
      });
    } else {
      console.log('Aucun ID utilisateur dans le token et non trouvé comme admin');
      return res.status(404).json({
        success: false,
        message: 'Informations utilisateur incomplètes'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des informations utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des informations utilisateur',
      error: error.message
    });
  }
});

/**
 * POST /api/auth/mark-pwa-installed
 * Marquer l'installation PWA pour l'utilisateur connecté
 */
router.post('/mark-pwa-installed', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { installedAt } = req.body;

    await query(
      'UPDATE utilisateurs SET pwa_installed_at = $1 WHERE id = $2',
      [installedAt || new Date().toISOString(), userId]
    );

    res.status(200).json({
      success: true,
      message: 'Installation PWA marquée avec succès'
    });

  } catch (error) {
    console.error('Erreur marquage installation PWA:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du marquage de l\'installation PWA',
      error: error.message
    });
  }
});

export default router;