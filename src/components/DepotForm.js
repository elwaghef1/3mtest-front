// frontend/src/components/DepotForm.js
import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Button from './Button';

function DepotForm({ onClose, onDepotCreated, initialDepot }) {
  const [intitule, setIntitule] = useState('');
  const [location, setLocation] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Initialiser les valeurs si on modifie un dépôt existant
  useEffect(() => {
    if (initialDepot) {
      setIntitule(initialDepot.intitule || '');
      setLocation(initialDepot.location || '');
      setCode(initialDepot.code || '');
    }
  }, [initialDepot]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const depotData = { intitule, location, code };
      if (initialDepot) {
        await axios.put(`/depots/${initialDepot._id}`, depotData);
      } else {
        await axios.post('/depots', depotData);
      }
      onDepotCreated(); // callback parent pour rafraîchir la liste
    } catch (err) {
      console.error('Erreur création / mise à jour depot:', err);
      setErrorMessage('Erreur lors de la sauvegarde du dépôt.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">
        {initialDepot ? 'Modifier Dépôt' : 'Nouveau Dépôt'}
      </h2>

      {errorMessage && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Ligne 1 : Intitulé, Location & Code */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Intitulé */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Intitulé *
            </label>
            <input
              className="w-full border border-gray-300 rounded-md shadow-sm p-2 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="text"
              required
              value={intitule}
              onChange={(e) => setIntitule(e.target.value)}
            />
          </div>

          {/* Location */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              className="w-full border border-gray-300 rounded-md shadow-sm p-2
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Code */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Code *
            </label>
            <input
              className="w-full border border-gray-300 rounded-md shadow-sm p-2 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="text"
              required
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
        </div>

        {/* Boutons */}
        <div className="flex justify-end space-x-4 mt-8">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
          >
            {initialDepot ? 'Mettre à jour' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default DepotForm;
