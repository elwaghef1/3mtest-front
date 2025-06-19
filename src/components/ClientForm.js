// frontend/src/components/ClientForm.js
import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Button from './Button';

function ClientForm({ onClose, onClientCreated, initialClient }) {
  const [formData, setFormData] = useState({
    raisonSociale: '',
    adresse: '',
    mail: '',
    numeroFacture: ''
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isEditMode = Boolean(initialClient && initialClient._id);

  useEffect(() => {
    // Dès que l'on a l'id du client à éditer, on recharge ses données
    if (isEditMode) {
      axios.get(`/clients/${initialClient._id}`)
        .then(res => {
          const c = res.data;
          setFormData({
            raisonSociale: c.raisonSociale || '',
            adresse:       c.adresse       || '',
            mail:          c.mail          || '',
            numeroFacture: c.numeroFacture || ''
          });
        })
        .catch(err => {
          console.error('Erreur chargement client en édition :', err);
          setErrorMessage("Impossible de charger les données du client.");
        });
    } else {
      // mode création : on remet à zéro
      setFormData({
        raisonSociale: '',
        adresse:       '',
        mail:          '',
        numeroFacture: ''
      });
    }
  }, [initialClient?._id]);  // ne se déclenche que si l'id change

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      if (isEditMode) {
        await axios.put(`/clients/${initialClient._id}`, formData);
      } else {
        await axios.post('/clients', formData);
      }
      onClientCreated();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde du client :', err);
      setErrorMessage(`Erreur lors de la ${isEditMode ? 'modification' : 'création'} du client.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">
        {isEditMode ? 'Modifier le Client' : 'Nouveau Client'}
      </h2>

      {errorMessage && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Raison Sociale *
            </label>
            <input
              className="w-full border border-gray-300 rounded-md shadow-sm p-2 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="text"
              name="raisonSociale"
              value={formData.raisonSociale}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Adresse
            </label>
            <input
              className="w-full border border-gray-300 rounded-md shadow-sm p-2 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="text"
              name="adresse"
              value={formData.adresse}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Mail
            </label>
            <input
              className="w-full border border-gray-300 rounded-md shadow-sm p-2 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="email"
              name="mail"
              value={formData.mail}
              onChange={handleChange}
            />
          </div>
        </div>

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
            {isEditMode ? 'Mettre à jour' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ClientForm;
