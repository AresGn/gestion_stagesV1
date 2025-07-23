import express from 'express';
import { body, validationResult } from 'express-validator';
import db from '../config/db.js';
const { pool } = db;
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Route pour récupérer les informations de stage d'un étudiant
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Vérifier si l'utilisateur est autorisé à accéder à ces informations
    if (req.user.id != userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à accéder à ces informations'
      });
    }

    // Récupérer les informations de stage
    const { rows: stages } = await db.query(`
      SELECT s.*, e.nom as nom_entreprise, e.departement, e.commune, e.quartier,
             ms.nom as nom_maitre_stage, ms.prenom as prenom_maitre_stage, 
             ms.telephone as telephone_maitre_stage, ms.email as email_maitre_stage, 
             ms.fonction as fonction_maitre_stage,
             mm.nom as nom_maitre_memoire, mm.telephone as telephone_maitre_memoire, 
             mm.email as email_maitre_memoire, mm.statut as statut_maitre_memoire
      FROM stages s
      LEFT JOIN entreprises e ON s.entreprise_id = e.id
      LEFT JOIN maitres_stage ms ON s.maitre_stage_id = ms.id
      LEFT JOIN maitres_memoire mm ON s.maitre_memoire_id = mm.id
      WHERE s.etudiant_id = $1
    `, [userId]);

    res.status(200).json({
      success: true,
      data: stages.length > 0 ? stages[0] : null
    });
  } catch (error) {
    console.error('Get internship error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des informations de stage'
    });
  }
});

