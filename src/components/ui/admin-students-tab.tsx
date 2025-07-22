import React, { useState, useEffect } from 'react';
import { SearchIcon } from 'lucide-react';

// Interfaces
interface Student {
  id: number;
  nom: string;
  prenom: string;
  matricule: string;
  filiere: string;
  email: string | null;
  telephone: string | null;
  entreprise_nom: string | null;
  entreprise_adresse: string | null;
  entreprise_departement: string | null;
  entreprise_commune: string | null;
  entreprise_quartier: string | null;
  entreprise_telephone: string | null;
  entreprise_email: string | null;
  maitre_stage_nom: string | null;
  maitre_stage_prenom: string | null;
  maitre_stage_email: string | null;
  maitre_stage_telephone: string | null;
  maitre_stage_fonction: string | null;
  maitre_memoire_nom: string | null;
  maitre_memoire_prenom: string | null;
  maitre_memoire_email: string | null;
  maitre_memoire_telephone: string | null;
  maitre_memoire_statut: string | null;
  stage_sujet: string | null;
  stage_date_debut: string | null;
  stage_date_fin: string | null;
  statut: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type TableView = 'ENTREPRISE_APPRENANT' | 'APPRENANT_MAITRE_STAGE' | 'APPRENANT_MAITRE_MEMOIRE';

// Helper function to format date strings
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
};

// Component for Filters
const StudentFiltersComponent = ({
  searchQuery, setSearchQuery,
  filterFiliere, setFilterFiliere,
  filterStatut, setFilterStatut,
  filterEntreprise, setFilterEntreprise,
  filterMaitreStage, setFilterMaitreStage,
  filterMaitreMemoire, setFilterMaitreMemoire,
  tableView, setTableView,
  filieres,
  handleSearchSubmit
}: {
  searchQuery: string, setSearchQuery: (q: string) => void,
  filterFiliere: string, setFilterFiliere: (f: string) => void,
  filterStatut: string, setFilterStatut: (s: string) => void,
  filterEntreprise: string, setFilterEntreprise: (e: string) => void,
  filterMaitreStage: string, setFilterMaitreStage: (ms: string) => void,
  filterMaitreMemoire: string, setFilterMaitreMemoire: (mm: string) => void,
  tableView: TableView, setTableView: (tv: TableView) => void,
  filieres: {id: number, nom: string}[],
  handleSearchSubmit: (e: React.FormEvent) => void
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
        {/* Row 1: Search, Filiere, Statut Stage */}
        <div className="lg:col-span-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Rechercher (nom, matricule...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full">
          <label htmlFor="filterFiliere" className="block text-sm font-medium text-gray-700 mb-1">Filière</label>
          <select
            id="filterFiliere"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={filterFiliere}
            onChange={(e) => setFilterFiliere(e.target.value)}
          >
            <option value="">Toutes les filières</option>
            {filieres.map(filiere => (
              <option key={filiere.id} value={filiere.nom}>{filiere.nom}</option>
            ))}
          </select>
        </div>
        <div className="w-full">
          <label htmlFor="filterStatut" className="block text-sm font-medium text-gray-700 mb-1">Statut Stage</label>
          <select
            id="filterStatut"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            <option value="en_cours">En cours</option>
            <option value="termine">Terminé</option>
            <option value="abandonne">Abandonné</option>
            <option value="non_defini">Non défini</option>
          </select>
        </div>

        {/* Row 2: Entreprise, Maitre de Stage, Maitre de Memoire */}
        <div className="w-full">
          <label htmlFor="filterEntreprise" className="block text-sm font-medium text-gray-700 mb-1">Entreprise</label>
          <input
            id="filterEntreprise" type="text"
            className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Nom de l'entreprise" value={filterEntreprise} onChange={(e) => setFilterEntreprise(e.target.value)}
          />
        </div>
        <div className="w-full">
          <label htmlFor="filterMaitreStage" className="block text-sm font-medium text-gray-700 mb-1">Maitre de Stage</label>
          <input
            id="filterMaitreStage" type="text"
            className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Nom du maitre de stage" value={filterMaitreStage} onChange={(e) => setFilterMaitreStage(e.target.value)}
          />
        </div>
        <div className="w-full">
          <label htmlFor="filterMaitreMemoire" className="block text-sm font-medium text-gray-700 mb-1">Maitre de Mémoire</label>
          <input
            id="filterMaitreMemoire" type="text"
            className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Nom du maitre de mémoire" value={filterMaitreMemoire} onChange={(e) => setFilterMaitreMemoire(e.target.value)}
          />
        </div>

        {/* Row 3: Table View Filter & Submit Button */}
        <div className="w-full md:col-span-2 lg:col-span-1">
          <label htmlFor="tableView" className="block text-sm font-medium text-gray-700 mb-1">Vue du Tableau</label>
          <select
            id="tableView"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={tableView}
            onChange={(e) => setTableView(e.target.value as TableView)}
          >
            <option value="ENTREPRISE_APPRENANT">Entreprise & Apprenant</option>
            <option value="APPRENANT_MAITRE_STAGE">Apprenant & Maître de Stage</option>
            <option value="APPRENANT_MAITRE_MEMOIRE">Apprenant & Maître de Mémoire</option>
          </select>
        </div>
        
        <button
          type="submit"
          className="w-full md:col-start-auto lg:col-start-auto px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 self-end md:col-span-1"
        >
          Rechercher / Filtrer
        </button>
      </form>
    </div>
  );
};

