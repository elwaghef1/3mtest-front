// Components/LivraisonPartielleModal.js - Modal pour gérer les livraisons partielles
import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Button from './Button';
import {
  CheckIcon,
  XMarkIcon,
  TruckIcon,
  DocumentTextIcon,
  PrinterIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { 
  generatePartialDeliveryInvoice, 
  generatePartialDeliveryPackingList, 
  generatePartialDeliveryBonDeSortie 
} from '../services/partialDeliveryPdfGenerator';
import { 
  unifiedPDFService,
  downloadUnifiedDeliveryPDF 
} from '../services/unifiedDeliveryPDFService';

const LivraisonPartielleModal = ({ 
  commande, 
  onClose, 
  onLivraisonCreated,
  formatCurrency,
  formatNumber 
}) => {
  const [livraisonItems, setLivraisonItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState({});
  const [calculatedValues, setCalculatedValues] = useState({
    totalLivre: 0,
    totalRestant: 0,
    prixTotalLivre: 0,
    prixTotalRestant: 0
  });

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

  useEffect(() => {
    if (commande) {
      initializeLivraisonItems();
      fetchStocks();
    }
  }, [commande]);

  const initializeLivraisonItems = async () => {
    try {
      // Récupérer l'historique des livraisons pour calculer les quantités restantes
      const response = await axios.get(`/commandes/${commande._id}/historique-livraisons`);
      const historiqueData = response.data;
      
      // Calculer les quantités déjà livrées par item
      const quantitesLivrees = {};
      
      if (historiqueData.livraisons) {
        historiqueData.livraisons.forEach(livraison => {
          livraison.items?.forEach(sortieItem => {
            const key = `${sortieItem.article?._id || sortieItem.article}-${sortieItem.depot?._id || sortieItem.depot}`;
            if (!quantitesLivrees[key]) {
              quantitesLivrees[key] = 0;
            }
            quantitesLivrees[key] += sortieItem.quantiteKg || 0;
          });
        });
      }
      
      // Initialiser les items avec les vraies quantités restantes
      const items = commande.items.map(item => {
        const key = `${item.article._id}-${item.depot._id}`;
        const quantiteDejaLivree = quantitesLivrees[key] || 0;
        const quantiteRestante = Math.max(0, item.quantiteKg - quantiteDejaLivree);
        
        return {
          ...item,
          quantiteLivree: 0,
          quantiteRestante: quantiteRestante,
          quantiteDejaLivree: quantiteDejaLivree,
          pourLivraison: false
        };
      });
      
      setLivraisonItems(items);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      // Fallback en cas d'erreur - utiliser les quantités originales
      const items = commande.items.map(item => ({
        ...item,
        quantiteLivree: 0,
        quantiteRestante: item.quantiteKg,
        quantiteDejaLivree: 0,
        pourLivraison: false
      }));
      setLivraisonItems(items);
    }
  };

  const fetchStocks = async () => {
    try {
      const response = await axios.get('/stock');
      const stockMap = {};
      response.data.forEach(stock => {
        const key = `${stock.article._id}-${stock.depot._id}`;
        stockMap[key] = stock;
      });
      setStocks(stockMap);
    } catch (error) {
      console.error('Erreur lors de la récupération des stocks:', error);
    }
  };

  const handleQuantiteChange = (itemIndex, quantite) => {
    const newItems = [...livraisonItems];
    const item = newItems[itemIndex];
    const stockKey = `${item.article._id}-${item.depot._id}`;
    const stockDisponible = stocks[stockKey]?.quantiteCommercialisableKg || 0;
    
    // CORRECTION: Limiter la quantité à la quantité restante ET au stock disponible
    // La quantité restante est déjà calculée dans initializeLivraisonItems
    const maxQuantiteRestante = item.quantiteRestante || 0;
    const maxQuantite = Math.min(maxQuantiteRestante, stockDisponible);
    const quantiteLivree = Math.min(Math.max(0, parseFloat(quantite) || 0), maxQuantite);
    
    item.quantiteLivree = quantiteLivree;
    item.quantiteRestante = (item.quantiteKg || 0) - (item.quantiteDejaLivree || 0) - quantiteLivree;
    item.pourLivraison = quantiteLivree > 0;
    
    setLivraisonItems(newItems);
    calculateValues(newItems);
  };

  const calculateValues = (items) => {
    const values = items.reduce((acc, item) => {
      const prixUnitaire = item.prixUnitaire || 0;
      const prixLivre = item.quantiteLivree * prixUnitaire;
      const prixRestant = item.quantiteRestante * prixUnitaire;
      
      return {
        totalLivre: acc.totalLivre + item.quantiteLivree,
        totalRestant: acc.totalRestant + item.quantiteRestante,
        prixTotalLivre: acc.prixTotalLivre + prixLivre,
        prixTotalRestant: acc.prixTotalRestant + prixRestant
      };
    }, {
      totalLivre: 0,
      totalRestant: 0,
      prixTotalLivre: 0,
      prixTotalRestant: 0
    });
    
    setCalculatedValues(values);
  };

  const handleLivrerTout = () => {
    const newItems = livraisonItems.map(item => {
      const stockKey = `${item.article._id}-${item.depot._id}`;
      const stockDisponible = stocks[stockKey]?.quantiteCommercialisableKg || 0;
      const quantiteLivree = Math.min(item.quantiteKg, stockDisponible);
      
      return {
        ...item,
        quantiteLivree,
        quantiteRestante: item.quantiteKg - quantiteLivree,
        pourLivraison: quantiteLivree > 0
      };
    });
    
    setLivraisonItems(newItems);
    calculateValues(newItems);
  };

  const handleConfirmerLivraison = async () => {
    setLoading(true);
    try {
      const itemsALivrer = livraisonItems.filter(item => item.pourLivraison && item.quantiteLivree > 0);
      
      if (itemsALivrer.length === 0) {
        alert('Aucun article sélectionné pour la livraison');
        return;
      }

      // Préparer les données pour l'API de livraison partielle
      const livraisonData = {
        itemsALivrer: itemsALivrer.map(item => ({
          itemId: item._id,
          quantiteLivree: item.quantiteLivree
        }))
      };

      // Effectuer la livraison partielle via l'endpoint dédié
      const response = await axios.post(`/commandes/${commande._id}/livraison-partielle`, livraisonData);
      
      const { commandeLivree, commandeOriginale, resume } = response.data;
      
      // Générer les documents PDF pour la livraison
      try {
        const itemsLivres = itemsALivrer.map(item => ({
          ...item,
          quantiteLivree: item.quantiteLivree,
          lot: item.lot || { batchNumber: 'N/A' }
        }));

        const infoLivraison = {
          dateLivraison: new Date(),
          referenceLivraison: resume.referenceLivraison,
          responsable: 'Système',
          quantiteLivree: resume.quantiteLivree,
          prixLivre: resume.prixLivre
        };

        // Utiliser le nouveau service PDF unifié
        const pdfGenerated = downloadUnifiedDeliveryPDF(
          commande, 
          itemsLivres, 
          infoLivraison,
          `Livraison_${resume.referenceLivraison}.pdf`
        );

        if (pdfGenerated) {
          console.log('✅ PDF unifié généré avec succès');
        } else {
          console.warn('⚠️ Génération PDF échouée, utilisation des PDFs individuels');
          
          // Fallback vers les anciens générateurs individuels
          const invoice = generatePartialDeliveryInvoice(commande, itemsLivres, infoLivraison);
          const packingList = generatePartialDeliveryPackingList(commande, itemsLivres, infoLivraison);
          const bonDeSortie = generatePartialDeliveryBonDeSortie(commande, itemsLivres, infoLivraison);

          // Télécharger les documents individuels
          invoice.save(`Facture_${resume.referenceLivraison}.pdf`);
          packingList.save(`Packing_List_${resume.referenceLivraison}.pdf`);
          bonDeSortie.save(`Bon_Sortie_${resume.referenceLivraison}.pdf`);
        }

      } catch (pdfError) {
        console.error('❌ Erreur lors de la génération des PDF:', pdfError);
        // Ne pas empêcher la livraison si la génération PDF échoue
        alert('⚠️ Livraison réussie mais génération PDF échouée. Contactez l\'administrateur.');
      }

      // Afficher un message de succès
      alert(`Livraison partielle effectuée avec succès!\nRéférence: ${resume.referenceLivraison}\nQuantité livrée: ${resume.quantiteLivree} kg`);

      // Fermer le modal et actualiser les données
      if (onLivraisonCreated) onLivraisonCreated();
      onClose();
    } catch (error) {
      console.error('Erreur lors de la livraison:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la livraison';
      alert(`Erreur: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateUnifiedPDF = () => {
    try {
      const itemsAGenerer = livraisonItems.filter(item => item.pourLivraison && item.quantiteLivree > 0);
      
      if (itemsAGenerer.length === 0) {
        alert('Aucun article sélectionné pour la génération PDF');
        return;
      }

      const itemsLivres = itemsAGenerer.map(item => ({
        ...item,
        quantiteLivree: item.quantiteLivree,
        lot: item.lot || { batchNumber: 'N/A' }
      }));

      const infoLivraison = {
        dateLivraison: new Date(),
        referenceLivraison: `PREVIEW_${commande.reference}_${Date.now()}`,
        responsable: 'Aperçu',
        quantiteLivree: itemsAGenerer.reduce((sum, item) => sum + item.quantiteLivree, 0),
        prixLivre: itemsAGenerer.reduce((sum, item) => sum + (item.quantiteLivree * (item.prixUnitaire || 0)), 0)
      };

      const pdfGenerated = downloadUnifiedDeliveryPDF(
        commande, 
        itemsLivres, 
        infoLivraison,
        `Apercu_Livraison_${commande.reference}.pdf`
      );

      if (pdfGenerated) {
        alert('✅ PDF d\'aperçu généré avec succès !');
      } else {
        alert('❌ Erreur lors de la génération du PDF');
      }
    } catch (error) {
      console.error('Erreur lors de la génération PDF:', error);
      alert('❌ Erreur lors de la génération du PDF: ' + error.message);
    }
  };

  const getStockStatus = (item) => {
    const stockKey = `${item.article._id}-${item.depot._id}`;
    const stock = stocks[stockKey];
    if (!stock) return { status: 'unavailable', text: 'Stock indisponible', color: 'text-red-600' };
    
    const disponible = stock.quantiteCommercialisableKg;
    if (disponible >= item.quantiteKg) {
      return { status: 'sufficient', text: `${disponible} kg disponible`, color: 'text-green-600' };
    } else if (disponible > 0) {
      return { status: 'partial', text: `${disponible} kg disponible (partiel)`, color: 'text-yellow-600' };
    } else {
      return { status: 'empty', text: 'Stock épuisé', color: 'text-red-600' };
    }
  };

  if (!commande) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <TruckIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Livraison Partielle
                </h2>
                <p className="text-gray-600">
                  Commande {commande.reference} - {commande.client?.raisonSociale}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              icon={<XMarkIcon className="h-5 w-5" />}
            />
          </div>
        </div>

        <div className="p-6">
          {/* Message explicatif pour les options de livraison */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <TruckIcon className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Options de livraison disponibles</h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p><strong>• Livraison partielle :</strong> Sélectionnez les articles et ajustez les quantités à livrer selon vos besoins. Idéal pour les livraisons échelonnées.</p>
                  <p><strong>• Livraison complète :</strong> Livrer tous les articles de la commande en une seule fois (utilisez le formulaire de sortie standard).</p>
                  <p className="text-blue-600 font-medium">ℹ️ Vous pouvez sélectionner individuellement chaque article ci-dessous et modifier les quantités à livrer.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Résumé des calculs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Total à livrer</p>
              <p className="text-2xl font-bold text-blue-900">
                {formatNumber(calculatedValues.totalLivre)} kg
              </p>
              <p className="text-sm text-blue-600">
                {formatCurrencyFunc(calculatedValues.prixTotalLivre, commande.currency)}
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-600 font-medium">Reste à livrer</p>
              <p className="text-2xl font-bold text-yellow-900">
                {formatNumberFunc(calculatedValues.totalRestant)} kg
              </p>
              <p className="text-sm text-yellow-600">
                {formatCurrencyFunc(calculatedValues.prixTotalRestant, commande.currency)}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Total commande</p>
              <p className="text-2xl font-bold text-green-900">
                {formatNumberFunc(commande.items.reduce((sum, item) => sum + item.quantiteKg, 0))} kg
              </p>
              <p className="text-sm text-green-600">
                {formatCurrencyFunc(commande.prixTotal, commande.currency)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <Button
                variant="info"
                size="sm"
                onClick={handleLivrerTout}
                className="w-full"
                icon={<CheckIcon className="h-4 w-4" />}
              >
                Livrer tout le possible
              </Button>
            </div>
          </div>

          {/* Table des articles */}
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Article
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-900">
                    Commandé
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-900">
                    Stock
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-900">
                    À livrer
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-900">
                    Reste
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-900">
                    Prix livré
                  </th>
                </tr>
              </thead>
              <tbody>
                {livraisonItems.map((item, index) => {
                  const stockStatus = getStockStatus(item);
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.article?.reference} - {item.article?.intitule}
                          </p>
                          <p className="text-sm text-gray-600">
                            {item.article?.specification} - {item.article?.taille}
                          </p>
                          <p className="text-sm text-gray-600">
                            Dépôt: {item.depot?.intitule}
                          </p>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <p className="font-medium">{formatNumberFunc(item.quantiteKg)} kg</p>
                        <p className="text-sm text-gray-600">
                          {formatCurrencyFunc(item.prixTotal, commande.currency)}
                        </p>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <p className={`text-sm font-medium ${stockStatus.color}`}>
                          {stockStatus.text}
                        </p>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={Math.min(item.quantiteKg, stocks[`${item.article._id}-${item.depot._id}`]?.quantiteCommercialisableKg || 0)}
                          step="0.01"
                          value={item.quantiteLivree}
                          onChange={(e) => handleQuantiteChange(index, e.target.value)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">kg</p>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <p className="font-medium">{formatNumberFunc(item.quantiteRestante)} kg</p>
                        <p className="text-sm text-gray-600">
                          {formatCurrencyFunc(item.quantiteRestante * item.prixUnitaire, commande.currency)}
                        </p>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right">
                        <p className="font-medium text-green-600">
                          {formatCurrencyFunc(item.quantiteLivree * item.prixUnitaire, commande.currency)}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center text-sm text-gray-600">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-yellow-500" />
              Les documents seront générés automatiquement pour la livraison
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Annuler
              </Button>
              <Button
                variant="info"
                onClick={() => handleGenerateUnifiedPDF()}
                icon={<DocumentTextIcon className="h-5 w-5" />}
                disabled={livraisonItems.filter(item => item.pourLivraison).length === 0}
              >
                Générer PDF unifié
              </Button>
              <Button
                variant="success"
                onClick={handleConfirmerLivraison}
                loading={loading}
                icon={<TruckIcon className="h-5 w-5" />}
              >
                Confirmer la livraison
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LivraisonPartielleModal;
