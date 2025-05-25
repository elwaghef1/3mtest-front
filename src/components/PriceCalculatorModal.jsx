import React, { useState, useEffect } from 'react';
import Button from './Button';

export default function PriceCalculatorModal({ isOpen, onClose, onCalculate }) {
  const [poidsBrut, setPoidsBrut] = useState('');
  const [poidsRejete, setPoidsRejete] = useState('');
  const [perte, setPerte] = useState('');
  const [factAchatBrut, setFactAchatBrut] = useState('');
  const [factCongel, setFactCongel] = useState('');
  const [factEmballage, setFactEmballage] = useState('');
  const [recetteRejet, setRecetteRejet] = useState('');
  const [prixUnitaireCalc, setPrixUnitaireCalc] = useState(0);

  // Calcul automatique dès que les valeurs changent
  useEffect(() => {
    const brut = parseFloat(poidsBrut) || 0;
    const rejete = parseFloat(poidsRejete) || 0;
    const perteKg = parseFloat(perte) || 0;
    const qtyCongele = brut - rejete - perteKg;
    if (qtyCongele > 0) {
      const totalCost =
        (parseFloat(factAchatBrut) || 0) +
        (parseFloat(factCongel) || 0) +
        (parseFloat(factEmballage) || 0) -
        (parseFloat(recetteRejet) || 0);
      setPrixUnitaireCalc(totalCost / qtyCongele);
    } else {
      setPrixUnitaireCalc(0);
    }
  }, [poidsBrut, poidsRejete, perte, factAchatBrut, factCongel, factEmballage, recetteRejet]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4">Calcul du Prix Unitaire</h3>
        <div className="space-y-3">
          <div>
            <label>Poids Brut (kg)</label>
            <input type="number" value={poidsBrut} onChange={e => setPoidsBrut(e.target.value)} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label>Poids Rejeté (kg)</label>
            <input type="number" value={poidsRejete} onChange={e => setPoidsRejete(e.target.value)} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label>Perte (kg)</label>
            <input type="number" value={perte} onChange={e => setPerte(e.target.value)} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label>Facture Achat Brut (MRU)</label>
            <input type="number" value={factAchatBrut} onChange={e => setFactAchatBrut(e.target.value)} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label>Facture Congélation (MRU)</label>
            <input type="number" value={factCongel} onChange={e => setFactCongel(e.target.value)} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label>Facture Emballage (MRU)</label>
            <input type="number" value={factEmballage} onChange={e => setFactEmballage(e.target.value)} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label>Recette Rejet (MRU)</label>
            <input type="number" value={recetteRejet} onChange={e => setRecetteRejet(e.target.value)} className="w-full border p-2 rounded" />
          </div>
          <div className="mt-4">
            <span className="font-medium">Prix Unitaire calculé :</span>{' '}
            <span>{prixUnitaireCalc.toFixed(2)} MRU</span>
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
            onClick={() => {
              onCalculate(prixUnitaireCalc);
              onClose();
            }}
            variant="primary"
          >
            Valider
          </Button>
        </div>
      </div>
    </div>
  );
}
