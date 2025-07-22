/**
 * Service de gestion des notifications étendues
 * Intègre PWA Push + SMS automatique après 12h
 */

import db from '../config/db.js';
import TextBeeService from './TextBeeService.js';
import PushNotificationService from './PushNotificationService.js';

class NotificationService {
  
  /**
   * Créer une notification avec programmation SMS automatique
   * @param {number} userId - ID de l'utilisateur
   * @param {string} title - Titre de la notification
   * @param {string} message - Message de la notification
   * @param {string} type - Type de notification ('push', 'sms', 'both')
   * @param {string} targetUrl - URL cible (optionnel)
   * @returns {Promise<Object>} Notification créée
   */
  async createNotification(userId, title, message, type = 'push', targetUrl = null) {
    try {
      // Calculer l'heure de programmation SMS (15 secondes après maintenant pour test)
      const scheduledSmsAt = new Date(Date.now() + 15 * 1000); // +15 secondes

      const { rows: result } = await db.query(`
        INSERT INTO notifications (
          utilisateur_id, 
          titre, 
          message, 
          type, 
          target_url,
          scheduled_sms_at,
          escalation_level
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [userId, title, message, type, targetUrl, scheduledSmsAt, 0]);

      const notification = result[0];
      
      console.log(`📋 Notification créée (ID: ${notification.id}) pour utilisateur ${userId}`);
      console.log(`⏰ SMS programmé pour: ${scheduledSmsAt.toLocaleString()}`);

      return notification;

    } catch (error) {
      console.error('❌ Erreur création notification:', error);
      throw error;
    }
  }

  /**
   * Envoyer une notification push et programmer le SMS de suivi
   * @param {Object} notification - Objet notification
   * @returns {Promise<Object>} Résultat de l'envoi
   */
  async sendPushNotification(notification) {
    try {
      console.log(`📱 Envoi notification push pour notification ${notification.id}`);

      // Envoyer la notification push via le service existant
      const pushResult = await PushNotificationService.sendToUser(
        notification.utilisateur_id,
        {
          title: notification.titre,
          message: notification.message,
          targetUrl: notification.target_url,
          notificationId: notification.id
        }
      );

      // Marquer comme envoyée en push
      await this.updateNotificationStatus(notification.id, 'sent', 'push');

      // Programmer le job SMS de suivi
      await this.scheduleFollowUpSMS(notification);

      console.log(`✅ Notification push envoyée et SMS programmé pour notification ${notification.id}`);

      return {
        success: true,
        pushResult,
        smsScheduled: true,
        scheduledAt: notification.scheduled_sms_at
      };

    } catch (error) {
      console.error('❌ Erreur envoi push:', error);
      throw error;
    }
  }

  /**
   * Programmer un SMS de suivi
   * @param {Object} notification - Objet notification
   * @returns {Promise<void>}
   */
  async scheduleFollowUpSMS(notification) {
    try {
      await db.query(`
        INSERT INTO scheduled_jobs (
          notification_id, 
          job_type, 
          scheduled_at,
          status
        )
        VALUES ($1, $2, $3, $4)
      `, [
        notification.id, 
        'sms_followup', 
        notification.scheduled_sms_at,
        'pending'
      ]);

      console.log(`⏰ Job SMS programmé pour notification ${notification.id}`);

    } catch (error) {
      console.error('❌ Erreur programmation SMS:', error);
      throw error;
    }
  }

  /**
   * Vérifier les notifications non lues qui nécessitent un SMS
   * @returns {Promise<Array>} Liste des notifications à traiter
   */
  async checkUnreadNotifications() {
    try {
      const { rows: notifications } = await db.query(`
        SELECT 
          n.*,
          u.telephone,
          u.prenom,
          u.email
        FROM notifications n
        JOIN utilisateurs u ON n.utilisateur_id = u.id
        WHERE n.lue = FALSE 
        AND n.push_sent_at IS NOT NULL
        AND n.sms_sent_at IS NULL
        AND n.scheduled_sms_at <= NOW()
        AND u.telephone IS NOT NULL
        AND u.telephone != ''
        ORDER BY n.scheduled_sms_at ASC
      `);

      console.log(`🔍 ${notifications.length} notifications trouvées pour SMS de suivi`);
      
      return notifications;

    } catch (error) {
      console.error('❌ Erreur vérification notifications:', error);
      throw error;
    }
  }

  /**
   * Envoyer un SMS de suivi pour une notification
   * @param {Object} notification - Notification avec données utilisateur
   * @returns {Promise<Object>} Résultat de l'envoi
   */
  async sendFollowUpSMS(notification) {
    try {
      console.log(`📱 Envoi SMS de suivi pour notification ${notification.id}`);

      // Créer le message SMS
      const smsMessage = TextBeeService.formatStageNotificationSMS(
        notification.prenom,
        notification.titre,
        notification.message
      );

      // Envoyer le SMS
      const smsResult = await TextBeeService.sendSMS(
        notification.telephone,
        smsMessage
      );

      if (smsResult.success) {
        // Marquer comme envoyé
        await this.updateNotificationStatus(notification.id, 'sent', 'sms');
        
        // Marquer le job comme exécuté
        await this.markJobAsExecuted(notification.id, 'sms_followup');

        console.log(`✅ SMS de suivi envoyé pour notification ${notification.id}`);
        
        return {
          success: true,
          messageId: smsResult.messageId,
          provider: smsResult.provider
        };

      } else {
        // Marquer le job comme échoué
        await this.markJobAsFailed(notification.id, 'sms_followup', smsResult.error);
        
        console.error(`❌ Échec SMS pour notification ${notification.id}:`, smsResult.error);
        
        return {
          success: false,
          error: smsResult.error
        };
      }

    } catch (error) {
      console.error('❌ Erreur envoi SMS de suivi:', error);
      
      // Marquer le job comme échoué
      await this.markJobAsFailed(notification.id, 'sms_followup', error.message);
      
      throw error;
    }
  }

  /**
   * Mettre à jour le statut d'une notification
   * @param {number} notificationId - ID de la notification
   * @param {string} status - Nouveau statut
   * @param {string} type - Type d'envoi ('push' ou 'sms')
   * @returns {Promise<void>}
   */
  async updateNotificationStatus(notificationId, status, type) {
    try {
      const field = type === 'push' ? 'push_sent_at' : 'sms_sent_at';
      
      await db.query(`
        UPDATE notifications 
        SET ${field} = NOW()
        WHERE id = $1
      `, [notificationId]);

    } catch (error) {
      console.error('❌ Erreur mise à jour statut:', error);
      throw error;
    }
  }

  /**
   * Marquer une notification comme lue (empêche l'envoi du SMS)
   * @param {number} notificationId - ID de la notification
   * @returns {Promise<void>}
   */
  async markAsRead(notificationId) {
    try {
      await db.query(`
        UPDATE notifications 
        SET lue = TRUE
        WHERE id = $1
      `, [notificationId]);

      // Annuler les jobs SMS en attente
      await db.query(`
        UPDATE scheduled_jobs 
        SET status = 'cancelled'
        WHERE notification_id = $1 
        AND job_type = 'sms_followup' 
        AND status = 'pending'
      `, [notificationId]);

      console.log(`✅ Notification ${notificationId} marquée comme lue, SMS annulé`);

    } catch (error) {
      console.error('❌ Erreur marquage lecture:', error);
      throw error;
    }
  }

  /**
   * Marquer un job comme exécuté
   * @param {number} notificationId - ID de la notification
   * @param {string} jobType - Type de job
   * @returns {Promise<void>}
   */
  async markJobAsExecuted(notificationId, jobType) {
    try {
      await db.query(`
        UPDATE scheduled_jobs 
        SET status = 'executed', executed_at = NOW()
        WHERE notification_id = $1 AND job_type = $2
      `, [notificationId, jobType]);

    } catch (error) {
      console.error('❌ Erreur marquage job exécuté:', error);
      throw error;
    }
  }

  /**
   * Marquer un job comme échoué
   * @param {number} notificationId - ID de la notification
   * @param {string} jobType - Type de job
   * @param {string} errorMessage - Message d'erreur
   * @returns {Promise<void>}
   */
  async markJobAsFailed(notificationId, jobType, errorMessage) {
    try {
      await db.query(`
        UPDATE scheduled_jobs 
        SET status = 'failed', executed_at = NOW(), error_message = $3
        WHERE notification_id = $1 AND job_type = $2
      `, [notificationId, jobType, errorMessage]);

    } catch (error) {
      console.error('❌ Erreur marquage job échoué:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques des notifications
   * @returns {Promise<Object>} Statistiques
   */
  async getStats() {
    try {
      const { rows: stats } = await db.query(`
        SELECT 
          COUNT(*) as total_notifications,
          COUNT(CASE WHEN push_sent_at IS NOT NULL THEN 1 END) as push_sent,
          COUNT(CASE WHEN sms_sent_at IS NOT NULL THEN 1 END) as sms_sent,
          COUNT(CASE WHEN lue = TRUE THEN 1 END) as read_notifications,
          COUNT(CASE WHEN lue = FALSE AND push_sent_at IS NOT NULL THEN 1 END) as pending_sms
        FROM notifications 
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);

      return stats[0];

    } catch (error) {
      console.error('❌ Erreur récupération stats:', error);
      throw error;
    }
  }
}

export default new NotificationService();
