// frontend/src/components/SortieDetails.js
import React from 'react';
import Button from './Button';
import { XMarkIcon, PrinterIcon, TruckIcon, CubeIcon } from '@heroicons/react/24/outline';
import { generateUnifiedSortiePDF } from '../services/unifiedDeliveryPDFService';

const SortieDetails = ({ sortie, onClose }) => {
  // Fonction pour formater les devises
  const formatCurrency = (value, currency = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  // Fonction pour formater les nombres
  const formatNumber = (value) => {
    return new Intl.NumberFormat('fr-FR').format(value || 0);
  };

  // Fonction pour formater une date
  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Fonction pour formater les articles
  const formatArticle = (article) => {
    if (!article) return '—';
    if (typeof article === 'string') return article;
    const parts = [
      article.reference,
      article.intitule,
      article.specification,
      article.taille
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' - ') : '—';
  };

  // Calculer les totaux
  const totaux = {
    quantiteKg: sortie?.items?.reduce((sum, item) => sum + (item.quantiteKg || 0), 0) || 0,
    quantiteCarton: sortie?.items?.reduce((sum, item) => sum + (item.quantiteCarton || 0), 0) || 0,
    nombreArticles: sortie?.items?.length || 0
  };

  const handlePrint = () => {
    if (sortie) {
      generateUnifiedSortiePDF(sortie);
    }
  };

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Détails de la sortie
          </h2>
          <p className="text-gray-600">
            Référence: <span className="font-semibold">{sortie?.reference || '—'}</span>
          </p>
        </div>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          icon={<XMarkIcon className="h-5 w-5" />}
        >
          Fermer
        </Button>
      </div>

      {/* Informations principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Informations de sortie */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <TruckIcon className="h-5 w-5 mr-2" />
            Informations de sortie
          </h3>
          <div className="space-y-2">
            <div>
              <span className="text-gray-600">Type de livraison:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                sortie?.typeLivraison === 'PARTIELLE' 
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {sortie?.typeLivraison === 'PARTIELLE' ? 'Partielle' : 'Complète'}
              </span>
            </div>
            {sortie?.typeLivraison === 'PARTIELLE' && (
              <div>
                <span className="text-gray-600">N° Livraison:</span>
                <span className="ml-2 font-medium">{sortie?.numeroLivraisonPartielle || '—'}</span>
              </div>
            )}
            <div>
              <span className="text-gray-600">Date de sortie:</span>
              <span className="ml-2 font-medium">{formatDate(sortie?.dateSortie)}</span>
            </div>
            <div>
              <span className="text-gray-600">Transporteur:</span>
              <span className="ml-2 font-medium">{sortie?.transporteur || '—'}</span>
            </div>
            <div>
              <span className="text-gray-600">N° Camion:</span>
              <span className="ml-2 font-medium">{sortie?.numeroCamion || '—'}</span>
            </div>
            <div>
              <span className="text-gray-600">Chauffeur:</span>
              <span className="ml-2 font-medium">{sortie?.nomChauffeur || '—'}</span>
            </div>
            {sortie?.notes && (
              <div>
                <span className="text-gray-600">Notes:</span>
                <p className="mt-1 text-sm">{sortie.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Informations de la commande */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <CubeIcon className="h-5 w-5 mr-2" />
            Informations de la commande
          </h3>
          <div className="space-y-2">
            <div>
              <span className="text-gray-600">Référence commande:</span>
              <span className="ml-2 font-medium">{sortie?.commande?.reference || '—'}</span>
            </div>
            <div>
              <span className="text-gray-600">N° BC:</span>
              <span className="ml-2 font-medium">{sortie?.commande?.noBonDeCommande || '—'}</span>
            </div>
            <div>
              <span className="text-gray-600">B/L:</span>
              <span className="ml-2 font-medium">{sortie?.commande?.BL || '—'}</span>
            </div>
            <div>
              <span className="text-gray-600">Client:</span>
              <span className="ml-2 font-medium">{sortie?.commande?.client?.raisonSociale || '—'}</span>
            </div>
            <div>
              <span className="text-gray-600">Contact client:</span>
              <span className="ml-2 font-medium">{sortie?.commande?.client?.telephone || '—'}</span>
            </div>
            <div>
              <span className="text-gray-600">Destination:</span>
              <span className="ml-2 font-medium">{sortie?.commande?.destination || '—'}</span>
            </div>
            <div>
              <span className="text-gray-600">N° Booking:</span>
              <span className="ml-2 font-medium">{sortie?.commande?.numeroBooking || '—'}</span>
            </div>
            <div>
              <span className="text-gray-600">Cargo:</span>
              <span className="ml-2 font-medium">{sortie?.commande?.cargo || '—'}</span>
            </div>
            <div>
              <span className="text-gray-600">ETA:</span>
              <span className="ml-2 font-medium">{formatDate(sortie?.commande?.dateETA)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des articles */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Articles livrés</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Article
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dépôt
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantité (kg)
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cartons
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix/kg
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  N° Lot
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Block
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qualité
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortie?.items?.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatArticle(item.article)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.depot?.intitule || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {formatNumber(item.quantiteKg)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {formatNumber(item.quantiteCarton)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {formatCurrency(item.prixUnitaire)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {formatCurrency(item.quantiteKg * item.prixUnitaire)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.noLot || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.block || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.qualite || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan="2" className="px-4 py-3 text-sm font-medium text-gray-900">
                  Total
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                  {formatNumber(totaux.quantiteKg)} kg
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                  {formatNumber(totaux.quantiteCarton)}
                </td>
                <td colSpan="2" className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                  {formatCurrency(sortie?.items?.reduce((sum, item) => 
                    sum + (item.quantiteKg * item.prixUnitaire || 0), 0
                  ) || 0)}
                </td>
                <td colSpan="3" className="px-4 py-3 text-sm text-gray-600">
                  {totaux.nombreArticles} article(s)
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <Button
          onClick={handlePrint}
          variant="primary"
          icon={<PrinterIcon className="h-5 w-5" />}
        >
          Télécharger le Dossier Complet
        </Button>
        <Button
          onClick={onClose}
          variant="secondary"
        >
          Fermer
        </Button>
      </div>
    </div>
  );
};

export default SortieDetails;
