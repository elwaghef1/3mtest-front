// frontend/src/components/ClientForm.js
import React, { useState } from 'react';
import axios from '../api/axios';
import Button from './Button';

function ClientForm({ onClose, onClientCreated }) {
  const [raisonSociale, setRaisonSociale] = useState('');
  const [adresse, setAdresse] = useState('');
  const [mail, setMail] = useState('');
  const [numeroFacture, setNumeroFacture] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      await axios.post('/clients', {
        raisonSociale,
        adresse,
        mail,
        numeroFacture,
      });
      onClientCreated();
    } catch (err) {
      console.error('Erreur création client:', err);
      setErrorMessage('Erreur lors de la création du client.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Nouveau Client</h2>

      {errorMessage && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Ligne 1 : Raison Sociale & Adresse */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Raison Sociale */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Raison Sociale *
            </label>
            <input
              className="w-full border border-gray-300 rounded-md shadow-sm p-2 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="text"
              value={raisonSociale}
              onChange={(e) => setRaisonSociale(e.target.value)}
              required
            />
          </div>

          {/* Adresse */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Adresse
            </label>
            <input
              className="w-full border border-gray-300 rounded-md shadow-sm p-2 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="text"
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
            />
          </div>
        </div>

        {/* Ligne 2 : Mail & N° Facture */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mail */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Mail
            </label>
            <input
              className="w-full border border-gray-300 rounded-md shadow-sm p-2 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="email"
              value={mail}
              onChange={(e) => setMail(e.target.value)}
            />
          </div>

          {/* N° Facture */}
          {/* <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              N° Facture
            </label>
            <input
              className="w-full border border-gray-300 rounded-md shadow-sm p-2
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="text"
              value={numeroFacture}
              onChange={(e) => setNumeroFacture(e.target.value)}
            />
          </div> */}
        </div>

        {/* Boutons */}
        <div className="flex justify-end space-x-4 mt-8">
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
            Enregistrer
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ClientForm;
