import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Button from './Button';
import { 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid';

const CommandesEnAttenteModal = ({ isOpen, onClose, onCommandeUpdated }) => {
  const [commandesEnAttente, setCommandesEnAttente] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState(new Set());

  useEffect(() => {
    if (isOpen) {
      fetchCommandesEnAttente();
    }
  }, [isOpen]);

  const fetchCommandesEnAttente = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/commandes/en-attente-stock');
      setCommandesEnAttente(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des commandes en attente:', error);
    } finally {
      setLoading(false);
    }
  };

  const tryCompleteCommande = async (commandeId) => {
    setProcessingIds(prev => new Set([...prev, commandeId]));
    try {
      const response = await axios.post(`/commandes/${commandeId}/try-complete`);
      
      // Afficher un message de succès ou d'information
      const message = response.data.message;
      alert(message);
      
      // Recharger la liste
      await fetchCommandesEnAttente();
      
      // Notifier le parent que les commandes ont été mises à jour
      if (onCommandeUpdated) {
        onCommandeUpdated();
      }
    } catch (error) {
      console.error('Erreur lors de la tentative de complétion:', error);
      alert('Erreur lors de la tentative de complétion de la commande');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(commandeId);
        return newSet;
      });
    }
  };

  const formatCurrency = (value, currency = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('fr-FR').format(value || 0);
  };

  const getTotalQuantityKG = (commande) => {
    return commande.items?.reduce((sum, item) => sum + (item.quantiteKg || 0), 0) || 0;
  };

  const getItemsSummary = (items) => {
    if (!items || items.length === 0) return '—';
    
    const itemsWithoutStock = items.filter(item => !item.lot);
    const itemsWithStock = items.filter(item => item.lot);
    
    return (
      <div>
        {itemsWithStock.length > 0 && (
          <div className="text-green-600 text-sm">
            ✅ {itemsWithStock.length} article(s) alloué(s)
          </div>
        )}
        {itemsWithoutStock.length > 0 && (
          <div className="text-orange-600 text-sm">
            ⏳ {itemsWithoutStock.length} article(s) en attente
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <ClockIcon className="h-6 w-6 mr-2 text-orange-500" />
            Commandes en Attente de Stock ({commandesEnAttente.length})
          </h2>
          <div className="flex gap-2">
            <Button
              onClick={fetchCommandesEnAttente}
              disabled={loading}
              loading={loading}
              variant="primary"
              size="md"
              leftIcon={<ArrowPathIcon className="h-4 w-4" />}
            >
              Actualiser
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="md"
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[70vh]">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : commandesEnAttente.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">✅</div>
              <p>Aucune commande en attente de stock</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border border-gray-300">
                      Référence
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border border-gray-300">
                      Client
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-300">
                      Date Commande
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700 border border-gray-300">
                      Quantité (Kg)
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700 border border-gray-300">
                      Prix Total
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-300">
                      État Articles
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {commandesEnAttente.map(commande => (
                    <tr key={commande._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 border border-gray-300">
                        {commande.reference}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 border border-gray-300">
                        {commande.client?.raisonSociale || '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-700 border border-gray-300">
                        {commande.dateCommande ? new Date(commande.dateCommande).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700 border border-gray-300">
                        {formatNumber(getTotalQuantityKG(commande))} Kg
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 border border-gray-300">
                        {formatCurrency(commande.prixTotal, commande.currency || 'EUR')}
                      </td>
                      <td className="px-4 py-3 text-center border border-gray-300">
                        {getItemsSummary(commande.items)}
                      </td>
                      <td className="px-4 py-3 text-center border border-gray-300">
                        <Button
                          onClick={() => tryCompleteCommande(commande._id)}
                          disabled={processingIds.has(commande._id)}
                          loading={processingIds.has(commande._id)}
                          variant="success"
                          size="sm"
                          leftIcon={!processingIds.has(commande._id) ? <CheckCircleIcon className="h-4 w-4" /> : null}
                          className="mx-auto"
                        >
                          {processingIds.has(commande._id) ? 'Vérification...' : 'Essayer de compléter'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-blue-500 mr-2" />
            <div className="text-sm text-blue-700">
              <strong>Info:</strong> Ces commandes sont en attente car certains articles n'avaient pas assez de stock au moment de la création. 
              Cliquez sur "Essayer de compléter" pour vérifier s'il y a maintenant suffisamment de stock disponible.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandesEnAttenteModal;