// Component for a single Table Row
const StudentTableRowComponent = ({ student, tableView, formatStatut }: { student: Student, tableView: TableView, formatStatut: (statut: string) => React.ReactNode }) => {
  return (
    <tr className="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
      {/* ENTREPRISE Section - Specific to ENTREPRISE_APPRENANT view */}
      {tableView === 'ENTREPRISE_APPRENANT' && (
        <>
          <td className="border px-2 py-1 text-sm text-gray-700">{student.entreprise_departement || 'N/A'}</td>
          <td className="border px-2 py-1 text-sm text-gray-700">{student.entreprise_commune || 'N/A'}</td>
          <td className="border px-2 py-1 text-sm text-gray-700">{student.entreprise_quartier || 'N/A'}</td>
          <td className="border px-2 py-1 text-sm text-gray-700">{student.entreprise_nom || 'N/A'}</td>
        </>
      )}

      {/* APPRENANT Section - Common but conditionally rendered based on main group selected */}
      {(tableView === 'ENTREPRISE_APPRENANT' || tableView === 'APPRENANT_MAITRE_STAGE' || tableView === 'APPRENANT_MAITRE_MEMOIRE') && (
        <>
          <td className="border px-2 py-1 text-sm text-gray-700">{student.filiere}</td>
          <td className="border px-2 py-1 text-sm text-gray-700">{student.nom}</td>
          <td className="border px-2 py-1 text-sm text-gray-700">{student.prenom}</td>
          <td className="border px-2 py-1 text-sm text-gray-700">{student.matricule}</td>
          <td className="border px-2 py-1 text-sm text-gray-700">{student.telephone || 'N/A'}</td>
          <td className="border px-2 py-1 text-sm text-gray-700">{student.email || 'N/A'}</td>
        </>
      )}

      {/* MAÎTRE DE STAGE Section - Specific to APPRENANT_MAITRE_STAGE view */}
      {tableView === 'APPRENANT_MAITRE_STAGE' && (
        <>
          {/* <td className="border px-2 py-1 text-sm text-gray-700">Statut (Permanent/Vacataire) - TODO if needed </td> */} {/* Placeholder for MS Statut if different from MM Statut*/}
          <td className="border px-2 py-1 text-sm text-gray-700">{student.maitre_stage_nom || 'N/A'}</td>
          <td className="border px-2 py-1 text-sm text-gray-700">{student.maitre_stage_prenom || 'N/A'}</td>
          <td className="border px-2 py-1 text-sm text-gray-700">{student.maitre_stage_telephone || 'N/A'}</td>
          <td className="border px-2 py-1 text-sm text-gray-700">{student.maitre_stage_email || 'N/A'}</td>
          <td className="border px-2 py-1 text-sm text-gray-700">{student.maitre_stage_fonction || 'N/A'}</td>
        </>
      )}

      {/* MAÎTRE DE MÉMOIRE Section - Specific to APPRENANT_MAITRE_MEMOIRE view */}
      {tableView === 'APPRENANT_MAITRE_MEMOIRE' && (
        <>
          <td className="border px-2 py-1 text-sm text-gray-700">{student.maitre_memoire_statut || 'N/A'}</td>
          <td className="border px-2 py-1 text-sm text-gray-700">{student.maitre_memoire_nom || 'N/A'}</td>
          <td className="border px-2 py-1 text-sm text-gray-700">{student.maitre_memoire_prenom || 'N/A'}</td>
          <td className="border px-2 py-1 text-sm text-gray-700">{student.maitre_memoire_telephone || 'N/A'}</td>
          <td className="border px-2 py-1 text-sm text-gray-700">{student.maitre_memoire_email || 'N/A'}</td>
          {/* No explicit "Fonction" for Maitre Memoire in design.tsx, if needed add here */} 
        </>
      )}
      
      {/* Common Details: Stage Sujet, Dates, Statut Stage, Actions - Always Visible */}
      <td className="border px-2 py-1 text-sm text-gray-700 max-w-xs truncate" title={student.stage_sujet || 'N/A'}>{student.stage_sujet || 'N/A'}</td>
      {/* Removed Date Formatting from here as it's applied in the main component now. Or ensure student.stage_date_debut/fin are pre-formatted if kept here. For now, direct display */}
      <td className="border px-2 py-1 text-sm text-gray-700">{formatDate(student.stage_date_debut)}</td>
      <td className="border px-2 py-1 text-sm text-gray-700">{formatDate(student.stage_date_fin)}</td>
      <td className="border px-2 py-1 text-sm text-gray-700">{formatStatut(student.statut)}</td>
      <td className="border px-2 py-1 text-sm text-gray-700 whitespace-nowrap">
        <a href={`#/etudiants/${student.id}`} className="text-blue-600 hover:text-blue-900 mr-3">Voir</a>
        <a href={`#/etudiants/${student.id}/edit`} className="text-gray-600 hover:text-gray-900">Editer</a>
      </td>
    </tr>
  );
};

