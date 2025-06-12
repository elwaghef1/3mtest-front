// Components/LivraisonPartielleModal.js - Modal amélioré pour gérer les livraisons partielles avec gestion des lots
import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Button from './Button';
import {
  CheckIcon,
  XMarkIcon,
  TruckIcon,
  DocumentTextIcon,
  PrinterIcon,
  ExclamationTriangleIcon,
  CubeIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

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
  const [lotsDisponibles, setLotsDisponibles] = useState({});
  const [expandedItems, setExpandedItems] = useState({});
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

  // Nouvelle fonction pour vérifier si la commande est complète
  const isCommandeComplete = () => {
    if (!commande) return false;
    return commande.statutBonDeCommande !== 'EN_ATTENTE_STOCK' && 
           commande.statutBonDeCommande !== 'AVEC_QUANTITES_MANQUANTES';
  };

  // Nouvelle fonction pour obtenir les articles manquants
  const getArticlesManquants = () => {
    if (!commande || !commande.items) return [];
    return commande.items.filter(item => item.quantiteManquante > 0);
  };

  useEffect(() => {
    if (commande) {
      initializeLivraisonItems();
      fetchStocks();
      fetchLotsDisponibles();
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
      
      // Initialiser les items avec gestion obligatoire des lots
      const items = commande.items.map(item => {
        const key = `${item.article._id}-${item.depot._id}`;
        const quantiteDejaLivree = quantitesLivrees[key] || 0;
        const quantiteRestante = Math.max(0, item.quantiteKg - quantiteDejaLivree);
        
        return {
          ...item,
          quantiteLivree: 0,
          quantiteRestante: quantiteRestante,
          quantiteDejaLivree: quantiteDejaLivree,
          pourLivraison: false,
          // Gestion des lots obligatoire
          distributionLots: [], // Array de { lotId, batchNumber, quantite }
          modeGestionLots: true // Toujours activé - gestion des lots obligatoire
        };
      });
      
      setLivraisonItems(items);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      // Fallback en cas d'erreur - utiliser les quantités originales avec gestion lots obligatoire
      const items = commande.items.map(item => ({
        ...item,
        quantiteLivree: 0,
        quantiteRestante: item.quantiteKg,
        quantiteDejaLivree: 0,
        pourLivraison: false,
        distributionLots: [],
        modeGestionLots: true // Gestion des lots obligatoire
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

  // Nouvelle fonction pour récupérer les lots disponibles
  const fetchLotsDisponibles = async () => {
    try {
      const response = await axios.get('/entrees');
      const lotsMap = {};
      
      response.data.forEach(entree => {
        if (entree.depot && entree.items) {
          entree.items.forEach(item => {
            if (item.article && item.quantiteRestante > 0) {
              // IMPORTANT: Extraire correctement l'ID de l'article
              const articleId = typeof item.article === 'object' && item.article._id
                ? item.article._id
                : item.article;
              
              // IMPORTANT: Extraire correctement l'ID du dépôt
              const depotId = typeof entree.depot === 'object' && entree.depot._id
                ? entree.depot._id
                : entree.depot;
              
              const key = `${articleId}-${depotId}`;
              
              if (!lotsMap[key]) {
                lotsMap[key] = [];
              }
              
              lotsMap[key].push({
                entreeId: entree._id,
                articleId: articleId, // ID extrait correctement
                depotId: depotId,     // ID extrait correctement
                batchNumber: entree.batchNumber,
                quantiteRestante: item.quantiteRestante,
                dateProduction: entree.dateProduction,
                dateExpiration: entree.dateExpiration,
                qualite: item.qualite || 'Standard',
                articleReference: item.article?.reference || 'N/A'
              });
            }
          });
        }
      });
      
      // VALIDATION SUPPLÉMENTAIRE: Log pour debugging
      console.log('🔍 Lots disponibles par article-dépôt:', lotsMap);
      Object.entries(lotsMap).forEach(([key, lots]) => {
        const [articleId, depotId] = key.split('-');
        console.log(`📦 Article ${articleId} - Dépôt ${depotId}: ${lots.length} lots disponibles`);
        lots.forEach(lot => {
          console.log(`   - Lot ${lot.batchNumber}: ${lot.quantiteRestante}kg (Article ID: ${lot.articleId})`);
        });
      });
      
      setLotsDisponibles(lotsMap);
    } catch (error) {
      console.error('Erreur lors de la récupération des lots:', error);
    }
  };

  // Initialisation automatique avec pré-remplissage des lots (FIFO)
  const initialiserGestionLots = (itemIndex) => {
    const newItems = [...livraisonItems];
    const item = newItems[itemIndex];
    
    // Auto-expand l'item pour montrer les lots
    setExpandedItems(prev => ({ ...prev, [itemIndex]: true }));
    
    // Pré-remplir automatiquement avec les lots disponibles si pas encore fait
    if (item.distributionLots.length === 0) {
      remplirLotsAutomatiquement(itemIndex);
    }
  };

  // Nouvelle fonction pour remplir automatiquement avec les lots disponibles
  const remplirLotsAutomatiquement = (itemIndex) => {
    const newItems = [...livraisonItems];
    const item = newItems[itemIndex];
    const key = `${item.article._id}-${item.depot._id}`;
    const lotsDisponiblesItem = lotsDisponibles[key] || [];
    
    if (lotsDisponiblesItem.length > 0) {
      let quantiteARePartir = item.quantiteRestante;
      item.distributionLots = [];
      
      // Trier les lots par date d'expiration (FIFO)
      const lotsTries = [...lotsDisponiblesItem].sort((a, b) => {
        if (a.dateExpiration && b.dateExpiration) {
          return new Date(a.dateExpiration) - new Date(b.dateExpiration);
        }
        return 0;
      });
      
      for (const lot of lotsTries) {
        if (quantiteARePartir <= 0) break;
        
        const quantiteAPrelevar = Math.min(quantiteARePartir, lot.quantiteRestante);
        
        item.distributionLots.push({
          lotId: lot.entreeId,
          batchNumber: lot.batchNumber,
          quantite: quantiteAPrelevar,
          quantiteMaximale: lot.quantiteRestante,
          dateExpiration: lot.dateExpiration,
          qualite: lot.qualite
        });
        
        quantiteARePartir -= quantiteAPrelevar;
      }
      
      // Mettre à jour la quantité totale livrée
      item.quantiteLivree = item.distributionLots.reduce((sum, lot) => sum + lot.quantite, 0);
      item.pourLivraison = item.quantiteLivree > 0;
    }
    
    setLivraisonItems(newItems);
    calculateValues(newItems);
  };

  const ajouterLotDistribution = (itemIndex) => {
    const newItems = [...livraisonItems];
    const item = newItems[itemIndex];
    const key = `${item.article._id}-${item.depot._id}`;
    const lotsDisponiblesItem = lotsDisponibles[key] || [];
    
    // Trouver le premier lot non encore utilisé
    const lotsUtilises = item.distributionLots.map(d => d.lotId);
    const lotDisponible = lotsDisponiblesItem.find(lot => !lotsUtilises.includes(lot.entreeId));
    
    if (lotDisponible) {
      const quantiteRestanteADistribuer = item.quantiteRestante - item.distributionLots.reduce((sum, lot) => sum + lot.quantite, 0);
      const quantiteProposee = Math.min(quantiteRestanteADistribuer, lotDisponible.quantiteRestante);
      
      item.distributionLots.push({
        lotId: lotDisponible.entreeId,
        batchNumber: lotDisponible.batchNumber,
        quantite: quantiteProposee,
        quantiteMaximale: lotDisponible.quantiteRestante,
        dateExpiration: lotDisponible.dateExpiration,
        qualite: lotDisponible.qualite
      });
      
      // Recalculer la quantité totale
      item.quantiteLivree = item.distributionLots.reduce((sum, lot) => sum + lot.quantite, 0);
      item.pourLivraison = item.quantiteLivree > 0;
      
      setLivraisonItems(newItems);
      calculateValues(newItems);
    } else {
      alert('Aucun lot supplémentaire disponible pour cet article');
    }
  };

  // Nouvelle fonction pour remplir automatiquement selon la quantité désirée
  const remplirQuantiteOptimale = (itemIndex, quantiteDesire) => {
    const newItems = [...livraisonItems];
    const item = newItems[itemIndex];
    const key = `${item.article._id}-${item.depot._id}`;
    const lotsDisponiblesItem = lotsDisponibles[key] || [];
    
    // Réinitialiser les distributions
    item.distributionLots = [];
    
    // Trier les lots par date d'expiration (FIFO)
    const lotsTries = [...lotsDisponiblesItem].sort((a, b) => {
      if (a.dateExpiration && b.dateExpiration) {
        return new Date(a.dateExpiration) - new Date(b.dateExpiration);
      }
      return 0;
    });
    
    let quantiteARePartir = Math.min(quantiteDesire, item.quantiteRestante);
    
    for (const lot of lotsTries) {
      if (quantiteARePartir <= 0) break;
      
      const quantiteAPrelevar = Math.min(quantiteARePartir, lot.quantiteRestante);
      
      if (quantiteAPrelevar > 0) {
        item.distributionLots.push({
          lotId: lot.entreeId,
          batchNumber: lot.batchNumber,
          quantite: quantiteAPrelevar,
          quantiteMaximale: lot.quantiteRestante,
          dateExpiration: lot.dateExpiration,
          qualite: lot.qualite
        });
        
        quantiteARePartir -= quantiteAPrelevar;
      }
    }
    
    // Mettre à jour la quantité totale livrée
    item.quantiteLivree = item.distributionLots.reduce((sum, lot) => sum + lot.quantite, 0);
    item.pourLivraison = item.quantiteLivree > 0;
    
    setLivraisonItems(newItems);
    calculateValues(newItems);
    
    return quantiteARePartir === 0; // Retourne true si la quantité a pu être entièrement répartie
  };

  const supprimerLotDistribution = (itemIndex, lotIndex) => {
    const newItems = [...livraisonItems];
    const item = newItems[itemIndex];
    
    item.distributionLots.splice(lotIndex, 1);
    
    // Recalculer la quantité totale
    const totalLots = item.distributionLots.reduce((sum, lot) => sum + lot.quantite, 0);
    item.quantiteLivree = totalLots;
    
    setLivraisonItems(newItems);
    calculateValues(newItems);
  };

  const handleDistributionLotChange = (itemIndex, lotIndex, field, value) => {
    const newItems = [...livraisonItems];
    const item = newItems[itemIndex];
    const key = `${item.article._id}-${item.depot._id}`;
    const lotsDisponiblesItem = lotsDisponibles[key] || [];
    
    if (field === 'lotId') {
      // Changement de lot
      const nouveauLot = lotsDisponiblesItem.find(lot => lot.entreeId === value);
      if (nouveauLot) {
        item.distributionLots[lotIndex] = {
          ...item.distributionLots[lotIndex],
          lotId: value,
          batchNumber: nouveauLot.batchNumber,
          quantiteMaximale: nouveauLot.quantiteRestante,
          dateExpiration: nouveauLot.dateExpiration,
          qualite: nouveauLot.qualite,
          // Ajuster la quantité si elle dépasse le maximum du nouveau lot
          quantite: Math.min(item.distributionLots[lotIndex].quantite, nouveauLot.quantiteRestante)
        };
      }
    } else if (field === 'quantite') {
      // Changement de quantité
      const quantite = Math.max(0, parseFloat(value) || 0);
      const quantiteMaximale = item.distributionLots[lotIndex].quantiteMaximale || 0;
      
      item.distributionLots[lotIndex].quantite = Math.min(quantite, quantiteMaximale);
    }
    
    // Recalculer la quantité totale livrée
    const totalDistribue = item.distributionLots.reduce((sum, lot) => sum + lot.quantite, 0);
    item.quantiteLivree = totalDistribue;
    item.pourLivraison = totalDistribue > 0;
    
    // Valider que la distribution ne dépasse pas la quantité restante
    if (totalDistribue > item.quantiteRestante) {
      // Réduire proportionnellement si nécessaire
      const facteurReduction = item.quantiteRestante / totalDistribue;
      item.distributionLots.forEach(lot => {
        lot.quantite = Math.floor(lot.quantite * facteurReduction * 100) / 100; // Arrondir à 2 décimales
      });
      item.quantiteLivree = item.distributionLots.reduce((sum, lot) => sum + lot.quantite, 0);
    }
    
    setLivraisonItems(newItems);
    calculateValues(newItems);
  };

  const handleQuantiteChange = (itemIndex, quantite) => {
    const newItems = [...livraisonItems];
    const item = newItems[itemIndex];
    const stockKey = `${item.article._id}-${item.depot._id}`;
    const stockDisponible = stocks[stockKey]?.quantiteKg || 0; // Utilisation du stock physique
    
    // Limiter la quantité à la quantité restante ET au stock physique disponible
    const maxQuantiteRestante = item.quantiteRestante || 0;
    const maxQuantite = Math.min(maxQuantiteRestante, stockDisponible);
    const quantiteLivree = Math.min(Math.max(0, parseFloat(quantite) || 0), maxQuantite);
    
    item.quantiteLivree = quantiteLivree;
    item.quantiteRestante = (item.quantiteKg || 0) - (item.quantiteDejaLivree || 0) - quantiteLivree;
    item.pourLivraison = quantiteLivree > 0;
    
    setLivraisonItems(newItems);
    calculateValues(newItems);
  };

  const toggleExpandItem = (itemIndex) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemIndex]: !prev[itemIndex]
    }));
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
      const stockDisponible = stocks[stockKey]?.quantiteKg || 0; // Utilisation du stock physique
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

  // NOUVELLE FONCTION: Validation avant envoi pour éviter l'erreur CHINCHARD
  const validerCompatibiliteLots = (itemsALivrer) => {
    const erreurs = [];
    
    itemsALivrer.forEach(item => {
      const key = `${item.article._id}-${item.depot._id}`;
      const lotsDisponiblesItem = lotsDisponibles[key] || [];
      
      item.distributionLots.forEach(lotDistrib => {
        // Vérifier que le lot sélectionné est bien dans la liste des lots disponibles pour cet article
        const lotValide = lotsDisponiblesItem.find(lot => 
          lot.entreeId === lotDistrib.lotId && 
          lot.articleId === item.article._id
        );
        
        if (!lotValide) {
          erreurs.push({
            article: item.article.intitule || item.article.reference,
            articleId: item.article._id,
            batchNumber: lotDistrib.batchNumber,
            lotId: lotDistrib.lotId,
            suggestion: lotsDisponiblesItem.length > 0 
              ? `Utilisez plutôt: ${lotsDisponiblesItem.map(l => l.batchNumber).join(', ')}`
              : 'Aucun lot disponible pour cet article'
          });
        }
      });
    });
    
    return erreurs;
  };

  const handleConfirmerLivraison = async () => {
    setLoading(true);
    try {
      const itemsALivrer = livraisonItems.filter(item => item.pourLivraison && item.quantiteLivree > 0);
      
      if (itemsALivrer.length === 0) {
        alert('❌ Aucun article sélectionné pour la livraison');
        setLoading(false);
        return;
      }

      // NOUVELLE VALIDATION: Vérifier la compatibilité des lots AVANT l'envoi
      const erreursCompatibilite = validerCompatibiliteLots(itemsALivrer);
      if (erreursCompatibilite.length > 0) {
        let messageErreur = '❌ Incompatibilité détectée entre articles et lots !\n\n';
        erreursCompatibilite.forEach(erreur => {
          messageErreur += `• ${erreur.article}: Le lot ${erreur.batchNumber} ne contient pas cet article\n`;
          messageErreur += `  ${erreur.suggestion}\n\n`;
        });
        messageErreur += '💡 Conseil: Utilisez uniquement les lots affichés dans la liste pour chaque article.';
        
        alert(messageErreur);
        setLoading(false);
        return;
      }

      // Validation obligatoire des lots
      const itemsSansLots = itemsALivrer.filter(item => 
        !item.distributionLots || item.distributionLots.length === 0
      );
      
      if (itemsSansLots.length > 0) {
        const articlesString = itemsSansLots.map(item => 
          `• ${item.article.intitule}`
        ).join('\n');
        
        alert(`❌ Gestion des lots obligatoire !\n\nLes articles suivants n'ont pas de lots configurés :\n${articlesString}\n\nVeuillez spécifier les lots d'origine pour chaque article avant de confirmer la livraison.`);
        setLoading(false);
        return;
      }

      // Validation des quantités
      const itemsQuantitesIncorrectes = itemsALivrer.filter(item => {
        const totalLots = item.distributionLots.reduce((sum, lot) => sum + lot.quantite, 0);
        return Math.abs(totalLots - item.quantiteLivree) > 0.01; // Tolérance de 0.01kg
      });

      if (itemsQuantitesIncorrectes.length > 0) {
        const detailsString = itemsQuantitesIncorrectes.map(item => {
          const totalLots = item.distributionLots.reduce((sum, lot) => sum + lot.quantite, 0);
          return `• ${item.article.intitule}: ${totalLots}kg dans lots ≠ ${item.quantiteLivree}kg à livrer`;
        }).join('\n');
        
        alert(`❌ Incohérence dans les quantités !\n\n${detailsString}\n\nVeuillez corriger les quantités dans les lots.`);
        setLoading(false);
        return;
      }

      // Préparer les données pour l'API de livraison partielle - TOUJOURS avec lots
      const livraisonData = {
        itemsALivrer: itemsALivrer.map(item => ({
          itemId: item._id,
          // IMPORTANT: Envoyer les IDs d'article et de dépôt explicitement
          articleId: item.article._id || item.article,
          depotId: item.depot._id || item.depot,
          quantiteLivree: item.quantiteLivree,
          // Les lots sont maintenant obligatoires
          distributionLots: item.distributionLots.map(lot => ({
            lotId: lot.lotId,
            batchNumber: lot.batchNumber,
            quantite: lot.quantite
          }))
        }))
      };

      console.log('🚚 Données de livraison avec lots obligatoires:', livraisonData);

      // Effectuer la livraison partielle via l'endpoint dédié
      const response = await axios.post(`/commandes/${commande._id}/livraison-partielle`, livraisonData);
      
      const { commandeLivree, commandeOriginale, resume } = response.data;
      
      // Afficher un message de succès avec détails des lots
      let successMessage = `✅ Livraison partielle effectuée avec succès!\nRéférence: ${resume.referenceLivraison}\nQuantité livrée: ${resume.quantiteLivree} kg`;
      
      successMessage += '\n\n📦 Distribution par lots:';
      itemsALivrer.forEach(item => {
        successMessage += `\n• ${item.article.intitule}:`;
        item.distributionLots.forEach(lot => {
          successMessage += `\n  - Lot ${lot.batchNumber}: ${lot.quantite} kg`;
        });
      });
      
      alert(successMessage);

      // Fermer le modal et actualiser les données
      if (onLivraisonCreated) onLivraisonCreated();
      onClose();
    } catch (error) {
      console.error('Erreur lors de la livraison:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Erreur lors de la livraison';
      alert(`❌ Erreur: ${errorMessage}`);
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

      // Pour le moment, afficher un message informatif
      alert('📄 Génération PDF : Cette fonctionnalité sera disponible après la livraison confirmée.\n\nUtilisez "Confirmer la livraison" pour générer automatiquement tous les documents nécessaires.');
      
    } catch (error) {
      console.error('Erreur lors de la préparation PDF:', error);
      alert('❌ Erreur lors de la préparation du PDF: ' + error.message);
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
          {/* Message d'avertissement pour les commandes incomplètes */}
          {!isCommandeComplete() && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-red-900 mb-2">
                    Commande incomplète - Livraison impossible
                  </h3>
                  <div className="text-sm text-red-800">
                    <p className="mb-2">
                      Cette commande ne peut pas être livrée car elle est incomplète. 
                      Statut actuel : <span className="font-semibold">{commande.statutBonDeCommande}</span>
                    </p>
                    <div className="mt-3">
                      <p className="font-semibold mb-1">Articles manquants :</p>
                      <ul className="list-disc pl-5 space-y-1">
                        {getArticlesManquants().map((item, index) => (
                          <li key={index}>
                            {item.article?.reference} - {item.article?.intitule} : 
                            <span className="font-semibold text-red-900"> {item.quantiteManquante} kg manquants</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className="mt-3 font-medium">
                      Veuillez d'abord compléter la commande avant de procéder à la livraison.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Message explicatif pour la gestion obligatoire des lots - uniquement si commande complète */}
          {isCommandeComplete() && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <TruckIcon className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Gestion obligatoire des lots pour livraison partielle</h3>
                  <div className="text-sm text-blue-800 space-y-2">
                    <p><strong>• Sélection des lots :</strong> Vous devez spécifier précisément les lots d'où proviennent les quantités livrées.</p>
                    <p><strong>• Exemple :</strong> Pour une commande de 300kg de sardines, spécifiez 40kg du Lot 30303 + 260kg du Lot 04993.</p>
                    <p><strong>• Traçabilité complète :</strong> Chaque kg livré est tracé jusqu'à son lot d'origine avec déduction automatique.</p>
                    <p className="text-blue-600 font-medium">
                      <InformationCircleIcon className="h-4 w-4 inline mr-1" />
                      Les quantités seront automatiquement déduites des lots sélectionnés lors de la confirmation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Résumé des calculs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
            {/* <div className="bg-gray-50 p-4 rounded-lg">
              <Button
                variant="info"
                size="sm"
                onClick={handleLivrerTout}
                className="w-full"
                icon={<CheckIcon className="h-4 w-4" />}
              >
                Livrer tout le possible
              </Button>
            </div> */}
          </div>

          {/* Table des articles avec gestion avancée des lots - désactivée si commande incomplète */}
          <div className={`overflow-x-auto ${!isCommandeComplete() ? 'opacity-50 pointer-events-none' : ''}`}>
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
                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-900">
                    Gestion lots
                  </th>
                </tr>
              </thead>
              <tbody>
                {livraisonItems.map((item, index) => {
                  const stockStatus = getStockStatus(item);
                  const key = `${item.article._id}-${item.depot._id}`;
                  const lotsDisponiblesItem = lotsDisponibles[key] || [];
                  const isExpanded = expandedItems[index];
                  
                  return (
                    <React.Fragment key={index}>
                      <tr className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-3">
                          <div className="flex items-center justify-between">
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
                              {item.quantiteDejaLivree > 0 && (
                                <p className="text-xs text-orange-600 mt-1">
                                  Déjà livré: {formatNumberFunc(item.quantiteDejaLivree)} kg
                                </p>
                              )}
                            </div>
                            {lotsDisponiblesItem.length > 0 && (
                              <button
                                onClick={() => toggleExpandItem(index)}
                                className="text-blue-600 hover:text-blue-800 focus:outline-none"
                              >
                                <CubeIcon className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            )}
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
                          {lotsDisponiblesItem.length > 0 && (
                            <p className="text-xs text-blue-600 mt-1">
                              {lotsDisponiblesItem.length} lot(s) disponible(s)
                            </p>
                          )}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center">
                          <div className="text-center">
                            <p className="font-medium text-blue-600">{formatNumberFunc(item.quantiteLivree)} kg</p>
                            <p className="text-xs text-blue-600">Via {item.distributionLots.length} lot(s)</p>
                            {item.quantiteLivree === 0 && (
                              <p className="text-xs text-red-600 mt-1">⚠️ Aucun lot configuré</p>
                            )}
                          </div>
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
                        <td className="border border-gray-300 px-4 py-3 text-center">
                          {lotsDisponiblesItem.length > 0 ? (
                            <div className="space-y-2">
                              <button
                                onClick={() => initialiserGestionLots(index)}
                                className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                                title="Configurer les lots pour cette livraison"
                              >
                                <CubeIcon className="h-3 w-3 inline mr-1" />
                                Lots obligatoires
                              </button>
                              {/* <button
                                onClick={() => ajouterLotDistribution(index)}
                                className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                                title="Ajouter un lot"
                              >
                                + Lot
                              </button> */}
                            </div>
                          ) : (
                            <div className="text-xs text-red-400">
                              <InformationCircleIcon className="h-4 w-4 mx-auto mb-1" />
                              Aucun lot disponible
                            </div>
                          )}
                        </td>
                      </tr>
                      
                      {/* Ligne expandable pour l'affichage des lots disponibles - Toujours visible */}
                      {isExpanded && lotsDisponiblesItem.length > 0 && (
                        <tr className="bg-green-50">
                          <td colSpan="7" className="border border-gray-300 px-4 py-4">
                            <div className="bg-white rounded-lg p-4 border border-green-200">
                              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                                <CubeIcon className="h-5 w-5 mr-2 text-green-600" />
                                Lots disponibles pour {item.article?.intitule}
                                <span className="ml-4 px-3 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                  Gestion obligatoire
                                </span>
                              </h4>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {lotsDisponiblesItem.map((lot, lotIdx) => (
                                  <div key={lotIdx} className="p-3 bg-gray-50 rounded border border-gray-200">
                                    <div className="flex justify-between items-start mb-2">
                                      <h5 className="font-medium text-gray-900 text-sm">
                                        Lot {lot.batchNumber}
                                      </h5>
                                      <span className={`px-2 py-1 text-xs rounded-full ${
                                        lot.quantiteRestante > 0 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-red-100 text-red-800'
                                      }`}>
                                        {formatNumberFunc(lot.quantiteRestante)} kg
                                      </span>
                                    </div>
                                    
                                    <div className="space-y-1 text-xs text-gray-600">
                                      {lot.dateProduction && (
                                        <div>
                                          <span className="font-medium">Production:</span> {new Date(lot.dateProduction).toLocaleDateString('fr-FR')}
                                        </div>
                                      )}
                                      {lot.dateExpiration && (
                                        <div>
                                          <span className="font-medium">Expiration:</span> {new Date(lot.dateExpiration).toLocaleDateString('fr-FR')}
                                        </div>
                                      )}
                                      <div>
                                        <span className="font-medium">Qualité:</span> {lot.qualite}
                                      </div>
                                    </div>
                                    
                                    {lot.quantiteRestante > 0 && (
                                      <button
                                        onClick={() => {
                                          // Ajouter automatiquement ce lot avec une quantité suggérée
                                          const quantiteSuggérée = Math.min(
                                            item.quantiteRestante - item.quantiteLivree, 
                                            lot.quantiteRestante
                                          );
                                          if (quantiteSuggérée > 0) {
                                            const newItems = [...livraisonItems];
                                            const currentItem = newItems[index];
                                            const existingLot = currentItem.distributionLots.find(d => d.lotId === lot.entreeId);
                                            
                                            if (!existingLot) {
                                              currentItem.distributionLots.push({
                                                lotId: lot.entreeId,
                                                batchNumber: lot.batchNumber,
                                                quantite: quantiteSuggérée,
                                                quantiteMaximale: lot.quantiteRestante,
                                                dateExpiration: lot.dateExpiration,
                                                qualite: lot.qualite
                                              });
                                              currentItem.quantiteLivree = currentItem.distributionLots.reduce((sum, l) => sum + l.quantite, 0);
                                              currentItem.pourLivraison = currentItem.quantiteLivree > 0;
                                              setLivraisonItems(newItems);
                                              calculateValues(newItems);
                                            }
                                          }
                                        }}
                                        className="mt-2 w-full px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                                      >
                                        Utiliser ce lot
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                              
                              <div className="mt-4 p-3 bg-red-50 rounded border border-red-200">
                                <div className="text-sm text-red-800">
                                  <p className="font-medium mb-1">⚠️ Gestion des lots obligatoire :</p>
                                  <p>Vous devez obligatoirement sélectionner les lots d'où proviennent les {formatNumberFunc(item.quantiteRestante)} kg à livrer.</p>
                                  <p className="text-xs mt-1">Exemple : 40kg du Lot 30303 + 260kg du Lot 04993 = 300kg total</p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      
                      {/* Ligne expandable pour la gestion détaillée des lots - Toujours visible */}
                      {isExpanded && (
                        <tr className="bg-blue-50">
                          <td colSpan="7" className="border border-gray-300 px-4 py-4">
                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                                <CubeIcon className="h-5 w-5 mr-2 text-blue-600" />
                                Distribution par lots pour {item.article?.intitule}
                              </h4>
                              
                              <div className="space-y-3">
                                {item.distributionLots.map((lotDistrib, lotIndex) => {
                                  const lotInfo = lotsDisponiblesItem.find(l => l.entreeId === lotDistrib.lotId);
                                  return (
                                    <div key={lotIndex} className="grid grid-cols-12 gap-2 items-center p-3 bg-gray-50 rounded border border-gray-200">
                                      <div className="col-span-4">
                                        <label className="block text-xs text-gray-600 mb-1">Lot disponible</label>
                                        <select
                                          value={lotDistrib.lotId}
                                          onChange={(e) => handleDistributionLotChange(index, lotIndex, 'lotId', e.target.value)}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                        >
                                          <option value="">-- Sélectionner un lot --</option>
                                          {lotsDisponiblesItem.map(lot => {
                                            const isUsed = item.distributionLots.some((d, i) => d.lotId === lot.entreeId && i !== lotIndex);
                                            return (
                                              <option 
                                                key={lot.entreeId} 
                                                value={lot.entreeId}
                                                disabled={isUsed}
                                              >
                                                {lot.batchNumber} ({formatNumberFunc(lot.quantiteRestante)} kg) {isUsed ? '- Déjà utilisé' : ''}
                                              </option>
                                            );
                                          })}
                                        </select>
                                        {lotInfo && (
                                          <div className="text-xs text-gray-600 mt-1">
                                            {lotInfo.dateExpiration && (
                                              <div>Exp: {new Date(lotInfo.dateExpiration).toLocaleDateString('fr-FR')}</div>
                                            )}
                                            <div>Qualité: {lotInfo.qualite}</div>
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="col-span-2">
                                        <label className="block text-xs text-gray-600 mb-1">Quantité à prélever</label>
                                        <input
                                          type="number"
                                          min="0"
                                          max={lotDistrib.quantiteMaximale}
                                          step="0.01"
                                          value={lotDistrib.quantite}
                                          onChange={(e) => handleDistributionLotChange(index, lotIndex, 'quantite', e.target.value)}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                          placeholder="0.00"
                                        />
                                        <div className="text-xs text-gray-500 mt-1">kg</div>
                                      </div>
                                      
                                      <div className="col-span-2">
                                        <label className="block text-xs text-gray-600 mb-1">Stock disponible</label>
                                        <p className="text-sm text-gray-700 font-medium">
                                          {formatNumberFunc(lotDistrib.quantiteMaximale)} kg
                                        </p>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                          <div 
                                            className="bg-blue-600 h-1.5 rounded-full" 
                                            style={{ 
                                              width: `${Math.min(100, (lotDistrib.quantite / lotDistrib.quantiteMaximale) * 100)}%` 
                                            }}
                                          ></div>
                                        </div>
                                      </div>
                                      
                                      <div className="col-span-3">
                                        <label className="block text-xs text-gray-600 mb-1">Informations du lot</label>
                                        <div className="text-xs text-gray-600 space-y-0.5">
                                          <div className="font-medium">{lotDistrib.batchNumber || 'N/A'}</div>
                                          {lotInfo?.dateProduction && (
                                            <div>Prod: {new Date(lotInfo.dateProduction).toLocaleDateString('fr-FR')}</div>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <div className="col-span-1">
                                        <button
                                          onClick={() => supprimerLotDistribution(index, lotIndex)}
                                          className="w-full px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                                          title="Supprimer ce lot"
                                        >
                                          <XMarkIcon className="h-4 w-4 mx-auto" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                                
                                {item.distributionLots.length === 0 && (
                                  <div className="text-center py-6 text-gray-500">
                                    <CubeIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                                    <p className="text-sm font-medium">Aucun lot configuré</p>
                                    <p className="text-xs mb-3">Commencez par ajouter un lot pour distribuer vos quantités</p>
                                    <button
                                      onClick={() => ajouterLotDistribution(index)}
                                      className="px-4 py-2 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                                    >
                                      + Ajouter le premier lot
                                    </button>
                                  </div>
                                )}
                                
                                {item.distributionLots.length > 0 && (
                                  <div className="flex justify-between items-center">
                                    <button
                                      onClick={() => ajouterLotDistribution(index)}
                                      className="px-3 py-2 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200"
                                      disabled={item.distributionLots.length >= lotsDisponiblesItem.length}
                                    >
                                      + Ajouter un lot
                                    </button>
                                    
                                    {/* <button
                                      onClick={() => remplirQuantiteOptimale(index, item.quantiteRestante)}
                                      className="px-3 py-2 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                                    >
                                      🎯 Remplir automatiquement (FIFO)
                                    </button> */}
                                  </div>
                                )}
                                
                                <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-blue-800">Total distribué:</span>
                                        <span className="font-medium text-blue-900">
                                          {formatNumberFunc(item.distributionLots.reduce((sum, lot) => sum + lot.quantite, 0))} kg
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center mt-1">
                                        <span className="text-blue-800">Restant à distribuer:</span>
                                        <span className={`font-medium ${
                                          (item.quantiteRestante - item.distributionLots.reduce((sum, lot) => sum + lot.quantite, 0)) > 0 
                                            ? 'text-orange-900' 
                                            : 'text-green-900'
                                        }`}>
                                          {formatNumberFunc(Math.max(0, item.quantiteRestante - item.distributionLots.reduce((sum, lot) => sum + lot.quantite, 0)))} kg
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-blue-800">Quantité demandée:</span>
                                        <span className="font-medium text-blue-900">
                                          {formatNumberFunc(item.quantiteRestante)} kg
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center mt-1">
                                        <span className="text-blue-800">Progression:</span>
                                        <span className="font-medium text-blue-900">
                                          {Math.round((item.distributionLots.reduce((sum, lot) => sum + lot.quantite, 0) / item.quantiteRestante) * 100)}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full transition-all duration-300 ${
                                        (item.distributionLots.reduce((sum, lot) => sum + lot.quantite, 0) / item.quantiteRestante) >= 1
                                          ? 'bg-green-600' 
                                          : 'bg-blue-600'
                                      }`}
                                      style={{ 
                                        width: `${Math.min(100, (item.distributionLots.reduce((sum, lot) => sum + lot.quantite, 0) / item.quantiteRestante) * 100)}%` 
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center text-sm text-gray-600">
              {isCommandeComplete() ? (
                <>
                  <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-yellow-500" />
                  Les documents seront générés automatiquement pour la livraison
                </>
              ) : (
                <>
                  <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-red-500" />
                  Commande incomplète - Livraison bloquée
                </>
              )}
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
                disabled={!isCommandeComplete() || livraisonItems.filter(item => item.pourLivraison).length === 0}
                title={!isCommandeComplete() ? "Commande incomplète" : "Aperçu PDF"}
              >
                Aperçu PDF
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmerLivraison}
                icon={loading ? 'loading' : <CheckIcon className="h-5 w-5" />}
                disabled={loading || !isCommandeComplete()}
                title={!isCommandeComplete() ? "Impossible de livrer une commande incomplète" : "Confirmer la livraison"}
              >
                {loading ? 'Confirmation en cours...' : 'Confirmer la livraison'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LivraisonPartielleModal;
