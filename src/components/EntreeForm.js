// frontend/src/components/EntreeForm.js
import React, { useEffect, useState, useMemo } from 'react';
import axios from '../api/axios';
import Button from './Button';
import PriceCalculatorModal from './PriceCalculatorModal';
import { convertKgToCarton, calculateKgFromCartons } from '../utils/cartonsUtils';

function EntreeForm({ onClose, onEntreeCreated, initialEntree }) {
  const [depots, setDepots] = useState([]);
  const [articles, setArticles] = useState([]);
  
  const [depotId, setDepotId] = useState('');
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  // Champ "block" supprimé
  const [origine, setOrigine] = useState(''); // Par défaut vide
  
  // Tableau d'items (chaque item correspond à un article)
  const [items, setItems] = useState([
    {
      article: '',
      quantiteKg: '',
      quantiteTunnel: '',
      // Champ "qualité" supprimé
      prixUnitaire: '',
      // Par défaut, la monnaie est MRU
      monnaie: 'MRU',
      // Le champ Prix Location n'est plus obligatoire
      prixLocation: '',
      quantiteCarton: 0,
      // Nouvelles données pour la persistance du calcul de prix
      priceCalculationData: null,
    },
  ]);
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // État pour le modal de confirmation/résumé
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [entreeData, setEntreeData] = useState(null);
  
  // Récupération des dépôts et articles, et pré-remplissage en cas d'édition
  useEffect(() => {
    fetchDepots();
    fetchArticles();
    if (initialEntree) {
      setDepotId(initialEntree.depot?._id || initialEntree.depot);
      setOrigine(initialEntree.origine || '');
      const initialItems = (initialEntree.items || []).map((item) => ({
        article: item.article?._id || item.article,
        quantiteKg: item.quantiteKg,
        quantiteTunnel: item.quantiteTunnel || '',
        prixUnitaire: item.prixUnitaire || '',
        monnaie: item.monnaie || 'MRU',
        prixLocation: item.prixLocation || '',
        quantiteCarton: convertKgToCarton(item.quantiteKg, item.article, articles),
        priceCalculationData: item.priceCalculationData || null,
      }));
      setItems(initialItems);
    }
  }, [initialEntree]);

  const handleCalc = (index) => (calculatedPrice, calculationData) => {
    const newItems = [...items];
    newItems[index].prixUnitaire = calculatedPrice.toFixed(2);
    newItems[index].priceCalculationData = calculationData;
    setItems(newItems);
  };

  const sortedArticles = useMemo(
    () =>
      [...articles].sort((a, b) =>
        a.reference.localeCompare(b.reference, 'fr', { sensitivity: 'base' })
      ),
    [articles]
  );
  
  const fetchDepots = async () => {
    try {
      const res = await axios.get('/depots');
      setDepots(res.data);
    } catch (err) {
      console.error('Erreur fetch depots:', err);
    }
  };
  
  const fetchArticles = async () => {
    try {
      const res = await axios.get('/articles');
      setArticles(res.data);
    } catch (err) {
      console.error('Erreur fetch articles:', err);
    }
  };
  
  // Mise à jour d'un item
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    const articleId = field === 'article' ? value : newItems[index].article;
    const selectedArticle = articles.find(a => a._id === articleId);
    
    if (field === 'quantiteKg') {
      const kg = parseFloat(value) || 0;
      newItems[index]['quantiteCarton'] = convertKgToCarton(kg, selectedArticle);
    } else if (field === 'quantiteCarton') {
      const cartons = parseFloat(value) || 0;
      newItems[index]['quantiteKg'] = calculateKgFromCartons(cartons, selectedArticle);
    } else if (field === 'article' && selectedArticle) {
      // Recalculer les cartons quand l'article change (en gardant les kg)
      const kg = parseFloat(newItems[index]['quantiteKg']) || 0;
      if (kg > 0) {
        newItems[index]['quantiteCarton'] = convertKgToCarton(kg, selectedArticle);
      }
    }
    
    setItems(newItems);
  };
  
  const addItem = () => {
    setItems([
      ...items,
      {
        article: '',
        quantiteKg: '',
        quantiteTunnel: '',
        prixUnitaire: '',
        monnaie: 'MRU',
        prixLocation: '',
        quantiteCarton: 0,
        priceCalculationData: null,
      },
    ]);
  };
  
  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    
    try {
      // Validation des items
      const validItems = items.filter(item => 
        item.article && 
        (
          (item.quantiteKg && parseFloat(item.quantiteKg) > 0) ||
          (item.quantiteCarton && parseFloat(item.quantiteCarton) > 0)
        ) &&
        item.prixUnitaire &&
        parseFloat(item.prixUnitaire) > 0
      );

      if (validItems.length === 0) {
        setErrorMessage("Veuillez remplir au moins un article avec une quantité (kg ou cartons) et un prix valides.");
        setLoading(false);
        return;
      }

      // Préparation des données pour le résumé
      const payload = {
        depot: depotId,
        origine,
        items: validItems.map((item) => {
          // S'assurer qu'on a une quantité en kg, soit directement soit par conversion
          let quantiteKg = parseFloat(item.quantiteKg) || 0;
          if (quantiteKg === 0 && item.quantiteCarton) {
            const selectedArticle = articles.find(a => a._id === item.article);
            quantiteKg = calculateKgFromCartons(parseFloat(item.quantiteCarton), selectedArticle);
          }
          
          return {
            article: item.article,
            quantiteKg: quantiteKg,
            quantiteTunnel: item.quantiteTunnel ? parseFloat(item.quantiteTunnel) : undefined,
            prixUnitaire: parseFloat(item.prixUnitaire),
            monnaie: item.monnaie,
            prixLocation: item.prixLocation ? parseFloat(item.prixLocation) : undefined,
            priceCalculationData: item.priceCalculationData || null,
          };
        }),
      };

      // Affichage du résumé avant envoi
      setEntreeData(payload);
      setShowConfirmation(true);
      setLoading(false);
    } catch (err) {
      console.error('Erreur lors de la préparation des données:', err);
      setErrorMessage("Erreur lors de la préparation des données.");
      setLoading(false);
    }
  };
  
  // Fonction pour envoyer réellement les données après confirmation
  const confirmSubmit = async () => {
    setLoading(true);
    try {
      if (initialEntree) {
        await axios.put(`/entrees/${initialEntree._id}`, entreeData);
      } else {
        await axios.post('/entrees', entreeData);
      }
      onEntreeCreated();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de l\'entrée:', err);
      setErrorMessage("Erreur lors de la création/mise à jour de l'entrée.");
      setShowConfirmation(false);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-8">
        {initialEntree ? 'Modifier l’Entrée' : 'Nouvelle Entrée'}
      </h2>
  
      {errorMessage && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
          {errorMessage}
        </div>
      )}
  
      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Sélection du dépôt et origine */}
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-lg font-semibold text-gray-800">
                Dépôt *
              </label>
              <select
                className="w-full border-2 border-gray-300 rounded-lg shadow-sm p-4 text-lg focus:ring-3 focus:ring-blue-500 focus:border-blue-500"
                value={depotId}
                onChange={(e) => setDepotId(e.target.value)}
                required
              >
                <option value="">-- Choisir un dépôt --</option>
                {depots.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.intitule}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-lg font-semibold text-gray-800">
                Origine
              </label>
              <input
                type="text"
                className="w-full border-2 border-gray-300 rounded-lg shadow-sm p-4 text-lg focus:ring-3 focus:ring-blue-500 focus:border-blue-500"
                value={origine}
                onChange={(e) => setOrigine(e.target.value)}
                placeholder="Ex: Bateau XYZ, Port ABC..."
              />
            </div>
          </div>
        </div>
  
        {/* Saisie des articles (items) */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-800">Articles</h3>
          {items.map((item, index) => (
            <div key={index} className="p-6 border-2 border-gray-200 rounded-lg bg-gray-50">
              {/* Ligne unique : Article, Quantité (cartons) et Quantité (kg) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Article *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500"
                    value={item.article}
                    onChange={(e) =>
                      handleItemChange(index, 'article', e.target.value)
                    }
                    required
                  >
                    <option value="">-- Choisir un article --</option>
                    {sortedArticles.map((a) => {
                      // Vérifier si cet article est déjà sélectionné dans un autre item
                      const isAlreadySelected = items.some((otherItem, otherIndex) => 
                        otherIndex !== index && otherItem.article === a._id
                      );
                      
                      const parts = [a.reference, a.specification, a.taille].filter(Boolean);
                      return (
                        <option 
                          key={a._id} 
                          value={a._id}
                          disabled={isAlreadySelected}
                          style={isAlreadySelected ? { color: '#999', fontStyle: 'italic' } : {}}
                        >
                          {parts.join(' – ')} {isAlreadySelected ? ' (déjà sélectionné)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    📦 Quantité (Cartons) *
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500"
                    type="number"
                    step="0.01"
                    value={item.quantiteCarton}
                    onChange={(e) =>
                      handleItemChange(index, 'quantiteCarton', e.target.value)
                    }
                    placeholder="Conversion automatique"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Conversion automatique
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    ⚖️ Quantité (Kg)
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500"
                    type="number"
                    step="0.01"
                    value={item.quantiteKg}
                    onChange={(e) =>
                      handleItemChange(index, 'quantiteKg', e.target.value)
                    }
                  />
                </div>
              </div>
              
              {/* Deuxième ligne : Quantité Tunnel uniquement */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Quantité Tunnel (Kg)
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500"
                    type="number"
                    value={item.quantiteTunnel || ''}
                    onChange={(e) =>
                      handleItemChange(index, 'quantiteTunnel', e.target.value)
                    }
                    placeholder="Quantité tunnel optionnelle"
                  />
                </div>
                <div></div> {/* Colonne vide */}
                <div></div> {/* Colonne vide */}
              </div>
              <div className="space-y-1 flex items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Prix Unitaire *
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500"
                    type="number"
                    step="0.01"
                    value={item.prixUnitaire}
                    onChange={(e) =>
                      handleItemChange(index, 'prixUnitaire', e.target.value)
                    }
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCalcOpen({ open: true, idx: index })}
                    className="mb-1"
                    title="Calcul automatique"
                  >
                    ⚙️
                  </Button>
                  {item.priceCalculationData && (
                    <div className="flex items-center text-green-600 text-sm mb-1">
                      <span className="text-xs">✓ Données calculées</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Monnaie *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500"
                    value={item.monnaie}
                    onChange={(e) =>
                      handleItemChange(index, 'monnaie', e.target.value)
                    }
                    required
                  >
                    <option value="MRU">MRU</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Prix Location (MRU/tonne/semaine)
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500"
                    type="number"
                    step="0.01"
                    value={item.prixLocation}
                    onChange={(e) =>
                      handleItemChange(index, 'prixLocation', e.target.value)
                    }
                    // Ce champ n'est plus obligatoire
                  />
                </div>
              </div>
              {items.length > 1 && (
                <div className="mt-4">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => removeItem(index)}
                  >
                    Supprimer cet article
                  </Button>
                </div>
              )}
            </div>
          ))}
          <Button
            variant="info"
            size="lg"
            onClick={addItem}
            className="mt-4"
          >
            + Ajouter un autre article
          </Button>
        </div>

        <div className="flex justify-end space-x-6 mt-10 pt-6 border-t border-gray-200">
          <Button
            variant="secondary"
            size="lg"
            onClick={onClose}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
            loading={loading}
          >
            {initialEntree ? 'Mettre à jour' : 'Enregistrer'}
          </Button>
          {isCalcOpen.open && (
          <PriceCalculatorModal
            isOpen={true}
            onClose={() => setIsCalcOpen({ open: false, idx: null })}
            onCalculate={handleCalc(isCalcOpen.idx)}
            initialData={{
              ...items[isCalcOpen.idx]?.priceCalculationData,
              quantiteTunnel: items[isCalcOpen.idx]?.quantiteTunnel || ''
            }}
            itemIndex={isCalcOpen.idx}
          />
        )}
        </div>
      </form>

      {/* Modal de confirmation/résumé */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">
              Résumé de l'Entrée
            </h3>
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <strong className="text-gray-700">Dépôt:</strong>
                    <p className="text-gray-900">{depots.find(d => d._id === depotId)?.intitule}</p>
                  </div>
                  <div>
                    <strong className="text-gray-700">Origine:</strong>
                    <p className="text-gray-900">{origine || 'Non spécifiée'}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <strong className="text-lg text-gray-700">Articles ({entreeData?.items?.length || 0}):</strong>
                
                {/* Tableau style Excel */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 bg-white">
                    <thead>
                      <tr className="bg-blue-100">
                        <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-800">Article</th>
                        <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-800">Quantité (Kg)</th>
                        <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-800">Quantité (Cartons)</th>
                        <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-800">Tunnel (Kg)</th>
                        <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-800">Prix Unitaire</th>
                        <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-800">Prix Location</th>
                        <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-800">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entreeData?.items?.map((item, idx) => {
                        const article = articles.find(a => a._id === item.article);
                        const articleName = article ? 
                          [article.reference, article.specification, article.taille].filter(Boolean).join(' – ') : 
                          'Article inconnu';
                        
                        // Calculer la quantité en cartons pour l'affichage
                        const quantiteCartons = article ? convertKgToCarton(item.quantiteKg, article) : 0;
                        const totalPrice = (item.quantiteKg * item.prixUnitaire).toFixed(2);
                        
                        return (
                          <tr key={idx} className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                            <td className="border border-gray-300 px-4 py-3 text-gray-900 font-medium">
                              {articleName}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center text-gray-900">
                              {item.quantiteKg}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center text-gray-900">
                              {quantiteCartons.toFixed(2)}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center text-gray-900">
                              {item.quantiteTunnel || '-'}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center text-gray-900">
                              {item.prixUnitaire} {item.monnaie}/Kg
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center text-gray-900">
                              {item.prixLocation ? `${item.prixLocation} MRU/t/sem` : '-'}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center text-gray-900 font-semibold">
                              {totalPrice} {item.monnaie}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Ligne de total */}
                      <tr className="bg-green-100 font-bold">
                        <td className="border border-gray-300 px-4 py-3 text-gray-800">
                          TOTAL
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center text-gray-800">
                          {entreeData?.items?.reduce((sum, item) => sum + (item.quantiteKg || 0), 0).toFixed(2)} Kg
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center text-gray-800">
                          {entreeData?.items?.reduce((sum, item) => {
                            const article = articles.find(a => a._id === item.article);
                            return sum + (article ? convertKgToCarton(item.quantiteKg, article) : 0);
                          }, 0).toFixed(2)} Cartons
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center text-gray-800">
                          {entreeData?.items?.reduce((sum, item) => sum + (item.quantiteTunnel || 0), 0).toFixed(2)} Kg
                        </td>
                        <td className="border border-gray-300 px-4 py-3"></td>
                        <td className="border border-gray-300 px-4 py-3"></td>
                        <td className="border border-gray-300 px-4 py-3 text-center text-gray-800">
                          {entreeData?.items?.reduce((sum, item) => sum + (item.quantiteKg * item.prixUnitaire), 0).toFixed(2)} MRU
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-8">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setShowConfirmation(false)}
                disabled={loading}
              >
                Modifier
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={confirmSubmit}
                loading={loading}
                disabled={loading}
              >
                Confirmer et Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
  
export default EntreeForm;
