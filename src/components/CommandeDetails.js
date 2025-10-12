// frontend/src/components/CommandeDetails.js
import React, { useState } from 'react';
import Button from './Button';
import CargoAllocationModal from './CargoAllocationModal';
import PackingListForm from './PackingListForm';
import CertificationModal from './CertificationModal';
import VGMModal from './VGMModal';
import { downloadCargoPackingList, downloadAllCargoPackingLists } from '../services/cargoPackingListGenerator';
import { generateCommandeDetailsPDF, generateCertificationRequestPDF, generateBonDeSortiePDF, generateCertificatOrigineExcel, generateInvoicePDF, generateProformaInvoicePDF } from './pdfGenerators';
import axios from '../api/axios';

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
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showPackingListForm, setShowPackingListForm] = useState(false);
  const [showCertificationModal, setShowCertificationModal] = useState(false);
  const [showVGMModal, setShowVGMModal] = useState(false);
  const [loading, setLoading] = useState(false);
  // Fonctions de formatage par défaut si elles ne sont pas fournies
  const defaultFormatCurrency = (value, currency = 'EUR') => {
    // Gérer les différentes devises
    let currencyCode = currency;
    if (currency === 'MRU') {
      currencyCode = 'MRU'; // Fallback car MRU n'est pas encore supporté par tous les navigateurs
    }
    
    try {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      }).format(value || 0);
    } catch (error) {
      // Fallback pour MRU ou autres devises non supportées
      if (currency === 'MRU') {
        return `${new Intl.NumberFormat('fr-FR', {
          minimumFractionDigits: 3,
          maximumFractionDigits: 3,
        }).format(value || 0)} MRU`;
      }
      return `${value || 0} ${currency}`;
    }
  };

  const defaultFormatNumber = (value) => {
    return new Intl.NumberFormat('fr-FR').format(value || 0);
  };

  // Utiliser les fonctions fournies ou les fonctions par défaut
  const formatCurrencyFunc = formatCurrency || defaultFormatCurrency;
  const formatNumberFunc = formatNumber || defaultFormatNumber;

  // Fonction pour générer le bon de sortie avec détails des batches
  const handleGenerateBonDeSortie = async () => {
    setLoading(true);
    try {
      console.log('🔍 Génération bon de sortie - ID commande:', commande._id);
      console.log('📋 Commande complète:', commande);
      
      // Récupérer l'historique des livraisons avec détails des batches
      const response = await axios.get(`/commandes/${commande._id}/historique-livraisons`);
      const historiqueData = response.data;
      
      console.log('📊 Données historique reçues:', historiqueData);
      
      if (!historiqueData.livraisons || historiqueData.livraisons.length === 0) {
        alert('Aucune livraison trouvée pour cette commande');
        return;
      }
      
      // Générer le PDF avec les détails des batches
      generateBonDeSortiePDF(commande, historiqueData);
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des données de sortie:', error);
      console.error('📝 Détails de l\'erreur:', error.response?.data);
      console.error('🔢 Status HTTP:', error.response?.status);
      alert(`Erreur lors de la génération du bon de sortie: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fonctions de gestion des allocations cargo
  const handleSaveAllocations = async (cargoAllocations) => {
    setLoading(true);
    try {
      // Fonction utilitaire pour nettoyer un ObjectId
      const cleanObjectId = (value) => {
        if (!value || value === '' || value === null || value === undefined) {
          return undefined;
        }
        return value;
      };

      // Préparer les données pour l'API avec nettoyage
      const updatedCargo = cargoAllocations.map(cargo => ({
        nom: cargo.nom,
        noDeConteneur: cargo.noDeConteneur,
        areDeConteneur: cargo.areDeConteneur,
        poidsCarton: cargo.poidsCarton,
        noPlomb: cargo.noPlomb,
        itemsAlloues: (cargo.itemsAlloues || [])
          .filter(item => item.article && item.depot && item.quantiteAllouee > 0) // Filtrer les items invalides
          .map(item => {
            const cleanedItem = {
              article: cleanObjectId(item.article),
              depot: cleanObjectId(item.depot),
              quantiteAllouee: parseFloat(item.quantiteAllouee) || 0,
              quantiteCarton: parseFloat(item.quantiteCarton) || 0,
              dateProduction: item.dateProduction || '',
              dateExpiration: item.dateExpiration || ''
            };

            // Ajouter les informations de lot seulement si elles sont valides
            if (item.lot && (item.lot.entreeOrigine || item.lot.batchNumber)) {
              cleanedItem.lot = {};
              
              if (cleanObjectId(item.lot.entreeOrigine)) {
                cleanedItem.lot.entreeOrigine = cleanObjectId(item.lot.entreeOrigine);
              }
              
              if (item.lot.batchNumber && item.lot.batchNumber !== '') {
                cleanedItem.lot.batchNumber = item.lot.batchNumber;
              }
              
              if (item.lot.quantiteUtilisee) {
                cleanedItem.lot.quantiteUtilisee = parseFloat(item.lot.quantiteUtilisee);
              }
            }

            return cleanedItem;
          })
      }));

      console.log('Données envoyées à l\'API:', JSON.stringify(updatedCargo, null, 2));

      // Sauvegarder via API
      await axios.put(`/commandes/${commande._id}/cargo-allocations`, {
        cargo: updatedCargo
      });

      // Recharger les données ou mettre à jour l'état local
      alert('Allocations sauvegardées avec succès !');
      
      // Optionnel : déclencher un rafraîchissement des données parent
      if (onClose) {
        window.location.reload(); // Simple refresh pour voir les changements
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde des allocations');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const hasAllocations = () => {
    return commande.cargo?.some(cargo => cargo.itemsAlloues && cargo.itemsAlloues.length > 0);
  };

  // Fonction pour sauvegarder les données du packing list
  const handleSavePackingList = async (packingData) => {
    try {
      await axios.put(`/commandes/${commande._id}/packing-list`, {
        packingListData: packingData
      });
      
      console.log('Packing list sauvegardé avec succès');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du packing list:', error);
      throw error;
    }
  };

  // Fonction pour télécharger le Certificat d'Origine en Excel
  const handleDownloadCertificatOrigine = () => {
    try {
      // Préparer les données pour le certificat d'origine
      const certificateData = {
        cargo: commande.cargo && commande.cargo.length > 0 ? commande.cargo[0] : {},
        articles: commande.items || [],
        totals: {
          totalColis: commande.items ? commande.items.reduce((sum, item) => sum + (item.quantiteCarton || 0), 0) : 0,
          poidsNet: commande.items ? commande.items.reduce((sum, item) => sum + (item.quantiteKg || 0), 0) : 0,
          poidsBrut: commande.items ? commande.items.reduce((sum, item) => sum + (item.quantiteKg || 0), 0) * 1.04 : 0, // Approximation 4% d'emballage
        }
      };

      // Générer le fichier Excel
      generateCertificatOrigineExcel(certificateData, commande);
    } catch (error) {
      console.error('Erreur lors de la génération du Certificat d\'Origine:', error);
      alert('Erreur lors de la génération du Certificat d\'Origine. Veuillez réessayer.');
    }
  };

  // Fonctions pour générer les PDF de facturation
  const handleDownloadProforma = () => {
    if (!commande) return;
    generateProformaInvoicePDF(commande);
  };

  const handleDownloadFacture = () => {
    if (!commande) return;
    generateInvoicePDF(commande);
  };

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
    { label: 'Numéro de Facture', value: commande.numeroFacture, badge: commande.numeroFacture ? 'bg-blue-600 text-white text-xs' : null },
    { label: 'Numéro de Facture Proforma', value: commande.numeroFactureProforma, badge: commande.numeroFactureProforma ? 'bg-purple-600 text-white text-xs' : null },
    { label: 'Type de commande', value: commande.typeCommande === 'LOCALE' ? 'Locale' : 'Export', badge: commande.typeCommande === 'LOCALE' ? 'bg-green-600 text-white text-xs' : 'bg-blue-600 text-white text-xs' },
    // Masquer certains champs pour les commandes locales
    ...(commande.typeCommande !== 'LOCALE' ? [
      { label: 'No Bon de Commande', value: commande.noBonDeCommande },
      { label: 'B/L', value: commande.BL },
      { label: 'Numéro Booking', value: commande.numeroBooking },
      { label: 'Numéros OP', value: commande.numerosOP && commande.numerosOP.length > 0 ? commande.numerosOP.join(', ') : 'N/A' },
    ] : []),
    { label: 'Client', value: commande.client?.raisonSociale },
    { label: 'Statut BC', value: commande.statutBonDeCommande, badge: getStatusColor(commande.statutBonDeCommande) },
    { label: 'Statut Paiement', value: commande.statutDePaiement, badge: getStatusColor(commande.statutDePaiement) },
    { label: 'Montant Payé', value: commande.montantPaye ? formatCurrencyFunc(commande.montantPaye, commande.currency) : null },
    { label: 'Reliquat', value: commande.reliquat ? formatCurrencyFunc(commande.reliquat, commande.currency) : null },
    { label: 'Devise', value: commande.currency },
    ...(commande.typeCommande !== 'LOCALE' ? [
      { label: 'Destination', value: commande.destination },
      { label: 'Responsable de stock informé', value: commande.responsableDeStockInforme },
      { label: 'Inspecteur informé', value: commande.inspecteurInforme },
    ] : []),
  ];

  // Si la commande est LIVREE, ajouter les champs spécifiques
  if (commande.statutBonDeCommande === 'LIVREE') {
    // Champs communs pour toutes les commandes livrées
    details.push(
      { label: 'Draft HC', value: commande.draftHC, badge: getStatusColor(commande.draftHC) },
      { label: 'Facture', value: commande.facture, badge: getStatusColor(commande.facture) },
      { label: 'Packing List', value: commande.packingList, badge: getStatusColor(commande.packingList) },
      { label: 'Draft CO', value: commande.draftCO, badge: getStatusColor(commande.draftCO) },
      { label: 'VGM', value: commande.vgm, badge: getStatusColor(commande.vgm) },
      { label: 'DHL', value: commande.dhl, badge: getStatusColor(commande.dhl) }
    );
    
    // Ajouter les charges locales seulement si ce n'est pas une commande locale
    if (commande.typeCommande !== 'LOCALE') {
      details.push(
        { label: 'Facture manutention', value: commande.factureManutention, badge: getStatusColor(commande.factureManutention) },
        { label: 'Facture cargo', value: commande.factureCargo, badge: getStatusColor(commande.factureCargo) },
        { label: 'Taxe zone franche', value: commande.taxeZoneFranche, badge: getStatusColor(commande.taxeZoneFranche) }
      );
    }
    
    details.push(
      { label: 'Etiquette', value: commande.etiquette, badge: getStatusColor(commande.etiquette) }
    );
    
    // Ajouter "Déclaration d'exportation" seulement pour les commandes export
    if (commande.typeCommande !== 'LOCALE') {
      details.push(
        { label: "Déclaration d'exportation", value: commande.declaration, badge: getStatusColor(commande.declaration) }
      );
    }
  }

  return (
    <div className="max-w-8xl mx-auto p-8 bg-white rounded-lg shadow-lg border border-gray-200">
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
              {/* <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 text-center">
                Batch Number
              </th> */}
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
                  {/* <td className="border border-gray-300 px-2 py-1 text-xs text-gray-700 whitespace-nowrap text-center">
                    <strong>{item.lot && item.lot.batchNumber ? item.lot.batchNumber : '—'}</strong>
                  </td> */}
                  <td className="border border-gray-300 px-2 py-1 text-xs text-gray-700 whitespace-nowrap">
                    {item.quantiteKg || '—'}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-xs text-gray-700 whitespace-nowrap">
                    {item.prixUnitaire ? formatCurrencyFunc(item.prixUnitaire, commande.currency) : '—'}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-xs text-gray-700 text-right whitespace-nowrap">
                    {item.prixTotal ? formatCurrencyFunc(item.prixTotal, commande.currency) : '—'}
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

      {/* Section Cargos et Informations Conteneur */}
      {commande.cargo && Array.isArray(commande.cargo) && commande.cargo.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Cargos et Informations Conteneur</h3>
          <div className="space-y-4">
            {commande.cargo.map((cargo, index) => (
              <div key={index} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-gray-700 mb-3">Cargo {index + 1}</h4>                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <DetailItem label="Nom du Cargo" value={cargo.nom} />
                    <DetailItem label="N° de Conteneur" value={cargo.noDeConteneur} />
                    <DetailItem label="Tare de Conteneur" value={cargo.areDeConteneur} />
                    <DetailItem label="Poids Carton" value={cargo.poidsCarton} />
                    <DetailItem label="N° Plomb" value={cargo.noPlomb} />
                    <DetailItem label="Numéro Facture" value={cargo.numeroFacture} />
                  </div>
                  
                  {/* Affichage des articles alloués à ce cargo */}
                  {cargo.itemsAlloues && cargo.itemsAlloues.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-medium text-gray-600 mb-2">Articles alloués:</h5>
                      <div className="bg-white rounded border">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="p-2 text-left">Article</th>
                              <th className="p-2 text-right">Quantité (kg)</th>
                              <th className="p-2 text-right">Cartons</th>
                              <th className="p-2 text-left">Batch Number</th>
                              <th className="p-2 text-left">Prod. Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cargo.itemsAlloues.map((item, itemIndex) => (
                              <tr key={itemIndex} className="border-t">
                                <td className="p-2">{item.article?.reference || 'N/A'}</td>
                                <td className="p-2 text-right">{item.quantiteAllouee || 0}</td>
                                <td className="p-2 text-right">{item.quantiteCarton || 0}</td>
                                <td className="p-2">{item.lot?.batchNumber || 'N/A'}</td>
                                <td className="p-2">{item.dateProduction || 'N/A'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-2">
                        <Button
                          onClick={() => downloadCargoPackingList(commande, index)}
                          variant="success"
                          size="sm"
                        >
                          Télécharger Packing List
                        </Button>
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>
      )}

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
      <div className="flex justify-between items-center mt-8">
        <div className="flex space-x-3">
          {/* Bouton d'allocation cargo - affiché seulement si la commande n'est pas livrée */}
          {/* {commande.statutBonDeCommande !== 'LIVREE' && (
            <Button
              onClick={() => setShowAllocationModal(true)}
              variant="primary"
              size="md"
              disabled={loading}
            >
              {loading ? 'Chargement...' : 'Allouer Articles aux Cargos'}
            </Button>
          )} */}
          
          {/* Bouton Créer le packing list - affiché pour toutes les commandes avec cargo */}
          {commande.cargo && commande.cargo.length > 0 && (
            <Button
              onClick={() => setShowPackingListForm(true)}
              variant="success"
              size="md"
            >
              Créer le Packing List
            </Button>
          )}
          
          {/* Bouton Détails de la Commande */}
          <Button
            onClick={() => generateCommandeDetailsPDF(commande)}
            variant="info"
            size="md"
          >
            Détails
          </Button>

          {/* Boutons de téléchargement des factures */}
          {commande.statutBonDeCommande !== 'LIVREE' && (
            <Button
              onClick={handleDownloadProforma}
              variant="warning"
              size="md"
            >
              📄 Facture Proforma
            </Button>
          )}
          
          <Button
            onClick={handleDownloadFacture}
            variant="success"
            size="md"
          >
            📋 Facture
          </Button>
          
          {/* Bouton Bon de Sortie - affiché pour toutes les commandes livrées */}
          {(commande.statutBonDeCommande === 'LIVREE' || commande.statutBonDeCommande === 'PARTIELLEMENT_LIVREE') && (
            <Button
              onClick={handleGenerateBonDeSortie}
              variant="secondary"
              size="md"
              disabled={loading}
            >
              {loading ? 'Génération...' : 'Bon de Sortie'}
            </Button>
          )}
          
          {/* Bouton Certificat d'Origine - affiché seulement pour les commandes export livrées */}
          {/* {commande.statutBonDeCommande === 'LIVREE' && commande.typeCommande !== 'LOCALE' && (
            <Button
              onClick={() => generateCertificationRequestPDF(commande)}
              variant="warning"
              size="md"
            >
              Certificat d'Origine
            </Button>
          )} */}
          
          {/* Bouton Créer CH - affiché seulement pour les commandes export livrées */}
          {commande.statutBonDeCommande === 'LIVREE' && commande.typeCommande !== 'LOCALE' && (
            <Button
              onClick={() => setShowCertificationModal(true)}
              variant="success"
              size="md"
            >
              📄 Créer CH
            </Button>
          )}

          {/* Bouton Télécharger CO Excel - affiché seulement pour les commandes export livrées */}
          {commande.statutBonDeCommande === 'LIVREE' && commande.typeCommande !== 'LOCALE' && (
            <Button
              onClick={handleDownloadCertificatOrigine}
              variant="info"
              size="md"
            >
              📊 Télécharger CO
            </Button>
          )}
          
          {/* Bouton Créer VGM - affiché seulement pour les commandes export livrées */}
          {commande.statutBonDeCommande === 'LIVREE' && commande.typeCommande !== 'LOCALE' && (
            <Button
              onClick={() => setShowVGMModal(true)}
              variant="primary"
              size="md"
            >
              ⚖️ Créer VGM
            </Button>
          )}
          
          {hasAllocations() && (
            <Button
              onClick={() => downloadAllCargoPackingLists(commande)}
              variant="success"
              size="md"
            >
              Télécharger Toutes les Packing Lists
            </Button>
          )}
        </div>
        
        <Button
          onClick={onClose}
          variant="secondary"
          size="md"
        >
          Fermer
        </Button>
      </div>

      {/* Modal d'allocation des cargos */}
      <CargoAllocationModal
        commande={commande}
        isOpen={showAllocationModal}
        onClose={() => setShowAllocationModal(false)}
        onSave={handleSaveAllocations}
      />

      {/* Modal de création du packing list */}
      <PackingListForm
        commande={commande}
        isOpen={showPackingListForm}
        onClose={() => setShowPackingListForm(false)}
        onSave={handleSavePackingList}
      />

      {/* Modal de certification CH */}
      <CertificationModal
        commande={commande}
        isOpen={showCertificationModal}
        onClose={() => setShowCertificationModal(false)}
      />

      {/* Modal de création VGM */}
      <VGMModal
        commande={commande}
        isOpen={showVGMModal}
        onClose={() => setShowVGMModal(false)}
      />
    </div>
  );
}

export default CommandeDetails;
