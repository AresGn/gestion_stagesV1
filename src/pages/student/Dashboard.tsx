import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StageForm } from '@/components/ui/stage-form';
import { ProjetsTab } from '@/components/ui/projets-tab';
import Header from '@/components/student/dashboard/Header';
import Sidebar from '@/components/student/dashboard/Sidebar';
import ProfileTab from '@/components/student/dashboard/ProfileTab';
import InternshipInfoTab from '@/components/student/dashboard/InternshipInfoTab';
import FindInternshipTab from '@/components/student/dashboard/FindInternshipTab';
import NotificationsTab from '@/components/student/dashboard/NotificationsTab';

import { usePWASimple } from '@/hooks/usePWASimple';

import { InternshipOffer } from '@/types';

// Liste des filières pour mappage ID -> nom
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
];

export interface UserInfo {
  id?: number;
  nom: string;
  prenom: string;
  email: string;
  matricule: string;
  filiere_id?: number;
  filiere?: string;
  telephone: string;
  role?: string;
  whatsapp?: string;
}

export interface StageInfo {
  id?: number;
  etudiant_id?: number;
  nom_entreprise?: string;
  departement?: string;
  commune?: string;
  quartier?: string;
  date_debut?: string;
  date_fin?: string;
  theme_memoire?: string;
  nom_maitre_stage?: string;
  prenom_maitre_stage?: string;
  telephone_maitre_stage?: string;
  email_maitre_stage?: string;
  fonction_maitre_stage?: string;
  nom_maitre_memoire?: string;
  telephone_maitre_memoire?: string;
  email_maitre_memoire?: string;
  statut_maitre_memoire?: string;
}

const StudentDashboard = () => {
  const [activeTab, setActiveTab] = useState('infos');
  const [showStageForm, setShowStageForm] = useState(false);
  const [hasFoundInternship, setHasFoundInternship] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stageInfo, setStageInfo] = useState<StageInfo | null>(null);
  const [loadingStage, setLoadingStage] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [studentInfo, setStudentInfo] = useState<UserInfo>({
    nom: '',
    prenom: '',
    email: '',
    matricule: '',
    filiere: '',
    telephone: '',
  });
  const [internshipOffers, setInternshipOffers] = useState<InternshipOffer[]>([]);
  const navigate = useNavigate();

  // Hook PWA pour gérer les notifications push
  const {
    isSupported,
    isSubscribed,
    notificationPermission,
    subscribeToPush,
    requestNotificationPermission
  } = usePWASimple();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Initialisation automatique des notifications push
  useEffect(() => {
    const initializePushNotifications = async () => {
      // Attendre que l'utilisateur soit connecté
      const token = localStorage.getItem('token');
      if (!token || !isSupported) return;

      try {
        console.log('🔔 Initialisation des notifications push...');
        console.log('État actuel:', { isSupported, isSubscribed, notificationPermission });

        // Si les notifications ne sont pas encore autorisées, demander la permission
        if (notificationPermission === 'default') {
          console.log('📱 Demande de permission de notification...');
          await requestNotificationPermission();
        }

        // Si les permissions sont accordées mais pas d'abonnement, s'abonner
        if (notificationPermission === 'granted' && !isSubscribed) {
          console.log('📡 Création de l\'abonnement push...');
          await subscribeToPush();
          console.log('✅ Abonnement push créé avec succès');
        }

        if (isSubscribed) {
          console.log('✅ Notifications push déjà configurées');
        }
      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation des notifications push:', error);
        // Ne pas bloquer l'application si les notifications échouent
      }
    };

    // Délai pour laisser le temps au service worker de s'enregistrer
    const timer = setTimeout(initializePushNotifications, 2000);
    return () => clearTimeout(timer);
  }, [isSupported, isSubscribed, notificationPermission, requestNotificationPermission, subscribeToPush]);

  // Chargement des informations utilisateur
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('token');
            navigate('/login');
          }
          throw new Error('Échec de récupération des informations utilisateur');
        }
        const data = await response.json();
        if (data.success && data.data) {
          const userData = data.data;
          let filiereName = '';
          if (userData.filiere_id) {
            const filiere = filieres.find(f => f.id === userData.filiere_id);
            if (filiere) filiereName = filiere.nom;
          }
          setStudentInfo({
            id: userData.id,
            nom: userData.nom || '',
            prenom: userData.prenom || '',
            email: userData.email || '',
            matricule: userData.matricule || '',
            filiere_id: userData.filiere_id,
            filiere: filiereName,
            telephone: userData.telephone || '',
            whatsapp: userData.whatsapp || '',
            role: userData.role || 'etudiant'
          });
          if (userData.id) fetchStageData(userData.id, token);
        } else {
           throw new Error(data.message || 'Impossible de charger les données utilisateur.');
        }
      } catch (err: any) {
        console.error('Erreur lors du chargement des données étudiant:', err);
        setError(err.message || 'Erreur lors du chargement des données');
        if (err.message.includes('401') || err.message.includes('Non autorisé')) {
            localStorage.removeItem('token');
            navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [navigate]);
  
  // Récupérer les informations de stage
  const fetchStageData = async (userId: number, token: string) => {
    setLoadingStage(true);
    try {
      const response = await fetch(`/api/internships/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setStageInfo(data.data);
          setHasFoundInternship(true);
        } else {
          setStageInfo(null);
        }
      } else {
        if (response.status !== 404) {
            console.error('Erreur lors de la récupération des informations de stage');
        }
        setStageInfo(null);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des informations de stage:', error);
      setStageInfo(null);
    } finally {
      setLoadingStage(false);
    }
  };

  useEffect(() => {
    const fetchInternshipOffers = async () => {
      try {
        const response = await fetch('/api/propositions-stages');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des offres de stage');
        }
        const data = await response.json();
        setInternshipOffers(data);
      } catch (error) {
        console.error("Erreur fetchInternshipOffers:", error);
      }
    };

    fetchInternshipOffers();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleStartFormClick = () => {
    setShowStageForm(true);
  };

  const handleInternshipStatusChange = (status: boolean) => {
    setHasFoundInternship(status);
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non définie';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Date invalide';
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
        console.error("Erreur de formatage de date:", e);
        return 'Date invalide';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-lg font-medium text-gray-700">Chargement des informations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
          <svg className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-red-600 text-2xl font-bold mt-4 mb-3">Erreur de chargement</h2>
          <p className="mb-6 text-gray-600">{error}</p>
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
            onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleLogout={handleLogout}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
      />

      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out md:ml-64 ml-0`}>
        <Header
          studentInfo={studentInfo}
          handleLogout={handleLogout}
          toggleSidebar={toggleSidebar}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50">
          {showStageForm ? (
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-xl">
              <button 
                onClick={() => setShowStageForm(false)}
                className="mb-6 flex items-center text-blue-600 hover:text-blue-800 font-medium group"
              >
                <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
                Retour 
              </button>
              <StageForm />
            </div>
          ) : (
            <>
              {activeTab === 'infos' && <ProfileTab studentInfo={studentInfo} />}
              {activeTab === 'stage' && (
                <InternshipInfoTab 
                  loadingStage={loadingStage}
                  stageInfo={stageInfo}
                  handleStartFormClick={handleStartFormClick}
                  formatDate={formatDate}
                />
              )}
              {activeTab === 'find' && (
                <FindInternshipTab 
                  hasFoundInternship={hasFoundInternship}
                  handleInternshipStatusChange={handleInternshipStatusChange}
                  internshipOffers={internshipOffers}
                />
              )}
              {activeTab === 'projets' && <ProjetsTab />}
              {activeTab === 'notifications' && <NotificationsTab />}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;