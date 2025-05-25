// frontend/src/components/SortieDetails.js
import React from 'react';
import Button from './Button';

// Fonction utilitaire pour formater un article
const formatArticle = (a) => {
  if (!a) return '—';
  const ref = a.reference || '';
  const spec = a.specification || '';
  const taille = a.taille || '';
  const typeCarton = a.typeCarton || '';
  return `${ref} - ${spec} - ${taille} - ${typeCarton}`;
};

// Fonction pour obtenir une couleur de badge selon le statut (même design que CommandeDetails)
const getStatusColor = (status) => {
  switch (status) {
    case 'EN_COURS':
      return 'bg-yellow-800 text-white text-xs';
    case 'LIVREE':
      return 'bg-green-800 text-white text-xs';
    case 'NON_PAYE':
      return 'bg-red-800 text-white text-xs';
    case 'PARTIELLEMENT_PAYE':
      return 'bg-orange-800 text-white text-xs';
    case 'PAYE':
      return 'bg-green-800 text-white text-xs';
    default:
      return 'bg-gray-800 text-white text-xs';
  }
};

// Vérifie si une valeur est manquante
const isMissing = (value) => {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
};

// Composant pour afficher une ligne de détail sous forme de "carte"
const DetailItem = ({ label, value, badge }) => (
  <div className="p-2 border rounded-lg bg-gray-50 relative">
    {isMissing(value) && (
      <span className="absolute top-6 right-0 transform -rotate-6 text-xs bg-red-500 text-white px-1 py-0.5 rounded font-bold shadow-md">
        MANQUANT
      </span>
    )}
    <p className="text-xs text-gray-500">{label}</p>
    <p className="mt-1 text-sm font-semibold text-gray-800">
      {!isMissing(value)
        ? badge 
          ? <span className={`inline-block px-3 py-1 rounded-full ${badge}`}>{value}</span>
          : value
        : ''}
    </p>
  </div>
);

