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

export interface ProjetRealise {
  id: number;
  titre: string;
  description: string;
  auteur: string;
  annee: string;
  filiere: string;
  technologies: string[];
  points_forts: string[];
  points_amelioration: string[];
  date_ajout?: string;
  ajoute_par?: string;
}

export interface PropositionTheme {
  id: number;
  titre: string;
  description: string;
  auteur_nom: string;
  auteur_type: 'Enseignant' | 'Étudiant' | 'Entreprise' | 'Autre' | string;
  nom_filiere?: string;
  filiere_id?: number | null;
  entreprise_nom?: string | null;
  email_contact?: string | null;
  difficulte: 'Facile' | 'Intermédiaire' | 'Difficile' | 'Non spécifiée' | string;
  technologies_suggerees?: string[];
  objectifs_pedagogiques?: string | null;
  est_validee?: boolean | null;
  statut?: 'soumise' | 'approuvee' | 'rejetee' | 'archivee' | null;
  date_soumission?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Notification {
  id: number;
  titre: string;
  message: string;
  lue: boolean;
  created_at: string;
}

export interface StageFormData {
  // Onglet 1: Informations sur l'Entreprise
  departement: string;
  commune: string;
  quartier: string;
  nomEntreprise: string;
  dateDebutStage: string;
  dateFinStage: string;
  
  // Onglet 2: Informations sur l'Étudiant
  filiere: string;
  prenom: string;
  nom: string;
  telephone: string;
  themeMemoire: string;
  
  // Onglet 3: Informations sur le Maître de Stage
  nomMaitreStage: string;
  prenomMaitreStage: string;
  telephoneMaitreStage: string;
  emailMaitreStage: string;
  fonctionMaitreStage: string;
  
  // Onglet 4: Informations sur le Maître de Mémoire
  nomMaitreMemoire: string;
  telephoneMaitreMemoire: string;
  emailMaitreMemoire: string;
  statutMaitreMemoire: 'Permanent' | 'Vacataire' | '';
}

export interface InternshipOffer {
  id: number;
  entreprise_nom: string;
  titre: string; // Correspond à 'position' dans les données fictives
  location: string;
  description: string;
  requirements: string; // Ou string[] si c'est une liste ? Pour l'instant string.
  duration: string;
  filiere_id?: number | null;
  created_at?: string;
  updated_at?: string;
  date_publication?: string | null;
  statut?: string | null;
  entreprise_id?: number | null;
} 