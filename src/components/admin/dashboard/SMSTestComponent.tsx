import React, { useState } from 'react';

interface SMSTestComponentProps {
  API_BASE_URL: string;
}

const SMSTestComponent: React.FC<SMSTestComponentProps> = ({ API_BASE_URL }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [testMessage, setTestMessage] = useState('Test SMS automatique - 15 secondes après notification non lue');
  const [phoneNumber, setPhoneNumber] = useState('');

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 5000);
  };

  // Test de connectivité des routes SMS
  const handleTestRoutes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sms/ping`);
      const result = await response.json();

      if (result.success) {
        showMessage(`✅ Routes SMS OK: ${result.routes.join(', ')}`, 'success');
      } else {
        showMessage(`❌ Erreur routes: ${result.message}`, 'error');
      }
    } catch (error) {
      showMessage(`❌ Routes inaccessibles: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Test direct SMS
  const handleTestDirectSMS = async () => {
    if (!phoneNumber.trim()) {
      showMessage('❌ Veuillez entrer un numéro de téléphone', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sms/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          message: testMessage
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showMessage('✅ SMS de test envoyé avec succès!', 'success');
      } else {
        showMessage(`❌ Erreur: ${result.message}`, 'error');
      }
    } catch (error) {
      showMessage(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Test notification avec SMS automatique
  const handleTestNotificationWithSMS = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Créer une notification qui déclenchera un SMS après 15 secondes
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          destinataire: {
            type: 'etudiant',
            id: 1 // ID de test - vous pouvez changer
          },
          titre: '🧪 Test SMS Automatique',
          message: 'Cette notification déclenchera un SMS dans 15 secondes si elle n\'est pas marquée comme lue.'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showMessage('✅ Notification créée! SMS sera envoyé dans 15 secondes si non lue.', 'success');
      } else {
        showMessage(`❌ Erreur: ${result.message}`, 'error');
      }
    } catch (error) {
      showMessage(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Vérifier le statut du scheduler
  const handleCheckSchedulerStatus = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sms/scheduler/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        const status = result.data;
        showMessage(`✅ Scheduler: ${status.isRunning ? 'Actif' : 'Inactif'} - Checks: ${status.stats.totalChecks} - SMS: ${status.stats.smsProcessed}`, 'success');
      } else {
        showMessage(`❌ Erreur: ${result.message}`, 'error');
      }
    } catch (error) {
      showMessage(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Forcer une vérification du scheduler
  const handleForceCheck = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sms/scheduler/force-check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        showMessage('✅ Vérification forcée exécutée!', 'success');
      } else {
        showMessage(`❌ Erreur: ${result.message}`, 'error');
      }
    } catch (error) {
      showMessage(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        📱 Test SMS Automatique (15 secondes)
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

      {/* Configuration */}
      <div className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Numéro de téléphone (pour test direct)
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+229 01 23 45 67"
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message de test
          </label>
          <textarea
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            rows={3}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={handleTestRoutes}
          disabled={isLoading}
          className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
        >
          {isLoading ? '⏳ Test...' : '🔗 Test Routes SMS'}
        </button>

        <button
          onClick={handleTestDirectSMS}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? '⏳ Envoi...' : '📱 Test SMS Direct'}
        </button>

        <button
          onClick={handleTestNotificationWithSMS}
          disabled={isLoading}
          className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {isLoading ? '⏳ Création...' : '🔔 Test Notification + SMS Auto (15s)'}
        </button>

        <button
          onClick={handleCheckSchedulerStatus}
          disabled={isLoading}
          className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {isLoading ? '⏳ Vérification...' : '📊 Statut Scheduler SMS'}
        </button>

        <button
          onClick={handleForceCheck}
          disabled={isLoading}
          className="w-full bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50"
        >
          {isLoading ? '⏳ Vérification...' : '🔄 Forcer Vérification SMS'}
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h4 className="font-medium text-yellow-800 mb-2">📋 Instructions de test :</h4>
        <ol className="text-sm text-yellow-700 space-y-1">
          <li>1. <strong>Test SMS Direct :</strong> Envoie immédiatement un SMS au numéro spécifié</li>
          <li>2. <strong>Test Notification + SMS Auto :</strong> Crée une notification qui déclenchera un SMS dans 15 secondes si non lue</li>
          <li>3. <strong>Statut Scheduler :</strong> Vérifie si le scheduler SMS fonctionne</li>
          <li>4. <strong>Forcer Vérification :</strong> Force le scheduler à vérifier immédiatement les notifications en attente</li>
        </ol>
      </div>

      {/* Informations système */}
      <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
        <div className="font-medium mb-1">Configuration actuelle :</div>
        <div>• Délai SMS : 15 secondes après création notification</div>
        <div>• Vérification scheduler : toutes les 10 secondes</div>
        <div>• Service SMS : TextBee</div>
      </div>
    </div>
  );
};

export default SMSTestComponent;
