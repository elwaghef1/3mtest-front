// frontend/src/components/PaymentHistory.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import Button from './Button';
import {
  ArrowLeftIcon,
  PlusIcon,
  CreditCardIcon,
  TrashIcon,
  PencilIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/solid';
import moment from 'moment';
import 'moment/locale/fr';

moment.locale('fr');

const PaymentHistory = () => {
  const { commandeId } = useParams();
  const navigate = useNavigate();

  const [commande, setCommande] = useState(null);
  const [paiements, setPaiements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

  // Nouveau paiement
  const [newPayment, setNewPayment] = useState({
    montant: '',
    datePaiement: moment().format('YYYY-MM-DD'),
    moyenPaiement: 'VIREMENT',
    reference: '',
    notes: ''
  });

  // Formatage de devise
  const formatCurrency = (amount, currency = 'EUR') => {
    const numValue = parseFloat(amount) || 0;
    if (currency === 'MRU') {
      return `${numValue.toFixed(0)} MRU`;
    } else if (currency === 'USD') {
      return `$${numValue.toFixed(2)}`;
    } else {
      return `${numValue.toFixed(2)} €`;
    }
  };

  // Chargement des données
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [commandeRes, paiementsRes] = await Promise.all([
          axios.get(`/commandes/${commandeId}`),
          axios.get(`/commandes/${commandeId}/paiements`)
        ]);
        setCommande(commandeRes.data);
        setPaiements(paiementsRes.data || []);
        setError(null);
      } catch (err) {
        setError("Erreur lors du chargement des données");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [commandeId]);

  // Calculs
  const totalPaiements = paiements.reduce((sum, p) => sum + (parseFloat(p.montant) || 0), 0);
  const montantCommande = commande?.prixTotal || 0;
  const reliquat = montantCommande - totalPaiements;

  // Ajouter un paiement
  const handleAddPayment = async () => {
    try {
      const montantSaisi = parseFloat(newPayment.montant);
      
      if (!newPayment.montant || montantSaisi <= 0) {
        alert('Veuillez saisir un montant valide');
        return;
      }

      if (montantSaisi > reliquat) {
        alert(`Le montant ne peut pas dépasser le reliquat restant de ${formatCurrency(reliquat, commande?.currency)}`);
        return;
      }

      const paiementData = {
        ...newPayment,
        montant: montantSaisi
      };

      const response = await axios.post(`/commandes/${commandeId}/paiements`, paiementData);
      setPaiements([...paiements, response.data]);
      
      // Reset du formulaire
      setNewPayment({
        montant: '',
        datePaiement: moment().format('YYYY-MM-DD'),
        moyenPaiement: 'VIREMENT',
        reference: '',
        notes: ''
      });
      setShowAddModal(false);

      // Recharger la commande pour mettre à jour le montant payé
      const commandeRes = await axios.get(`/commandes/${commandeId}`);
      setCommande(commandeRes.data);
    } catch (err) {
      console.error('Erreur lors de l\'ajout du paiement:', err);
      alert('Erreur lors de l\'ajout du paiement');
    }
  };

  // Supprimer un paiement
  const handleDeletePayment = async (paiementId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce paiement ?')) {
      return;
    }

    try {
      await axios.delete(`/commandes/${commandeId}/paiements/${paiementId}`);
      setPaiements(paiements.filter(p => p._id !== paiementId));
      
      // Recharger la commande pour mettre à jour le montant payé
      const commandeRes = await axios.get(`/commandes/${commandeId}`);
      setCommande(commandeRes.data);
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      alert('Erreur lors de la suppression du paiement');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent mx-auto"></div>
            <p className="mt-2 text-gray-600">Chargement en cours...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
          <Button
            onClick={() => navigate(-1)}
            variant="primary"
            className="mt-4"
            leftIcon={<ArrowLeftIcon className="h-5 w-5" />}
          >
            Retour
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">

        {/* En-tête */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => navigate(-1)}
              variant="secondary"
              leftIcon={<ArrowLeftIcon className="h-5 w-5" />}
            >
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Historique des Paiements</h1>
              {commande && (
                <p className="text-gray-600">
                  Commande: {commande.reference} - Client: {commande.client?.raisonSociale}
                </p>
              )}
            </div>
          </div>
          <Button 
            onClick={() => setShowAddModal(true)}
            variant="primary"
            leftIcon={<PlusIcon className="h-5 w-5" />}
            disabled={reliquat <= 0}
            title={reliquat <= 0 ? "Cette commande est entièrement payée" : "Ajouter un nouveau paiement"}
          >
            Nouveau Paiement
          </Button>
        </div>

        {/* Résumé financier */}
        {commande && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Résumé Financier</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Montant Total</div>
                <div className="text-xl font-bold text-blue-600">
                  {formatCurrency(montantCommande, commande.currency)}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Total Payé</div>
                <div className="text-xl font-bold text-green-600">
                  {formatCurrency(totalPaiements, commande.currency)}
                </div>
              </div>
              <div className={`p-4 rounded-lg ${reliquat > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <div className="text-sm text-gray-600">Reliquat</div>
                <div className={`text-xl font-bold ${reliquat > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(reliquat, commande.currency)}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Nombre de Paiements</div>
                <div className="text-xl font-bold text-gray-600">
                  {paiements.length}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Liste des paiements */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Historique des Paiements</h2>
          </div>
          
          {paiements.length === 0 ? (
            <div className="text-center py-12">
              <CreditCardIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucun paiement enregistré pour cette commande</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Moyen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Référence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paiements
                    .sort((a, b) => new Date(b.datePaiement) - new Date(a.datePaiement))
                    .map((paiement) => (
                    <tr key={paiement._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {moment(paiement.datePaiement).format('DD/MM/YYYY')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {formatCurrency(paiement.montant, commande?.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {paiement.moyenPaiement}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {paiement.reference || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {paiement.notes || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <Button
                          onClick={() => handleDeletePayment(paiement._id)}
                          variant="danger"
                          size="sm"
                          leftIcon={<TrashIcon className="h-4 w-4" />}
                        >
                          Supprimer
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Nouveau Paiement */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Nouveau Paiement
                  </h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <div className="px-6 py-4 space-y-4">
                {/* Information sur le reliquat disponible */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="text-sm font-medium text-blue-900">
                      Reliquat disponible : 
                    </div>
                    <div className="text-sm font-bold text-blue-700">
                      {formatCurrency(reliquat, commande?.currency)}
                    </div>
                  </div>
                  {reliquat <= 0 && (
                    <div className="text-xs text-blue-600 mt-1">
                      Cette commande est entièrement payée
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Montant ({commande?.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    max={reliquat}
                    value={newPayment.montant}
                    onChange={e => setNewPayment({...newPayment, montant: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      parseFloat(newPayment.montant) > reliquat && newPayment.montant ? 
                      'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                    required
                    disabled={reliquat <= 0}
                  />
                  {parseFloat(newPayment.montant) > reliquat && newPayment.montant && (
                    <p className="text-xs text-red-600 mt-1">
                      Le montant ne peut pas dépasser {formatCurrency(reliquat, commande?.currency)}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de Paiement
                  </label>
                  <input
                    type="date"
                    value={newPayment.datePaiement}
                    onChange={e => setNewPayment({...newPayment, datePaiement: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Moyen de Paiement
                  </label>
                  <select
                    value={newPayment.moyenPaiement}
                    onChange={e => setNewPayment({...newPayment, moyenPaiement: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="VIREMENT">Virement</option>
                    <option value="CHEQUE">Chèque</option>
                    <option value="ESPECES">Espèces</option>
                    <option value="CARTE_BANCAIRE">Carte Bancaire</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Référence (optionnel)
                  </label>
                  <input
                    type="text"
                    value={newPayment.reference}
                    onChange={e => setNewPayment({...newPayment, reference: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="N° de référence, chèque, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optionnel)
                  </label>
                  <textarea
                    value={newPayment.notes}
                    onChange={e => setNewPayment({...newPayment, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Commentaires additionnels..."
                  />
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <Button
                  onClick={() => setShowAddModal(false)}
                  variant="secondary"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleAddPayment}
                  variant="primary"
                  leftIcon={<CheckCircleIcon className="h-4 w-4" />}
                  disabled={
                    !newPayment.montant || 
                    parseFloat(newPayment.montant) <= 0 || 
                    parseFloat(newPayment.montant) > reliquat ||
                    reliquat <= 0
                  }
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PaymentHistory;
