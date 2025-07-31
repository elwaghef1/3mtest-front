// frontend/src/components/ApresLivraisonDetails.js
import React from 'react';
import Button from './Button';

// Fonction utilitaire pour formater un article
const formatArticle = (a) => {
  console.log('DEBUG - formatArticle called with:', a);
  if (!a) {
    console.log('DEBUG - formatArticle: Article is null/undefined');
    return '—';
  }
  const ref = a.reference || '';
  const spec = a.specification || '';
  const taille = a.taille || '';
  const typeCarton = a.typeCarton || '';
  const formatted = `${ref} - ${spec} - ${taille} - ${typeCarton}`;
  console.log('DEBUG - formatArticle result:', formatted);
  return formatted;
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
  // Debug: Log the entire commande object to understand the data structure
  console.log('DEBUG - ApresLivraisonDetails: Full commande object:', commande);
  console.log('DEBUG - ApresLivraisonDetails: historiquelivraisons:', commande.historiquelivraisons);
  
  // If historiquelivraisons exists, log each livraison and its items
  if (commande.historiquelivraisons && commande.historiquelivraisons.length > 0) {
    commande.historiquelivraisons.forEach((livraison, index) => {
      console.log(`DEBUG - Livraison ${index}:`, livraison);
      if (livraison.items && livraison.items.length > 0) {
        livraison.items.forEach((item, itemIndex) => {
          console.log(`DEBUG - Livraison ${index}, Item ${itemIndex}:`, item);
          console.log(`DEBUG - Item article:`, item.article);
          console.log(`DEBUG - Item lotInfo:`, item.lotInfo);
          console.log(`DEBUG - Item quantiteKg:`, item.quantiteKg);
        });
      }
    });
  }

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
    { label: 'No Bon de Commande', value: commande.noBonDeCommande },
    { label: 'B/L', value: commande.BL },
    { label: 'Destination', value: commande.destination },
    {
      label: 'Date Prévue de Chargement',
      value: commande.datePrevueDeChargement
        ? new Date(commande.datePrevueDeChargement).toLocaleDateString('fr-FR')
        : null,
    },
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

      {/* Section Cargos et Informations Conteneur */}
      <div className="mb-8">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Cargos et Informations Conteneur</h3>
        {commande.cargo && commande.cargo.length > 0 ? (
          <div className="space-y-4">
            {commande.cargo.map((cargo, index) => (
              <div key={index} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                <h4 className="text-lg font-semibold mb-3 text-gray-700">
                  {typeof cargo === 'string' ? `Cargo ${index + 1}: ${cargo}` : `Cargo ${index + 1}: ${cargo.nom || 'Sans nom'}`}
                </h4>
                {typeof cargo === 'object' && cargo !== null ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <DetailItem
                      label="N° de Conteneur"
                      value={cargo.noDeConteneur}
                    />
                    <DetailItem
                      label="Tare de Conteneur"
                      value={cargo.areDeConteneur}
                    />
                    <DetailItem
                      label="Poids Carton"
                      value={cargo.poidsCarton}
                    />
                    <DetailItem
                      label="N° Plomb"
                      value={cargo.noPlomb}
                    />
                    <DetailItem
                      label="Numéro Facture"
                      value={cargo.numeroFacture}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    Format ancien - Informations conteneur non disponibles
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">Aucun cargo renseigné.</p>
        )}
      </div>

      {/* Section Détails de Livraison par Lots */}
      <div className="mb-8">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Détails de Livraison par Lots</h3>
        {commande.historiquelivraisons && commande.historiquelivraisons.length > 0 ? (
          <div className="space-y-6">
            {commande.historiquelivraisons.map((livraison, livraisonIndex) => (
              <div key={livraisonIndex} className="border border-gray-300 rounded-lg p-4 bg-blue-50">
                <h4 className="text-lg font-semibold mb-3 text-gray-700">
                  Livraison {livraisonIndex + 1} - {livraison.dateLivraison ? new Date(livraison.dateLivraison).toLocaleDateString('fr-FR') : 'Date non renseignée'}
                  {livraison.referenceLivraison && (
                    <span className="ml-2 text-sm text-blue-600">({livraison.referenceLivraison})</span>
                  )}
                </h4>
                {livraison.items && livraison.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 text-left">
                            Article
                          </th>
                          <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 text-center">
                            Quantité Livrée (Kg)
                          </th>
                          <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 text-center">
                            Détails par Lot
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {livraison.items.map((item, itemIndex) => (
                          <tr key={itemIndex} className="hover:bg-gray-50 transition-colors">
                            <td className="border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 whitespace-nowrap">
                              {item.article ? formatArticle(item.article) : '—'}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-xs text-center text-gray-700 whitespace-nowrap">
                              <strong>{item.quantiteKg || '—'} Kg</strong>
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-xs text-gray-700">
                              {item.lotInfo && item.lotInfo.distributionLots && item.lotInfo.distributionLots.length > 0 ? (
                                <div className="space-y-1">
                                  {item.lotInfo.distributionLots.map((lot, lotIndex) => (
                                    <div key={lotIndex} className="bg-white rounded px-2 py-1 border border-gray-200">
                                      <span className="font-semibold text-blue-700">Lot: {lot.batchNumber || 'N/A'}</span>
                                      <span className="ml-2 text-green-700">→ {lot.quantiteUtilisee || '0'} Kg</span>
                                      {lot.dateProduction && (
                                        <span className="ml-2 text-gray-500 text-xs">
                                          (Prod: {new Date(lot.dateProduction).toLocaleDateString('fr-FR')})
                                        </span>
                                      )}
                                      {lot.dateExpiration && (
                                        <span className="ml-2 text-gray-500 text-xs">
                                          (Exp: {new Date(lot.dateExpiration).toLocaleDateString('fr-FR')})
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : item.lotInfo && item.lotInfo.batchNumber ? (
                                // Support pour l'ancien format de lot
                                <div className="bg-white rounded px-2 py-1 border border-gray-200">
                                  <span className="font-semibold text-blue-700">Lot: {item.lotInfo.batchNumber}</span>
                                  <span className="ml-2 text-green-700">→ {item.lotInfo.quantiteUtilisee || item.quantiteKg || '0'} Kg</span>
                                </div>
                              ) : (
                                <span className="text-gray-500 italic">Informations de lot non disponibles</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Aucun article livré dans cette livraison.</p>
                )}
                
                {/* Résumé de la livraison */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Quantité totale livrée:</span>
                    <span className="font-semibold text-gray-800">{livraison.quantiteLivree || '—'} Kg</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Prix total livré:</span>
                    <span className="font-semibold text-gray-800">{livraison.prixLivre || '—'} {commande.currency || 'EUR'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-gray-300 rounded-lg p-4 bg-blue-50">
            <p className="text-sm text-gray-600">
              <strong>Aucun détail de livraison par lots trouvé pour cette commande.</strong>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Les informations de lots peuvent être consultées dans la section Articles ci-dessus ou vérifiez que la livraison a été correctement enregistrée.
            </p>
          </div>
        )}
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
