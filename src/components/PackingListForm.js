// frontend/src/components/PackingListForm.js
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { generatePackingListFromFormPDF } from './pdfGenerators';

const PackingListForm = ({ commande, isOpen, onClose, onSave }) => {
  const [packingData, setPackingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState({});

  // Initialiser les données du packing list basées sur les cargos de la commande
  useEffect(() => {
    if (commande && commande.cargo && isOpen) {
      const initialData = commande.cargo.map((cargo, index) => {
        // Calculer les totaux pour ce cargo
        const totalQuantity = cargo.itemsAlloues ? 
          cargo.itemsAlloues.reduce((sum, item) => sum + (item.quantiteAllouee || 0), 0) : 0;
        
        // Calculer Num of Box = Net Weight / 20
        const numOfBoxes = Math.ceil(totalQuantity / 20);
        const netWeight = totalQuantity;
        
        // Calculer Gross Weight = Num of Box * poids carton
        const poidsCarton = parseFloat(cargo.poidsCarton) || 20; // Utiliser le poids carton du cargo
        const grossWeight = numOfBoxes * poidsCarton;

        // Obtenir les tailles de tous les articles du cargo
        const sizes = cargo.itemsAlloues ? 
          cargo.itemsAlloues
            .filter(item => item.article && item.article.taille)
            .map(item => item.article.taille)
            .filter((size, index, self) => self.indexOf(size) === index) // Éliminer les doublons
            .join(', ') : '';

        return {
          containerNo: cargo.noDeConteneur || '',
          sealNo: cargo.noPlomb || '',
          size: sizes || '',
          marks: '', // Sera rempli par la sélection d'articles
          prod: '', // À remplir par l'utilisateur
          date: '24 MONTHS FROM DATE OF PRODUCTION', // Valeur automatique
          box: '', // À remplir par l'utilisateur
          numOfBox: numOfBoxes,
          netWeight: netWeight,
          grossWeight: grossWeight,
          poidsCarton: poidsCarton // Stocker le poids carton pour les calculs
        };
      });
      
      setPackingData(initialData);
      
      // Initialiser les articles sélectionnés pour chaque cargo
      const initialSelectedArticles = {};
      commande.cargo.forEach((cargo, index) => {
        initialSelectedArticles[index] = [];
      });
      setSelectedArticles(initialSelectedArticles);
    }
  }, [commande, isOpen]);

  const handleInputChange = (index, field, value) => {
    const newData = [...packingData];
    newData[index] = { ...newData[index], [field]: value };
    
    // Recalculer automatiquement si nécessaire
    if (field === 'netWeight') {
      const numOfBoxes = Math.ceil(parseFloat(value) / 20) || 0;
      const poidsCarton = newData[index].poidsCarton || 20;
      newData[index].numOfBox = numOfBoxes;
      newData[index].grossWeight = numOfBoxes * poidsCarton;
    } else if (field === 'numOfBox') {
      const poidsCarton = newData[index].poidsCarton || 20;
      newData[index].grossWeight = parseFloat(value) * poidsCarton;
    }
    
    setPackingData(newData);
  };

  // Nouvelle fonction pour gérer la sélection d'articles multiples
  const handleArticleSelection = (cargoIndex, selectedOptions) => {
    const newSelectedArticles = { ...selectedArticles };
    newSelectedArticles[cargoIndex] = selectedOptions;
    setSelectedArticles(newSelectedArticles);

    // Mettre à jour les champs marks et size automatiquement
    const newData = [...packingData];
    
    // Remplir marks avec les intitulés séparés par des virgules
    const marks = selectedOptions.map(option => option.intitule).join(', ');
    newData[cargoIndex].marks = marks;

    // Remplir size avec les tailles séparées par des virgules
    const sizes = selectedOptions
      .map(option => option.taille)
      .filter((size, index, self) => self.indexOf(size) === index) // Éliminer les doublons
      .join(', ');
    newData[cargoIndex].size = sizes;

    setPackingData(newData);
  };

  const calculateTotals = () => {
    const totals = {
      totalBoxes: packingData.reduce((sum, row) => sum + (parseFloat(row.numOfBox) || 0), 0),
      totalNetWeight: packingData.reduce((sum, row) => sum + (parseFloat(row.netWeight) || 0), 0),
      totalGrossWeight: packingData.reduce((sum, row) => sum + (parseFloat(row.grossWeight) || 0), 0)
    };
    return totals;
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Sauvegarder les données du packing list dans la commande
      if (onSave) {
        await onSave(packingData);
      }
      
      // Générer le PDF avec la fonction des pdfGenerators
      generatePackingListFromFormPDF(commande, packingData);
      
      alert('Packing list créé avec succès !');
      onClose();
    } catch (error) {
      console.error('Erreur lors de la création du packing list:', error);
      alert('Erreur lors de la création du packing list');
    } finally {
      setLoading(false);
    }
  };

  const getArticleOptions = () => {
    if (!commande.items) return [];
    return commande.items
      .filter(item => item.article && item.article.intitule) // S'assurer que l'article a un intitulé
      .map(item => ({
        value: item.article._id,
        intitule: item.article.intitule,
        taille: item.article.taille || '',
        label: item.article.intitule // Afficher seulement l'intitulé
      }));
  };

  // Composant pour la sélection multiple d'articles
  const ArticleMultiSelect = ({ cargoIndex, selectedOptions, onSelectionChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const options = getArticleOptions();

    // Fermer le menu quand on clique en dehors
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (isOpen && !event.target.closest('.multi-select-container')) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    const toggleOption = (option) => {
      const isSelected = selectedOptions.some(selected => selected.value === option.value);
      let newSelection;
      
      if (isSelected) {
        newSelection = selectedOptions.filter(selected => selected.value !== option.value);
      } else {
        newSelection = [...selectedOptions, option];
      }
      
      onSelectionChange(newSelection);
    };

    return (
      <div className="relative multi-select-container">
        <div
          className="w-full p-1 text-sm border border-gray-300 rounded cursor-pointer min-h-[24px] flex items-center hover:bg-gray-50"
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedOptions.length === 0 ? (
            <span className="text-gray-500">Sélectionner les articles...</span>
          ) : (
            <span className="text-xs">{selectedOptions.length} article(s) sélectionné(s)</span>
          )}
          <span className="ml-auto">▼</span>
        </div>
        
        {isOpen && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
            {options.length === 0 ? (
              <div className="p-2 text-sm text-gray-500">Aucun article disponible</div>
            ) : (
              options.map((option, optIndex) => {
                const isSelected = selectedOptions.some(selected => selected.value === option.value);
                return (
                  <div
                    key={optIndex}
                    className={`p-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0 ${
                      isSelected ? 'bg-blue-50 text-blue-800' : ''
                    }`}
                    onClick={() => toggleOption(option)}
                  >
                    <span className={isSelected ? 'font-semibold' : ''}>
                      {isSelected ? '✓ ' : ''}{option.label}
                    </span>
                    {option.taille && (
                      <span className="text-gray-500 ml-2">({option.taille})</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  };

  const totals = calculateTotals();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-lg max-w-[95vw] w-full h-[95vh] overflow-y-auto">
        <div className="p-4 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Créer le Packing List</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="mb-3">
            <p className="text-sm text-gray-600">
              Commande: <strong>{commande.reference}</strong> | 
              Client: <strong>{commande.client?.raisonSociale}</strong>
            </p>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead className="sticky top-0 bg-gray-100 z-10">
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-1 text-xs font-semibold">Container N°</th>
                  <th className="border border-gray-300 px-2 py-1 text-xs font-semibold">Seal N°</th>
                  <th className="border border-gray-300 px-2 py-1 text-xs font-semibold">Size</th>
                  <th className="border border-gray-300 px-2 py-1 text-xs font-semibold">Articles</th>
                  <th className="border border-gray-300 px-2 py-1 text-xs font-semibold">Prod</th>
                  <th className="border border-gray-300 px-2 py-1 text-xs font-semibold">Expiry Date</th>
                  <th className="border border-gray-300 px-2 py-1 text-xs font-semibold">Box</th>
                  <th className="border border-gray-300 px-2 py-1 text-xs font-semibold">Num of Box</th>
                  <th className="border border-gray-300 px-2 py-1 text-xs font-semibold">Net Weight</th>
                  <th className="border border-gray-300 px-2 py-1 text-xs font-semibold">Gross Weight</th>
                </tr>
              </thead>
              <tbody>
                {packingData.map((row, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        value={row.containerNo}
                        onChange={(e) => handleInputChange(index, 'containerNo', e.target.value)}
                        className="w-full p-1 text-sm border-none outline-none"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        value={row.sealNo}
                        onChange={(e) => handleInputChange(index, 'sealNo', e.target.value)}
                        className="w-full p-1 text-sm border-none outline-none"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        value={row.size}
                        readOnly
                        className="w-full p-1 text-sm border-none outline-none bg-gray-50"
                        title="Rempli automatiquement à partir des articles sélectionnés"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <ArticleMultiSelect
                        cargoIndex={index}
                        selectedOptions={selectedArticles[index] || []}
                        onSelectionChange={(selection) => handleArticleSelection(index, selection)}
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        value={row.prod}
                        onChange={(e) => handleInputChange(index, 'prod', e.target.value)}
                        className="w-full p-1 text-sm border-none outline-none"
                        placeholder="Prod"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        value={row.date}
                        readOnly
                        className="w-full p-1 text-sm border-none outline-none bg-gray-50 font-semibold"
                        title="Valeur automatique: 24 MONTHS FROM DATE OF PRODUCTION"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        value={row.box}
                        onChange={(e) => handleInputChange(index, 'box', e.target.value)}
                        className="w-full p-1 text-sm border-none outline-none"
                        placeholder="Box"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="number"
                        value={row.numOfBox}
                        readOnly
                        className="w-full p-1 text-sm border-none outline-none text-center bg-gray-50"
                        title="Calculé automatiquement: Net Weight ÷ 20"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="number"
                        value={row.netWeight}
                        onChange={(e) => handleInputChange(index, 'netWeight', e.target.value)}
                        className="w-full p-1 text-sm border-none outline-none text-right"
                        step="0.01"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="number"
                        value={row.grossWeight}
                        readOnly
                        className="w-full p-1 text-sm border-none outline-none text-right bg-gray-50"
                        title="Calculé automatiquement: Num of Box × Poids Carton"
                      />
                    </td>
                  </tr>
                ))}
                {/* Ligne des totaux */}
                <tr className="bg-gray-100 font-semibold">
                  <td colSpan="7" className="border border-gray-300 p-2 text-right">TOTAL:</td>
                  <td className="border border-gray-300 p-2 text-center">{totals.totalBoxes}</td>
                  <td className="border border-gray-300 p-2 text-right">{totals.totalNetWeight.toFixed(2)}</td>
                  <td className="border border-gray-300 p-2 text-right">{totals.totalGrossWeight.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end space-x-3 mt-4 pt-4 border-t bg-white">
            <Button
              onClick={onClose}
              variant="secondary"
              size="md"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              variant="primary"
              size="md"
              disabled={loading}
            >
              {loading ? 'Création...' : 'Créer et Télécharger PDF'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackingListForm;
