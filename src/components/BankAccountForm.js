// frontend/src/components/BankAccountForm.js
import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Button from './Button';

function BankAccountForm({ onClose, onAccountCreated, initialAccount = null }) {
  const [banque, setBanque] = useState('');
  const [titulaire, setTitulaire] = useState('');
  const [iban, setIban] = useState('');
  const [codeSwift, setCodeSwift] = useState('');
  const [compteIntermediaire, setCompteIntermediaire] = useState('');
  const [banqueIntermediaire, setBanqueIntermediaire] = useState('');
  const [swiftIntermediaire, setSwiftIntermediaire] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Remplissage automatique des champs en cas d'édition
  useEffect(() => {
    if (initialAccount) {
      setBanque(initialAccount.banque);
      setTitulaire(initialAccount.titulaire);
      setIban(initialAccount.iban);
      setCodeSwift(initialAccount.codeSwift);
      setCompteIntermediaire(initialAccount.compteIntermediaire || '');
      setBanqueIntermediaire(initialAccount.banqueIntermediaire || '');
      setSwiftIntermediaire(initialAccount.swiftIntermediaire || '');
    }
  }, [initialAccount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const accountData = { 
        banque, 
        titulaire, 
        iban, 
        codeSwift, 
        compteIntermediaire,
        banqueIntermediaire,
        swiftIntermediaire
      };
      
      if (initialAccount) {
        // Mise à jour du compte existant
        await axios.put(`/bankaccounts/${initialAccount._id}`, accountData);
      } else {
        // Création d'un nouveau compte
        await axios.post('/bankaccounts', accountData);
      }
      onAccountCreated();
    } catch (err) {
      console.error('Erreur lors de la soumission du compte bancaire:', err);
      setErrorMessage('Erreur lors de la soumission du compte bancaire.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">
        {initialAccount ? 'Modifier Compte Bancaire' : 'Nouveau Compte Bancaire'}
      </h2>

      {errorMessage && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Banque */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Banque *
          </label>
          <input
            type="text"
            value={banque}
            onChange={(e) => setBanque(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Titulaire du compte */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Titulaire du compte *
          </label>
          <input
            type="text"
            value={titulaire}
            onChange={(e) => setTitulaire(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* IBAN */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            IBAN *
          </label>
          <input
            type="text"
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Code Swift */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Code Swift *
          </label>
          <input
            type="text"
            value={codeSwift}
            onChange={(e) => setCodeSwift(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Compte Intermédiaire */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Compte intermédiaire
          </label>
          <input
            type="text"
            value={compteIntermediaire}
            onChange={(e) => setCompteIntermediaire(e.target.value)}
            placeholder="Numéro de compte intermédiaire (optionnel)"
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Banque Intermédiaire */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Banque intermédiaire
          </label>
          <input
            type="text"
            value={banqueIntermediaire}
            onChange={(e) => setBanqueIntermediaire(e.target.value)}
            placeholder="Nom de la banque intermédiaire (optionnel)"
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Swift Intermédiaire */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Swift de la banque intermédiaire
          </label>
          <input
            type="text"
            value={swiftIntermediaire}
            onChange={(e) => setSwiftIntermediaire(e.target.value)}
            placeholder="Code Swift de la banque intermédiaire (optionnel)"
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
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

export default BankAccountForm;
