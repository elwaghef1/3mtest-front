// frontend/src/components/TransfertForm.js
import React, { useEffect, useState, useMemo } from 'react';
import axios from '../api/axios';
import Button from './Button';
import { convertKgToCarton, calculateKgFromCartons } from '../utils/cartonsUtils';

function TransfertForm({ onClose, onTransfertCreated, initialTransfert }) {
  // Champs globaux
  const [depotDepartId, setDepotDepartId] = useState('');
  const [depotArriveeId, setDepotArriveeId] = useState('');
  const [dateTransfert, setDateTransfert] = useState('');
  const [pointeur, setPointeur] = useState('');
  const [moyenDeTransfert, setMoyenDeTransfert] = useState('');
  const [immatricule, setImmatricule] = useState('');

  // Listes de référence
  const [articles, setArticles] = useState([]);
  const [depots, setDepots] = useState([]);

  // Items de transfert (similaire à EntreeForm)
  const [items, setItems] = useState([
    {
      article: '',
      quantiteKg: '',
      quantiteCarton: 0,
      availableLots: [],
      selectedLots: [], // Multi-lots avec quantités
      stockDisponible: 0,
    }
  ]);

  // Contrôle du chargement
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // État pour le modal de confirmation
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [transfertData, setTransfertData] = useState(null);

  // Chargement initial
  useEffect(() => {
    fetchArticles();
    fetchDepots();
  }, []);

  // Tri des articles par référence
  const sortedArticles = useMemo(
    () =>
      [...articles].sort((a, b) =>
        a.reference.localeCompare(b.reference, 'fr', { sensitivity: 'base' })
      ),
    [articles]
  );

  const fetchArticles = async () => {
    try {
      const res = await axios.get('/articles');
      setArticles(res.data);
    } catch (err) {
      console.error('Erreur fetch articles:', err);
    }
  };

  const fetchDepots = async () => {
    try {
      const res = await axios.get('/depots');
      setDepots(res.data);
    } catch (err) {
      console.error('Erreur fetch depots:', err);
    }
  };

  // Charger les lots disponibles quand un article ou le dépôt de départ change
  const loadAvailableLotsForItem = async (index, articleId) => {
    if (!articleId || !depotDepartId) {
      return;
    }

    try {
      // Charger les entrées pour trouver les lots
      const resEntrees = await axios.get('/entrees');
      const filtered = resEntrees.data.filter((e) => {
        return (
          e.depot &&
          e.depot._id === depotDepartId &&
          e.items &&
          e.items.some(
            (item) =>
              item.article &&
              item.article._id === articleId &&
              item.quantiteRestante > 0
          )
        );
      });

      // Charger le stock disponible
      const resStock = await axios.get('/stock');
      const found = resStock.data.find(
        (s) =>
          s.depot &&
          s.depot._id === depotDepartId &&
          s.article &&
          s.article._id === articleId
      );

      const newItems = [...items];
      newItems[index].availableLots = filtered;
      newItems[index].stockDisponible = found ? found.quantiteCommercialisableKg || 0 : 0;
      newItems[index].selectedLots = [];
      setItems(newItems);
    } catch (err) {
      console.error('Erreur lors du chargement des lots :', err);
    }
  };

  // Mise à jour d'un item
  const handleItemChange = (index, field, value) => {
    // Vérification des articles dupliqués
    if (field === 'article' && value) {
      const existingArticleIndex = items.findIndex((item, i) => i !== index && item.article === value);
      if (existingArticleIndex !== -1) {
        setErrorMessage(`Cet article est déjà sélectionné à la ligne ${existingArticleIndex + 1}. Veuillez choisir un article différent.`);
        return; // Ne pas continuer la mise à jour
      } else {
        setErrorMessage(''); // Effacer le message d'erreur si l'article est valide
      }
    }

    const newItems = [...items];
    newItems[index][field] = value;
    
    const articleId = field === 'article' ? value : newItems[index].article;
    const selectedArticle = articles.find(a => a._id === articleId);
    
    // Gestion de la conversion automatique kg ↔ cartons
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

    // Si l'article change, charger les lots disponibles
    if (field === 'article') {
      loadAvailableLotsForItem(index, value);
    }

    setItems(newItems);
  };

  // Ajouter un nouvel item
  const addItem = () => {
    setItems([
      ...items,
      {
        article: '',
        quantiteKg: '',
        quantiteCarton: 0,
        availableLots: [],
        selectedLots: [],
        stockDisponible: 0,
      }
    ]);
  };

  // Supprimer un item
  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  // Recharger les lots pour tous les items quand le dépôt de départ change
  useEffect(() => {
    if (depotDepartId) {
      items.forEach((item, index) => {
        if (item.article) {
          loadAvailableLotsForItem(index, item.article);
        }
      });
    } else {
      // Réinitialiser tous les lots
      const newItems = items.map(item => ({
        ...item,
        availableLots: [],
        selectedLots: [],
        stockDisponible: 0,
      }));
      setItems(newItems);
    }
  }, [depotDepartId]);

  // Formattage du libellé de lot
  const formatLotLabel = (lot, articleId) => {
    if (!lot || !articleId) return 'Lot inconnu';
    
    // Filtrer pour obtenir seulement les items de l'article spécifique
    const articleItems = lot.items.filter((i) => 
      i.article && String(i.article._id) === String(articleId)
    );
    
    // Calculer la quantité disponible pour cet article spécifique
    const quantiteDisponiblePourArticle = articleItems.reduce((acc, i) => 
      acc + (i.quantiteRestante || 0), 0
    );

    // Afficher clairement que c'est pour cet article spécifique
    return `${lot.batchNumber} (${quantiteDisponiblePourArticle} Kg pour cet article)`;
  };

  // Ajouter un lot à la sélection
  const addLotToSelection = (itemIndex) => {
    const newItems = [...items];
    newItems[itemIndex].selectedLots.push({
      lotId: '',
      quantiteKg: '',
    });
    setItems(newItems);
  };

  // Supprimer un lot de la sélection
  const removeLotFromSelection = (itemIndex, lotIndex) => {
    const newItems = [...items];
    newItems[itemIndex].selectedLots = newItems[itemIndex].selectedLots.filter((_, i) => i !== lotIndex);
    setItems(newItems);
  };

  // Mettre à jour un lot sélectionné
  const handleLotSelectionChange = (itemIndex, lotIndex, field, value) => {
    const newItems = [...items];
    newItems[itemIndex].selectedLots[lotIndex][field] = value;
    setItems(newItems);
  };

  // Calculer la quantité totale des lots sélectionnés
  const getTotalQuantityFromLots = (itemIndex) => {
    return items[itemIndex].selectedLots.reduce((total, lot) => {
      return total + (parseFloat(lot.quantiteKg) || 0);
    }, 0);
  };

  // Obtenir la quantité disponible pour un lot spécifique
  const getAvailableQuantityForLot = (itemIndex, lotId) => {
    const item = items[itemIndex];
    const lot = item.availableLots.find(l => l._id === lotId);
    if (!lot || !item.article) return 0;
    
    // Filtrer strictement par article spécifique
    const articleItems = lot.items.filter((i) => 
      i.article && String(i.article._id) === String(item.article)
    );
    
    // Retourner la quantité disponible pour cet article uniquement
    return articleItems.reduce((acc, i) => acc + (i.quantiteRestante || 0), 0);
  };

  // Gestion de la soumission - Étape 1 : Validation et préparation des données
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    // Validations
    if (depotDepartId === depotArriveeId) {
      setErrorMessage("Vous ne pouvez pas transférer vers le même dépôt.");
      setLoading(false);
      return;
    }

    // Vérifier que tous les items ont les données requises
    const validItems = items.filter(item => 
      item.article && 
      (
        (item.quantiteKg && parseFloat(item.quantiteKg) > 0) ||
        (item.quantiteCarton && parseFloat(item.quantiteCarton) > 0)
      ) &&
      item.selectedLots && item.selectedLots.length > 0
    );

    if (validItems.length === 0) {
      setErrorMessage("Au moins un article avec une quantité (kg ou cartons) et des lots doivent être spécifiés.");
      setLoading(false);
      return;
    }

    // Vérifier les quantités par rapport aux stocks disponibles et validation des lots
    for (const item of validItems) {
      // S'assurer qu'on a une quantité en kg, soit directement soit par conversion
      let quantiteKg = parseFloat(item.quantiteKg) || 0;
      if (quantiteKg === 0 && item.quantiteCarton) {
        const selectedArticle = articles.find(a => a._id === item.article);
        quantiteKg = calculateKgFromCartons(parseFloat(item.quantiteCarton), selectedArticle);
      }
      
      if (quantiteKg > item.stockDisponible) {
        const selectedArticle = articles.find(a => a._id === item.article);
        const articleName = selectedArticle ? 
          [selectedArticle.reference, selectedArticle.specification, selectedArticle.taille, selectedArticle.typeCarton]
            .filter(Boolean).join(' - ') : 
          'Article inconnu';
        setErrorMessage(`Quantité insuffisante pour l'article "${articleName}". Stock disponible: ${item.stockDisponible} Kg`);
        setLoading(false);
        return;
      }

      // Vérifier que tous les lots sélectionnés ont une quantité et un lotId
      for (const lotSelection of item.selectedLots) {
        if (!lotSelection.lotId || !lotSelection.quantiteKg || parseFloat(lotSelection.quantiteKg) <= 0) {
          const selectedArticle = articles.find(a => a._id === item.article);
          const articleName = selectedArticle ? 
            [selectedArticle.reference, selectedArticle.specification, selectedArticle.taille]
              .filter(Boolean).join(' – ') : 
            'Article inconnu';
          setErrorMessage(`Tous les lots sélectionnés pour l'article "${articleName}" doivent avoir une quantité valide.`);
          setLoading(false);
          return;
        }

        // Vérifier que la quantité demandée pour ce lot ne dépasse pas la quantité disponible
        const availableForLot = getAvailableQuantityForLot(items.indexOf(item), lotSelection.lotId);
        if (parseFloat(lotSelection.quantiteKg) > availableForLot) {
          const selectedLot = item.availableLots.find(l => l._id === lotSelection.lotId);
          const selectedArticle = articles.find(a => a._id === item.article);
          const articleName = selectedArticle ? 
            [selectedArticle.reference, selectedArticle.specification, selectedArticle.taille]
              .filter(Boolean).join(' – ') : 
            'Article inconnu';
          setErrorMessage(`Quantité demandée (${lotSelection.quantiteKg}kg) supérieure à la quantité disponible (${availableForLot}kg) dans le lot ${selectedLot?.batchNumber || 'inconnu'} pour l'article "${articleName}".`);
          setLoading(false);
          return;
        }
      }

      // Vérifier que la somme des quantités des lots correspond à la quantité totale
      const totalFromLots = getTotalQuantityFromLots(items.indexOf(item));
      if (Math.abs(totalFromLots - quantiteKg) > 0.01) {
        const selectedArticle = articles.find(a => a._id === item.article);
        const articleName = selectedArticle ? 
          [selectedArticle.reference, selectedArticle.specification, selectedArticle.taille]
            .filter(Boolean).join(' – ') : 
          'Article inconnu';
        setErrorMessage(`La somme des quantités des lots sélectionnés (${totalFromLots}kg) ne correspond pas à la quantité totale demandée (${quantiteKg}kg) pour l'article "${articleName}".`);
        setLoading(false);
        return;
      }
    }

    // Préparer les données pour la confirmation
    const payload = {
      depotDepart: depotDepartId,
      depotArrivee: depotArriveeId,
      pointeur,
      moyenDeTransfert,
      immatricule,
      dateTransfert: dateTransfert ? new Date(dateTransfert) : undefined,
      items: validItems.map(item => {
        // S'assurer qu'on a une quantité en kg, soit directement soit par conversion
        let quantiteKg = parseFloat(item.quantiteKg) || 0;
        if (quantiteKg === 0 && item.quantiteCarton) {
          const selectedArticle = articles.find(a => a._id === item.article);
          quantiteKg = calculateKgFromCartons(parseFloat(item.quantiteCarton), selectedArticle);
        }
        
        return {
          article: item.article,
          quantiteKg: quantiteKg,
          selectedLots: item.selectedLots.map(lot => ({
            lotId: lot.lotId,
            quantiteKg: parseFloat(lot.quantiteKg),
          })),
        };
      }),
    };

    // Stocker les données et afficher la confirmation
    setTransfertData(payload);
    setLoading(false);
    setShowConfirmation(true);
  };

  // Gestion de la soumission - Étape 2 : Envoi après confirmation
  const handleConfirmSubmit = async () => {
    setLoading(true);

    try {
      await axios.post('/transferts/multiple', transfertData);
      onTransfertCreated();
      onClose();
    } catch (error) {
      console.error('Erreur lors de la création du transfert :', error);
      setErrorMessage(
        error.response?.data?.message || 'Erreur lors de la création du transfert'
      );
      setShowConfirmation(false); // Fermer la confirmation en cas d'erreur
    } finally {
      setLoading(false);
    }
  };

  // Annuler la confirmation
  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setTransfertData(null);
  };

  return (
    <div className="p-8 w-full max-h-[95vh] overflow-y-auto">
      <h2 className="text-2xl font-bold mb-6">Nouveau Transfert</h2>

      {errorMessage && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">{/*Augmenté l'espacement entre sections*/}
        {/* Informations générales */}
        <div className="p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-medium mb-4">Informations générales</h3>
          
          {/* Ligne 1 : Dépôts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Dépôt de Départ *
              </label>
              <select
                className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500"
                value={depotDepartId}
                onChange={(e) => setDepotDepartId(e.target.value)}
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
            
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Dépôt d'Arrivée *
              </label>
              <select
                className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500"
                value={depotArriveeId}
                onChange={(e) => setDepotArriveeId(e.target.value)}
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
          </div>

          {/* Ligne 2 : Date et Pointeur */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Date Transfert
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500"
                value={dateTransfert}
                onChange={(e) => setDateTransfert(e.target.value)}
              />
            </div>
            
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Pointeur *
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500"
                value={pointeur}
                onChange={(e) => setPointeur(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Ligne 3 : Moyen de transfert et Immatricule */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Moyen de Transfert
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500"
                value={moyenDeTransfert}
                onChange={(e) => setMoyenDeTransfert(e.target.value)}
              />
            </div>
            
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Immatricule
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500"
                value={immatricule}
                onChange={(e) => setImmatricule(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Articles à transférer */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium">Articles à transférer</h3>

          {items.map((item, index) => (
            <div key={index} className="p-6 border rounded-lg bg-white shadow-sm">
              {/* Première ligne : Quantité (cartons) et Article */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    📦 Quantité à transférer (Cartons) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500"
                    value={item.quantiteCarton}
                    onChange={(e) => handleItemChange(index, 'quantiteCarton', e.target.value)}
                    placeholder="Conversion automatique"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 La conversion kg ↔ cartons se fait automatiquement
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Article *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500"
                    value={item.article}
                    onChange={(e) => handleItemChange(index, 'article', e.target.value)}
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
                  {item.stockDisponible !== undefined && (
                    <p className="text-sm text-red-600 font-semibold">
                      {item.stockDisponible} Kg disponibles
                    </p>
                  )}
                </div>
              </div>

              {/* Deuxième ligne : Quantité (kg) */}
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    ⚖️ Quantité totale à transférer (Kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500"
                    value={item.quantiteKg}
                    onChange={(e) => handleItemChange(index, 'quantiteKg', e.target.value)}
                  />
                  {item.selectedLots.length > 0 && (
                    <div className="mt-2">
                      <span className="text-sm text-blue-600">
                        Quantité totale des lots sélectionnés: {getTotalQuantityFromLots(index).toFixed(2)} Kg
                      </span>
                      {Math.abs(getTotalQuantityFromLots(index) - (parseFloat(item.quantiteKg) || 0)) > 0.01 && (
                        <span className="text-sm text-red-600 block">
                          ⚠️ La somme des lots ne correspond pas à la quantité totale
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Section des lots multiples */}
              {item.availableLots.length > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-gray-700">
                      Sélection des lots (Batch Numbers) *
                    </label>
                    <Button
                      type="button"
                      variant="info"
                      size="sm"
                      onClick={() => addLotToSelection(index)}
                    >
                      + Ajouter un lot
                    </Button>
                  </div>

                  {item.selectedLots.length === 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                      <p className="text-sm text-yellow-800">
                        🔔 Cliquez sur "Ajouter un lot" pour sélectionner les lots à transférer avec leurs quantités spécifiques.
                      </p>
                    </div>
                  )}

                  {item.selectedLots.map((lotSelection, lotIndex) => (
                    <div key={lotIndex} className="p-4 border border-blue-200 rounded-md bg-blue-50">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Lot (Batch Number)
                          </label>
                          <select
                            className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-2 focus:ring-blue-500"
                            value={lotSelection.lotId}
                            onChange={(e) => handleLotSelectionChange(index, lotIndex, 'lotId', e.target.value)}
                            required
                          >
                            <option value="">-- Choisir un lot --</option>
                            {item.availableLots.map((lot) => (
                              <option key={lot._id} value={lot._id}>
                                {formatLotLabel(lot, item.article)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Quantité de ce lot (Kg)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-2 focus:ring-blue-500"
                            value={lotSelection.quantiteKg}
                            onChange={(e) => handleLotSelectionChange(index, lotIndex, 'quantiteKg', e.target.value)}
                            placeholder="Quantité en kg"
                            required
                          />
                          {lotSelection.lotId && (
                            <p className="text-xs text-gray-600">
                              💡 Disponible pour cet article: {getAvailableQuantityForLot(index, lotSelection.lotId)} Kg
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => removeLotFromSelection(index, lotIndex)}
                        >
                          Supprimer ce lot
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {item.availableLots.length === 0 && (
                <div className="mt-6 p-4 bg-gray-100 border border-gray-200 rounded-md">
                  <p className="text-sm text-gray-600 text-center">
                    Sélectionnez d'abord un article et un dépôt de départ pour voir les lots disponibles
                  </p>
                </div>
              )}

              {/* Bouton de suppression */}
              {items.length > 1 && (
                <div className="mt-6">
                  <Button
                    type="button"
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
            type="button"
            variant="info"
            size="md"
            onClick={addItem}
            className="mt-4"
          >
            + Ajouter un autre article
          </Button>
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-end space-x-6 mt-10 pt-6 border-t border-gray-200">{/*Ajout d'une séparation visuelle*/}
          <Button
            type="button"
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
            Créer le transfert
          </Button>
        </div>
      </form>

      {/* Modal de confirmation */}
      {showConfirmation && transfertData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
            <div className="p-8">{/*Augmenté le padding de p-6 à p-8*/}
              <h3 className="text-2xl font-bold mb-6 text-center">Confirmation du Transfert</h3>{/*Augmenté la taille du titre*/}
              
              {/* Informations générales */}
              <div className="bg-gray-50 p-6 rounded-lg mb-6">{/*Augmenté le padding de p-4 à p-6*/}
                <h4 className="font-semibold mb-4 text-lg">Informations générales :</h4>{/*Augmenté la taille du sous-titre*/}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-base">{/*Changé md:grid-cols-2 à lg:grid-cols-2 et augmenté gap et text-size*/}
                  <div>
                    <span className="font-medium">Dépôt de départ :</span>
                    <br />
                    {depots.find(d => d._id === depotDepartId)?.intitule || '—'}
                  </div>
                  <div>
                    <span className="font-medium">Dépôt d'arrivée :</span>
                    <br />
                    {depots.find(d => d._id === depotArriveeId)?.intitule || '—'}
                  </div>
                  <div>
                    <span className="font-medium">Pointeur :</span>
                    <br />
                    {pointeur || '—'}
                  </div>
                  <div>
                    <span className="font-medium">Date :</span>
                    <br />
                    {dateTransfert ? new Date(dateTransfert).toLocaleDateString('fr-FR') : 'Aujourd\'hui'}
                  </div>
                </div>
                {(moyenDeTransfert || immatricule) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-base mt-4">{/*Amélioré la grille et l'espacement*/}
                    {moyenDeTransfert && (
                      <div>
                        <span className="font-medium">Moyen de transfert :</span>
                        <br />
                        {moyenDeTransfert}
                      </div>
                    )}
                    {immatricule && (
                      <div>
                        <span className="font-medium">Immatricule :</span>
                        <br />
                        {immatricule}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Résumé des articles */}
              <div className="bg-blue-50 p-6 rounded-lg mb-8">{/*Augmenté le padding et margin*/}
                <h4 className="font-semibold mb-4 text-lg">Articles à transférer :</h4>{/*Augmenté la taille du titre*/}
                <div className="space-y-3">{/*Augmenté l'espacement entre les articles*/}
                  {transfertData.items.map((item, index) => {
                    const article = articles.find(a => a._id === item.article);
                    const articleName = article ? [article.reference, article.specification, article.taille].filter(Boolean).join(' – ') : 'Article inconnu';
                    
                    // Calculer la quantité en cartons
                    const quantiteCartons = article ? convertKgToCarton(item.quantiteKg, article) : 0;
                    
                    return (
                      <div key={index} className="p-4 bg-white rounded border shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="font-medium text-base">{articleName}</div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="font-semibold text-blue-600 text-lg">{item.quantiteKg} Kg</div>
                            <div className="text-sm text-gray-500">{quantiteCartons.toFixed(2)} Cartons</div>
                          </div>
                        </div>
                        
                        {/* Détail des lots */}
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-gray-700">Lots sélectionnés :</div>
                          {item.selectedLots.map((lotSelection, lotIdx) => {
                            const originalItem = items.find(i => i.article === item.article);
                            const lot = originalItem?.availableLots?.find(l => l._id === lotSelection.lotId);
                            return (
                              <div key={lotIdx} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                                <span>
                                  📦 {lot?.batchNumber || 'Lot inconnu'}
                                </span>
                                <span className="font-medium text-blue-600">
                                  {lotSelection.quantiteKg} Kg
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-5 pt-4 border-t border-blue-200">{/*Augmenté margins et padding*/}
                  <div className="flex justify-between items-center font-bold text-lg mb-2">{/*Augmenté la taille de police*/}
                    <span>Total :</span>
                    <span className="text-blue-600 text-xl">{/*Augmenté la taille de police pour le total*/}
                      {transfertData.items.reduce((sum, item) => sum + item.quantiteKg, 0)} Kg
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Total (Cartons) :</span>
                    <span>
                      {transfertData.items.reduce((sum, item) => {
                        const article = articles.find(a => a._id === item.article);
                        return sum + (article ? convertKgToCarton(item.quantiteKg, article) : 0);
                      }, 0).toFixed(2)} Cartons
                    </span>
                  </div>
                </div>
              </div>

              {/* Boutons de confirmation */}
              <div className="flex justify-end space-x-6 pt-4">{/*Augmenté l'espacement et ajouté padding-top*/}
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={handleCancelConfirmation}
                  disabled={loading}
                >
                  Modifier
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={handleConfirmSubmit}
                  disabled={loading}
                  loading={loading}
                >
                  Confirmer le transfert
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransfertForm;
