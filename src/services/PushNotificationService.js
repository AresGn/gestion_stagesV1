import webpush from 'web-push';
import db from '../config/db.js';

class PushNotificationService {
  constructor() {
    // Configuration VAPID
    try {
      if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
          process.env.VAPID_SUBJECT || 'mailto:admin@insti.edu',
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );
        console.log('✅ Configuration VAPID réussie');
      } else {
        console.warn('⚠️ Clés VAPID manquantes - Notifications push désactivées');
        this.vapidConfigured = false;
      }
    } catch (error) {
      console.error('❌ Erreur configuration VAPID:', error.message);
      this.vapidConfigured = false;
    }
  }

  /**
   * Enregistrer un abonnement push pour un utilisateur
   */
  async subscribe(userId, subscription) {
    try {
      const { endpoint, keys } = subscription;
      const { p256dh, auth } = keys;

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
        
        return { success: true, message: 'Abonnement mis à jour' };
      } else {
        // Créer un nouvel abonnement
        await db.query(
          `INSERT INTO push_subscriptions (utilisateur_id, endpoint, p256dh_key, auth_key, user_agent)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, endpoint, p256dh, auth, 'Web Browser']
        );
        
        return { success: true, message: 'Abonnement créé' };
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'abonnement push:', error);
      throw new Error('Impossible d\'enregistrer l\'abonnement push');
    }
  }

  /**
   * Désabonner un utilisateur des notifications push
   */
  async unsubscribe(userId, endpoint = null) {
    try {
      if (endpoint) {
        // Désactiver un abonnement spécifique
        await db.query(
          'UPDATE push_subscriptions SET is_active = FALSE WHERE utilisateur_id = $1 AND endpoint = $2',
          [userId, endpoint]
        );
      } else {
        // Désactiver tous les abonnements de l'utilisateur
        await db.query(
          'UPDATE push_subscriptions SET is_active = FALSE WHERE utilisateur_id = $1',
          [userId]
        );
      }
      
      return { success: true, message: 'Désabonnement effectué' };
    } catch (error) {
      console.error('Erreur lors du désabonnement push:', error);
      throw new Error('Impossible de désabonner');
    }
  }

  /**
   * Envoyer une notification push à un utilisateur spécifique
   */
  async sendToUser(userId, payload) {
    if (this.vapidConfigured === false) {
      console.warn('⚠️ VAPID non configuré - Notification push ignorée');
      return { success: false, message: 'Service push non configuré' };
    }

    try {
      // Récupérer les abonnements actifs de l'utilisateur
      const { rows: subscriptions } = await db.query(
        'SELECT * FROM push_subscriptions WHERE utilisateur_id = $1 AND is_active = TRUE',
        [userId]
      );

      if (subscriptions.length === 0) {
        console.log(`Aucun abonnement push actif pour l'utilisateur ${userId}`);
        return { success: false, message: 'Aucun abonnement push actif' };
      }

      const results = [];
      
      for (const subscription of subscriptions) {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh_key,
              auth: subscription.auth_key
            }
          };

          console.log(`📡 Envoi notification push vers: ${subscription.endpoint.substring(0, 50)}...`);
          console.log(`📦 Payload:`, payload);

          await webpush.sendNotification(pushSubscription, JSON.stringify(payload));

          console.log(`✅ Notification push envoyée avec succès vers: ${subscription.endpoint.substring(0, 50)}...`);

          results.push({
            endpoint: subscription.endpoint,
            success: true
          });

          // Marquer comme envoyé dans la base de données (seulement pour les vraies notifications)
          if (payload.notificationId && typeof payload.notificationId === 'number') {
            await this.markAsSent(payload.notificationId, subscription.id);
          }

        } catch (error) {
          console.error(`❌ Erreur envoi push vers ${subscription.endpoint.substring(0, 50)}...:`, error);
          console.error(`❌ Détails erreur:`, {
            statusCode: error.statusCode,
            message: error.message,
            body: error.body
          });

          // Si l'abonnement est invalide ou problème VAPID, le désactiver
          if (error.statusCode === 410 || error.statusCode === 404 || error.statusCode === 403) {
            console.log(`Désactivation de l'abonnement invalide: ${subscription.id}`);
            await db.query(
              'UPDATE push_subscriptions SET is_active = FALSE WHERE id = $1',
              [subscription.id]
            );

            // Si erreur VAPID (403), suggérer le nettoyage
            if (error.statusCode === 403 && error.body && error.body.includes('VAPID')) {
              console.warn('⚠️ Erreur VAPID détectée - Exécutez: npm run clean:push');
            }
          }

          results.push({
            endpoint: subscription.endpoint,
            success: false,
            error: error.message,
            statusCode: error.statusCode
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      
      return {
        success: successCount > 0,
        message: `${successCount}/${results.length} notifications envoyées`,
        results
      };

    } catch (error) {
      console.error('Erreur lors de l\'envoi de notification push:', error);
      throw new Error('Impossible d\'envoyer la notification push');
    }
  }

  /**
   * Envoyer des notifications push à plusieurs utilisateurs
   */
  async sendToMultipleUsers(userIds, payload) {
    const results = [];
    
    for (const userId of userIds) {
      try {
        const result = await this.sendToUser(userId, {
          ...payload,
          studentId: userId
        });
        results.push({ userId, ...result });
      } catch (error) {
        results.push({ 
          userId, 
          success: false, 
          error: error.message 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    return {
      success: successCount > 0,
      message: `${successCount}/${results.length} utilisateurs notifiés`,
      results
    };
  }

  /**
   * Tester l'envoi d'une notification push (version simplifiée)
   */
  async sendTestNotification(userId) {
    if (this.vapidConfigured === false) {
      console.warn('⚠️ VAPID non configuré - Notification push ignorée');
      return { success: false, message: 'Service push non configuré' };
    }

    try {
      // Récupérer les abonnements actifs de l'utilisateur
      const { rows: subscriptions } = await db.query(
        'SELECT * FROM push_subscriptions WHERE utilisateur_id = $1 AND is_active = TRUE',
        [userId]
      );

      if (subscriptions.length === 0) {
        console.log(`Aucun abonnement push actif pour l'utilisateur ${userId}`);
        return { success: false, message: 'Aucun abonnement push actif' };
      }

      const testPayload = {
        title: '🎓 Test INSTI',
        message: 'Ceci est un test de notification push. Votre configuration fonctionne correctement !',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-urgent.png',
        targetUrl: '/student/dashboard',
        studentId: userId
        // Pas de notificationId pour éviter les erreurs de DB
      };

      const results = [];

      for (const subscription of subscriptions) {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh_key,
              auth: subscription.auth_key
            }
          };

          await webpush.sendNotification(pushSubscription, JSON.stringify(testPayload));

          results.push({
            endpoint: subscription.endpoint,
            success: true
          });

          console.log('✅ Notification de test envoyée avec succès');
          // Pas de marquage DB pour les tests

        } catch (error) {
          console.error(`Erreur envoi push test vers ${subscription.endpoint}:`, error);

          // Si l'abonnement est invalide, le désactiver
          if (error.statusCode === 410 || error.statusCode === 404 || error.statusCode === 403) {
            console.log(`Désactivation de l'abonnement invalide: ${subscription.id}`);
            await db.query(
              'UPDATE push_subscriptions SET is_active = FALSE WHERE id = $1',
              [subscription.id]
            );
          }

          results.push({
            endpoint: subscription.endpoint,
            success: false,
            error: error.message,
            statusCode: error.statusCode
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      return {
        success: successCount > 0,
        message: successCount > 0 ?
          `✅ Test réussi ! ${successCount}/${results.length} notifications envoyées` :
          `❌ Échec du test. Tous les abonnements sont invalides.`,
        results
      };

    } catch (error) {
      console.error('Erreur lors du test de notification push:', error);
      return {
        success: false,
        message: 'Erreur lors du test de notification push',
        error: error.message
      };
    }
  }

  /**
   * Marquer une notification comme envoyée
   */
  async markAsSent(notificationId, subscriptionId) {
    try {
      await db.query(
        `INSERT INTO notification_campaigns (notification_id, campaign_type, status, sent_at)
         VALUES ($1, 'push', 'sent', CURRENT_TIMESTAMP)
         ON CONFLICT (notification_id, campaign_type) 
         DO UPDATE SET status = 'sent', sent_at = CURRENT_TIMESTAMP`,
        [notificationId]
      );

      // Mettre à jour la notification principale
      await db.query(
        'UPDATE notifications SET push_sent_at = CURRENT_TIMESTAMP WHERE id = $1',
        [notificationId]
      );

    } catch (error) {
      console.error('Erreur marquage envoi:', error);
    }
  }

  /**
   * Marquer une notification comme délivrée
   */
  async markAsDelivered(notificationId) {
    try {
      await db.query(
        `UPDATE notification_campaigns 
         SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP
         WHERE notification_id = $1 AND campaign_type = 'push'`,
        [notificationId]
      );

      await db.query(
        'UPDATE notifications SET push_delivered_at = CURRENT_TIMESTAMP WHERE id = $1',
        [notificationId]
      );

    } catch (error) {
      console.error('Erreur marquage livraison:', error);
    }
  }

  /**
   * Marquer une notification comme ouverte
   */
  async markAsOpened(notificationId) {
    try {
      await db.query(
        'UPDATE notifications SET push_opened_at = CURRENT_TIMESTAMP, lue = TRUE WHERE id = $1',
        [notificationId]
      );

    } catch (error) {
      console.error('Erreur marquage ouverture:', error);
    }
  }

  /**
   * Obtenir les statistiques des notifications push
   */
  async getStats(userId = null) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_sent,
          COUNT(CASE WHEN push_delivered_at IS NOT NULL THEN 1 END) as delivered,
          COUNT(CASE WHEN push_opened_at IS NOT NULL THEN 1 END) as opened,
          COUNT(CASE WHEN lue = TRUE THEN 1 END) as read
        FROM notifications 
        WHERE push_sent_at IS NOT NULL
      `;
      
      const params = [];
      
      if (userId) {
        query += ' AND utilisateur_id = $1';
        params.push(userId);
      }

      const { rows } = await db.query(query, params);
      const stats = rows[0];

      return {
        total_sent: parseInt(stats.total_sent),
        delivered: parseInt(stats.delivered),
        opened: parseInt(stats.opened),
        read: parseInt(stats.read),
        delivery_rate: stats.total_sent > 0 ? (stats.delivered / stats.total_sent * 100).toFixed(2) : 0,
        open_rate: stats.delivered > 0 ? (stats.opened / stats.delivered * 100).toFixed(2) : 0,
        read_rate: stats.opened > 0 ? (stats.read / stats.opened * 100).toFixed(2) : 0
      };

    } catch (error) {
      console.error('Erreur récupération stats push:', error);
      throw new Error('Impossible de récupérer les statistiques');
    }
  }
}

// Instance du service
const pushService = new PushNotificationService();

/**
 * Fonction utilitaire pour envoyer des notifications push à plusieurs utilisateurs
 * Utilisée par le contrôleur de notifications
 */
export const sendPushNotificationToUsers = async (userIds, payload) => {
  console.log('📡 Envoi notifications push à', userIds.length, 'utilisateurs');

  try {
    const result = await pushService.sendToMultipleUsers(userIds, payload);

    console.log('✅ Résultat envoi push:', {
      success: result.success,
      message: result.message,
      details: result.results?.map(r => ({
        userId: r.userId,
        success: r.success,
        error: r.error || null
      }))
    });

    return {
      success: result.success,
      sent: result.results?.filter(r => r.success).length || 0,
      failed: result.results?.filter(r => !r.success).length || 0,
      details: result.results
    };

  } catch (error) {
    console.error('❌ Erreur envoi push notifications:', error);
    return {
      success: false,
      sent: 0,
      failed: userIds.length,
      error: error.message
    };
  }
};

export default pushService;
