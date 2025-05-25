// frontend/src/components/ApresLivraisonDetails.js
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

// Couleurs de badge selon le statut
const getStatusColor = (status) => {
  switch (status) {
    case 'EN_COURS':
      return 'bg-green-600 text-white text-xs';
    case 'LIVREE':
      return 'bg-green-800 text-white text-xs';
    case 'NON_PAYE':
      return 'bg-red-800 text-white text-xs';
    case 'PARTIELLEMENT_PAYE':
      return 'bg-orange-800 text-white text-xs';
    case 'PAYE':
      return 'bg-yellow-800 text-white text-xs';
    case 'ETABLIE':
      return 'bg-orange-800 text-white text-xs';
    case 'ENVOYEE':
      return 'bg-purple-800 text-white text-xs';
    case 'APPROUVEE':
      return 'bg-blue-800 text-white text-xs';
    default:
      return 'bg-gray-800 text-white text-xs';
  }
};

// Vérifie si une valeur est manquante
const isMissing = (value) =>
  value === null || value === undefined || (typeof value === 'string' && value.trim() === '');

// Composant pour afficher un champ de détail
const DetailItem = ({ label, value, badge }) => (
  <div className="p-2 border rounded-lg bg-gray-50 relative">
    {isMissing(value) && (
      <span className="absolute top-1 right-1 transform -rotate-6 text-xs bg-red-500 text-white px-1 py-0.5 rounded font-bold shadow-md">
        MANQUANT
      </span>
    )}
    <p className="text-sm text-gray-500">{label}</p>
    <p className="mt-1 text-base font-semibold text-gray-800">
      {!isMissing(value) ? (
        badge ? (
          <span className={`inline-block px-3 py-1 rounded-full ${badge}`}>
            {value}
          </span>
        ) : (
          value
        )
      ) : (
        ''
      )}
    </p>
  </div>
);

function ApresLivraisonDetails({ commande, onClose }) {
  // Carte récapitulative pour le prix total
  const totalCard = (
    <div className="bg-gray-200 p-6 rounded-lg text-center mb-8">
      <h3 className="text-2xl font-bold text-gray-800 mb-2">Prix Total</h3>
      <p className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-red-700 to-purple-500">
        {commande.prixTotal ? `${commande.prixTotal} ${commande.currency}` : '—'}
      </p>
    </div>
  );

  // Champs à afficher pour une commande LIVREE
  const details = [
    { label: 'Référence', value: commande.reference },
    { label: 'Client', value: commande.client?.raisonSociale },
    { label: 'Booking', value: commande.numeroBooking },
    { label: 'Numéro OP', value: commande.numeroOP },
    { label: 'Cargo', value: commande.cargo },
    { label: 'No Bon de Commande', value: commande.noBonDeCommande },
    { label: 'Destination', value: commande.destination },
    {
      label: 'Date Prévue de Chargement',
      value: commande.datePrevueDeChargement
        ? new Date(commande.datePrevueDeChargement).toLocaleDateString('fr-FR')
        : null,
    },
    { label: 'Poids Carton', value: commande.poidsCarton },
    { label: 'No Plomb', value: commande.noPlomb },
    { label: 'Tare de Conteneur', value: commande.areDeConteneur },
    {
      label: 'Montant Payé',
      value: commande.montantPaye ? `${commande.montantPaye} ${commande.currency}` : null,
    },
    {
      label: 'Reliquat',
      value: commande.reliquat ? `${commande.reliquat} ${commande.currency}` : null,
    },
    { label: 'Devise', value: commande.currency },
    {
      label: 'Statut BC',
      value: commande.statutBonDeCommande,
      badge: getStatusColor(commande.statutBonDeCommande),
    },
    {
      label: 'Statut Paiement',
      value: commande.statutDePaiement,
      badge: getStatusColor(commande.statutDePaiement),
    },
    // Champs complémentaires
    {
      label: 'Draft HC',
      value: commande.draftHC,
      badge: getStatusColor(commande.draftHC),
    },
    {
      label: 'Draft CO',
      value: commande.draftCO,
      badge: getStatusColor(commande.draftCO),
    },
    {
      label: 'VGM',
      value: commande.vgm,
      badge: getStatusColor(commande.vgm),
    },
    {
      label: 'Packing List',
      value: commande.packingList,
      badge: getStatusColor(commande.packingList),
    },
    {
      label: 'Facture',
      value: commande.facture,
      badge: getStatusColor(commande.facture),
    },
    {
      label: 'DHL',
      value: commande.dhl,
      badge: getStatusColor(commande.dhl),
    },
    // Champs pour charges locales
    {
      label: 'Facture manutention',
      value: commande.factureManutention,
      badge: getStatusColor(commande.factureManutention),
    },
    {
      label: 'Facture cargo',
      value: commande.factureCargo,
      badge: getStatusColor(commande.factureCargo),
    },
    {
      label: 'Taxe zone franche',
      value: commande.taxeZoneFranche,
      badge: getStatusColor(commande.taxeZoneFranche),
    },
    {
      label: 'Etiquette',
      value: commande.etiquette,
      badge: getStatusColor(commande.etiquette),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-lg border border-gray-200">
      <h2 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-red-700 to-purple-500">
        Détails de commande après livraison
      </h2>

      {/* Carte Total */}
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
                Prix Unitaire ({commande.currency})
              </th>
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 text-right">
                Total ({commande.currency})
              </th>
            </tr>
          </thead>
          <tbody>
            {commande.items && commande.items.length > 0 ? (
              commande.items.map((item, idx) => (
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
          </tbody>
        </table>
      </div>

      {/* Informations globales en grille */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {details.map((detail, idx) => (
          <DetailItem
            key={idx}
            label={detail.label}
            value={detail.value}
            badge={detail.badge}
          />
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onClose}
          variant="secondary"
          size="lg"
        >
          Fermer
        </Button>
      </div>
    </div>
  );
}

export default ApresLivraisonDetails;
