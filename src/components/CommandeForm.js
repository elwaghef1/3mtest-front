// frontend/src/components/CommandeForm.js
import React, { useEffect, useState, useMemo } from 'react';
import axios from '../api/axios';
import Button from './Button';
import { useNavigate, useParams } from 'react-router-dom';

// Pour la liste des pays en français
import i18nIsoCountries from 'i18n-iso-countries';
import frLocale from 'i18n-iso-countries/langs/fr.json';

// On importe nos fonctions d'export PDF
import {
  generateInvoicePDF,
  generatePackingListPDF,
  generateBonDeCommandePDF,
  generateProformaInvoicePDF
} from './pdfGenerators';

i18nIsoCountries.registerLocale(frLocale);

const CommandeForm = ({ onClose, onCommandeCreated, initialCommande: propInitialCommande }) => {
  const navigate = useNavigate();
  const { id } = useParams(); // Pour récupérer l'ID depuis l'URL
  const [initialCommande, setInitialCommande] = useState(propInitialCommande);
  // Préparation de la liste des pays (en français)
  const countries = useMemo(() => {
    const countriesObj = i18nIsoCountries.getNames('fr', { select: 'official' });
    return Object.entries(countriesObj).map(([code, name]) => ({
      value: code,
      label: name
    }));
  }, []);

  const defaultConditions = "Packing: 20 kg per carton\nOrigin: Mauritania\nPayment Terms: 100% CAD TT\nIncoterms: FOB Nouadhibou – Mauritania";

  // État initial du formulaire
  const [formData, setFormData] = useState({
    reference: '',
    typeCommande: 'NORMALE', // Nouveau champ
    numeroBooking: '',
    cargo: [{ nom: '', noDeConteneur: '', areDeConteneur: '', poidsCarton: '', noPlomb: '' }], // Modifié pour accepter un tableau de cargos avec informations conteneur
    noBonDeCommande: '',
    client: '',
    statutBonDeCommande: 'EN_COURS', // EN_COURS ou LIVREE
    statutDePaiement: 'NON_PAYE',    // Calculé automatiquement
    montantPaye: '',
    currency: 'EUR', // Sera mis à jour automatiquement selon le type
    numeroOP: '',
    destination: '',
    datePrevueDeChargement: '',
    // Champs complémentaires sous forme de drop list
    draftHC: 'ETABLIE',
    facture: 'ETABLIE',
    packingList: 'ETABLIE',
    draftCO: 'ETABLIE',
    vgm: 'ETABLIE',
    dhl: 'ETABLIE',
    // Nouveaux champs facultatifs
    responsableDeStockInforme: 'NON',
    inspecteurInforme: 'NON',
    // Champs pour charges locales (affichés uniquement en LIVREE)
    factureManutention: 'NON_PAYE',
    factureCargo: 'NON_PAYE',
    taxeZoneFranche: 'NON_PAYE',
    etiquette: 'ETABLIE',
    declaration: 'ETABLIE',
    // Total global calculé automatiquement
    prixTotal: 0,
    // Nouveau champ pour la banque (référence à BankAccount)
    bank: '',
    conditionsDeVente: defaultConditions
  });

  // Items de la commande
  const [items, setItems] = useState([
    {
      article: '',
      depot: '',
      quantiteKg: '',
      prixUnitaire: '',
      quantiteCarton: 0,
      prixTotal: 0
      // Note: Suppression des champs de lots pour simplifier la création de commande
    }
  ]);

  // Données de référence
  const [clients, setClients] = useState([]);
  const [banks, setBanks] = useState([]);
  const [articles, setArticles] = useState([]);
  const [depots, setDepots] = useState([]);
  const [stocks, setStocks] = useState([]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Effet pour charger la commande si on est en mode édition via URL
  useEffect(() => {
    const loadCommandeFromUrl = async () => {
      if (id && !propInitialCommande) {
        try {
          const response = await axios.get(`/commandes/${id}`);
          setInitialCommande(response.data);
        } catch (error) {
          console.error('Erreur lors du chargement de la commande:', error);
          // Rediriger vers la liste si la commande n'existe pas
          navigate('/commandes');
        }
      }
    };

    loadCommandeFromUrl();
  }, [id, propInitialCommande, navigate]);

  // Fonction utilitaire pour générer la classe d'un input/select
  const getInputClass = (value, additionalClasses = '') => {
    return `p-2 border-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      value === '' ? 'border-red-500' : 'border-gray-300'
    } ${additionalClasses}`;
  };

  // Préremplissage en cas d'édition
  useEffect(() => {
    if (initialCommande) {
      console.log('Initial commande typeCommande:', initialCommande.typeCommande); // Debug log
      setFormData({
        reference: initialCommande.reference || '',
        typeCommande: initialCommande.typeCommande || 'NORMALE',
        numeroBooking: initialCommande.typeCommande === 'LOCALE' ? '' : (initialCommande.numeroBooking || ''),
        cargo: Array.isArray(initialCommande.cargo) 
          ? (initialCommande.cargo.length > 0 
              ? initialCommande.cargo.map(cargoItem => 
                  typeof cargoItem === 'string' 
                    ? { nom: cargoItem, noDeConteneur: '', areDeConteneur: '', poidsCarton: '', noPlomb: '' }
                    : { nom: cargoItem.nom || '', noDeConteneur: cargoItem.noDeConteneur || '', areDeConteneur: cargoItem.areDeConteneur || '', poidsCarton: cargoItem.poidsCarton || '', noPlomb: cargoItem.noPlomb || '' }
                )
              : [{ nom: '', noDeConteneur: '', areDeConteneur: '', poidsCarton: '', noPlomb: '' }])
          : (initialCommande.cargo 
              ? [{ nom: initialCommande.cargo, noDeConteneur: initialCommande.noDeConteneur || '', areDeConteneur: initialCommande.areDeConteneur || '', poidsCarton: initialCommande.poidsCarton || '', noPlomb: initialCommande.noPlomb || '' }] 
              : [{ nom: '', noDeConteneur: '', areDeConteneur: '', poidsCarton: '', noPlomb: '' }]),
        noBonDeCommande: initialCommande.noBonDeCommande || '',
        client: initialCommande.client?._id || '',
        bank: initialCommande.bank?._id || '',
        statutBonDeCommande: initialCommande.statutBonDeCommande || 'EN_COURS',
        statutDePaiement: initialCommande.statutDePaiement || 'NON_PAYE',
        montantPaye: initialCommande.montantPaye || '',
        currency: initialCommande.currency || (initialCommande.typeCommande === 'LOCALE' ? 'MRU' : 'EUR'),
        numeroOP: initialCommande.typeCommande === 'LOCALE' ? '' : (initialCommande.numeroOP || ''),
        destination: initialCommande.typeCommande === 'LOCALE' ? '' : (initialCommande.destination || ''),
        datePrevueDeChargement: initialCommande.datePrevueDeChargement 
          ? new Date(initialCommande.datePrevueDeChargement).toISOString().slice(0, 10)
          : '',
        draftHC: initialCommande.draftHC || 'ETABLIE',
        facture: initialCommande.facture || 'ETABLIE',
        packingList: initialCommande.packingList || 'ETABLIE',
        draftCO: initialCommande.draftCO || 'ETABLIE',
        vgm: initialCommande.vgm || 'ETABLIE',
        dhl: initialCommande.dhl || 'ETABLIE',
        responsableDeStockInforme: initialCommande.responsableDeStockInforme || 'NON',
        inspecteurInforme: initialCommande.inspecteurInforme || 'NON',
        factureManutention: initialCommande.typeCommande === 'LOCALE' ? 'NON_PAYE' : (initialCommande.factureManutention || 'NON_PAYE'),
        factureCargo: initialCommande.typeCommande === 'LOCALE' ? 'NON_PAYE' : (initialCommande.factureCargo || 'NON_PAYE'),
        taxeZoneFranche: initialCommande.typeCommande === 'LOCALE' ? 'NON_PAYE' : (initialCommande.taxeZoneFranche || 'NON_PAYE'),
        etiquette: initialCommande.etiquette || 'ETABLIE',
        declaration: initialCommande.declaration || 'ETABLIE',
        prixTotal: initialCommande.prixTotal || 0,
        conditionsDeVente: initialCommande.conditionsDeVente || defaultConditions
      });
      setItems(
        (initialCommande.items || []).map(item => ({
          article: item.article?._id || '',
          depot: item.depot?._id || '',
          quantiteKg: item.quantiteKg || '',
          prixUnitaire: item.prixUnitaire || '',
          quantiteCarton: item.quantiteCarton || 0,
          prixTotal: item.prixTotal || 0,
          // Conserver les données de stock pour l'affichage
          quantiteAllouee: item.quantiteAllouee || 0,
          quantiteManquante: item.quantiteManquante || 0,
          statutStock: item.statutStock || ''
          // Note: selectedLot supprimé - gestion des lots lors de la livraison
        }))
      );
    }
  }, [initialCommande, defaultConditions]);

  // Note: L'effet pour charger les lots a été supprimé car la gestion des lots
  // se fait maintenant lors de la livraison via LivraisonPartielleModal

  // S'assurer qu'il y a toujours au moins un cargo
  useEffect(() => {
    if (formData.cargo.length === 0) {
      setFormData(prev => ({
        ...prev,
        cargo: [{ nom: '', noDeConteneur: '', areDeConteneur: '', poidsCarton: '', noPlomb: '' }]
      }));
    }
  }, [formData.cargo]);

  // Chargement des données de référence
  useEffect(() => {
    fetchClients();
    fetchArticles();
    fetchDepots();
    fetchStocks();
    fetchBanks()
  }, []);

  const fetchBanks = async () => {
    try {
      const res = await axios.get('/bankaccounts');
      setBanks(res.data);
    } catch (error) {
      console.error('Erreur chargement banques:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await axios.get('/clients');
      setClients(res.data);
    } catch (error) {
      console.error('Erreur chargement clients:', error);
    }
  };

  const fetchArticles = async () => {
    try {
      const res = await axios.get('/articles');
      setArticles(res.data);
    } catch (error) {
      console.error('Erreur chargement articles:', error);
    }
  };

  const fetchDepots = async () => {
    try {
      const res = await axios.get('/depots');
      setDepots(res.data);
    } catch (error) {
      console.error('Erreur chargement dépôts:', error);
    }
  };

  const fetchStocks = async () => {
    try {
      const res = await axios.get('/stock');
      setStocks(res.data);
    } catch (error) {
      console.error('Erreur chargement stocks:', error);
    }
  };

  // Retourne la quantité commercialisable d’un article dans un dépôt donné
  const getQuantiteInDepot = (articleId, depotId) => {
    if (!articleId || !depotId) return null;
    const found = stocks.find(
      (s) => s.article?._id === articleId && s.depot?._id === depotId
    );
    return found ? found.quantiteCommercialisableKg : 0;
  };

  // Note: La gestion des lots a été supprimée de la création de commande
  // Les lots seront gérés lors de la livraison via LivraisonPartielleModal

  // Mise à jour d’un item
  const updateItem = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;
    if (field === 'quantiteKg' || field === 'prixUnitaire') {
      const quantiteKg = parseFloat(updatedItems[index].quantiteKg) || 0;
      const prixUnitaire = parseFloat(updatedItems[index].prixUnitaire) || 0;
      updatedItems[index].quantiteCarton = quantiteKg / 20;
      updatedItems[index].prixTotal = prixUnitaire * quantiteKg;
    }
    // Note: La gestion des lots a été supprimée lors de la création de commande
    setItems(updatedItems);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        article: '',
        depot: '',
        quantiteKg: '',
        prixUnitaire: '',
        quantiteCarton: 0,
        prixTotal: 0,
        availableLots: [],
        selectedLot: ''
      }
    ]);
  };

  const removeItem = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  // Gestion des cargos multiples
  const addCargo = () => {
    setFormData({
      ...formData,
      cargo: [...formData.cargo, { nom: '', noDeConteneur: '', areDeConteneur: '', poidsCarton: '', noPlomb: '' }]
    });
  };

  const removeCargo = (index) => {
    const updatedCargos = formData.cargo.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      cargo: updatedCargos
    });
  };

  const updateCargo = (index, field, value) => {
    const updatedCargos = [...formData.cargo];
    updatedCargos[index] = { ...updatedCargos[index], [field]: value };
    setFormData({
      ...formData,
      cargo: updatedCargos
    });
  };

  // Gestion du changement du champ Banque (on stocke l'ID sélectionné)
  const handleBankChange = (e) => {
    const bankId = e.target.value;
    setFormData({ ...formData, bank: bankId });
  };

  // Mise à jour du formData pour les autres champs
  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedData = { ...formData, [name]: value };
    
    // Gestion spéciale pour le type de commande (seulement en création)
    if (name === 'typeCommande' && !initialCommande) {
      // Changer automatiquement la monnaie selon le type
      updatedData.currency = value === 'LOCALE' ? 'MRU' : 'EUR';
      
      // Réinitialiser les champs d'export si on passe en locale
      if (value === 'LOCALE') {
        updatedData.numeroBooking = '';
        updatedData.destination = '';
        updatedData.numeroOP = '';
        updatedData.noBonDeCommande = '';
        updatedData.responsableDeStockInforme = 'NON';
        updatedData.inspecteurInforme = 'NON';
        updatedData.declaration = 'ETABLIE';
      }
    }
    
    if (name === 'statutBonDeCommande' && value === 'LIVREE') {
      const today = new Date().toISOString().slice(0, 10);
      updatedData.datePrevueDeChargement = today;
    }
    setFormData(updatedData);
  };

  // Effet pour gérer automatiquement la monnaie selon le type de commande (seulement en création)
  useEffect(() => {
    // Ne changer la monnaie automatiquement que lors de la création (pas en édition)
    if (!initialCommande) {
      if (formData.typeCommande === 'LOCALE' && formData.currency !== 'MRU') {
        setFormData(prev => ({
          ...prev,
          currency: 'MRU'
        }));
      } else if (formData.typeCommande === 'NORMALE' && formData.currency === 'MRU') {
        setFormData(prev => ({
          ...prev,
          currency: 'EUR'
        }));
      }
    }
  }, [formData.typeCommande, initialCommande]);

  // Recalcul automatique du total et du statut de paiement
  useEffect(() => {
    const newPrixTotal = items.reduce((sum, item) => sum + (parseFloat(item.prixTotal) || 0), 0);
    const montantPaye = parseFloat(formData.montantPaye) || 0;
    let newStatut = 'NON_PAYE';
    if (newPrixTotal > 0) {
      if (montantPaye >= newPrixTotal) {
        newStatut = 'PAYE';
      } else if (montantPaye > 0 && montantPaye < newPrixTotal) {
        newStatut = 'PARTIELLEMENT_PAYE';
      }
    }
    setFormData(prev => ({
      ...prev,
      prixTotal: newPrixTotal,
      statutDePaiement: newStatut
    }));
  }, [items, formData.montantPaye]);

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    
    // Validation supplémentaire pour les commandes non locales
    if (formData.typeCommande !== 'LOCALE') {
      if (!formData.destination) {
        setErrorMessage('La destination est obligatoire pour les commandes export');
        setLoading(false);
        return;
      }
    }
    
    try {
      const payload = {
        ...formData,
        typeCommande: formData.typeCommande || 'NORMALE', // Valeur par défaut explicite
        montantPaye: parseFloat(formData.montantPaye) || 0,
        prixTotal: parseFloat(formData.prixTotal) || 0,
        bank: formData.bank,
        items: items.map(item => ({
          article: item.article,
          depot: item.depot,
          quantiteKg: parseFloat(item.quantiteKg) || 0,
          quantiteCarton: parseFloat(item.quantiteCarton) || 0,
          prixUnitaire: parseFloat(item.prixUnitaire) || 0,
          prixTotal: parseFloat(item.prixTotal) || 0
          // Note: selectedLot supprimé - gestion des lots lors de la livraison
        })),
      };

      // Nettoyer les champs non nécessaires pour les commandes locales
      if (payload.typeCommande === 'LOCALE') {
        payload.numeroBooking = null;
        payload.destination = null;
        payload.numeroOP = null;
        payload.factureManutention = null;
        payload.factureCargo = null;
        payload.taxeZoneFranche = null;
      }

      console.log('Payload envoyé:', { 
        typeCommande: payload.typeCommande,
        reference: payload.reference,
        isLocal: payload.typeCommande === 'LOCALE'
      });

      let response;
      if (initialCommande) {
        response = await axios.put(`/commandes/${initialCommande._id}`, payload);
      } else {
        response = await axios.post('/commandes', payload);
      }
      
      console.log('Réponse du serveur:', {
        typeCommande: response.data.typeCommande,
        reference: response.data.reference
      });
      
      // Navigation vers la liste des commandes après création/modification
      if (onCommandeCreated) {
        onCommandeCreated(); // Pour compatibilité avec le mode modal
      }
      navigate('/commandes');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setErrorMessage(err.response.data.message);
      } else {
        setErrorMessage('Erreur lors de la création/modification de la commande.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fonctions pour générer les PDF
  const handleDownloadProforma = () => {
    if (!initialCommande) return;
    generateProformaInvoicePDF(initialCommande);
  };

  const handleDownloadFacture = () => {
    if (!initialCommande) return;
    generateInvoicePDF(initialCommande);
  };

  const handleDownloadPackingList = () => {
    if (!initialCommande) return;
    generatePackingListPDF(initialCommande);
  };

  const handleDownloadBonDeSortie = () => {
    if (!initialCommande) return;
    generateBonDeCommandePDF(initialCommande);
  };

  // Fonction pour obtenir les informations de stock disponible
  const getStockInfo = (articleId, depotId) => {
    if (!articleId || !depotId) return null;
    
    const stock = stocks.find(s => 
      s.article && s.depot && 
      s.article._id === articleId && 
      s.depot._id === depotId
    );
    
    return {
      disponible: stock ? stock.quantiteCommercialisableKg : 0,
      stockFound: !!stock
    };
  };

    // Fonction pour calculer et afficher le statut de stock d'un item
  const getStockStatus = (item, index) => {
    const stockInfo = getStockInfo(item.article, item.depot);
    if (!stockInfo || !item.quantiteKg) return null;
    
    const qtyRequested = parseFloat(item.quantiteKg) || 0;
    const qtyAvailable = stockInfo.disponible;
    
    // 🔧 CORRECTION: En mode édition, ne valider que la différence de quantité
    let qtyToValidate = qtyRequested;
    if (initialCommande && initialCommande.items && initialCommande.items[index]) {
      const originalQty = parseFloat(initialCommande.items[index].quantiteKg) || 0;
      const difference = qtyRequested - originalQty;
      
      // Si on diminue la quantité, pas besoin de validation de stock
      if (difference <= 0) {
        return {
          type: 'success',
          message: `✅ Modification OK (quantité ${difference < 0 ? 'réduite' : 'inchangée'})`,
          color: 'text-green-600 bg-green-50'
        };
      }
      
      // Si on augmente, valider seulement l'augmentation
      qtyToValidate = difference;
    }
    
    if (qtyAvailable >= qtyToValidate) {
      const message = initialCommande 
        ? `✅ Modification OK (${qtyToValidate > 0 ? '+' + qtyToValidate : qtyToValidate} Kg, ${qtyAvailable} Kg disponibles)`
        : `✅ Stock suffisant (${qtyAvailable} Kg disponibles)`;
      return {
        type: 'success',
        message: message,
        color: 'text-green-600 bg-green-50'
      };
    } else if (qtyAvailable > 0) {
      const missing = qtyToValidate - qtyAvailable;
      const message = initialCommande
        ? `⚠️ Stock insuffisant pour augmentation: ${qtyAvailable} Kg disponibles, ${missing} Kg manquants`
        : `⚠️ Stock partiel: ${qtyAvailable} Kg disponibles, ${missing} Kg manquants`;
      return {
        type: 'warning', 
        message: message,
        color: 'text-orange-600 bg-orange-50'
      };
    } else {
      const message = initialCommande
        ? `❌ Impossible d'augmenter: stock indisponible (+${qtyToValidate} Kg demandés)`
        : `❌ Stock indisponible (${qtyRequested} Kg demandés)`;
      return {
        type: 'error',
        message: message,
        color: 'text-red-600 bg-red-50'
      };
    }
  };

  return (
    <div className="p-8 max-h-[90vh] overflow-y-auto">
      <h2 className="text-2xl font-bold mb-6">{initialCommande ? 'Modifier la Commande' : 'Nouvelle Commande'}</h2>
      
      {/* Type de commande avec étiquette */}
      <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
        <label className="block text-sm font-bold text-gray-700 mb-3">
          Type de commande <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-4 items-center">
          <label className="flex items-center">
            <input
              type="radio"
              name="typeCommande"
              value="NORMALE"
              checked={formData.typeCommande === 'NORMALE'}
              onChange={handleChange}
              className="mr-2"
              disabled={!!initialCommande} // Désactiver en mode édition
            />
            <span className="font-medium mr-3">Export</span>
            {formData.typeCommande === 'NORMALE' && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full border border-blue-300">
                🚢 COMMANDE EXPORT
              </span>
            )}
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="typeCommande"
              value="LOCALE"
              checked={formData.typeCommande === 'LOCALE'}
              onChange={handleChange}
              className="mr-2"
              disabled={!!initialCommande} // Désactiver en mode édition
            />
            <span className="font-medium mr-3">Locale</span>
            {formData.typeCommande === 'LOCALE' && (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full border border-green-300">
                🏠 COMMANDE LOCALE
              </span>
            )}
          </label>
        </div>
        
        {/* Message informatif selon le contexte */}
        {initialCommande && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Mode édition :</strong> Le type de commande ne peut pas être modifié après création.
            </p>
          </div>
        )}
        
        {!initialCommande && formData.typeCommande === 'LOCALE' && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              <strong>Commande locale :</strong> Monnaie automatiquement définie en MRU. 
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section Informations Générales */}
        <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
            Informations Générales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Référence (lecture seule) */}
            {formData.reference && (
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-700">Référence</label>
                <input
                  name="reference"
                  type="text"
                  readOnly
                  className="p-2 border rounded bg-gray-100"
                  value={formData.reference}
                />
              </div>
            )}

            {/* Numéro Booking - Masqué pour commande locale */}
            {formData.typeCommande !== 'LOCALE' && (
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-700">Numéro Booking</label>
                <input
                  name="numeroBooking"
                  type="text"
                  placeholder="Saisissez le numéro booking"
                  className={getInputClass(formData.numeroBooking)}
                  value={formData.numeroBooking}
                  onChange={handleChange}
                  disabled={false}
                />
              </div>
            )}

            {/* No Bon de Commande - Masqué pour commande locale */}
            {formData.typeCommande !== 'LOCALE' && (
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-700">No Bon de Commande</label>
                <input
                  name="noBonDeCommande"
                  type="text"
                  placeholder="Saisissez le numéro de bon de commande"
                  className={getInputClass(formData.noBonDeCommande)}
                  value={formData.noBonDeCommande}
                  onChange={handleChange}
                />
              </div>
            )}

            {/* Client */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Client *</label>
              <select
                name="client"
                required
                className={getInputClass(formData.client)}
                value={formData.client}
                onChange={handleChange}
                disabled={false}
              >
                <option value="">-- Choisir un client --</option>
                {clients.map(c => (
                  <option key={c._id} value={c._id}>{c.raisonSociale}</option>
                ))}
              </select>
            </div>

            {/* Numéro OP - Masqué pour commande locale */}
            {formData.typeCommande !== 'LOCALE' && (
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-700">Numéro OP</label>
                <input
                  name="numeroOP"
                  type="text"
                  placeholder="Saisissez le numéro OP"
                  className={getInputClass(formData.numeroOP)}
                  value={formData.numeroOP}
                  onChange={handleChange}
                />
              </div>
            )}

            {/* Destination - Masqué pour commande locale */}
            {formData.typeCommande !== 'LOCALE' && (
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-700">
                  Destination {formData.typeCommande !== 'LOCALE' && '*'}
                </label>
                <select
                  name="destination"
                  required={formData.typeCommande !== 'LOCALE'}
                  className={getInputClass(formData.destination)}
                  value={formData.destination}
                  onChange={handleChange}
                  disabled={false}
                >
                  <option value="">-- Choisir un pays --</option>
                  {countries.map((country, idx) => (
                    <option key={idx} value={country.label}>
                      {country.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Nouveau champ Banque */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Banque *</label>
              <select
                name="bank"
                required
                className={getInputClass(formData.bank)}
                value={formData.bank}
                onChange={handleChange}
                disabled={false}
              >
                <option value="">-- Choisir une banque --</option>
                {banks.map(b => (
                  <option key={b._id} value={b._id}>{b.banque}</option>
                ))}
              </select>
            </div>

            {/* Responsable de stock informé - Masqué pour commande locale */}
            {formData.typeCommande !== 'LOCALE' && (
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-700">Responsable de stock informé</label>
                <select
                  name="responsableDeStockInforme"
                  className={getInputClass(formData.responsableDeStockInforme)}
                  value={formData.responsableDeStockInforme}
                  onChange={handleChange}
                  disabled={false}
                >
                  <option value="OUI">OUI</option>
                  <option value="NON">NON</option>
                </select>
              </div>
            )}

            {/* Inspecteur informé - Masqué pour commande locale */}
            {formData.typeCommande !== 'LOCALE' && (
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-700">Inspecteur informé</label>
                <select
                  name="inspecteurInforme"
                  className={getInputClass(formData.inspecteurInforme)}
                  value={formData.inspecteurInforme}
                  onChange={handleChange}
                  disabled={false}
                >
                  <option value="OUI">OUI</option>
                  <option value="NON">NON</option>
                </select>
              </div>
            )}              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-700">Etiquette</label>
                <select
                  name="etiquette"
                  className={getInputClass(formData.etiquette)}
                  value={formData.etiquette}
                  onChange={handleChange}
                  disabled={false}
                >
                  <option value="ETABLIE">Etablie</option>
                  <option value="APPROUVEE">Approuvée</option>
                  <option value="IMPRIME">Imprimé</option>
                </select>
              </div>
              
              {/* Déclaration d'exportation - Masqué pour commande locale */}
              {formData.typeCommande !== 'LOCALE' && (
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">Déclaration d'exportation</label>
                  <select
                    name="declaration"
                    className={getInputClass(formData.declaration)}
                    value={formData.declaration}
                    onChange={handleChange}
                    disabled={false}
                  >
                    <option value="ETABLIE">Etablie</option>
                    <option value="APPROUVEE">Approuvée</option>
                    <option value="IMPRIME">Imprimé</option>
                  </select>
                </div>
              )}
          </div>
        </div>

        {/* Section Articles (désactivée si LIVREE) */}
        <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm mt-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
            Articles
            {formData.statutBonDeCommande === 'LIVREE' && (
              <span className="text-sm text-orange-600 font-normal ml-2">
                (Non modifiables - Commande livrée)
              </span>
            )}
          </h3>
          {items.map((item, index) => (
            <div key={index} className={`mb-6 last:mb-0 p-4 rounded shadow-sm ${formData.statutBonDeCommande === 'LIVREE' ? 'bg-gray-100' : 'bg-gray-50'}`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">Article *</label>
                  <select
                    value={item.article}
                    required
                    className={getInputClass(item.article, formData.statutBonDeCommande === 'LIVREE' ? 'bg-gray-200' : '')}
                    onChange={(e) => updateItem(index, 'article', e.target.value)}
                    disabled={formData.statutBonDeCommande === 'LIVREE'}
                  >
                    <option value="">-- Choisir un article --</option>
                    {articles.map(a => {
                      // const label = `${a.reference || ''} - ${a.specification || ''} - ${a.taille || ''} - ${a.typeCarton || ''}`;
                      const label = `${a.intitule}`;
                      return <option key={a._id} value={a._id}>{label}</option>;
                    })}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">Dépôt *</label>
                  <select
                    value={item.depot}
                    required
                    className={getInputClass(item.depot, formData.statutBonDeCommande === 'LIVREE' ? 'bg-gray-200' : '')}
                    onChange={(e) => updateItem(index, 'depot', e.target.value)}
                    disabled={formData.statutBonDeCommande === 'LIVREE'}
                  >
                    <option value="">-- Choisir un dépôt --</option>
                    {depots.map(d => {
                      const qty = getQuantiteInDepot(item.article, d._id);
                      const suffix = qty !== null ? ` (${qty} Kg dispo)` : '';
                      return <option key={d._id} value={d._id}>{d.intitule + suffix}</option>;
                    })}
                  </select>
                </div>
                <div className="flex justify-end">
                  {items.length > 1 && formData.statutBonDeCommande !== 'LIVREE' && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
              {/* Indicateur de stock */}
              {item.article && item.depot && item.quantiteKg && formData.statutBonDeCommande === 'LIVREE' && (() => {
                const status = getStockStatus(item, index);
                return status ? (
                  <div className={`mt-3 p-3 rounded-lg border ${status.color}`}>
                    <div className="text-sm font-medium">{status.message}</div>
                    {/* Affichage des quantités manquantes si présentes */}
                    {item.quantiteManquante > 0 && (
                      <div className="text-xs mt-1">
                        Quantité allouée: {item.quantiteAllouee || 0} Kg | 
                        Quantité manquante: {item.quantiteManquante} Kg |
                        Statut: {item.statutStock}
                      </div>
                    )}
                  </div>
                ) : null;
              })()}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">Quantité (Kg) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      placeholder="0"
                      className={getInputClass(item.quantiteKg, formData.statutBonDeCommande === 'LIVREE' ? 'bg-gray-200' : '')}
                      value={item.quantiteKg}
                      onChange={(e) => updateItem(index, 'quantiteKg', e.target.value)}
                      disabled={formData.statutBonDeCommande === 'LIVREE'}
                    />
                    {/* Indicateur de stock en temps réel pour la création */}
                    {formData.statutBonDeCommande !== 'LIVREE' && item.article && item.depot && item.quantiteKg && (() => {
                      const status = getStockStatus(item, index);
                      return status && status.type !== 'success' ? (
                        <div className="absolute -bottom-6 left-0 text-xs text-orange-600">
                          {status.type === 'warning' ? '⚠️ Stock partiel' : '❌ Stock indisponible'}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">Prix Unitaire *</label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    className={getInputClass(item.prixUnitaire, formData.statutBonDeCommande === 'LIVREE' ? 'bg-gray-200' : '')}
                    value={item.prixUnitaire}
                    onChange={(e) => updateItem(index, 'prixUnitaire', e.target.value)}
                    disabled={formData.statutBonDeCommande === 'LIVREE'}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">Quantité (Cartons)</label>
                  <input
                    type="number"
                    className="p-2 border rounded bg-gray-100 border-gray-300"
                    value={item.quantiteCarton}
                    readOnly
                  />
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">Total</label>
                  <input
                    type="number"
                    className="p-2 border rounded bg-gray-100 border-gray-300"
                    value={item.prixTotal}
                    readOnly
                  />
                </div>
              </div>
              {/* Note: La sélection des lots a été supprimée. */}
              {/* Les lots seront gérés lors de la livraison via LivraisonPartielleModal */}
              {/* Indicateurs de stock */}
              <div className="mt-4">
                {getStockStatus(item, index) && (
                  <div className={`p-2 rounded ${getStockStatus(item, index).color} text-sm`}>
                    {getStockStatus(item, index).message}
                  </div>
                )}
              </div>
            </div>
          ))}
          {formData.statutBonDeCommande !== 'LIVREE' && (
            <Button
              variant="info"
              size="sm"
              onClick={addItem}
              className="mt-2"
            >
              + Ajouter un article
            </Button>
          )}
        </div>

        {/* Section Paiement & Informations Complémentaires */}
        <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
            Paiement & Informations Complémentaires
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Montant Payé */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Montant Payé</label>
              <input
                name="montantPaye"
                type="number"
                placeholder="0"
                className={getInputClass(formData.montantPaye)}
                value={formData.montantPaye}
                onChange={handleChange}
              />
            </div>
            {/* Devise */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">
                Devise {formData.typeCommande === 'LOCALE' && (
                  <span className="text-xs text-green-600 font-normal">(Automatique pour commande locale)</span>
                )}
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className={getInputClass(formData.currency)}
                disabled={false || formData.typeCommande === 'LOCALE'}
              >
                <option value="EUR">€ Euro</option>
                <option value="USD">$ Dollar</option>
                <option value="MRU">MRU Ouguiya</option>
              </select>
            </div>
          </div>
        </div>

        {/* Si la commande est LIVREE */}
        {formData.statutBonDeCommande === 'LIVREE' && (
          <>
            {/* Détails de la Commande (LIVREE) */}
            <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
                Détails de la Commande
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">Cargos et Informations Conteneur</label>
                  <div className="space-y-4">
                    {formData.cargo.map((cargo, index) => (
                      <div key={index} className="border border-gray-300 rounded-lg p-4 bg-white">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium text-gray-700">Cargo {index + 1}</h4>
                          {formData.cargo.length > 1 && (
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => removeCargo(index)}
                            >
                              Supprimer
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Nom du Cargo</label>
                            <select
                              value={cargo.nom}
                              onChange={(e) => updateCargo(index, 'nom', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">-- Choisir un cargo --</option>
                              <option value="Maersk">Maersk</option>
                              <option value="MSC Line">MSC Line</option>
                              <option value="CMA/CGM">CMA/CGM</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">N° de Conteneur</label>
                            <input
                              type="text"
                              value={cargo.noDeConteneur}
                              onChange={(e) => updateCargo(index, 'noDeConteneur', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="N° de conteneur"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Tare de Conteneur</label>
                            <input
                              type="text"
                              value={cargo.areDeConteneur}
                              onChange={(e) => updateCargo(index, 'areDeConteneur', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Tare de conteneur"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Poids Carton</label>
                            <input
                              type="number"
                              value={cargo.poidsCarton}
                              onChange={(e) => updateCargo(index, 'poidsCarton', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Poids en kg"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">N° Plomb</label>
                            <input
                              type="text"
                              value={cargo.noPlomb}
                              onChange={(e) => updateCargo(index, 'noPlomb', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="N° de plomb"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="info"
                      size="sm"
                      onClick={addCargo}
                      className="mt-2"
                    >
                      + Ajouter un cargo
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">Date Prévue de Chargement</label>
                  <input
                    name="datePrevueDeChargement"
                    type="date"
                    className={getInputClass(formData.datePrevueDeChargement)}
                    value={formData.datePrevueDeChargement}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Champs Complémentaires (LIVREE) */}
            <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
                Champs Complémentaires
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">Draft HC</label>
                  <select
                    name="draftHC"
                    className={getInputClass(formData.draftHC)}
                    value={formData.draftHC}
                    onChange={handleChange}
                  >
                    <option value="ETABLIE">ETABLIE</option>
                    <option value="ENVOYEE">ENVOYEE</option>
                    <option value="APPROUVEE">APPROUVEE</option>
                    <option value="DEPOSEE">DEPOSEE</option>
                    <option value="PRET">PRET</option>
                    <option value="ENVOYEE DHL">ENVOYEE DHL</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">Facture</label>
                  <select
                    name="facture"
                    className={getInputClass(formData.facture)}
                    value={formData.facture}
                    onChange={handleChange}
                  >
                    <option value="ETABLIE">ETABLIE</option>
                    <option value="ENVOYEE">ENVOYEE</option>
                    <option value="APPROUVEE">APPROUVEE</option>
                    <option value="DEPOSEE">DEPOSEE</option>
                    <option value="PRET">PRET</option>
                    <option value="ENVOYEE DHL">ENVOYEE DHL</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">Packing List</label>
                  <select
                    name="packingList"
                    className={getInputClass(formData.packingList)}
                    value={formData.packingList}
                    onChange={handleChange}
                  >
                    <option value="ETABLIE">ETABLIE</option>
                    <option value="ENVOYEE">ENVOYEE</option>
                    <option value="APPROUVEE">APPROUVEE</option>
                    <option value="DEPOSEE">DEPOSEE</option>
                    <option value="PRET">PRET</option>
                    <option value="ENVOYEE DHL">ENVOYEE DHL</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">Draft CO</label>
                  <select
                    name="draftCO"
                    className={getInputClass(formData.draftCO)}
                    value={formData.draftCO}
                    onChange={handleChange}
                  >
                    <option value="ETABLIE">ETABLIE</option>
                    <option value="ENVOYEE">ENVOYEE</option>
                    <option value="APPROUVEE">APPROUVEE</option>
                    <option value="DEPOSEE">DEPOSEE</option>
                    <option value="PRET">PRET</option>
                    <option value="ENVOYEE DHL">ENVOYEE DHL</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">VGM</label>
                  <select
                    name="vgm"
                    className={getInputClass(formData.vgm)}
                    value={formData.vgm}
                    onChange={handleChange}
                  >
                    <option value="ETABLIE">ETABLIE</option>
                    <option value="ENVOYEE">ENVOYEE</option>
                    <option value="APPROUVEE">APPROUVEE</option>
                    <option value="DEPOSEE">DEPOSEE</option>
                    <option value="PRET">PRET</option>
                    <option value="ENVOYEE DHL">ENVOYEE DHL</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">DHL</label>
                  <select
                    name="dhl"
                    className={getInputClass(formData.dhl)}
                    value={formData.dhl}
                    onChange={handleChange}
                  >
                    <option value="ETABLIE">ETABLIE</option>
                    <option value="ENVOYEE">ENVOYEE</option>
                    <option value="APPROUVEE">APPROUVEE</option>
                    <option value="DEPOSEE">DEPOSEE</option>
                    <option value="PRET">PRET</option>
                    <option value="ENVOYEE DHL">ENVOYEE DHL</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section Charges Locales - Masquée pour commande locale */}
            {formData.statutBonDeCommande === 'LIVREE' && formData.typeCommande !== 'LOCALE' && (
              <>
                <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
                    Charges Locales
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="flex flex-col">
                      <label className="mb-1 text-sm font-medium text-gray-700">Facture manutention</label>
                      <select
                        name="factureManutention"
                        className={getInputClass(formData.factureManutention)}
                        value={formData.factureManutention}
                        onChange={handleChange}
                      >
                        <option value="NON_PAYE">Non payé</option>
                        <option value="PAYE">Payé</option>
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <label className="mb-1 text-sm font-medium text-gray-700">Facture cargo</label>
                      <select
                        name="factureCargo"
                        className={getInputClass(formData.factureCargo)}
                        value={formData.factureCargo}
                        onChange={handleChange}
                      >
                        <option value="NON_PAYE">Non payé</option>
                        <option value="PAYE">Payé</option>
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <label className="mb-1 text-sm font-medium text-gray-700">Taxe zone franche</label>
                      <select
                        name="taxeZoneFranche"
                        className={getInputClass(formData.taxeZoneFranche)}
                        value={formData.taxeZoneFranche}
                        onChange={handleChange}
                      >
                        <option value="NON_PAYE">Non payé</option>
                        <option value="PAYE">Payé</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

         {/* Section Conditions de Vente */}
         <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
            Conditions de Vente
          </h3>
          <textarea
            name="conditionsDeVente"
            placeholder="Saisissez les conditions de vente..."
            className={`w-full h-32 p-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
            value={formData.conditionsDeVente}
            onChange={handleChange}
          />
        </div>

        {/* Section Prix Total */}
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-center shadow-sm">
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Prix Total de la Commande</h3>
          <p className="text-4xl font-extrabold text-blue-700">
            {new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: formData.currency,
              minimumFractionDigits: 2
            }).format(formData.prixTotal)}
          </p>
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-end space-x-4 mt-4">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              if (onClose) {
                onClose(); // Pour compatibilité avec le mode modal
              }
              navigate('/commandes'); // Navigation vers la liste
            }}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
            loading={loading}
          >
            {initialCommande ? 'Modifier' : 'Créer'}
          </Button>
        </div>
      </form>

      {/* Boutons de téléchargement des PDF (uniquement en modification) */}
      {initialCommande && (
        <div className="mt-6 border-t pt-4 flex items-center gap-3 justify-end">
          {formData.statutBonDeCommande !== 'LIVREE' && (
            <Button
              variant="warning"
              size="md"
              onClick={handleDownloadProforma}
            >
              Télécharger Proforma Invoice
            </Button>
          )}
          {formData.statutBonDeCommande === 'LIVREE' && (
            <>
              <Button
                variant="success"
                size="md"
                onClick={handleDownloadFacture}
              >
                Télécharger Facture
              </Button>
              {/* <Button
                variant="success"
                size="md"
                onClick={handleDownloadPackingList}
              >
                Télécharger Packing List
              </Button> */}
              <Button
                variant="success"
                size="md"
                onClick={handleDownloadBonDeSortie}
              >
                Télécharger Bon de Sortie
              </Button>
            </>
          )}
        </div>
      )}

      {/* Section Résumé des Quantités Manquantes - uniquement en modification */}
      {initialCommande && formData.statutBonDeCommande === 'AVEC_QUANTITES_MANQUANTES' && (
        <div className="p-4 border border-orange-300 rounded-lg bg-orange-50 shadow-sm">
          <h3 className="text-xl font-semibold text-orange-800 mb-4 border-b border-orange-200 pb-2">
            ⚠️ Quantités Manquantes
          </h3>
          <div className="space-y-3">
            {items.filter(item => item.quantiteManquante > 0).map((item, index) => {
              const article = articles.find(a => a._id === item.article);
              const depot = depots.find(d => d._id === item.depot);
              return (
                <div key={index} className="bg-white p-3 rounded border border-orange-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="font-medium">Article:</span><br/>
                      {article?.intitule || 'Article inconnu'}
                    </div>
                    <div>
                      <span className="font-medium">Dépôt:</span><br/>
                      {depot?.intitule || 'Dépôt inconnu'}
                    </div>
                    <div>
                      <span className="font-medium">Quantités:</span><br/>
                      Demandée: {item.quantiteKg} Kg<br/>
                      Allouée: {item.quantiteAllouee || 0} Kg<br/>
                      <span className="text-orange-600 font-medium">Manquante: {item.quantiteManquante} Kg</span>
                    </div>
                    <div>
                      <span className="font-medium">Statut:</span><br/>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.statutStock === 'DISPONIBLE' ? 'bg-green-100 text-green-800' :
                        item.statutStock === 'PARTIEL' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.statutStock}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-800">
                💡 <strong>Information:</strong> Vous serez automatiquement notifié lorsque les articles manquants seront disponibles en stock.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandeForm;
