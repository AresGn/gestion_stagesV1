import express from 'express';
import {
  getNotificationsForUser,
  getUnreadNotificationsForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  markNotificationAsDisplayed,
  createNotification,
  getAllNotificationsForAdmin
} from '../controllers/NotificationsController.js';
import { protect } from '../middleware/auth.js'; // Assurez-vous que ce middleware expose req.user.id

const router = express.Router();

// Récupérer toutes les notifications pour l'admin
router.get('/admin', protect, getAllNotificationsForAdmin);

// Récupérer uniquement les notifications non lues (pour le polling)
router.get('/unread', protect, getUnreadNotificationsForUser);

// Marquer toutes les notifications comme lues
router.put('/read-all', protect, markAllNotificationsAsRead);

// Marquer une notification spécifique comme lue
router.put('/:id/read', protect, markNotificationAsRead);

// Marquer une notification comme affichée (pour le système simple)
router.post('/:id/displayed', protect, markNotificationAsDisplayed);

// Créer une nouvelle notification (admin seulement)
router.post('/', protect, createNotification);

// Récupérer les notifications pour l'utilisateur connecté
router.get('/', protect, getNotificationsForUser);

export default router; 