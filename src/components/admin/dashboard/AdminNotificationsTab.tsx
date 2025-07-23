import React, { useState, useEffect, useCallback } from 'react';
import SMSTestComponent from './SMSTestComponent';

// TODO: Déplacer vers des fichiers d'interfaces partagés
interface User { // Utilisateur simplifié pour la sélection
  id: number;
  email: string; 
  nom: string; // Ajouté
  prenom: string; // Ajouté
  matricule?: string; // Ajouté pour la recherche et l'affichage
}

interface AdminNotification { // Correspond à la réponse de l'API
  id: number;
  utilisateur_id: number;
  utilisateur_email?: string; // Ajouté par jointure côté backend
  message: string;
  lue: boolean;
  created_at: string; 
}

// Pour le formulaire de création
interface NewNotificationPayload {
  destinataire: {
    type: 'etudiant' | 'filiere' | 'tous';
    id?: number | null; // utilisateur_id pour 'etudiant', filiere_id pour 'filiere'
  };
  titre: string; // Ajout du champ titre
  message: string;
}

// Liste des filières (peut être récupérée via API plus tard)
const filieres = [
  { id: 1, nom: 'GEI/EE' },
  { id: 2, nom: 'GEI/IT' },
  { id: 3, nom: 'GE/ER' },
  { id: 4, nom: 'GMP' },
  { id: 5, nom: 'MSY/MI' },
  { id: 6, nom: 'ER/SE' },
  { id: 7, nom: 'GC/A' },
  { id: 8, nom: 'GC/B' },
  { id: 9, nom: 'MSY/MA' },
  { id: 10, nom: 'GE/FC' },
  // Ajoutez d'autres filières au besoin
];

// TODO: Récupérer depuis une API /api/users ou /api/admin/etudiants
// const mockUsers: User[] = [ ... ]; // Supprimé