// Route pour créer ou mettre à jour un stage
router.post('/submit', protect, [
  // Validation des données
  body('departement').notEmpty().withMessage('Le département est requis'),
  body('commune').notEmpty().withMessage('La commune est requise'),
  body('quartier').notEmpty().withMessage('Le quartier est requis'),
  body('nomEntreprise').notEmpty().withMessage("Le nom de l'entreprise est requis"),
  body('dateDebutStage').notEmpty().withMessage('La date de début est requise'),
  // Date de fin optionnelle
  
  // Informations sur l'étudiant
  body('themeMemoire').notEmpty().withMessage("Le thème de mémoire est requis"),
  
  // Informations sur le maître de stage
  body('nomMaitreStage').notEmpty().withMessage('Le nom du maître de stage est requis'),
  body('prenomMaitreStage').notEmpty().withMessage('Le prénom du maître de stage est requis'),
  body('telephoneMaitreStage').notEmpty().withMessage('Le téléphone du maître de stage est requis'),
  body('emailMaitreStage').isEmail().withMessage("L'email du maître de stage doit être valide"),
  body('fonctionMaitreStage').notEmpty().withMessage('La fonction du maître de stage est requise'),
  
  // Informations sur le maître de mémoire
  body('nomMaitreMemoire').notEmpty().withMessage('Le nom du maître de mémoire est requis'),
  body('telephoneMaitreMemoire').notEmpty().withMessage('Le téléphone du maître de mémoire est requis'),
  body('emailMaitreMemoire').isEmail().withMessage("L'email du maître de mémoire doit être valide"),
  body('statutMaitreMemoire').notEmpty().withMessage('Le statut du maître de mémoire est requis'),
], async (req, res) => {
  // Vérifier les erreurs de validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
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

    // Début d'une transaction
    const client = await pool.connect();
    await client.query('BEGIN');

    try {
      // 1. Vérifier si l'entreprise existe déjà
      const { rows: existingEnterpriseRows } = await client.query(
        'SELECT id FROM entreprises WHERE nom = $1 AND departement = $2 AND commune = $3 AND quartier = $4',
        [nomEntreprise, departement, commune, quartier]
      );

      let entrepriseId;
      
      // Si l'entreprise n'existe pas, l'ajouter
      if (existingEnterpriseRows.length === 0) {
        const { rows: newEnterpriseRows } = await client.query(
          'INSERT INTO entreprises (nom, departement, commune, quartier) VALUES ($1, $2, $3, $4) RETURNING id',
          [nomEntreprise, departement, commune, quartier]
        );
        entrepriseId = newEnterpriseRows[0].id;
      } else {
        entrepriseId = existingEnterpriseRows[0].id;
      }

      // 2. Vérifier si le maître de stage existe déjà
      let { rows: existingMaitreStageRows } = await client.query(
        'SELECT id FROM maitres_stage WHERE nom = $1 AND prenom = $2 AND email = $3',
        [nomMaitreStage, prenomMaitreStage, emailMaitreStage]
      );

      let maitreStageId;
      
      if (existingMaitreStageRows.length === 0) {
        const { rows: newMaitreStageRows } = await client.query(
          'INSERT INTO maitres_stage (nom, prenom, telephone, email, fonction, entreprise_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
          [nomMaitreStage, prenomMaitreStage, telephoneMaitreStage, emailMaitreStage, fonctionMaitreStage, entrepriseId]
        );
        maitreStageId = newMaitreStageRows[0].id;
      } else {
        maitreStageId = existingMaitreStageRows[0].id;
        await client.query(
          'UPDATE maitres_stage SET telephone = $1, fonction = $2, entreprise_id = $3 WHERE id = $4',
          [telephoneMaitreStage, fonctionMaitreStage, entrepriseId, maitreStageId]
        );
      }

      // 3. Vérifier si le maître de mémoire existe déjà
      let { rows: existingMaitreMemoireRows } = await client.query(
        'SELECT id FROM maitres_memoire WHERE nom = $1 AND email = $2',
        [nomMaitreMemoire, emailMaitreMemoire]
      );

      let maitreMemoireId;
      
      if (existingMaitreMemoireRows.length === 0) {
        const { rows: newMaitreMemoireRows } = await client.query(
          'INSERT INTO maitres_memoire (nom, telephone, email, statut) VALUES ($1, $2, $3, $4) RETURNING id',
          [nomMaitreMemoire, telephoneMaitreMemoire, emailMaitreMemoire, statutMaitreMemoire]
        );
        maitreMemoireId = newMaitreMemoireRows[0].id;
      } else {
        maitreMemoireId = existingMaitreMemoireRows[0].id;
        await client.query(
          'UPDATE maitres_memoire SET telephone = $1, statut = $2 WHERE id = $3',
          [telephoneMaitreMemoire, statutMaitreMemoire, maitreMemoireId]
        );
      }

      // 4. Vérifier si un stage existe déjà pour cet étudiant
      const { rows: existingStageRows } = await client.query(
        'SELECT id FROM stages WHERE etudiant_id = $1',
        [req.user.id]
      );

      // let stageId; // Supprimé car non utilisé
      
      // Si le stage n'existe pas, l'ajouter
      if (existingStageRows.length === 0) {
        await client.query( // newStageRows n'est pas utilisé, donc on ne le stocke pas
          'INSERT INTO stages (etudiant_id, entreprise_id, maitre_stage_id, maitre_memoire_id, date_debut, date_fin, theme_memoire) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
          [req.user.id, entrepriseId, maitreStageId, maitreMemoireId, dateDebutStage, dateFinStage || null, themeMemoire]
        );
        // stageId = newStageRows[0].id; // Supprimé
      } else {
        const stageToUpdateId = existingStageRows[0].id;
        await client.query(
          'UPDATE stages SET entreprise_id = $1, maitre_stage_id = $2, maitre_memoire_id = $3, date_debut = $4, date_fin = $5, theme_memoire = $6 WHERE id = $7',
          [entrepriseId, maitreStageId, maitreMemoireId, dateDebutStage, dateFinStage || null, themeMemoire, stageToUpdateId]
        );
      }

      // Commit de la transaction
      await client.query('COMMIT');
client.release();
    } catch (error) {
      // Rollback en cas d'erreur
      await client.query('ROLLBACK');
      client.release();
      throw error;
    }
    
    res.status(200).json({
      success: true,
      message: 'Informations de stage enregistrées avec succès'
    });
    
  } catch (error) {
    console.error('Submit internship error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement des informations de stage'
    });
  }
});

export default router; 