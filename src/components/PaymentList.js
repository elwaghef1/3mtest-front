import React, { useEffect, useState, Suspense } from 'react';
import axios from '../api/axios';
import Button from './Button';
// Chargement paresseux du composant de détails pour réduire le bundle initial

import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/solid';
import { ArrowPathIcon, DocumentArrowDownIcon, PrinterIcon } from '@heroicons/react/24/outline';
import Pagination from './Pagination';
import moment from 'moment';
import 'moment/locale/fr';

moment.locale('fr');

const CommandeDetails = React.lazy(() => import('./CommandeDetails'));

function PaymentList() {
  const [commandes, setCommandes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [searchRef, setSearchRef] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showDetails, setShowDetails] = useState(false);
  const [detailsCommande, setDetailsCommande] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Statistiques par devise
  const [statisticsByCurrency, setStatisticsByCurrency] = useState({});

  // Calcul des indices pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  // Totaux globaux (toutes devises confondues) sur les commandes filtrées
  const totals = filtered.reduce((acc, cmd) => {
    acc.prixTotal += cmd.prixTotal || 0;
    acc.montantPaye += cmd.montantPaye || 0;
    acc.reliquat += cmd.reliquat || 0;
    return acc;
  }, { prixTotal: 0, montantPaye: 0, reliquat: 0 });

  // Formateur de montant en devise (gère EUR vs USD pour format local)
  const formatCurrency = (amount, currency = 'EUR') => {
    if (amount == null) {
      return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        .format(0) + ' ' + currency;
    }
    return new Intl.NumberFormat(
      currency === 'USD' ? 'en-US' : 'fr-FR',
      { style: 'currency', currency, minimumFractionDigits: 2 }
    ).format(amount);
  };

  // Charger la liste de toutes les commandes *et* des clients au montage du composant
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        // On peut appeler l'API en mode "minimal" pour n'obtenir que les champs nécessaires
        const [cmdRes, cliRes] = await Promise.all([
          axios.get('/commandes?minimal=true'),   // n'obtient que les champs légers des commandes
          axios.get('/clients'),
        ]);
        // CORRECTION: Filtrer uniquement les commandes livrées
        console.log('🔍 DEBUG PaymentList - Commandes reçues:', cmdRes.data);
        console.log('🔍 DEBUG PaymentList - Nombre total de commandes:', cmdRes.data.length);
        
        // Vérifier les statuts disponibles
        const statuts = [...new Set(cmdRes.data.map(cmd => cmd.statutBonDeCommande))];
        console.log('🔍 DEBUG PaymentList - Statuts disponibles:', statuts);
        
        // FILTRAGE CORRECT: Ne prendre que les commandes livrées
        const commandesLivrees = cmdRes.data.filter(cmd => cmd.statutBonDeCommande === 'LIVREE');
        
        console.log('🔍 DEBUG PaymentList - Commandes livrées:', commandesLivrees.length);
        console.log('🔍 DEBUG PaymentList - Détails des commandes livrées:', commandesLivrees.map(cmd => ({
          reference: cmd.reference,
          statut: cmd.statutBonDeCommande,
          client: cmd.client?.raisonSociale,
          prix: cmd.prixTotal,
          devise: cmd.currency
        })));
        setCommandes(commandesLivrees);
        setClients(cliRes.data);
        setFiltered(commandesLivrees);
      } catch (err) {
        console.error('Erreur:', err);
        setError('Erreur de chargement des données');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filtrage local des commandes en fonction des sélections (client, référence, devise)
  // Note: Les commandes sont déjà filtrées pour ne contenir que celles avec statut LIVREE
  useEffect(() => {
    let result = [...commandes];
    if (selectedClient) {
      result = result.filter(cmd => cmd.client?._id === selectedClient);
    }
    if (searchRef) {
      result = result.filter(cmd =>
        cmd.reference?.toLowerCase().includes(searchRef.toLowerCase())
      );
    }
    if (selectedCurrency) {
      result = result.filter(cmd => cmd.currency === selectedCurrency);
    }
    if (selectedPaymentStatus) {
      result = result.filter(cmd => cmd.statutDePaiement === selectedPaymentStatus);
    }
    setFiltered(result);
    setCurrentPage(1);  // Réinitialiser à la première page à chaque nouveau filtre
  }, [commandes, selectedClient, searchRef, selectedCurrency, selectedPaymentStatus]);

  // Calculer les statistiques par devise à chaque changement de la liste filtrée
  useEffect(() => {
    const statsByCurrency = {};
    filtered.forEach(cmd => {
      const currency = cmd.currency || 'EUR';
      const paye = cmd.montantPaye || 0;
      const reliquat = (cmd.prixTotal || 0) - paye;
      const estEntierementPaye = reliquat <= 0.01; // Considérer comme payé si reliquat proche de 0
      
      if (!statsByCurrency[currency]) {
        statsByCurrency[currency] = {
          totalCommandes: 0,
          montantTotal: 0,
          montantPaye: 0,
          reliquat: 0,
          commandesPaye: 0,
          commandesPartiellementPaye: 0,
          commandesNonPaye: 0,
          commandesEntierementPayees: 0 // Nouvelle statistique
        };
      }
      statsByCurrency[currency].totalCommandes++;
      statsByCurrency[currency].montantTotal += cmd.prixTotal || 0;
      statsByCurrency[currency].montantPaye += paye;
      statsByCurrency[currency].reliquat += reliquat;
      
      // Compter les commandes entièrement payées (reliquat = 0)
      if (estEntierementPaye) {
        statsByCurrency[currency].commandesEntierementPayees++;
      }
      
      switch (cmd.statutDePaiement) {
        case 'PAYE':
          statsByCurrency[currency].commandesPaye++;
          break;
        case 'PARTIELLEMENT_PAYE':
          statsByCurrency[currency].commandesPartiellementPaye++;
          break;
        case 'NON_PAYE':
        default:
          statsByCurrency[currency].commandesNonPaye++;
      }
    });
    setStatisticsByCurrency(statsByCurrency);
  }, [filtered]);

  // Réinitialiser tous les filtres
  const resetFilters = () => {
    setSelectedClient('');
    setSearchRef('');
    setSelectedCurrency('');
    setSelectedPaymentStatus('');
  };

  // Liste des devises disponibles dans les commandes (pour alimenter le <select>)
  const getAvailableCurrencies = () => {
    const currencies = [...new Set(commandes.map(cmd => cmd.currency).filter(Boolean))];
    return currencies.sort();
  };

  // Génération d'un badge visuel pour le statut de paiement
  const getPaymentBadge = (etatPaiement) => {
    const config = {
      PAYE: {
        bg: 'bg-green-800 text-white',
        icon: <CheckCircleIcon className="h-4 w-4 mr-1" />
      },
      PARTIELLEMENT_PAYE: {
        bg: 'bg-orange-600 text-white',
        icon: <ExclamationCircleIcon className="h-4 w-4 mr-1" />
      },
      NON_PAYE: {
        bg: 'bg-red-800 text-white',
        icon: <XCircleIcon className="h-4 w-4 mr-1" />
      },
      default: {
        bg: 'bg-gray-800 text-white',
        icon: null
      },
    };
    const { bg, icon } = config[etatPaiement] || config.default;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${bg}`}>
        {icon}
        {etatPaiement ? etatPaiement.replace(/_/g, ' ') : 'Inconnu'}
      </span>
    );
  };

  // Ouverture/fermeture du popup de détails
  const handleShowDetails = (cmd) => {
    setDetailsCommande(cmd);
    setShowDetails(true);
  };
  const handleCloseDetails = () => {
    setShowDetails(false);
  };

  // Fonction de formatage pour PDF (évite les problèmes d'espaces)
  const formatCurrencyForPDF = (value, currency = 'EUR') => {
    const numValue = parseFloat(value) || 0;
    if (currency === 'MRU') {
      return `${numValue.toFixed(0)} MRU`;
    } else if (currency === 'USD') {
      return `$${numValue.toFixed(2)}`;
    } else {
      return `${numValue.toFixed(2)} EUR`;
    }
  };

  // Fonction d'export PDF de l'état des paiements
  const exportPaymentsToPDF = async () => {
    try {
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default;
      await import('jspdf-autotable');
      const { default: logoBase64 } = await import('./logoBase64');
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginLeft = 10;
      const marginRight = 10;
      
      // En-tête MSM identique aux factures
      doc.addImage(logoBase64, 'PNG', marginLeft, 10, 20, 20);
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      let headerY = 15;
      const infoX = marginLeft + 25;
      doc.text("MSM Seafood", infoX, headerY);
      headerY += 5;
      doc.text("Zone idustrielle,", infoX, headerY);
      headerY += 5;
      doc.text("Dakhlet Nouâdhibou", infoX, headerY);
      headerY += 5;
      doc.text("msmseafoodsarl@gmail.com", infoX, headerY);
      
      // Titre principal
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('ÉTAT DES PAIEMENTS', pageWidth / 2, 20, { align: 'center' });
      
      // Date d'édition
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      const today2 = new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(new Date()).replace(/(\d+)/, (match) => {
        const day = parseInt(match);
        return day === 1 ? '1er' : match;
      }).toUpperCase();
      doc.text(`Nouadhibou, ${today2}`, pageWidth - marginRight, 32, { align: 'right' });
      
      // Déterminer le client sélectionné
      const selectedClientInfo = selectedClient ? 
        clients.find(c => c._id === selectedClient) : null;
      
      if (selectedClientInfo) {
        doc.text(`Client: ${selectedClientInfo.raisonSociale}`, 20, 42);
      }
      
      let currentY = selectedClientInfo ? 50 : 43;
      
      // Résumé par devise - position plus haute et design amélioré
      if (Object.keys(statisticsByCurrency).length > 0) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('RESUME PAR DEVISE', 20, currentY);
        currentY += 8;
        
        // Ligne de séparation
        doc.setLineWidth(0.5);
        doc.line(20, currentY, pageWidth - 20, currentY);
        currentY += 5;
        
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        
        Object.entries(statisticsByCurrency)
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([currency, stats]) => {
            // En-tête de devise
            doc.setFont(undefined, 'bold');
            doc.text(`Devise: ${currency}`, 25, currentY);
            doc.setFont(undefined, 'normal');
            currentY += 4;
            
            // Détails alignés
            doc.text(`  • Commandes: ${stats.totalCommandes}`, 30, currentY);
            doc.text(`Total: ${formatCurrencyForPDF(stats.montantTotal, currency)}`, 80, currentY);
            currentY += 4;
            
            doc.text(`  • Payé: ${formatCurrencyForPDF(stats.montantPaye, currency)}`, 30, currentY);
            doc.text(`Reliquat: ${formatCurrencyForPDF(stats.reliquat, currency)}`, 80, currentY);
            currentY += 6;
          });
        
        currentY += 5;
      }
      
      // Tableau des commandes
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('DETAIL DES COMMANDES', 20, currentY);
      currentY += 3;
      
      // Ligne de séparation
      doc.setLineWidth(0.5);
      doc.line(20, currentY, pageWidth - 20, currentY);
      currentY += 2;
      
      const tableData = filtered.map(cmd => [
        cmd.reference,
        cmd.client?.raisonSociale || '—',
        formatCurrencyForPDF(cmd.prixTotal, cmd.currency),
        formatCurrencyForPDF(cmd.montantPaye, cmd.currency), 
        formatCurrencyForPDF((cmd.prixTotal || 0) - (cmd.montantPaye || 0), cmd.currency),
        cmd.currency || 'EUR',
        cmd.statutDePaiement ? cmd.statutDePaiement.replace(/_/g, ' ') : 'Inconnu'
      ]);
      
      doc.autoTable({
        head: [['Référence', 'Client', 'Montant Total', 'Montant Payé', 'Reliquat', 'Devise', 'État Paiement']],
        body: tableData,
        startY: currentY + 5,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [71,85,105] },
        columnStyles: {
          2: { halign: 'right' }, // Montant Total
          3: { halign: 'right' }, // Montant Payé  
          4: { halign: 'right' }, // Reliquat
          5: { halign: 'center' }, // Devise
          6: { halign: 'center' }  // État Paiement
        }
      });
      
      // Total général en bas si plusieurs devises
      if (Object.keys(statisticsByCurrency).length > 1) {
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text('Total Général (toutes devises)', 20, finalY);
        
        doc.setFontSize(10);
        let totalY = finalY + 8;
        Object.entries(statisticsByCurrency).forEach(([currency, stats]) => {
          doc.text(`Reliquat total ${currency}: ${formatCurrencyForPDF(stats.reliquat, currency)}`, 30, totalY);
          totalY += 6;
        });
      }
      
      // Sauvegarde
      const fileName = selectedClientInfo 
        ? `etat_paiements_${selectedClientInfo.raisonSociale.replace(/[^a-zA-Z0-9]/g, '_')}_${moment().format('YYYY-MM-DD')}.pdf`
        : `etat_paiements_${moment().format('YYYY-MM-DD')}.pdf`;
        
      doc.save(fileName);
      
    } catch (err) {
      console.error("Erreur lors de l'export PDF :", err);
      alert("Erreur lors de la génération du PDF");
    }
  };

  return (
    <div className="p-4 lg:p-6">
      {/* Titre de la page */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Gestion des Paiements</h1>
        </div>
        <div className="flex space-x-2 mt-4 md:mt-0">
          <Button
            onClick={exportPaymentsToPDF}
            variant="primary"
            leftIcon={<PrinterIcon className="h-4 w-4" />}
            className="whitespace-nowrap"
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* Bannières récap par devise */}
      {Object.keys(statisticsByCurrency).length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Résumé par Devise</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(statisticsByCurrency)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([currency, stats]) => (
                <div key={currency} className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-green-900">{currency}</h3>
                    <div className="bg-green-100 px-2 py-1 rounded-full">
                      <span className="text-sm font-medium text-green-800">
                        {stats.totalCommandes} commande{stats.totalCommandes > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Montant Total</span>
                      <span className="font-semibold text-blue-700">
                        {formatCurrency(stats.montantTotal, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Montant Payé</span>
                      <span className="font-semibold text-green-700">
                        {formatCurrency(stats.montantPaye, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-sm font-medium text-gray-700">Reliquat</span>
                      <span className={`font-bold text-lg ${
                        stats.reliquat > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(stats.reliquat, currency)}
                      </span>
                    </div>
                    {/* Nouvelle ligne pour les commandes entièrement payées */}
                    <div className="flex justify-between items-center pt-1 border-t border-green-200">
                      <span className="text-sm font-medium text-green-700">✓ Entièrement Payées</span>
                      <span className="font-bold text-green-600">
                        {stats.commandesEntierementPayees} commande{stats.commandesEntierementPayees > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 pt-1">
                      <span>✅ {stats.commandesPaye} payées</span>
                      <span>🔶 {stats.commandesPartiellementPaye} partielles</span>
                      <span>❌ {stats.commandesNonPaye} non payées</span>
                    </div>
                  </div>
                </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtres de recherche */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <select
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              <option value="">Tous les clients</option>
              {clients.map(cli => (
                <option key={cli._id} value={cli._id}>
                  {cli.raisonSociale}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
            <input
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              type="text"
              placeholder="Recherche par référence"
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
            <select
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
            >
              <option value="">Toutes les devises</option>
              {getAvailableCurrencies().map(currency => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">État de Paiement</label>
            <select
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
            >
              <option value="">Tous les états</option>
              <option value="PAYE">Payé</option>
              <option value="PARTIELLEMENT_PAYE">Partiellement payé</option>
              <option value="NON_PAYE">Non payé</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={resetFilters}
              variant="outline"
              size="md"
              leftIcon={<ArrowPathIcon className="h-4 w-4" />}
              className="w-full"
            >
              Réinitialiser
            </Button>
          </div>
        </div>
      </div>

      {/* Message d'erreur si échec */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
          {error} - Veuillez rafraîchir la page
        </div>
      )}

      {/* Indicateur de chargement */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Chargement en cours...</p>
        </div>
      ) : filtered.length === 0 ? (
        // Aucun résultat après filtrage
        <div className="text-center py-12 bg-white rounded-lg border">
          <InformationCircleIcon className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">Aucune commande trouvée</h3>
          <p className="mt-1 text-gray-500">Essayez d’ajuster vos filtres de recherche</p>
        </div>
      ) : (
        // Tableau des résultats avec ligne de total en pied
        <div className="overflow-x-auto rounded-lg border shadow-sm">
          <table className="min-w-full border-collapse border border-gray-400">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border">Référence</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border">Client</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border">Statut Commande</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700 border">Prix Total</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700 border">Montant Payé</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700 border">Reliquat</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border">Devise</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border">Statut Paiement</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border">Date Livraison</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {currentItems.map(cmd => (
                <tr key={cmd._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900 border">
                    <div className="font-medium">{cmd.reference}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 border">
                    {cmd.client?.raisonSociale || '—'}
                  </td>
                  <td className="px-4 py-3 text-center border">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      cmd.statutBonDeCommande === 'LIVREE' ? 'bg-green-100 text-green-800' :
                      cmd.statutBonDeCommande === 'EN_COURS' ? 'bg-blue-100 text-blue-800' :
                      cmd.statutBonDeCommande === 'EN_ATTENTE_STOCK' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {cmd.statutBonDeCommande || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium border">
                    {formatCurrency(cmd.prixTotal, cmd.currency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium border">
                    {formatCurrency(cmd.montantPaye, cmd.currency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium border">
                    <span className={`font-medium ${
                      (cmd.reliquat || 0) <= 0.01 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(cmd.reliquat, cmd.currency)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-700 font-medium border">
                    {cmd.currency || 'EUR'}
                  </td>
                  <td className="px-4 py-3 text-center border">
                    {getPaymentBadge(cmd.statutDePaiement)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 border">
                    {cmd.datePrevueDeChargement
                      ? new Date(cmd.datePrevueDeChargement).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
           
          </table>
        </div>
      )}

      {/* Pagination */}
      {filtered.length > 0 && (
        <Pagination
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalItems={filtered.length}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}

      {/* Modal de détails, chargé en lazy loading */}
      {showDetails && detailsCommande && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-8">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[100vh] overflow-y-auto">
            <Suspense fallback={<div className="p-6">Chargement des détails...</div>}>
              <CommandeDetails 
                commande={detailsCommande} 
                onClose={handleCloseDetails}
                formatCurrency={(amount) => formatCurrency(amount, detailsCommande?.currency)}
                formatNumber={(value) => new Intl.NumberFormat('fr-FR').format(value || 0)}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentList;
