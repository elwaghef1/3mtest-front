// frontend/src/components/AutorisationSortieModal.js
import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import Button from './Button';
import { generateAutorisationSortiePDF } from './pdfGenerators';
import { calculateCartonsFromKg, calculateKgFromCartons, getKgPerCarton } from '../utils/cartonsUtils';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/solid';

const AutorisationSortieModal = ({ onClose }) => {
  // États pour les données
  const [depots, setDepots] = useState([]);
  const [selectedDepot, setSelectedDepot] = useState('');
  const [stockArticles, setStockArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // États pour le formulaire
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Charger les dépôts au montage
  useEffect(() => {
    fetchDepots();
  }, []);

  // Filtrer les articles selon le terme de recherche
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredArticles(stockArticles);
    } else {
      const filtered = stockArticles.filter(stock => {
        const articleName = (stock.article?.reference || '') + ' ' + (stock.article?.intitule || '') + ' ' + (stock.article?.specification || '');
        return articleName.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredArticles(filtered);
    }
  }, [stockArticles, searchTerm]);

  const fetchDepots = async () => {
    try {
      const response = await axios.get('/depots');
      setDepots(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des dépôts:', error);
      setError('Erreur lors du chargement des dépôts');
    }
  };

  const fetchStockArticles = async (depotId) => {
    if (!depotId) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`/stock?depot=${depotId}`);
      
      // Filtrer seulement les articles avec stock commercialisable > 0
      const articlesAvecStock = response.data
        .filter(stock => stock.quantiteCommercialisableKg > 0)
        .sort((a, b) => {
          // Tri alphabétique par référence puis intitulé
          const nameA = (a.article?.reference || '') + ' ' + (a.article?.intitule || '');
          const nameB = (b.article?.reference || '') + ' ' + (b.article?.intitule || '');
          return nameA.localeCompare(nameB);
        });
      
      setStockArticles(articlesAvecStock);
      setFilteredArticles(articlesAvecStock);
    } catch (error) {
      console.error('Erreur lors du chargement du stock:', error);
      setError('Erreur lors du chargement du stock');
    } finally {
      setLoading(false);
    }
  };

  const handleDepotChange = (depotId) => {
    setSelectedDepot(depotId);
    setSelectedArticles([]);
    setSearchTerm('');
    if (depotId) {
      fetchStockArticles(depotId);
    } else {
      setStockArticles([]);
      setFilteredArticles([]);
    }
  };

  const handleArticleSelect = (stockItem) => {
    // Vérifier si l'article n'est pas déjà sélectionné
    const isAlreadySelected = selectedArticles.some(item => item.stockId === stockItem._id);
    if (isAlreadySelected) return;

    const newSelectedArticle = {
      stockId: stockItem._id,
      article: stockItem.article,
      depot: stockItem.depot,
      quantiteDisponible: stockItem.quantiteCommercialisableKg,
      quantiteCarton: 1,
      quantiteKg: 20,
    };

    setSelectedArticles(prev => [...prev, newSelectedArticle]);
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
      setError('Veuillez sélectionner au moins un article');
      return;
    }

    const selectedDepotObj = depots.find(d => d._id === selectedDepot);
    
    const autorisationData = {
      depot: selectedDepotObj,
      date: new Date(),
      articles: selectedArticles,
    };

    generateAutorisationSortiePDF(autorisationData);
    onClose();
  };

  const formatArticleName = (article) => {
    if (!article) return 'Article inconnu';
    const parts = [article.reference, article.intitule, article.specification].filter(Boolean);
    return parts.join(' - ');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden">
        {/* En-tête */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Éditer une Autorisation de Sortie</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Messages d'erreur */}
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Sélection du dépôt */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sélectionner un dépôt
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
                </option>
              ))}
            </select>
          </div>

          {selectedDepot && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Liste des articles disponibles */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Articles Disponibles</h3>
                
                {/* Barre de recherche */}
                <div className="relative mb-4">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un article..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Chargement...</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredArticles.map(stockItem => {
                      const isSelected = selectedArticles.some(item => item.stockId === stockItem._id);
                      return (
                        <div
                          key={stockItem._id}
                          onClick={() => !isSelected && handleArticleSelect(stockItem)}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-gray-200 border-gray-400 cursor-not-allowed' 
                              : 'bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-300'
                          }`}
                        >
                          <div className="font-medium text-sm">
                            {formatArticleName(stockItem.article)}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Stock disponible: <span className="font-semibold">{stockItem.quantiteCommercialisableKg} kg</span>
                            {stockItem.article?.taille && (
                              <span className="ml-2">• Taille: {stockItem.article.taille}</span>
                            )}
                          </div>
                          {isSelected && (
                            <div className="text-xs text-green-600 mt-1 font-medium">
                              ✓ Déjà sélectionné
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {filteredArticles.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        {stockArticles.length === 0 
                          ? 'Aucun article avec stock disponible dans ce dépôt'
                          : 'Aucun article trouvé pour cette recherche'
                        }
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Articles sélectionnés */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Articles Sélectionnés ({selectedArticles.length})</h3>
                
                {selectedArticles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Cliquez sur un article à gauche pour l'ajouter
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
                              Dispo: {item.quantiteDisponible} kg
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveArticle(index)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
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
                              max={Math.floor(item.quantiteDisponible / 20)}
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
                              max={item.quantiteDisponible}
                              step="0.1"
                              value={item.quantiteKg}
                              onChange={(e) => handleQuantiteKgChange(index, e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                          </div>
                        </div>
                        
                        {item.quantiteKg > item.quantiteDisponible && (
                          <div className="text-xs text-red-600 mt-2">
                            ⚠️ Quantité supérieure au stock disponible
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
            Générer et Télécharger PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AutorisationSortieModal;
