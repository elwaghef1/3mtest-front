// frontend/src/components/CommandeDetails.js
import React from 'react';
import Button from './Button';

// Fonction utilitaire pour formater un article (détail)
const formatArticle = (a) => {
  if (!a) return '—';
  const ref = a.reference || '';
  const spec = a.specification || '';
  const taille = a.taille || '';
  const typeCarton = a.typeCarton || '';
  return `${ref} - ${spec} - ${taille} - ${typeCarton}`;
};

// Fonction pour obtenir une couleur de badge selon le statut
const getStatusColor = (status) => {
  switch (status) {
    case 'EN_COURS':
      return 'bg-yellow-800 text-white text-xs';
    case 'EN_ATTENTE_STOCK':
      return 'bg-orange-800 text-white text-xs';
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

// Fonction utilitaire pour vérifier si une valeur est manquante
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
      {isMissing(value)
        ? ''
        : badge ? (
            <span className={`inline-block px-3 py-1 rounded-full ${badge}`}>
              {value}
            </span>
          ) : (
            value
          )}
    </p>
  </div>
);

function CommandeDetails({ commande, onClose, formatCurrency, formatNumber }) {
  // Fonctions de formatage par défaut si elles ne sont pas fournies
  const defaultFormatCurrency = (value, currency = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  const defaultFormatNumber = (value) => {
    return new Intl.NumberFormat('fr-FR').format(value || 0);
  };

  // Utiliser les fonctions fournies ou les fonctions par défaut
  const formatCurrencyFunc = formatCurrency || defaultFormatCurrency;
  const formatNumberFunc = formatNumber || defaultFormatNumber;

  // Carte affichant le total de la commande
  const totalCard = (
    <div className="bg-gray-200 p-6 rounded-lg text-center mb-8">
      <h3 className="text-2xl font-bold text-gray-800 mb-2">Prix Total de la Commande</h3>
      <p className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-red-700 to-purple-500">
        {commande.prixTotal
          ? formatCurrencyFunc(commande.prixTotal, commande.currency)
          : '—'}
      </p>
    </div>
  );

  // Début du tableau des détails communs
  const details = [
    { label: 'Référence', value: commande.reference },
    { label: 'No Bon de Commande', value: commande.noBonDeCommande },
    { label: 'Numéro Booking', value: commande.numeroBooking },
    { label: 'Numéro OP', value: commande.numeroOP },
    { label: 'Client', value: commande.client?.raisonSociale },
    { label: 'Statut BC', value: commande.statutBonDeCommande, badge: getStatusColor(commande.statutBonDeCommande) },
    { label: 'Statut Paiement', value: commande.statutDePaiement, badge: getStatusColor(commande.statutDePaiement) },
    { label: 'Montant Payé', value: commande.montantPaye ? `${commande.montantPaye} ${commande.currency}` : null },
    { label: 'Reliquat', value: commande.reliquat ? `${commande.reliquat} ${commande.currency}` : null },
    { label: 'Devise', value: commande.currency },
    { label: 'Destination', value: commande.destination },
    { label: 'Responsable de stock informé', value: commande.responsableDeStockInforme },
    { label: 'Inspecteur informé', value: commande.inspecteurInforme },
  ];

  // Si la commande est LIVREE, ajouter les champs spécifiques
  if (commande.statutBonDeCommande === 'LIVREE') {
    details.push(
      { label: 'Cargo', value: commande.cargo },
      { label: 'Poids Carton', value: commande.poidsCarton },
      { label: 'No Plomb', value: commande.noPlomb },
      { label: 'Tare de Conteneur', value: commande.areDeConteneur },
      { label: 'Numéro de Conteneur', value: commande.noDeConteneur },
      { label: 'Draft HC', value: commande.draftHC, badge: getStatusColor(commande.draftHC) },
      { label: 'Facture', value: commande.facture, badge: getStatusColor(commande.facture) },
      { label: 'Packing List', value: commande.packingList, badge: getStatusColor(commande.packingList) },
      { label: 'Draft CO', value: commande.draftCO, badge: getStatusColor(commande.draftCO) },
      { label: 'VGM', value: commande.vgm, badge: getStatusColor(commande.vgm) },
      { label: 'DHL', value: commande.dhl, badge: getStatusColor(commande.dhl) },
      { label: 'Facture manutention', value: commande.factureManutention, badge: getStatusColor(commande.factureManutention) },
      { label: 'Facture cargo', value: commande.factureCargo, badge: getStatusColor(commande.factureCargo) },
      { label: 'Taxe zone franche', value: commande.taxeZoneFranche, badge: getStatusColor(commande.taxeZoneFranche) },
      { label: 'Etiquette', value: commande.etiquette, badge: getStatusColor(commande.etiquette) },
      { label: "Déclaration d'exportation", value: commande.declaration, badge: getStatusColor(commande.declaration) }
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-lg border border-gray-200">
      <h2 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-red-700 to-purple-500">
        Détails de la Commande
      </h2>
      {totalCard}
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
                    {formatArticle(item.article)}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-xs text-gray-700 whitespace-nowrap text-center">
                    <strong>{item.lot && item.lot.batchNumber ? item.lot.batchNumber : '—'}</strong>
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-xs text-gray-700 whitespace-nowrap">
                    {item.quantiteKg || '—'}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-xs text-gray-700 whitespace-nowrap">
                    {item.prixUnitaire || '—'}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-xs text-gray-700 text-right whitespace-nowrap">
                    {item.prixTotal || '—'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border border-gray-300 px-2 py-1 text-xs text-gray-700" colSpan="5">
                  —
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {details.map((detail, idx) => (
          <DetailItem
            key={idx}
            label={detail.label}
            value={detail.value}
            badge={detail.badge}
          />
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

export default CommandeDetails;
