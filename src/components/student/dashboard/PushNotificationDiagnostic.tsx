import React, { useState, useEffect } from 'react';
import { usePWASimple } from '@/hooks/usePWASimple';

interface DiagnosticInfo {
  serviceWorkerState: string;
  pushManagerSupport: boolean;
  notificationSupport: boolean;
  subscriptionDetails: any;
  vapidKey: string | null;
  userAgent: string;
  isOnline: boolean;
}

const PushNotificationDiagnostic: React.FC = () => {
  const {
    isSupported,
    isSubscribed,
    subscription,
    notificationPermission,
    subscribeToPush,
    testNotification,
    requestNotificationPermission
  } = usePWASimple();

  const [diagnosticInfo, setDiagnosticInfo] = useState<DiagnosticInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Collecter les informations de diagnostic
  useEffect(() => {
    const collectDiagnosticInfo = async () => {
      try {
        const info: DiagnosticInfo = {
          serviceWorkerState: 'unknown',
          pushManagerSupport: 'PushManager' in window,
          notificationSupport: 'Notification' in window,
          subscriptionDetails: null,
          vapidKey: import.meta.env.VITE_VAPID_PUBLIC_KEY || null,
          userAgent: navigator.userAgent,
          isOnline: navigator.onLine
        };

        // Vérifier l'état du service worker
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.ready;
            info.serviceWorkerState = registration.active ? 'active' : 'inactive';
            
            if (registration.pushManager) {
              const existingSubscription = await registration.pushManager.getSubscription();
              info.subscriptionDetails = existingSubscription ? {
                endpoint: existingSubscription.endpoint,
                keys: existingSubscription.keys
              } : null;
            }
          } catch (error) {
            info.serviceWorkerState = 'error: ' + error.message;
          }
        } else {
          info.serviceWorkerState = 'not supported';
        }

        setDiagnosticInfo(info);
      } catch (error) {
        console.error('Erreur collecte diagnostic:', error);
      }
    };

    collectDiagnosticInfo();
  }, []);

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      await subscribeToPush();
      showMessage('✅ Abonnement créé avec succès!', 'success');
    } catch (error) {
      showMessage(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    setIsLoading(true);
    try {
      await testNotification();
      showMessage('✅ Notification de test envoyée! Vérifiez vos notifications.', 'success');
    } catch (error) {
      showMessage(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPermission = async () => {
    setIsLoading(true);
    try {
      await requestNotificationPermission();
      showMessage('✅ Permission accordée!', 'success');
    } catch (error) {
      showMessage(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: boolean | string) => {
    if (typeof status === 'boolean') {
      return status ? 'text-green-600' : 'text-red-600';
    }
    if (status.includes('active') || status.includes('granted')) {
      return 'text-green-600';
    }
    if (status.includes('error') || status.includes('denied')) {
      return 'text-red-600';
    }
    return 'text-yellow-600';
  };

  const getStatusIcon = (status: boolean | string) => {
    if (typeof status === 'boolean') {
      return status ? '✅' : '❌';
    }
    if (status.includes('active') || status.includes('granted')) {
      return '✅';
    }
    if (status.includes('error') || status.includes('denied')) {
      return '❌';
    }
    return '⚠️';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        🔧 Diagnostic des Notifications Push
      </h3>

      {/* Message de statut */}
      {message && (
        <div className={`mb-4 p-3 rounded ${
          message.includes('✅') ? 'bg-green-50 text-green-700' :
          message.includes('❌') ? 'bg-red-50 text-red-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          {message}
        </div>
      )}

      {/* État général */}
      <div className="mb-6 p-4 bg-gray-50 rounded">
        <h4 className="font-medium text-gray-700 mb-3">État général :</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span>{getStatusIcon(isSupported)}</span>
            <span className={getStatusColor(isSupported)}>
              Support PWA : {isSupported ? 'Supporté' : 'Non supporté'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>{getStatusIcon(notificationPermission === 'granted')}</span>
            <span className={getStatusColor(notificationPermission)}>
              Permission : {notificationPermission}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>{getStatusIcon(isSubscribed)}</span>
            <span className={getStatusColor(isSubscribed)}>
              Abonnement : {isSubscribed ? 'Actif' : 'Inactif'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>{getStatusIcon(diagnosticInfo?.isOnline || false)}</span>
            <span className={getStatusColor(diagnosticInfo?.isOnline || false)}>
              Connexion : {diagnosticInfo?.isOnline ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>
        </div>
      </div>

      {/* Informations détaillées */}
      {diagnosticInfo && (
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h4 className="font-medium text-gray-700 mb-3">Informations détaillées :</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Service Worker :</span>
              <span className={`ml-2 ${getStatusColor(diagnosticInfo.serviceWorkerState)}`}>
                {diagnosticInfo.serviceWorkerState}
              </span>
            </div>
            <div>
              <span className="font-medium">Support PushManager :</span>
              <span className={`ml-2 ${getStatusColor(diagnosticInfo.pushManagerSupport)}`}>
                {diagnosticInfo.pushManagerSupport ? 'Oui' : 'Non'}
              </span>
            </div>
            <div>
              <span className="font-medium">Support Notifications :</span>
              <span className={`ml-2 ${getStatusColor(diagnosticInfo.notificationSupport)}`}>
                {diagnosticInfo.notificationSupport ? 'Oui' : 'Non'}
              </span>
            </div>
            <div>
              <span className="font-medium">Clé VAPID :</span>
              <span className={`ml-2 ${getStatusColor(!!diagnosticInfo.vapidKey)}`}>
                {diagnosticInfo.vapidKey ? 'Configurée' : 'Manquante'}
              </span>
            </div>
            {diagnosticInfo.subscriptionDetails && (
              <div>
                <span className="font-medium">Endpoint :</span>
                <span className="ml-2 text-xs text-gray-600 break-all">
                  {diagnosticInfo.subscriptionDetails.endpoint.substring(0, 50)}...
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {notificationPermission !== 'granted' && (
          <button
            onClick={handleRequestPermission}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? '⏳ Demande en cours...' : '🔔 Demander Permission'}
          </button>
        )}

        {notificationPermission === 'granted' && !isSubscribed && (
          <button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? '⏳ Abonnement...' : '📱 S\'abonner aux Notifications'}
          </button>
        )}

        {isSubscribed && (
          <button
            onClick={handleTest}
            disabled={isLoading}
            className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {isLoading ? '⏳ Envoi...' : '🧪 Tester Notification'}
          </button>
        )}
      </div>

      {/* Informations sur l'appareil */}
      {diagnosticInfo && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
          <div className="font-medium mb-1">Informations appareil :</div>
          <div className="break-all">{diagnosticInfo.userAgent}</div>
        </div>
      )}
    </div>
  );
};

export default PushNotificationDiagnostic;
