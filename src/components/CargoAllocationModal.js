// frontend/src/components/CargoAllocationModal.js
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { XMarkIcon } from '@heroicons/react/24/outline';

function CargoAllocationModal({ commande, isOpen, onClose, onSave }) {
  const [cargoAllocations, setCargoAllocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedOptions, setSavedOptions] = useState({}); // Sauvegarde des options

  useEffect(() => {
    if (isOpen && commande) {
      initializeAllocations();
      loadSavedOptions();
    }
  }, [isOpen, commande]);

  // Sauvegarder les options dans localStorage
  const saveOptions = (options) => {
    const key = `cargo_options_${commande.reference}`;
    localStorage.setItem(key, JSON.stringify(options));
    setSavedOptions(options);
  };

  // Charger les options sauvegardées
  const loadSavedOptions = () => {
    const key = `cargo_options_${commande.reference}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const options = JSON.parse(saved);
        setSavedOptions(options);
      } catch (e) {
        console.error('Erreur lors du chargement des options:', e);
      }
    }
  };

  const initializeAllocations = () => {
    // Initialiser les allocations basées sur les cargos et articles existants
    const initialAllocations = commande.cargo.map((cargo, cargoIndex) => ({
      ...cargo,
      itemsAlloues: cargo.itemsAlloues || [],
      cargoIndex
    }));

    setCargoAllocations(initialAllocations);
  };

  const addItemToCargo = (cargoIndex) => {
    const updatedAllocations = [...cargoAllocations];
    
    // Utiliser les valeurs par défaut sauvegardées
    const defaultValues = {
      containerNo: savedOptions.default_containerNo || '',
      sealNo: savedOptions.default_sealNo || '',
      batchNumber: savedOptions['default_lot.batchNumber'] || '',
      dateProduction: savedOptions.default_dateProduction || 'MAY 2025',
      dateExpiration: savedOptions.default_dateExpiration || 'NOVEMBER 2026'
    };
    
    updatedAllocations[cargoIndex].itemsAlloues.push({
      article: null,
      depot: null,
      quantiteAllouee: 0,
      quantiteCarton: 0,
      containerNo: defaultValues.containerNo,
      sealNo: defaultValues.sealNo,
      lot: { 
        batchNumber: defaultValues.batchNumber, 
        entreeOrigine: null 
      },
      dateProduction: defaultValues.dateProduction,
      dateExpiration: defaultValues.dateExpiration
    });
    setCargoAllocations(updatedAllocations);
  };

  const removeItemFromCargo = (cargoIndex, itemIndex) => {
    const updatedAllocations = [...cargoAllocations];
    updatedAllocations[cargoIndex].itemsAlloues.splice(itemIndex, 1);
    setCargoAllocations(updatedAllocations);
  };

  const updateCargoItem = (cargoIndex, itemIndex, field, value) => {
    const updatedAllocations = [...cargoAllocations];
    const item = updatedAllocations[cargoIndex].itemsAlloues[itemIndex];
    
    if (field.includes('.')) {
      // Pour les champs nested comme lot.batchNumber
      const [parent, child] = field.split('.');
      updatedAllocations[cargoIndex].itemsAlloues[itemIndex][parent] = {
        ...updatedAllocations[cargoIndex].itemsAlloues[itemIndex][parent],
        [child]: value
      };
    } else {
      // Validation des quantités avant mise à jour
      if (field === 'quantiteAllouee') {
        const newQuantity = parseFloat(value) || 0;
        const articleId = item.article?._id || item.article;
        const depotId = item.depot?._id || item.depot;
        
        if (articleId && depotId) {
          const available = getAvailableQuantity(articleId, depotId);
          
          // Vérifier si la nouvelle quantité ne dépasse pas la disponibilité
          if (newQuantity > available.kg) {
            alert(`Quantité maximale disponible: ${available.kg}kg (${available.cartons} cartons)`);
            return; // Ne pas mettre à jour si dépassement
          }
        }
      }
      
      updatedAllocations[cargoIndex].itemsAlloues[itemIndex][field] = value;
      
      // Calcul automatique des cartons (20kg par carton)
      if (field === 'quantiteAllouee') {
        updatedAllocations[cargoIndex].itemsAlloues[itemIndex].quantiteCarton = 
          Math.ceil(parseFloat(value) / 20) || 0;
      }
    }
    
    setCargoAllocations(updatedAllocations);
    
    // Sauvegarder automatiquement les options importantes
    if (['containerNo', 'sealNo', 'lot.batchNumber', 'dateProduction', 'dateExpiration'].includes(field)) {
      const optionsToSave = {
        ...savedOptions,
        [`cargo_${cargoIndex}_item_${itemIndex}_${field}`]: value
      };
      saveOptions(optionsToSave);
    }
  };

  const getAvailableArticles = () => {
    // Retourner la liste des articles de la commande
    return commande.items || [];
  };

  const getAvailableQuantity = (articleId, depotId) => {
    // Calculer la quantité disponible pour cet article
    const commandeItem = commande.items?.find(item => 
      (item.article?._id || item.article) === articleId && 
      (item.depot?._id || item.depot) === depotId
    );
    
    if (!commandeItem) return { kg: 0, cartons: 0 };

    // Soustraire les quantités déjà allouées à d'autres cargos
    const alreadyAllocated = cargoAllocations.reduce((total, cargo) => {
      return total + (cargo.itemsAlloues?.reduce((cargoTotal, item) => {
        if (item.article && item.depot &&
            (item.article._id || item.article) === articleId && 
            (item.depot._id || item.depot) === depotId) {
          return cargoTotal + (parseFloat(item.quantiteAllouee) || 0);
        }
        return cargoTotal;
      }, 0) || 0);
    }, 0);

    const availableKg = Math.max(0, commandeItem.quantiteKg - alreadyAllocated);
    const availableCartons = Math.floor(availableKg / 20); // 20kg par carton
    
    return { kg: availableKg, cartons: availableCartons };
  };

  const getCargoSummary = (cargo) => {
    const totalKg = cargo.itemsAlloues?.reduce((total, item) => 
      total + (parseFloat(item.quantiteAllouee) || 0), 0) || 0;
    const totalCartons = cargo.itemsAlloues?.reduce((total, item) => 
      total + (parseInt(item.quantiteCarton) || 0), 0) || 0;
    const articleCount = cargo.itemsAlloues?.length || 0;
    
    return { totalKg, totalCartons, articleCount };
  };

  const getGlobalSummary = () => {
    const totalAllocatedByArticle = {};
    const errors = [];
    
    // Calculer les totaux alloués par article
    cargoAllocations.forEach(cargo => {
      cargo.itemsAlloues?.forEach(item => {
        if (item.article && item.depot) {
          const key = `${item.article._id || item.article}_${item.depot._id || item.depot}`;
          totalAllocatedByArticle[key] = (totalAllocatedByArticle[key] || 0) + (parseFloat(item.quantiteAllouee) || 0);
        }
      });
    });
    
    // Vérifier les dépassements
    commande.items?.forEach(commandeItem => {
      const key = `${commandeItem.article._id || commandeItem.article}_${commandeItem.depot._id || commandeItem.depot}`;
      const allocated = totalAllocatedByArticle[key] || 0;
      const articleName = commandeItem.article?.reference || 'Article inconnu';
      
      if (allocated > commandeItem.quantiteKg) {
        errors.push({
          article: articleName,
          commanded: commandeItem.quantiteKg,
          allocated: allocated,
          excess: allocated - commandeItem.quantiteKg
        });
      }
    });
    
    return { totalAllocatedByArticle, errors };
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Validation : vérifier que les allocations ne dépassent pas les quantités commandées
      const errors = [];
      
      commande.items?.forEach(commandeItem => {
        const totalAllocated = cargoAllocations.reduce((total, cargo) => {
          return total + (cargo.itemsAlloues?.reduce((cargoTotal, item) => {
            // Vérifier que l'article et le depot ne sont pas null
            if (item.article && item.depot && 
                (item.article._id || item.article) === (commandeItem.article._id || commandeItem.article) && 
                (item.depot._id || item.depot) === (commandeItem.depot._id || commandeItem.depot)) {
              return cargoTotal + (parseFloat(item.quantiteAllouee) || 0);
            }
            return cargoTotal;
          }, 0) || 0);
        }, 0);

        if (totalAllocated > commandeItem.quantiteKg) {
          const articleName = commandeItem.article?.reference || `Article ${commandeItem.article}`;
          errors.push(`${articleName}: allocation (${totalAllocated}kg) > quantité commandée (${commandeItem.quantiteKg}kg)`);
        }
      });

      if (errors.length > 0) {
        setError('Erreurs d\'allocation:\n' + errors.join('\n'));
        return;
      }

      // Sauvegarder les allocations
      await onSave(cargoAllocations);
      onClose();
    } catch (err) {
      setError('Erreur lors de la sauvegarde: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            Allocation des Articles par Cargo - {commande.reference}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded whitespace-pre-line">
            {error}
          </div>
        )}

        {/* Section des options par défaut */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-800 mb-3">Options par défaut (appliquées aux nouveaux articles)</h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-blue-700 mb-1">Container N° par défaut</label>
              <input
                type="text"
                value={savedOptions.default_containerNo || ''}
                onChange={(e) => saveOptions({...savedOptions, default_containerNo: e.target.value})}
                className="w-full text-xs border border-blue-300 rounded p-1"
                placeholder="CONT-001"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-700 mb-1">Seal N° par défaut</label>
              <input
                type="text"
                value={savedOptions.default_sealNo || ''}
                onChange={(e) => saveOptions({...savedOptions, default_sealNo: e.target.value})}
                className="w-full text-xs border border-blue-300 rounded p-1"
                placeholder="SEAL-001"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-700 mb-1">Batch par défaut</label>
              <input
                type="text"
                value={savedOptions['default_lot.batchNumber'] || ''}
                onChange={(e) => saveOptions({...savedOptions, 'default_lot.batchNumber': e.target.value})}
                className="w-full text-xs border border-blue-300 rounded p-1"
                placeholder="ML-MR00008336"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-700 mb-1">Date Prod. par défaut</label>
              <input
                type="text"
                value={savedOptions.default_dateProduction || ''}
                onChange={(e) => saveOptions({...savedOptions, default_dateProduction: e.target.value})}
                className="w-full text-xs border border-blue-300 rounded p-1"
                placeholder="MAY 2025"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-700 mb-1">Date Exp. par défaut</label>
              <input
                type="text"
                value={savedOptions.default_dateExpiration || ''}
                onChange={(e) => saveOptions({...savedOptions, default_dateExpiration: e.target.value})}
                className="w-full text-xs border border-blue-300 rounded p-1"
                placeholder="NOVEMBER 2026"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6 max-h-96 overflow-y-auto">
          {cargoAllocations.map((cargo, cargoIndex) => {
            const summary = getCargoSummary(cargo);
            return (
              <div key={cargoIndex} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800">
                      {cargo.nom} - Conteneur: {cargo.noDeConteneur || 'Non défini'}
                    </h4>
                    <div className="text-sm text-gray-600 mt-1">
                      <span className="mr-4">📦 {summary.articleCount} article(s)</span>
                      <span className="mr-4">⚖️ {summary.totalKg.toFixed(2)}kg</span>
                      <span>📦 {summary.totalCartons} carton(s)</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => addItemToCargo(cargoIndex)}
                    variant="success"
                    size="sm"
                  >
                    Ajouter Article
                  </Button>
                </div>

                {cargo.itemsAlloues && cargo.itemsAlloues.length > 0 ? (
                  <div className="space-y-3">
                    {cargo.itemsAlloues.map((item, itemIndex) => {
                      const articleId = item.article?._id || item.article;
                      const depotId = item.depot?._id || item.depot;
                      const available = articleId && depotId ? getAvailableQuantity(articleId, depotId) : { kg: 0, cartons: 0 };
                      
                      return (
                        <div key={itemIndex} className="grid grid-cols-1 md:grid-cols-9 gap-3 p-3 bg-white rounded border">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Article</label>
                            <select
                              value={item.article?._id || item.article || ''}
                              onChange={(e) => updateCargoItem(cargoIndex, itemIndex, 'article', e.target.value)}
                              className="w-full text-xs border border-gray-300 rounded p-1"
                            >
                              <option value="">Sélectionner...</option>
                              {getAvailableArticles().map((commandeItem, idx) => (
                                <option key={idx} value={commandeItem.article._id || commandeItem.article}>
                                  {commandeItem.article?.reference || `Article ${idx + 1}`}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Quantité (kg)
                              {available.kg > 0 && (
                                <span className="text-green-600 text-xs ml-1">
                                  Max: {available.kg}kg
                                </span>
                              )}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.quantiteAllouee || ''}
                              onChange={(e) => updateCargoItem(cargoIndex, itemIndex, 'quantiteAllouee', e.target.value)}
                              className="w-full text-xs border border-gray-300 rounded p-1"
                              placeholder="0.00"
                              max={available.kg}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Cartons
                              {available.cartons > 0 && (
                                <span className="text-green-600 text-xs ml-1">
                                  Max: {available.cartons}
                                </span>
                              )}
                            </label>
                            <input
                              type="number"
                              value={item.quantiteCarton || ''}
                              disabled
                              className="w-full text-xs border border-gray-300 rounded p-1 bg-gray-100"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Container N°</label>
                            <input
                              type="text"
                              value={item.containerNo || ''}
                              onChange={(e) => updateCargoItem(cargoIndex, itemIndex, 'containerNo', e.target.value)}
                              className="w-full text-xs border border-gray-300 rounded p-1"
                              placeholder="CONT-001"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Seal N°</label>
                            <input
                              type="text"
                              value={item.sealNo || ''}
                              onChange={(e) => updateCargoItem(cargoIndex, itemIndex, 'sealNo', e.target.value)}
                              className="w-full text-xs border border-gray-300 rounded p-1"
                              placeholder="SEAL-001"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Batch Number</label>
                            <input
                              type="text"
                              value={item.lot?.batchNumber || ''}
                              onChange={(e) => updateCargoItem(cargoIndex, itemIndex, 'lot.batchNumber', e.target.value)}
                              className="w-full text-xs border border-gray-300 rounded p-1"
                              placeholder="ML-MR00008336"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Date Prod.</label>
                            <input
                              type="text"
                              value={item.dateProduction || ''}
                              onChange={(e) => updateCargoItem(cargoIndex, itemIndex, 'dateProduction', e.target.value)}
                              className="w-full text-xs border border-gray-300 rounded p-1"
                              placeholder="MAY 2025"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Date Exp.</label>
                            <input
                              type="text"
                              value={item.dateExpiration || ''}
                              onChange={(e) => updateCargoItem(cargoIndex, itemIndex, 'dateExpiration', e.target.value)}
                              className="w-full text-xs border border-gray-300 rounded p-1"
                              placeholder="NOVEMBER 2026"
                            />
                          </div>

                          <div className="flex items-end">
                            <Button
                              onClick={() => removeItemFromCargo(cargoIndex, itemIndex)}
                              variant="danger"
                              size="sm"
                            >
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-center py-4">
                    Aucun article alloué à ce cargo. Cliquez sur "Ajouter Article" pour commencer.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <Button onClick={onClose} variant="secondary" disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSave} variant="primary" disabled={loading}>
            {loading ? 'Sauvegarde...' : 'Sauvegarder Allocations'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CargoAllocationModal;