// Component for Table
const StudentsTableComponent = ({
  students, loading, tableView,
  sortField, setSortField,
  sortOrder, setSortOrder,
  formatStatut
} : {
  students: Student[], loading: boolean, tableView: TableView,
  sortField: string, setSortField: (sf: string) => void,
  sortOrder: 'asc' | 'desc', setSortOrder: (so: 'asc' | 'desc') => void,
  formatStatut: (statut: string) => React.ReactNode
}) => {
  const renderSortArrow = (field: string) => {
    if (sortField === field) {
      return sortOrder === 'asc' ? ' ↑' : ' ↓';
    }
    return '';
  };

  const handleSort = (field: string) => {
    const newSortOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortOrder(newSortOrder);
  };
  
  let mainHeaders: React.ReactNode[] = [];
  let subHeaders: React.ReactNode[] = [];

  const thBaseClass = "border px-2 py-1 bg-gray-100 text-gray-700 text-left text-xs font-medium uppercase tracking-wider";
  const thSortableClass = `${thBaseClass} cursor-pointer`;

  if (tableView === 'ENTREPRISE_APPRENANT') {
    mainHeaders = [
      <th key="h-ent" colSpan={4} className={thBaseClass}>ENTREPRISE</th>,
      <th key="h-app" colSpan={6} className={thBaseClass}>APPRENANT</th>,
    ];
    subHeaders = [
      <th key="sh-ent-dep" className={thSortableClass} onClick={() => handleSort('entreprise_departement')}>Département{renderSortArrow('entreprise_departement')}</th>,
      <th key="sh-ent-com" className={thSortableClass} onClick={() => handleSort('entreprise_commune')}>Commune{renderSortArrow('entreprise_commune')}</th>,
      <th key="sh-ent-qua" className={thSortableClass} onClick={() => handleSort('entreprise_quartier')}>Quartier{renderSortArrow('entreprise_quartier')}</th>,
      <th key="sh-ent-nom" className={thSortableClass} onClick={() => handleSort('entreprise_nom')}>Entreprise{renderSortArrow('entreprise_nom')}</th>,
      
      <th key="sh-app-fil" className={thSortableClass} onClick={() => handleSort('filiere')}>Filière{renderSortArrow('filiere')}</th>,
      <th key="sh-app-nom" className={thSortableClass} onClick={() => handleSort('nom')}>Nom{renderSortArrow('nom')}</th>,
      <th key="sh-app-pre" className={thSortableClass} onClick={() => handleSort('prenom')}>Prénom{renderSortArrow('prenom')}</th>,
      <th key="sh-app-mat" className={thSortableClass} onClick={() => handleSort('matricule')}>Matricule{renderSortArrow('matricule')}</th>,
      <th key="sh-app-tel" className={thBaseClass}>Téléphone</th>,
      <th key="sh-app-ema" className={thBaseClass}>Email</th>,
    ];
  } else if (tableView === 'APPRENANT_MAITRE_STAGE') {
    mainHeaders = [
      <th key="h-app" colSpan={6} className={thBaseClass}>APPRENANT</th>,
      <th key="h-ms" colSpan={5} className={thBaseClass}>MAÎTRE DE STAGE</th>,
    ];
    subHeaders = [
      <th key="sh-app-fil" className={thSortableClass} onClick={() => handleSort('filiere')}>Filière{renderSortArrow('filiere')}</th>,
      <th key="sh-app-nom" className={thSortableClass} onClick={() => handleSort('nom')}>Nom{renderSortArrow('nom')}</th>,
      <th key="sh-app-pre" className={thSortableClass} onClick={() => handleSort('prenom')}>Prénom{renderSortArrow('prenom')}</th>,
      <th key="sh-app-mat" className={thSortableClass} onClick={() => handleSort('matricule')}>Matricule{renderSortArrow('matricule')}</th>,
      <th key="sh-app-tel" className={thBaseClass}>Téléphone</th>,
      <th key="sh-app-ema" className={thBaseClass}>Email</th>,

      // <th key="sh-ms-stat" className={thSortableClass} onClick={() => handleSort('maitre_stage_statut')}>Statut{renderSortArrow('maitre_stage_statut')}</th>, // Maitre Stage Statut (e.g. Permanent/Vacataire)
      <th key="sh-ms-nom" className={thSortableClass} onClick={() => handleSort('maitre_stage_nom')}>Nom{renderSortArrow('maitre_stage_nom')}</th>,
      <th key="sh-ms-pre" className={thBaseClass}>Prénom</th>,
      <th key="sh-ms-tel" className={thBaseClass}>Téléphone</th>,
      <th key="sh-ms-ema" className={thBaseClass}>Email</th>,
      <th key="sh-ms-fon" className={thSortableClass} onClick={() => handleSort('maitre_stage_fonction')}>Fonction{renderSortArrow('maitre_stage_fonction')}</th>,
    ];
  } else if (tableView === 'APPRENANT_MAITRE_MEMOIRE') {
    mainHeaders = [
      <th key="h-app" colSpan={6} className={thBaseClass}>APPRENANT</th>,
      <th key="h-mm" colSpan={5} className={thBaseClass}>MAÎTRE DE MÉMOIRE</th>,
    ];
    subHeaders = [
      <th key="sh-app-fil" className={thSortableClass} onClick={() => handleSort('filiere')}>Filière{renderSortArrow('filiere')}</th>,
      <th key="sh-app-nom" className={thSortableClass} onClick={() => handleSort('nom')}>Nom{renderSortArrow('nom')}</th>,
      <th key="sh-app-pre" className={thSortableClass} onClick={() => handleSort('prenom')}>Prénom{renderSortArrow('prenom')}</th>,
      <th key="sh-app-mat" className={thSortableClass} onClick={() => handleSort('matricule')}>Matricule{renderSortArrow('matricule')}</th>,
      <th key="sh-app-tel" className={thBaseClass}>Téléphone</th>,
      <th key="sh-app-ema" className={thBaseClass}>Email</th>,
      
      <th key="sh-mm-stat" className={thSortableClass} onClick={() => handleSort('maitre_memoire_statut')}>Statut{renderSortArrow('maitre_memoire_statut')}</th>,
      <th key="sh-mm-nom" className={thSortableClass} onClick={() => handleSort('maitre_memoire_nom')}>Nom{renderSortArrow('maitre_memoire_nom')}</th>,
      <th key="sh-mm-pre" className={thBaseClass}>Prénom</th>,
      <th key="sh-mm-tel" className={thBaseClass}>Téléphone</th>,
      <th key="sh-mm-ema" className={thBaseClass}>Email</th>,
      // No "Fonction" for Maitre Memoire in design.tsx
    ];
  }

  // Common main headers for Stage Details, Statut, Actions
  const commonMainHeaders: React.ReactNode[] = [
    <th key="h-stagedetails" colSpan={3} className={thBaseClass}>DÉTAILS STAGE</th>,
    <th key="h-stagestatut" className={thBaseClass}>STATUT STAGE</th>,
    <th key="h-actions" className={thBaseClass}>ACTIONS</th>
  ];

  const commonSubHeaders: React.ReactNode[] = [
    <th key="sh-stage-sujet" className={thBaseClass}>Sujet</th>,
    <th key="sh-stage-debut" className={thSortableClass} onClick={() => handleSort('stage_date_debut')}>Début{renderSortArrow('stage_date_debut')}</th>,
    <th key="sh-stage-fin" className={thSortableClass} onClick={() => handleSort('stage_date_fin')}>Fin{renderSortArrow('stage_date_fin')}</th>,
    <th key="sh-statut" className={thSortableClass} onClick={() => handleSort('statut')}>Statut{renderSortArrow('statut')}</th>,
    <th key="sh-actions" className={thBaseClass}>Actions</th>
  ];

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {loading ? (
        <div className="flex justify-center items-center p-8">
          <div className="spinner-border text-blue-600" role="status"> {/* Consider a proper spinner component */}
            <span className="sr-only">Chargement...</span>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          {students.length > 0 ? (
            <table className="min-w-full border text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>{mainHeaders.concat(commonMainHeaders)}</tr>
                <tr>{subHeaders.concat(commonSubHeaders)}</tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <StudentTableRowComponent key={student.id} student={student} tableView={tableView} formatStatut={formatStatut} />
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 px-4">
              <p className="text-gray-500">Aucun étudiant ne correspond à vos critères de recherche.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Component for Pagination
const StudentPaginationComponent = ({
  pagination, studentsCount, filterFiliere, filterStatut,
  handlePageChange, handleExport
} : {
  pagination: Pagination, studentsCount: number,
  filterFiliere: string, filterStatut: string,
  handlePageChange: (newPage: number) => void,
  handleExport: () => void
}) => {
  if (studentsCount === 0 && pagination.total === 0) return null; // Only hide if no students and no total (e.g. initial load error)

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mt-4"> {/* Added mt-4 for spacing */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
        <div className="text-sm text-gray-700">
          {studentsCount > 0 ? (
            <>
              Affichage de <span className="font-medium">{studentsCount}</span> étudiant(s) sur <span className="font-medium">{pagination.total}</span>
              {filterFiliere && <> dans la filière <span className="font-medium">{filterFiliere}</span></>}
              {filterStatut && <> avec le statut <span className="font-medium">{
                filterStatut === 'en_cours' ? 'En cours' : 
                filterStatut === 'termine' ? 'Terminé' : 
                filterStatut === 'abandonne' ? 'Abandonné' : 'Non défini'
              }</span></>}
            </>
          ) : (
            <>{pagination.total > 0 ? `Aucun étudiant affiché (sur ${pagination.total} au total)` : 'Aucun étudiant trouvé.'}</>
          )}
        </div>
        
        <div className="flex space-x-2 items-center">
          {pagination.totalPages > 1 && (
            <div className="flex">
              {/* Previous Button */}
              {pagination.page > 1 && (
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="px-3 py-1 rounded text-gray-700 hover:bg-gray-100"
                >
                  &laquo; Préc.
                </button>
              )}

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(pageNumber => { // Logic to show limited page numbers
                  const totalPages = pagination.totalPages;
                  const currentPage = pagination.page;
                  if (totalPages <= 5) return true; // Show all if 5 or less
                  if (pageNumber <= 2) return true; // Always show first 2
                  if (pageNumber >= totalPages - 1) return true; // Always show last 2
                  if (Math.abs(pageNumber - currentPage) <= 1) return true; // Show current and neighbors
                  return false;
                })
                .map((pageNumber, index, array) => {
                  const prevPageNumber = index > 0 ? array[index-1] : 0;
                  return (
                    <React.Fragment key={pageNumber}>
                      {pageNumber > prevPageNumber + 1 && pageNumber > 2 && <span className="px-3 py-1">...</span>}
                      <button
                        onClick={() => handlePageChange(pageNumber)}
                        className={`px-3 py-1 rounded ${
                          pagination.page === pageNumber 
                            ? 'bg-blue-600 text-white' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    </React.Fragment>
                  );
              })}
              {/* Next Button */}
              {pagination.page < pagination.totalPages && (
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="px-3 py-1 rounded text-gray-700 hover:bg-gray-100"
                >
                  Suiv. &raquo;
                </button>
              )}
            </div>
          )}
          
          {studentsCount > 0 && (
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              onClick={handleExport}
            >
              Exporter la liste
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export function AdminStudentsTab() {
  // États pour les données et filtres
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFiliere, setFilterFiliere] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterEntreprise, setFilterEntreprise] = useState('');
  const [filterMaitreStage, setFilterMaitreStage] = useState('');
  const [filterMaitreMemoire, setFilterMaitreMemoire] = useState('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const [filieres, setFilieres] = useState<{id: number, nom: string}[]>([]);
  
  // États pour le tri
  const [sortField, setSortField] = useState<string>('nom');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [tableView, setTableView] = useState<TableView>('ENTREPRISE_APPRENANT');

  // Fonction pour charger les étudiants
  const fetchStudents = async () => {
    try {
      setLoading(true);
      
      // Construction des paramètres de requête
      const params = new URLSearchParams();
      if (searchQuery) params.append('recherche', searchQuery);
      if (filterFiliere) params.append('filiere', filterFiliere);
      if (filterStatut) params.append('statut', filterStatut);
      if (filterEntreprise) params.append('entreprise_nom', filterEntreprise);
      if (filterMaitreStage) params.append('maitre_stage_nom', filterMaitreStage);
      if (filterMaitreMemoire) params.append('maitre_memoire_nom', filterMaitreMemoire);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      params.append('sortField', sortField);
      params.append('sortOrder', sortOrder);
      
      // Appel de l'API
      const response = await fetch(`/api/admin/etudiants?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des étudiants');
      }
      
      const data = await response.json();

      if (data.success) {
        // Gérer les deux formats possibles de retour
        const etudiants = data.data.etudiants || data.data || [];
        const pagination = data.data.pagination || data.pagination || {
          total: etudiants.length,
          page: 1,
          limit: 10,
          totalPages: Math.ceil(etudiants.length / 10)
        };

        setStudents(etudiants);
        setPagination(pagination);
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Impossible de charger la liste des étudiants');
    } finally {
      setLoading(false);
    }
  };
  
  // Fonction pour charger les filières
  const fetchFilieres = async () => {
    try {
      // Utiliser la nouvelle route publique pour les filières
      const response = await fetch('/api/filieres');

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des filières');
      }

      const filieres = await response.json();

      // La route /api/filieres retourne directement un tableau de filières
      if (Array.isArray(filieres)) {
        setFilieres(filieres);
      } else {
        console.error('Format de données invalide:', filieres);
        throw new Error('Format de données invalide pour les filières');
      }
    } catch (err) {
      console.error('Erreur lors du chargement des filières:', err);
      // Ne pas bloquer l'interface si les filières ne se chargent pas
      setFilieres([]);
      console.warn('Filières non disponibles, continuons sans filtrage par filière');
    }
  };

  // Chargement initial des données
  useEffect(() => {
    const loadData = async () => {
      console.log('Début du chargement des données de l\'onglet étudiants');
      try {
        await fetchFilieres();
        console.log('Filières chargées avec succès');
        await fetchStudents();
        console.log('Étudiants chargés avec succès');
      } catch (err) {
        console.error('Erreur lors du chargement initial des données:', err);
      }
    };
    
    loadData();
  }, []);

  // Récupérer les données lorsque les filtres changent
  useEffect(() => {
    if (pagination.page > 0) {
      fetchStudents();
    }
  }, [pagination.page, pagination.limit, filterFiliere, filterStatut, filterEntreprise, filterMaitreStage, filterMaitreMemoire, sortField, sortOrder]);

  // Fonction pour la recherche
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents();
  };
  
  // Fonction pour le changement de page
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };
  
  // Fonction pour l'export des données
  const handleExport = async () => {
    try {
      // Construction des paramètres de requête pour l'export
      const params = new URLSearchParams();
      if (searchQuery) params.append('recherche', searchQuery);
      if (filterFiliere) params.append('filiere', filterFiliere);
      if (filterStatut) params.append('statut', filterStatut);
      params.append('export', 'true'); // Indique au backend d'envoyer toutes les données
      
      // Notification de démarrage de l'export
      alert('Export des données en cours...');
      
      // Cette fonctionnalité devra être implémentée côté serveur pour générer un fichier CSV/Excel
      // Pour l'instant, cela affichera simplement une notification
      setTimeout(() => {
        alert('Fonctionnalité d\'export non implémentée dans cette version');
      }, 1000);
    } catch (err) {
      console.error('Erreur lors de l\'export:', err);
      setError('Impossible d\'exporter les données');
    }
  };

  // Formater le statut du stage pour l'affichage
  const formatStatut = (statutValue: string): React.ReactNode => {
    switch (statutValue) {
      case 'en_cours':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
            En cours
          </span>
        );
      case 'termine':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            Terminé
          </span>
        );
      case 'abandonne':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            Abandonné
          </span>
        );
      case 'non_defini':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            Non défini
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            {statutValue}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Afficher les erreurs */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {/* Barre de recherche et filtres */}
      <StudentFiltersComponent
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        filterFiliere={filterFiliere} setFilterFiliere={setFilterFiliere}
        filterStatut={filterStatut} setFilterStatut={setFilterStatut}
        filterEntreprise={filterEntreprise} setFilterEntreprise={setFilterEntreprise}
        filterMaitreStage={filterMaitreStage} setFilterMaitreStage={setFilterMaitreStage}
        filterMaitreMemoire={filterMaitreMemoire} setFilterMaitreMemoire={setFilterMaitreMemoire}
        tableView={tableView} setTableView={setTableView}
        filieres={filieres}
        handleSearchSubmit={handleSearch}
      />

      {/* Liste des étudiants */}
      <StudentsTableComponent
        students={students}
        loading={loading}
        tableView={tableView}
        sortField={sortField} setSortField={setSortField}
        sortOrder={sortOrder} setSortOrder={setSortOrder}
        formatStatut={formatStatut}
      />

      {/* Pagination */}
      <StudentPaginationComponent
        pagination={pagination}
        studentsCount={students.length}
        filterFiliere={filterFiliere}
        filterStatut={filterStatut}
        handlePageChange={handlePageChange}
        handleExport={handleExport}
      />
    </div>
  );
} 