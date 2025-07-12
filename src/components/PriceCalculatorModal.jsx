import React, { useState, useEffect } from 'react';
import Button from './Button';

export default function PriceCalculatorModal({ isOpen, onClose, onCalculate, initialData, isGlobalCalculation = false }) {
  const [poidsCamion, setPoidsCamion] = useState('');
  const [prixUnitaireAchat, setPrixUnitaireAchat] = useState('');
  const [valeurCamion, setValeurCamion] = useState(0);
  const [quantiteRejetee, setQuantiteRejetee] = useState('');
  const [prixUnitaireRejet, setPrixUnitaireRejet] = useState('');
  const [recetteRejet, setRecetteRejet] = useState(0);
  const [prixTotal, setPrixTotal] = useState(0);
  const [quantiteTunnel, setQuantiteTunnel] = useState('');
  const [prixUnitaireFrais, setPrixUnitaireFrais] = useState(0);
  const [frais, setFrais] = useState('');
  const [prixUnitaireFinal, setPrixUnitaireFinal] = useState(0);

  // Initialisation avec les données existantes
  useEffect(() => {
    if (initialData) {
      setPoidsCamion(initialData.poidsCamion || '');
      setPrixUnitaireAchat(initialData.prixUnitaireAchat || '');
      setQuantiteRejetee(initialData.quantiteRejetee || '');
      setPrixUnitaireRejet(initialData.prixUnitaireRejet || '');
      setFrais(initialData.frais || '');
      setQuantiteTunnel(initialData.quantiteTunnel || '');
    }
  }, [initialData, isOpen]);

  // Calcul automatique dès que les valeurs changent
  useEffect(() => {
    // Calcul de la valeur camion
    const poidsCamionNum = parseFloat(poidsCamion) || 0;
    const prixAchatNum = parseFloat(prixUnitaireAchat) || 0;
    const valeurCamionCalc = poidsCamionNum * prixAchatNum;
    setValeurCamion(valeurCamionCalc);

    // Calcul de la recette rejet
    const quantiteRejeteeNum = parseFloat(quantiteRejetee) || 0;
    const prixRejetNum = parseFloat(prixUnitaireRejet) || 0;
    const recetteRejetCalc = quantiteRejeteeNum * prixRejetNum;
    setRecetteRejet(recetteRejetCalc);

    // Calcul du prix total
    const prixTotalCalc = valeurCamionCalc - recetteRejetCalc;
    setPrixTotal(prixTotalCalc);

    // Calcul du prix unitaire frais
    const quantiteTunnelNum = parseFloat(quantiteTunnel) || 0;
    const prixUnitaireFraisCalc = quantiteTunnelNum > 0 ? prixTotalCalc / quantiteTunnelNum : 0;
    setPrixUnitaireFrais(prixUnitaireFraisCalc);

    // Calcul du prix unitaire final
    const fraisNum = parseFloat(frais) || 0;
    const prixUnitaireFinalCalc = prixUnitaireFraisCalc + fraisNum;
    setPrixUnitaireFinal(prixUnitaireFinalCalc);
  }, [poidsCamion, prixUnitaireAchat, quantiteRejetee, prixUnitaireRejet, quantiteTunnel, frais]);

  if (!isOpen) return null;

  const handleValidate = () => {
    const calculatedData = {
      poidsCamion,
      prixUnitaireAchat,
      valeurCamion,
      quantiteRejetee,
      prixUnitaireRejet,
      recetteRejet,
      prixTotal,
      quantiteTunnel,
      prixUnitaireFrais,
      frais,
      prixUnitaireFinal,
    };
    
    onCalculate(prixUnitaireFinal, calculatedData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">
            {isGlobalCalculation ? 'Calcul du Prix Unitaire Global' : 'Calcul du Prix Unitaire'}
          </h3>
          {initialData && initialData.prixUnitaireFinal && (
            <div className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded">
              ✓ Données existantes
            </div>
          )}
        </div>
        
        {isGlobalCalculation && (
          <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>📊 Calcul Global:</strong> Le prix unitaire calculé sera appliqué automatiquement à tous les articles de cette entrée.
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section Camion */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700 border-b pb-2">Données Camion</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Poids camion (kg)
              </label>
              <input 
                type="number" 
                value={poidsCamion} 
                onChange={e => setPoidsCamion(e.target.value)} 
                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500" 
                placeholder="Poids total du camion"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix unitaire d'achat (MRU/kg)
              </label>
              <input 
                type="number" 
                value={prixUnitaireAchat} 
                onChange={e => setPrixUnitaireAchat(e.target.value)} 
                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500" 
                placeholder="Prix par kg"
              />
            </div>
            
            <div className="bg-gray-50 p-3 rounded">
              <span className="text-sm font-medium text-gray-700">
                Valeur camion : 
              </span>
              <span className="text-lg font-bold text-blue-600">
                {valeurCamion.toFixed(2)} MRU
              </span>
            </div>
          </div>

          {/* Section Rejet */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700 border-b pb-2">Données Rejet</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantité Rejetée (kg)
              </label>
              <input 
                type="number" 
                value={quantiteRejetee} 
                onChange={e => setQuantiteRejetee(e.target.value)} 
                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500" 
                placeholder="Quantité rejetée"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix unitaire rejet (MRU/kg)
              </label>
              <input 
                type="number" 
                value={prixUnitaireRejet} 
                onChange={e => setPrixUnitaireRejet(e.target.value)} 
                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500" 
                placeholder="Prix de vente du rejet"
              />
            </div>
            
            <div className="bg-gray-50 p-3 rounded">
              <span className="text-sm font-medium text-gray-700">
                Recette rejet : 
              </span>
              <span className="text-lg font-bold text-green-600">
                {recetteRejet.toFixed(2)} MRU
              </span>
            </div>
          </div>
        </div>

        {/* Section Calculs */}
        <div className="mt-6 space-y-4">
          <h4 className="font-medium text-gray-700 border-b pb-2">Calculs et Résultats</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="bg-blue-50 p-4 rounded mb-4">
                <span className="text-sm font-medium text-gray-700">
                  Prix total : 
                </span>
                <span className="text-lg font-bold text-blue-600">
                  {prixTotal.toFixed(2)} MRU
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  = Valeur camion - Recette rejet
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantité Tunnel (kg)
                </label>
                <input 
                  type="number" 
                  value={quantiteTunnel} 
                  onChange={e => setQuantiteTunnel(e.target.value)} 
                  className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500" 
                  placeholder="Quantité entrée tunnel"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Récupérée du formulaire d'entrée
                </p>
              </div>
            </div>
            
            <div>
              <div className="bg-green-50 p-4 rounded mb-4">
                <span className="text-sm font-medium text-gray-700">
                  Prix unitaire frais : 
                </span>
                <span className="text-lg font-bold text-green-600">
                  {prixUnitaireFrais.toFixed(2)} MRU/kg
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  = Prix total ÷ Quantité tunnel
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frais (MRU/kg)
                </label>
                <input 
                  type="number" 
                  value={frais} 
                  onChange={e => setFrais(e.target.value)} 
                  className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500" 
                  placeholder="Frais supplémentaires"
                />
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded border-l-4 border-yellow-400">
            <span className="text-sm font-medium text-gray-700">
              Prix unitaire final : 
            </span>
            <span className="text-xl font-bold text-yellow-700">
              {prixUnitaireFinal.toFixed(2)} MRU/kg
            </span>
            <p className="text-xs text-gray-500 mt-1">
              = Prix unitaire frais + Frais
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button 
            onClick={onClose} 
            variant="secondary"
          >
            Annuler
          </Button>
          <Button
            onClick={handleValidate}
            variant="primary"
          >
            Valider
          </Button>
        </div>
      </div>
    </div>
  );
}
