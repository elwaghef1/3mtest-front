import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import axios from '../api/axios';
import Button from './Button';

export default function AdjustStockModal({ isOpen, onClose, stock, onAdjusted }) {
  const [quantiteDelta, setQuantiteDelta] = useState(0);
  const [prixUnitaire, setPrixUnitaire] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { quantiteDelta: parseFloat(quantiteDelta) };
      if (quantiteDelta > 0) payload.prixUnitaire = parseFloat(prixUnitaire);
      await axios.patch(`/stock/${stock._id}/adjust`, payload);
      onAdjusted();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l’ajustement');
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center">
      <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
        <Dialog.Title className="text-lg font-bold mb-4">Ajuster le stock</Dialog.Title>
        {error && <p className="text-red-600 mb-2">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm">Quantité à ajuster (Kg):</label>
            <input
              type="number"
              step="0.01"
              value={quantiteDelta}
              onChange={e => setQuantiteDelta(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
          </div>
          {quantiteDelta > 0 && (
            <div>
              <label className="block text-sm">Prix unitaire (uniquement pour ajout):</label>
              <input
                type="number"
                step="0.01"
                value={prixUnitaire}
                onChange={e => setPrixUnitaire(e.target.value)}
                className="w-full border p-2 rounded"
                required
              />
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              onClick={onClose} 
              variant="secondary"
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              variant="primary"
            >
              Valider
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