function SortieDetails({ sortie, onClose, formatCurrency }) {
  // Calcul du total des articles (pour la carte)
  const totalCard = (
    <div className="bg-gray-200 p-6 rounded-lg text-center mb-8">
      <h3 className="text-2xl font-bold text-gray-800 mb-2">Prix Total de la Sortie</h3>
      <p className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-red-700 to-purple-500">
        {sortie.prixTotal ? formatCurrency(sortie.prixTotal, sortie.currency) : '—'}
      </p>
    </div>
  );

  // Définir deux ensembles de détails selon le statut
  const detailsEnCours = [
    { label: 'Référence', value: sortie.reference },
    { label: 'Client', value: sortie.client?.raisonSociale },
    { label: 'Numéro OP', value: sortie.numeroOP },
    { label: 'Booking', value: sortie.numeroBooking },
    { label: 'Destination', value: sortie.destination },
    {
      label: 'Montant Payé',
      value: sortie.montantPaye ? `${sortie.montantPaye} ${sortie.currency}` : null,
    },
    {
      label: 'Reliquat',
      value: sortie.reliquat ? `${sortie.reliquat} ${sortie.currency}` : null,
    },
    { label: 'Devise', value: sortie.currency },
    {
      label: 'Statut BC',
      value: sortie.statutBonDeCommande,
      badge: getStatusColor(sortie.statutBonDeCommande),
    },
    {
      label: 'Statut Paiement',
      value: sortie.statutDePaiement,
      badge: getStatusColor(sortie.statutDePaiement),
    },
  ];

  const detailsLivree = [
    { label: 'Référence', value: sortie.reference },
    { label: 'No Bon de Commande', value: sortie.noBonDeCommande },
    { label: 'Numéro Booking', value: sortie.numeroBooking },
    { label: 'Client', value: sortie.client?.raisonSociale },
    { label: 'Cargo', value: sortie.cargo },
    { label: 'Numéro OP', value: sortie.numeroOP },
    { label: 'Destination', value: sortie.destination },
    {
      label: 'Date Prévue de Chargement',
      value: sortie.datePrevueDeChargement
        ? new Date(sortie.datePrevueDeChargement).toLocaleDateString('fr-FR')
        : null,
    },
    { label: 'Poids Carton', value: sortie.poidsCarton },
    { label: 'No Plomb', value: sortie.noPlomb },
    { label: 'Tare de Conteneur', value: sortie.areDeConteneur },
    {
      label: 'Montant Payé',
      value: sortie.montantPaye ? `${sortie.montantPaye} ${sortie.currency}` : null,
    },
    {
      label: 'Reliquat',
      value: sortie.reliquat ? `${sortie.reliquat} ${sortie.currency}` : null,
    },
    { label: 'Devise', value: sortie.currency },
    {
      label: 'Statut BC',
      value: sortie.statutBonDeCommande,
      badge: getStatusColor(sortie.statutBonDeCommande),
    },
    {
      label: 'Statut Paiement',
      value: sortie.statutDePaiement,
      badge: getStatusColor(sortie.statutDePaiement),
    },
    {
      label: 'Draft HC',
      value: sortie.draftHC,
      badge: getStatusColor(sortie.draftHC),
    },
    {
      label: 'Draft CO',
      value: sortie.draftCO,
      badge: getStatusColor(sortie.draftCO),
    },
    {
      label: 'VGM',
      value: sortie.vgm,
      badge: getStatusColor(sortie.vgm),
    },
    {
      label: 'Packing List',
      value: sortie.packingList,
      badge: getStatusColor(sortie.packingList),
    },
    {
      label: 'Facture',
      value: sortie.facture,
      badge: getStatusColor(sortie.facture),
    },
    {
      label: 'DHL',
      value: sortie.dhl,
      badge: getStatusColor(sortie.dhl),
    },
    // Charges locales (uniquement pour LIVREE)
    {
      label: 'Facture manutention',
      value: sortie.factureManutention,
      badge: getStatusColor(sortie.factureManutention),
    },
    {
      label: 'Facture cargo',
      value: sortie.factureCargo,
      badge: getStatusColor(sortie.factureCargo),
    },
    {
      label: 'Taxe zone franche',
      value: sortie.taxeZoneFranche,
      badge: getStatusColor(sortie.taxeZoneFranche),
    },
    {
      label: 'Etiquette',
      value: sortie.etiquette,
      badge: getStatusColor(sortie.etiquette),
    },
  ];

  const displayDetails = sortie.statutBonDeCommande === 'LIVREE' ? detailsLivree : detailsEnCours;

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-lg border border-gray-200">
      <h2 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-red-700 to-purple-500">
        Détails de la Sortie {sortie.statutBonDeCommande === 'LIVREE' ? '' : '(En cours)'}
      </h2>
      {totalCard}
      {/* Tableau des articles */}
      <div className="overflow-x-auto mb-8">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 text-left">
                Référence
              </th>
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 text-center">
                Batch Number
              </th>
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 text-center">
                Quantité (Kg)
              </th>
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 text-center">
                Prix Unitaire ({sortie.currency})
              </th>
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 text-right">
                Total ({sortie.currency})
              </th>
            </tr>
          </thead>
          <tbody>
            {sortie.items && sortie.items.length > 0 ? (
              sortie.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 whitespace-nowrap">
                    {item.article ? formatArticle(item.article) : '—'}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-xs text-center text-gray-700 whitespace-nowrap">
                    <strong>{item.lot && item.lot.batchNumber ? item.lot.batchNumber : '—'}</strong>
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-xs text-center text-gray-700 whitespace-nowrap">
                    {item.quantiteKg || '—'}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-xs text-center text-gray-700 whitespace-nowrap">
                    {item.prixUnitaire || '—'}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-xs text-right text-gray-700 whitespace-nowrap">
                    {item.prixTotal || '—'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border border-gray-300 px-2 py-1 text-xs text-gray-700" colSpan="5">
                  Aucun article renseigné.
                </td>
              </tr>
            )}
            {/* Ligne Total */}
            <tr className="bg-gray-100">
              <td colSpan="4" className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 text-right">
                Prix total
              </td>
              <td className="border border-gray-300 px-2 py-1 text-xs text-center bg-red-600 text-white whitespace-nowrap">
                <strong>
                  {sortie.items && sortie.items.length > 0
                    ? formatCurrency(sortie.items.reduce((acc, item) => acc + (parseFloat(item.prixTotal) || 0), 0), sortie.currency)
                    : '—'}
                </strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Grille des détails */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {displayDetails.map((detail, idx) => (
          <DetailItem key={idx} label={detail.label} value={detail.value} badge={detail.badge} />
        ))}
      </div>

      <div className="flex justify-end mt-8">
        <Button
          onClick={onClose}
          variant="secondary"
          size="md"
        >
          Fermer
        </Button>
      </div>
    </div>
  );
}

export default SortieDetails;
