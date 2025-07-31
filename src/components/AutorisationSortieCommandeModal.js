// frontend/src/components/AutorisationSortieCommandeModal.js
import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import Button from './Button';
import { generateAutorisationSortiePDF } from './pdfGenerators';
import { calculateCartonsFromKg, calculateKgFromCartons } from '../utils/cartonsUtils';
import {
  XMarkIcon,
  TrashIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/solid';

const AutorisationSortieCommandeModal = ({ commande, onClose }) => {
  // États pour les données
  const [depots, setDepots] = useState([]);
  const [selectedDepot, setSelectedDepot] = useState('');
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Charger les dépôts au montage
  useEffect(() => {
    fetchDepots();
  }, []);

  // Initialiser les articles de la commande
  useEffect(() => {
    if (commande && commande.items) {
      initializeArticlesFromCommande();
    }
  }, [commande]);

  const fetchDepots = async () => {
    try {
      const response = await axios.get('/depots');
      setDepots(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des dépôts:', error);
      setError('Erreur lors du chargement des dépôts');
    }
  };

  const initializeArticlesFromCommande = () => {
    const articlesFromCommande = commande.items.map((item, index) => ({
      stockId: `commande_${index}`, // ID unique pour identifier l'item
      article: item.article,
      depot: null, // À sélectionner par l'utilisateur
      quantiteDisponible: item.quantiteKg, // Utiliser la quantité de la commande
      quantiteCarton: calculateCartonsFromKg(item.quantiteKg, item),
      quantiteKg: item.quantiteKg,
      fromCommande: true, // Marquer comme venant de la commande
    }));

    setSelectedArticles(articlesFromCommande);
  };

  const formatArticleName = (article) => {
    if (!article) return 'Article non défini';
    const parts = [
      article.reference,
      article.intitule,
      article.specification,
      article.taille,
      article.typeCarton
    ].filter(Boolean);
    return parts.join(' - ');
  };

  const handleDepotChange = (depotId) => {
    setSelectedDepot(depotId);
    const selectedDepotObj = depots.find(d => d._id === depotId);
    
    // Mettre à jour tous les articles avec le dépôt sélectionné
    setSelectedArticles(prev => prev.map(item => ({
      ...item,
      depot: selectedDepotObj
    })));
  };

  const handleQuantiteCartonChange = (index, value) => {
    const numValue = parseInt(value) || 0;
    setSelectedArticles(prev => prev.map((item, i) => 
      i === index 
        ? { ...item, quantiteCarton: numValue, quantiteKg: calculateKgFromCartons(numValue, item) }
        : item
    ));
  };

  const handleQuantiteKgChange = (index, value) => {
    const numValue = parseFloat(value) || 0;
    setSelectedArticles(prev => prev.map((item, i) => 
      i === index 
        ? { ...item, quantiteKg: numValue, quantiteCarton: calculateCartonsFromKg(numValue, item) }
        : item
    ));
  };

  const handleRemoveArticle = (index) => {
    setSelectedArticles(prev => prev.filter((_, i) => i !== index));
  };

  const handleGeneratePDF = () => {
    if (selectedArticles.length === 0) {
      setError('Aucun article à inclure dans l\'autorisation');
      return;
    }

    if (!selectedDepot) {
      setError('Veuillez sélectionner un dépôt');
      return;
    }

    const selectedDepotObj = depots.find(d => d._id === selectedDepot);
    
    const autorisationData = {
      depot: selectedDepotObj,
      date: new Date(),
      articles: selectedArticles,
      commande: {
        numero: commande.numeroCommande,
        client: commande.client,
        date: commande.dateCommande
      }
    };

    generateAutorisationSortiePDF(autorisationData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden">
        {/* En-tête */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Autorisation de Sortie
            </h2>
            <p className="text-blue-100 mt-1">
              Commande N° {commande?.numeroCommande} - {commande?.client?.nom}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Contenu principal */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 140px)' }}>
          {/* Sélection du dépôt */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sélectionner le dépôt *
            </label>
            <select
              value={selectedDepot}
              onChange={(e) => handleDepotChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Choisir un dépôt --</option>
              {depots.map(depot => (
                <option key={depot._id} value={depot._id}>
                  {depot.intitule} ({depot.code})
                  {depot.location && ` - ${depot.location}`}
                </option>
              ))}
            </select>
          </div>

          {/* Articles de la commande */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">
              Articles de la Commande ({selectedArticles.length})
            </h3>
            
            {selectedArticles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun article dans cette commande
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {selectedArticles.map((item, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {formatArticleName(item.article)}
                        </div>
                        <div className="text-xs text-gray-600">
                          Quantité commande: {item.quantiteDisponible} kg
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveArticle(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                        title="Retirer de l'autorisation"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Quantité (Cartons)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.quantiteCarton}
                          onChange={(e) => handleQuantiteCartonChange(index, e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Quantité (Kg)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={item.quantiteKg}
                          onChange={(e) => handleQuantiteKgChange(index, e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Récapitulatif */}
          {selectedArticles.length > 0 && (
            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Récapitulatif</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total articles:</span>
                  <span className="ml-2 font-semibold">{selectedArticles.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total cartons:</span>
                  <span className="ml-2 font-semibold">
                    {selectedArticles.reduce((sum, item) => sum + (item.quantiteCarton || 0), 0)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Total kg:</span>
                  <span className="ml-2 font-semibold">
                    {selectedArticles.reduce((sum, item) => sum + (item.quantiteKg || 0), 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Dépôt:</span>
                  <span className="ml-2 font-semibold">
                    {selectedDepot ? depots.find(d => d._id === selectedDepot)?.intitule : 'Non sélectionné'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pied de page avec boutons */}
        <div className="flex justify-end space-x-4 p-6 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={onClose}
            variant="secondary"
            size="lg"
          >
            Annuler
          </Button>
          <Button
            onClick={handleGeneratePDF}
            variant="primary"
            size="lg"
            disabled={selectedArticles.length === 0 || !selectedDepot}
            icon={<DocumentArrowDownIcon className="h-5 w-5" />}
          >
            Générer Autorisation PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AutorisationSortieCommandeModal;
