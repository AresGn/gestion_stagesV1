import React, { useState } from 'react';
import { PropositionTheme } from '@/types';
import { SearchBar } from './search-bar';

interface PropositionsThemesProps {
  propositions: PropositionTheme[];
}

export const PropositionsThemes: React.FC<PropositionsThemesProps> = ({ propositions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProposition, setSelectedProposition] = useState<PropositionTheme | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [difficulteFilter, setDifficulteFilter] = useState<string | null>(null);
  
  // Filtrer les propositions en fonction des critères
  const filteredPropositions = propositions.filter(prop => {
    // Filtre par terme de recherche
    const matchesSearch = 
      prop.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (prop.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (prop.auteur_nom?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (prop.technologies_suggerees?.some(tech => tech.toLowerCase().includes(searchTerm.toLowerCase())) || false);
      
    // Filtre par type d'auteur
    const matchesAuteurFilter = !activeFilter || prop.auteur_type === activeFilter;
    
    // Filtre par difficulté
    const matchesDifficulteFilter = !difficulteFilter || prop.difficulte === difficulteFilter;
    
    return matchesSearch && matchesAuteurFilter && matchesDifficulteFilter;
  });
  
  // Types d'auteur uniques pour filtrage
  const auteurTypes = [...new Set(propositions.map(prop => prop.auteur_type).filter(Boolean))];
  
  // Niveaux de difficulté pour filtrage
  const difficultes = ['Facile', 'Intermédiaire', 'Difficile'];
  
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };
  
  const handleAuteurFilterClick = (type: string) => {
    if (activeFilter === type) {
      setActiveFilter(null);
    } else {
      setActiveFilter(type);
    }
  };
  
  const handleDifficulteFilterClick = (difficulte: string) => {
    if (difficulteFilter === difficulte) {
      setDifficulteFilter(null);
    } else {
      setDifficulteFilter(difficulte);
    }
  };
  
  const handlePropositionClick = (proposition: PropositionTheme) => {
    try {
      setSelectedProposition(proposition);
    } catch (error) {
      console.error('Erreur lors de l\'ouverture de la proposition:', error);
    }
  };
  
  const closeModal = () => {
    setSelectedProposition(null);
  };
  
  const renderDifficultyBadge = (difficulte: string) => {
    let color = '';
    
    switch (difficulte) {
      case 'Facile':
        color = 'bg-green-100 text-green-800';
        break;
      case 'Intermédiaire':
        color = 'bg-yellow-100 text-yellow-800';
        break;
      case 'Difficile':
        color = 'bg-red-100 text-red-800';
        break;
      default:
        color = 'bg-gray-100 text-gray-800';
    }
    
    return (
      <span className={`inline-block ${color} text-xs px-2 py-0.5 rounded-full`}>
        {difficulte}
      </span>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <SearchBar
          placeholder="Rechercher une proposition de thème..."
          onSearch={handleSearchChange}
        />
        
        <div className="flex flex-wrap gap-2">
          {/* Filtres par type d'auteur */}
          <div className="flex flex-wrap gap-2 mr-4">
            {auteurTypes.map(type => (
              <button
                key={type}
                onClick={() => handleAuteurFilterClick(type)}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  activeFilter === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          
          {/* Filtres par difficulté */}
          <div className="flex flex-wrap gap-2">
            {difficultes.map(difficulte => (
              <button
                key={difficulte}
                onClick={() => handleDifficulteFilterClick(difficulte)}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  difficulteFilter === difficulte
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {difficulte}
              </button>
            ))}
          </div>
        </div>
      </div>
    
      {filteredPropositions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Aucune proposition de thème correspondante trouvée.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPropositions.map((proposition) => (
            <div
              key={proposition.id}
              className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
              onClick={() => handlePropositionClick(proposition)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">{proposition.titre}</h3>
                {renderDifficultyBadge(proposition.difficulte)}
              </div>
              
              <p className="text-sm text-gray-600 mb-2">
                Proposé par {proposition.auteur_nom} ({proposition.auteur_type})
              </p>
              
              <p className="text-sm text-gray-700 line-clamp-3 mb-2">
                {proposition.description}
              </p>
              
              {proposition.technologies_suggerees && proposition.technologies_suggerees.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {proposition.technologies_suggerees.slice(0, 3).map((tech, index) => (
                    <span
                      key={index}
                      className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full"
                    >
                      {tech}
                    </span>
                  ))}
                  {proposition.technologies_suggerees.length > 3 && (
                    <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded-full">
                      +{proposition.technologies_suggerees.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Modal détaillé pour la proposition sélectionnée */}
      {selectedProposition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold">{selectedProposition.titre}</h2>
                    {renderDifficultyBadge(selectedProposition.difficulte)}
                  </div>
                  <p className="text-gray-600">
                    Proposé par {selectedProposition.auteur_nom} ({selectedProposition.auteur_type})
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <section>
                  <h3 className="text-lg font-semibold mb-1">Description</h3>
                  <p className="text-gray-700">{selectedProposition.description}</p>
                </section>

                {selectedProposition.objectifs_pedagogiques && (
                  <section>
                    <h3 className="text-lg font-semibold mb-1">Objectifs pédagogiques</h3>
                    <p className="text-gray-700">{selectedProposition.objectifs_pedagogiques}</p>
                  </section>
                )}

                {selectedProposition.technologies_suggerees && selectedProposition.technologies_suggerees.length > 0 && (
                  <section>
                    <h3 className="text-lg font-semibold mb-1">Technologies suggérées</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProposition.technologies_suggerees.map((tech, index) => (
                        <span
                          key={index}
                          className="inline-block bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {selectedProposition.date_ajout && (
                  <div className="text-xs text-gray-500">
                    Ajouté le {selectedProposition.date_ajout}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};