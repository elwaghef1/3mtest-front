import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Button from './Button';

export default function AdjustStockModal({ isOpen, onClose, stock, onAdjusted }) {
  const [quantiteDelta, setQuantiteDelta]   = useState(0);
  const [prixUnitaire, setPrixUnitaire]     = useState('');
  const [lots, setLots]                     = useState([]);
  const [selectedLot, setSelectedLot]       = useState('');
  const [error, setError]                   = useState('');

  // à l’ouverture du modal : charger les lots
  useEffect(() => {
    if (isOpen && stock) {
      setQuantiteDelta(0);
      setPrixUnitaire('');
      setSelectedLot('');
      setError('');
      axios.get(`/entrees/lots/${stock.depot._id}/${stock.article._id}`)
        .then(res => setLots(res.data))
        .catch(err => setError('Impossible de charger les lots'));
    }
  }, [isOpen, stock]);

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const payload = { quantiteDelta: parseFloat(quantiteDelta) };

      if (quantiteDelta > 0) {
        // Si c'est un ajout, on demande de sélectionner un lot pour ajouter la quantité
        if (!selectedLot) {
          return setError('Vous devez choisir un lot pour un ajout');
        }
        payload.lotId = selectedLot;
        payload.prixUnitaire = parseFloat(prixUnitaire); // prix unitaire pour l'ajout
      } else {
        // Cas de retrait, on garde l'ancienne logique
        if (!selectedLot) {
          return setError('Vous devez choisir un lot pour un retrait');
        }
        payload.lotId = selectedLot;
      }

      // Envoie de la requête pour ajuster le stock
      await axios.patch(`/stock/${stock._id}/adjust`, payload);
      onAdjusted();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l’ajustement');
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-30" onClick={onClose} />
      <div className="relative bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Ajuster le stock</h2>
        {error && <p className="text-red-600 mb-2">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Quantité à ajuster (Kg):</label>
            <input
              type="number" step="0.01" value={quantiteDelta}
              onChange={e => setQuantiteDelta(e.target.value)}
              className="w-full border p-2 rounded" required
            />
          </div>

          {quantiteDelta !== 0 && (
            <div>
              <label className="block text-sm mb-1">{quantiteDelta > 0 ? "Choisir un lot pour ajouter :" : "Choisir un lot pour retirer :"}</label>
              <select
                value={selectedLot}
                onChange={e => setSelectedLot(e.target.value)}
                className="w-full border p-2 rounded" required
              >
                <option value="">-- Sélectionnez un lot --</option>
                {lots.map(l => (
                  <option key={l.lotId} value={l.lotId}>
                    {l.batchNumber} ({l.quantiteRestante} Kg restantes)
                  </option>
                ))}
              </select>
            </div>
          )}

          {quantiteDelta > 0 && (
            <div>
              <label className="block text-sm mb-1">Prix unitaire (pour ajout) :</label>
              <input
                type="number" step="0.01" value={prixUnitaire}
                onChange={e => setPrixUnitaire(e.target.value)}
                className="w-full border p-2 rounded" required
              />
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" onClick={onClose} variant="secondary" size="sm">
              Annuler
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Valider
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
