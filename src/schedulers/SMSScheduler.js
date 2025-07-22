/**
 * Scheduler SMS pour l'envoi automatique après 12h
 * Utilise node-cron pour vérifier périodiquement les notifications non lues
 */

import cron from 'node-cron';
import NotificationService from '../services/NotificationService.js';

class SMSScheduler {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
    this.stats = {
      totalChecks: 0,
      smsProcessed: 0,
      smsSuccessful: 0,
      smsFailed: 0,
      lastCheck: null,
      lastError: null
    };
  }

  /**
   * Démarrer le scheduler
   * Vérifie toutes les 10 minutes les notifications qui nécessitent un SMS
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  SMS Scheduler déjà en cours d\'exécution');
      return;
    }

    console.log('🚀 Démarrage du SMS Scheduler...');

    // Vérifier toutes les 10 secondes pour test rapide
    this.cronJob = cron.schedule('*/10 * * * * *', async () => {
      await this.checkAndSendSMS();
    }, {
      scheduled: false,
      timezone: 'Africa/Porto-Novo' // Timezone du Bénin
    });

    // Démarrer le cron job
    this.cronJob.start();
    this.isRunning = true;

    console.log('✅ SMS Scheduler démarré - vérification toutes les 10 secondes (mode test)');
    console.log('🕐 Timezone: Africa/Porto-Novo (Bénin)');
    
    // Faire une vérification immédiate
    setTimeout(() => {
      this.checkAndSendSMS();
    }, 5000); // Attendre 5 secondes après le démarrage
  }

  /**
   * Arrêter le scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  SMS Scheduler n\'est pas en cours d\'exécution');
      return;
    }

    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob.destroy();
      this.cronJob = null;
    }

    this.isRunning = false;
    console.log('🛑 SMS Scheduler arrêté');
  }

  /**
   * Vérifier et envoyer les SMS en attente
   */
  async checkAndSendSMS() {
    const startTime = Date.now();
    this.stats.totalChecks++;
    this.stats.lastCheck = new Date();

    try {
      console.log('\n🔍 Vérification des SMS de suivi en attente...');
      console.log(`📊 Check #${this.stats.totalChecks} - ${this.stats.lastCheck.toLocaleString()}`);

      // Récupérer les notifications qui nécessitent un SMS
      const unreadNotifications = await NotificationService.checkUnreadNotifications();

      if (unreadNotifications.length === 0) {
        console.log('✅ Aucun SMS de suivi à envoyer');
        return;
      }

      console.log(`📱 ${unreadNotifications.length} SMS de suivi à envoyer`);

      // Traiter chaque notification
      for (const notification of unreadNotifications) {
        try {
          console.log(`\n📤 Traitement notification ${notification.id} pour ${notification.prenom}`);
          console.log(`   📞 Téléphone: ${notification.telephone}`);
          console.log(`   📅 Programmé: ${new Date(notification.scheduled_sms_at).toLocaleString()}`);

          const result = await NotificationService.sendFollowUpSMS(notification);
          
          if (result.success) {
            this.stats.smsSuccessful++;
            console.log(`   ✅ SMS envoyé avec succès`);
          } else {
            this.stats.smsFailed++;
            console.log(`   ❌ Échec envoi SMS: ${result.error}`);
          }

          this.stats.smsProcessed++;

          // Petite pause entre les envois pour éviter la surcharge
          await this.sleep(1000); // 1 seconde

        } catch (error) {
          this.stats.smsFailed++;
          console.error(`❌ Erreur traitement notification ${notification.id}:`, error.message);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`\n📊 Résumé du traitement:`);
      console.log(`   • Notifications traitées: ${unreadNotifications.length}`);
      console.log(`   • SMS réussis: ${this.stats.smsSuccessful}`);
      console.log(`   • SMS échoués: ${this.stats.smsFailed}`);
      console.log(`   • Durée: ${duration}ms`);

    } catch (error) {
      this.stats.lastError = {
        message: error.message,
        timestamp: new Date()
      };
      
      console.error('❌ Erreur dans le scheduler SMS:', error.message);
      console.error('   Stack:', error.stack);
    }
  }

  /**
   * Obtenir les statistiques du scheduler
   * @returns {Object} Statistiques
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      uptime: this.isRunning ? Date.now() - this.startTime : 0,
      successRate: this.stats.smsProcessed > 0 
        ? (this.stats.smsSuccessful / this.stats.smsProcessed * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Réinitialiser les statistiques
   */
  resetStats() {
    this.stats = {
      totalChecks: 0,
      smsProcessed: 0,
      smsSuccessful: 0,
      smsFailed: 0,
      lastCheck: null,
      lastError: null
    };
    console.log('📊 Statistiques du scheduler réinitialisées');
  }

  /**
   * Forcer une vérification immédiate
   */
  async forceCheck() {
    console.log('🔄 Vérification forcée des SMS en attente...');
    await this.checkAndSendSMS();
  }

  /**
   * Utilitaire pour faire une pause
   * @param {number} ms - Millisecondes
   * @returns {Promise}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtenir le statut du scheduler
   * @returns {Object} Statut
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: this.cronJob ? this.cronJob.nextDate() : null,
      stats: this.getStats()
    };
  }

  /**
   * Tester le scheduler avec une notification fictive
   */
  async testScheduler() {
    console.log('🧪 Test du scheduler SMS...');
    
    try {
      // Simuler une vérification
      await this.checkAndSendSMS();
      console.log('✅ Test du scheduler réussi');
      return { success: true };
    } catch (error) {
      console.error('❌ Test du scheduler échoué:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export default new SMSScheduler();