const AdminNotificationsTab: React.FC = () => {
  const [notificationsHistory, setNotificationsHistory] = useState<AdminNotification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [newNotification, setNewNotification] = useState<NewNotificationPayload>({
    destinataire: {
      type: 'etudiant', // Type par défaut
      id: null, 
    },
    titre: '',
    message: ''
  });

  // États pour gérer la sélection du type de destinataire et de la filière
  const [recipientType, setRecipientType] = useState<'etudiant' | 'filiere' | 'tous'>('etudiant');
  const [selectedFiliereId, setSelectedFiliereId] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(false); // Pour l'historique et l'envoi
  const [error, setError] = useState<string | null>(null); // Erreur pour l'historique
  const [errorUsers, setErrorUsers] = useState<string | null>(null); // Erreur pour les utilisateurs
  const [formError, setFormError] = useState<string | null>(null);

  const API_BASE_URL = '/api'; // Base URL pour toutes les API
  const ADMIN_API_BASE_URL = '/api/admin'; // URL spécifique pour les API admin

  const fetchNotificationsHistory = useCallback(async (token: string | null) => { // Ajout du token
    setIsLoading(true);
    setError(null);
    if (!token) { setError('Token manquant'); setIsLoading(false); return; }
    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` } // Ajout du token
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.success) {
        setNotificationsHistory(data.data || []); // data.data devrait être le tableau
      } else {
        throw new Error(data.message || 'Failed to fetch notifications history');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      console.error("Error fetching notifications history:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetchNotificationsHistory(token);
  }, [fetchNotificationsHistory]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Debounce search function
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setErrorUsers(null);
    const token = localStorage.getItem('token');
    if (!token) {
        setErrorUsers('Token manquant');
        setIsSearching(false);
        return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await fetch(`${ADMIN_API_BASE_URL}/etudiants/search?term=${encodeURIComponent(searchTerm)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setSearchResults(data.data.map((u: any) => ({
            id: u.id,
            email: u.email || 'N/A',
            matricule: u.matricule || 'N/A', 
            nom: u.nom || '',
            prenom: u.prenom || ''
          })));
        } else {
          throw new Error(data.message || 'Failed to search users');
        }
      } catch (err) {
        setErrorUsers(err instanceof Error ? err.message : String(err));
        setSearchResults([]); // Vider les résultats en cas d'erreur
        console.error("Error searching users:", err);
      } finally {
        setIsSearching(false);
      }
    }, 500); // Délai de 500ms

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, ADMIN_API_BASE_URL]);

  const handleUserSelect = (user: User) => {
    setNewNotification(prev => ({
      ...prev,
      destinataire: {
        type: 'etudiant',
        id: user.id
      }
    }));
    setSearchTerm(`${user.prenom} ${user.nom} (${user.matricule || user.email})`);
    setSearchResults([]);
    setRecipientType('etudiant'); // S'assurer que le type est 'etudiant' quand on sélectionne un user
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'titre' || name === 'message') {
      setNewNotification(prev => ({
        ...prev,
        [name]: value
      }));
    } else if (name === 'recipientTypeSelector') {
      const newType = value as 'etudiant' | 'filiere' | 'tous';
      setRecipientType(newType);
      setNewNotification(prev => ({
        ...prev,
        destinataire: {
          type: newType,
          // Réinitialiser l'id si on change de type, sauf si on revient à étudiant et un user était déjà cherché
          // (le searchTerm contient l'info de l'étudiant recherché si c'est le cas)
          id: newType === 'etudiant' && prev.destinataire.type === 'etudiant' ? prev.destinataire.id : null 
        }
      }));
      setSelectedFiliereId(null); // Réinitialiser la filière si on change de type
      if (newType !== 'etudiant') {
          setSearchTerm(''); // Vider la recherche d'étudiant si on n'est plus en mode étudiant
          setSearchResults([]);
      }
    } else if (name === 'filiereSelector') {
      const filiereId = value ? parseInt(value, 10) : null;
      setSelectedFiliereId(filiereId);
      setNewNotification(prev => ({
        ...prev,
        destinataire: {
          type: 'filiere',
          id: filiereId
        }
      }));
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const { destinataire, titre, message } = newNotification;

    if (!titre.trim()) {
      setFormError("Veuillez entrer un titre pour la notification.");
      return;
    }
    if (!message.trim()) {
      setFormError("Veuillez écrire un message pour la notification.");
      return;
    }

    if (destinataire.type === 'etudiant' && !destinataire.id) {
      setFormError("Veuillez sélectionner un étudiant destinataire.");
      return;
    }
    if (destinataire.type === 'filiere' && !destinataire.id) {
      setFormError("Veuillez sélectionner une filière destinataire.");
      return;
    }

    setIsLoading(true);
    const token = localStorage.getItem('token');
    if (!token) { setFormError('Non authentifié'); setIsLoading(false); return; }
    
    try {
      // Le payload est maintenant directement newNotification
      const response = await fetch(`${ADMIN_API_BASE_URL}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newNotification),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Error sending notification');
      }
      
      alert(result.message || 'Notification(s) envoyée(s) avec succès!'); // Utiliser le message du backend
      // Reset form
      setNewNotification({
        destinataire: { type: 'etudiant', id: null },
        titre: '',
        message: ''
      });
      setSearchTerm('');
      setSearchResults([]);
      setRecipientType('etudiant');
      setSelectedFiliereId(null);
      fetchNotificationsHistory(token); // Re-fetch history
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
      console.error("Error sending notification:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-800 mb-6">Envoyer une nouvelle notification</h3>
        <form onSubmit={handleSendNotification} className="space-y-5">
          <div>
            <label htmlFor="recipientTypeSelector" className="block text-sm font-medium text-gray-700 mb-1">Type de Destinataire</label>
            <select 
              id="recipientTypeSelector" 
              name="recipientTypeSelector"
              value={recipientType}
              onChange={handleInputChange}
              className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            >
              <option value="etudiant">Étudiant spécifique</option>
              <option value="filiere">Filière</option>
              <option value="tous">Tous les étudiants</option>
            </select>
          </div>

          {recipientType === 'etudiant' && (
            <div>
              <label htmlFor="utilisateur_search" className="block text-sm font-medium text-gray-700 mb-1">Rechercher un étudiant (par nom, prénom, matricule)</label>
              <div className="relative">
                <input
                  type="text"
                  id="utilisateur_search"
                  name="utilisateur_search"
                  value={searchTerm}
                  onChange={handleSearchChange} // Modifié ici pour utiliser handleSearchChange au lieu de handleInputChange
                  className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                  placeholder="Entrez nom, prénom ou matricule..."
                  autoComplete="off"
                  disabled={recipientType !== 'etudiant'} // Désactiver si pas le bon type
                />
                {isSearching && <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">Recherche...</div>}
                {searchResults.length > 0 && (
                  <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-auto shadow-lg">
                    {searchResults.map(user => (
                      <li 
                        key={user.id} 
                        onClick={() => handleUserSelect(user)}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                      >
                        {user.prenom} {user.nom} ({user.matricule || user.email})
                      </li>
                    ))}
                  </ul>
                )}
                {errorUsers && <p className="text-sm text-red-500 mt-1">{errorUsers}</p>}
              </div>
              {newNotification.destinataire.type === 'etudiant' && newNotification.destinataire.id && (
                <p className="text-xs text-gray-500 mt-1">ID Utilisateur sélectionné: {newNotification.destinataire.id}</p>
              )}
            </div>
          )}

          {recipientType === 'filiere' && (
            <div>
              <label htmlFor="filiereSelector" className="block text-sm font-medium text-gray-700 mb-1">Sélectionner une Filière</label>
              <select 
                id="filiereSelector" 
                name="filiereSelector"
                value={selectedFiliereId || ''}
                onChange={handleInputChange}
                className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                disabled={recipientType !== 'filiere'} // Désactiver si pas le bon type
              >
                <option value="">-- Sélectionner une filière --</option>
                {filieres.map(filiere => (
                  <option key={filiere.id} value={filiere.id}>{filiere.nom}</option>
                ))}
              </select>
              {newNotification.destinataire.type === 'filiere' && newNotification.destinataire.id && (
                <p className="text-xs text-gray-500 mt-1">ID Filière sélectionnée: {newNotification.destinataire.id}</p>
              )}
            </div>
          )}
          
          {/* Champ Titre toujours visible */}
          <div>
            <label htmlFor="titre" className="block text-sm font-medium text-gray-700 mb-1">Titre de la notification</label>
            <input 
              type="text"
              id="titre" 
              name="titre"
              value={newNotification.titre}
              onChange={handleInputChange}
              className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
              placeholder="Entrez le titre de la notification..."
              required
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Contenu du message</label>
            <textarea 
              id="message" 
              name="message"
              rows={5}
              value={newNotification.message}
              onChange={handleInputChange}
              className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors resize-y"
              placeholder="Rédigez votre message ici..."
              required
            ></textarea>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={isLoading} className="px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md hover:shadow-lg transition-colors disabled:opacity-50">
              {isLoading ? 'Envoi en cours...' : 'Envoyer la notification'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-800 mb-6">Historique des notifications ({notificationsHistory.length})</h3>
        {isLoading && !notificationsHistory.length ? (
            <p className="text-center text-gray-500 py-8">Chargement de l'historique...</p>
        ) : error && !notificationsHistory.length ? (
            <p className="text-center text-red-500 py-8">{error}</p>
        ) : notificationsHistory.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {notificationsHistory.map(notif => (
                <div key={notif.id} className={`border-l-4 ${notif.lue ? 'border-gray-300' : 'border-blue-500'} pl-4 py-3 bg-gray-50 rounded-r-md shadow-sm`}>
                <div className="flex justify-between items-start mb-1">
                    <span className="text-xs text-gray-500">
                        {new Date(notif.created_at).toLocaleDateString('fr-FR', {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${notif.lue ? 'bg-gray-200 text-gray-700' : 'bg-blue-100 text-blue-700'}`}>
                        {notif.lue ? 'Lue' : 'Non lue'}
                    </span>
                </div>
                <p className="text-sm text-gray-700 font-medium mb-1">À: {notif.utilisateur_email || `ID Utilisateur: ${notif.utilisateur_id}`}</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{notif.message}</p>
                </div>
            ))}
            </div>
        ) : (
            <p className="text-center text-gray-500 py-8">Aucune notification dans l'historique.</p>
        )}
      </div>

      {/* Composant de test SMS */}
      <div className="mt-8">
        <SMSTestComponent API_BASE_URL={API_BASE_URL} />
      </div>
    </div>
  );
};

export default AdminNotificationsTab; 