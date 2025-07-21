import React, { useState, useEffect } from 'react';
import { ProjetRealise, PropositionTheme } from '@/types';
import { ProjetsRealises } from './projets-realises';
import { PropositionsThemes } from './propositions-themes';

interface ProjetsTabProps {
  // Props si nécessaire
}

export const ProjetsTab: React.FC<ProjetsTabProps> = () => {
  const [activeTab, setActiveTab] = useState<'realises' | 'propositions'>('realises');
  const [loading, setLoading] = useState(true);
  const [projets, setProjets] = useState<ProjetRealise[]>([]);
  const [propositions, setPropositions] = useState<PropositionTheme[]>([]);

  // Charger les données
  useEffect(() => {
    setLoading(true);
    const fetchProjets = async () => {
      try {
        const response = await fetch('/api/projets-realises');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des projets');
        }
        const data = await response.json();
        setProjets(data.data || []);
      } catch (error) {
        console.error('Erreur fetchProjets:', error);
        setProjets([]);
      }
    };

    const fetchPropositions = async () => {
      try {
        const response = await fetch('/api/propositions-themes');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des propositions');
        }
        const data = await response.json();
        setPropositions(Array.isArray(data) ? data : data.data || []);
      } catch (error) {
        console.error('Erreur fetchPropositions:', error);
        setPropositions([]);
      }
    };

    Promise.all([fetchProjets(), fetchPropositions()]).finally(() => {
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Projets</h2>
      
      {/* Navigation entre les onglets */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          className={`py-2 px-4 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'realises'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('realises')}
        >
          Projets réalisés
        </button>
        <button
          className={`py-2 px-4 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'propositions'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('propositions')}
        >
          Propositions de thèmes
        </button>
      </div>
      
      {/* État de chargement */}
      {loading ? (
        <div className="py-8 flex justify-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <>
          {/* Afficher le composant en fonction de l'onglet actif */}
          {activeTab === 'realises' ? (
            <ProjetsRealises projets={projets} />
          ) : (
            <PropositionsThemes propositions={propositions} />
          )}
        </>
      )}
    </div>
  );
};