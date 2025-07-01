// frontend/src/components/ClientOrderHistory.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import Button from './Button';
import Pagination from './Pagination';
import {
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/solid';
import moment from 'moment';
import 'moment/locale/fr';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

moment.locale('fr');

const ClientOrderHistory = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [filteredCommandes, setFilteredCommandes] = useState([]);

  const [statistics, setStatistics] = useState({
    totalCommandes: 0,
    montantTotal: 0,
    reliquatGeneral: 0,
    commandesLivrees: 0,
    commandesEnCours: 0,
    commandesIncompletes: 0
  });

  const [statisticsByCurrency, setStatisticsByCurrency] = useState({});

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState(null);

  // --- Helpers PDF number formatting (identical to StockList) ---
  const pdfNumber = (value) => {
    const num = parseFloat(value || 0);
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true
    }).format(num).replace(/\s/g, '\u00A0');
  };
  const pdfNumberDecimal = (value) => {
    const num = parseFloat(value || 0);
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    }).format(num).replace(/\s/g, '\u00A0');
  };
  // ------------------------------------------------------------

  useEffect(() => {
    fetchClientData();
    fetchCommandesData();
  }, [clientId]);

  useEffect(() => {
    applyFilters();
  }, [commandes, startDate, endDate]);

  useEffect(() => {
    calculateStatistics();
  }, [filteredCommandes]);

  const fetchClientData = async () => {
    try {
      const res = await axios.get(`/clients/${clientId}`);
      setClient(res.data);
    } catch {
      setError('Client non trouvé');
    }
  };

  const fetchCommandesData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/commandes?client=${clientId}`);
      setCommandes(res.data);
    } catch {
      setError('Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filt = [...commandes];
    if (startDate && endDate) {
      filt = filt.filter(c =>
        moment(c.dateCommande).isBetween(startDate, endDate, null, '[]')
      );
    }
    setFilteredCommandes(filt);
  };

  const calculateStatistics = () => {
    const stats = {
      totalCommandes: filteredCommandes.length,
      montantTotal: 0,
      reliquatGeneral: 0,
      commandesLivrees: 0,
      commandesEnCours: 0,
      commandesIncompletes: 0
    };

    // Statistiques par devise
    const statsByCurrency = {};

    filteredCommandes.forEach(c => {
      const currency = c.currency || 'EUR';
      const paye = c.montantPaye || 0;
      const reliquat = (c.prixTotal || 0) - paye;

      // Statistiques globales
      stats.montantTotal += c.prixTotal || 0;
      stats.reliquatGeneral += reliquat;

      // Initialiser la devise si elle n'existe pas
      if (!statsByCurrency[currency]) {
        statsByCurrency[currency] = {
          totalCommandes: 0,
          montantTotal: 0,
          montantPaye: 0,
          reliquat: 0,
          commandesLivrees: 0,
          commandesEnCours: 0,
          commandesIncompletes: 0
        };
      }

      // Statistiques par devise
      statsByCurrency[currency].totalCommandes++;
      statsByCurrency[currency].montantTotal += c.prixTotal || 0;
      statsByCurrency[currency].montantPaye += paye;
      statsByCurrency[currency].reliquat += reliquat;

      // Compter les statuts
      switch (c.statutBonDeCommande) {
        case 'LIVREE':
        case 'COMPLET':
          stats.commandesLivrees++;
          statsByCurrency[currency].commandesLivrees++;
          break;
        case 'INCOMPLET':
        case 'A_COMPLETER':
        case 'PARTIELLEMENT_LIVREE':
        case 'AVEC_QUANTITES_MANQUANTES':
          stats.commandesIncompletes++;
          statsByCurrency[currency].commandesIncompletes++;
          break;
        default:
          stats.commandesEnCours++;
          statsByCurrency[currency].commandesEnCours++;
      }
    });

    setStatistics(stats);
    setStatisticsByCurrency(statsByCurrency);
  };

  const formatNumber = (value) =>
    new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      .format(value || 0);

  const formatCurrency = (amount, currency = 'EUR') => {
    if (amount == null) return formatNumber(0) + ' ' + currency;
    return new Intl.NumberFormat(
      currency === 'USD' ? 'en-US' : 'fr-FR',
      { style: 'currency', currency, minimumFractionDigits: 2 }
    ).format(amount);
  };

  const getStatusIcon = statut => {
    if (['LIVREE','COMPLET'].includes(statut))
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    if (['INCOMPLET','A_COMPLETER','PARTIELLEMENT_LIVREE','AVEC_QUANTITES_MANQUANTES'].includes(statut))
      return <ExclamationCircleIcon className="h-5 w-5 text-orange-500" />;
    if (statut === 'EN_ATTENTE_STOCK')
      return <ClockIcon className="h-5 w-5 text-purple-500" />;
    return <ClockIcon className="h-5 w-5 text-blue-500" />;
  };

  const getStatusLabel = statut => ({
    EN_COURS: 'En cours',
    LIVREE: 'Livrée',
    INCOMPLET: 'Incomplet',
    A_COMPLETER: 'À compléter',
    COMPLET: 'Complet',
    EN_ATTENTE_STOCK: 'En attente stock',
    PARTIELLEMENT_LIVREE: 'Partiellement livrée',
    AVEC_QUANTITES_MANQUANTES: 'Quantités manquantes'
  }[statut] || statut);

  const calculateReliquatCommande = c =>
    (c.prixTotal || 0) - (c.montantPaye || 0);

  const getDocStatusIcon = value => {
    if (['ENVOYEE DHL','FAIT','IMPRIME','APPROUVEE','PRET'].includes(value))
      return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
    if (['ENVOYEE','DEPOSEE'].includes(value))
      return <ExclamationCircleIcon className="h-4 w-4 text-yellow-500" />;
    return <ClockIcon className="h-4 w-4 text-gray-500" />;
  };

  const exportToExcel = () => {
    const data = filteredCommandes.map(c => ({
      Référence: c.reference,
      Date: moment(c.dateCommande).format('DD/MM/YYYY'),
      Statut: getStatusLabel(c.statutBonDeCommande),
      'Montant Total': formatNumber(c.prixTotal),
      'Montant Payé': formatNumber(c.montantPaye),
      Reliquat: formatNumber(calculateReliquatCommande(c)),
      Devise: c.currency
    }));
    data.push(
      {},
      { Référence: 'STATISTIQUES' },
      { Référence: 'Total Commandes', Date: formatNumber(statistics.totalCommandes) },
      { Référence: 'Montant Total', Date: formatNumber(statistics.montantTotal) },
      { Référence: 'Reliquat Général', Date: formatNumber(statistics.reliquatGeneral) }
    );
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historique Commandes');
    XLSX.writeFile(
      wb,
      `historique_commandes_${client?.raisonSociale || 'client'}_${moment().format('YYYY-MM-DD')}.xlsx`
    );
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Historique des Commandes', 20, 20);

    if (client) {
      doc.setFontSize(12);
      doc.text(`Client: ${client.raisonSociale}`, 20, 35);
    }

    // Statistiques format PDF
    doc.setFontSize(14);
    doc.text('Statistiques', 20, 65);
    doc.setFontSize(10);
    doc.text(`Total commandes: ${pdfNumber(statistics.totalCommandes)}`, 20, 75);
    doc.text(`Montant total: ${pdfNumberDecimal(statistics.montantTotal)} €`, 20, 85);
    doc.text(`Reliquat général: ${pdfNumberDecimal(statistics.reliquatGeneral)} €`, 20, 95);

    // Tableau des commandes
    const tableData = filteredCommandes.map(c => [
      c.reference,
      moment(c.dateCommande).format('DD/MM/YYYY'),
      getStatusLabel(c.statutBonDeCommande),
      `${pdfNumberDecimal(c.prixTotal)} ${c.currency}`,
      `${pdfNumberDecimal(c.montantPaye)} ${c.currency}`,
      `${pdfNumberDecimal(calculateReliquatCommande(c))} ${c.currency}`
    ]);

    doc.autoTable({
      head: [['Référence','Date','Statut','Montant Total','Montant Payé','Reliquat']],
      body: tableData,
      startY: 110,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [71,85,105] }
    });

    doc.save(
      `historique_commandes_${client?.raisonSociale || 'client'}_${moment().format('YYYY-MM-DD')}.pdf`
    );
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
          <Button
            onClick={() => navigate('/clients')}
            variant="primary"
            className="mt-4"
            leftIcon={<ArrowLeftIcon className="h-5 w-5" />}
          >
            Retour aux clients
          </Button>
        </div>
      </div>
    );
  }

  const indexOfLast  = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredCommandes.slice(indexOfFirst, indexOfLast);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">

        {/* En-tête */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => navigate('/clients')}
              variant="secondary"
              leftIcon={<ArrowLeftIcon className="h-5 w-5" />}
            >
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Historique des Commandes</h1>
              {client && <p className="text-gray-600">Client: {client.raisonSociale}</p>}
            </div>
          </div>
          <div className="flex space-x-2">
            <Button onClick={exportToExcel} variant="success" leftIcon={<DocumentArrowDownIcon className="h-5 w-5" />}>
              Export Excel
            </Button>
            <Button onClick={exportToPDF} variant="primary" leftIcon={<PrinterIcon className="h-5 w-5" />}>
              Export PDF
            </Button>
          </div>
        </div>

        {/* Bannières par devise */}
        {Object.keys(statisticsByCurrency).length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Résumé par Devise</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(statisticsByCurrency)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([currency, stats]) => (
                <div key={currency} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-blue-900">{currency}</h3>
                    <div className="bg-blue-100 px-2 py-1 rounded-full">
                      <span className="text-sm font-medium text-blue-800">
                        {stats.totalCommandes} commande{stats.totalCommandes > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Montant Total</span>
                      <span className="font-semibold text-green-700">
                        {formatCurrency(stats.montantTotal, currency)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Montant Payé</span>
                      <span className="font-semibold text-blue-700">
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
                    
                    <div className="flex justify-between text-xs text-gray-500 pt-1">
                      <span>✓ {stats.commandesLivrees} livrées</span>
                      <span>⏳ {stats.commandesEnCours} en cours</span>
                      <span>⚠️ {stats.commandesIncompletes} incomplètes</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistiques */}
        {/* <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[
            { label: 'Total Commandes', value: statistics.totalCommandes, color: 'blue' },
            { label: 'Montant Total',   value: formatCurrency(statistics.montantTotal),   color: 'green' },
            { label: 'Reliquat Général', value: formatCurrency(statistics.reliquatGeneral), color: 'red' },
            { label: 'Livrées',         value: statistics.commandesLivrees,               color: 'green' },
            { label: 'En Cours',        value: statistics.commandesEnCours,              color: 'yellow' },
            { label: 'Incomplètes',     value: statistics.commandesIncompletes,           color: 'orange'}
          ].map((stat,i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4">
              <div className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div> */}

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-4 items-center">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                <input
                  type="date"
                  value={startDate ? moment(startDate).format('YYYY-MM-DD') : ''}
                  onChange={e => setStartDate(e.target.value ? new Date(e.target.value) : null)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                <input
                  type="date"
                  value={endDate ? moment(endDate).format('YYYY-MM-DD') : ''}
                  onChange={e => setEndDate(e.target.value ? new Date(e.target.value) : null)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500"
                />
              </div>
            </div>
            <Button onClick={() => { setStartDate(null); setEndDate(null); }} variant="secondary">
              Réinitialiser
            </Button>
          </div>
        </div>

        {/* Tableau des commandes */}
        {loading ? (
          <div className="text-center py-8">

            <div className="animate-spin w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent mx-auto"></div>
            <p className="mt-2 text-gray-600">Chargement en cours...</p>
          </div>
        ) : filteredCommandes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <div className="text-gray-400 text-lg">Aucune commande trouvée</div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border shadow-sm bg-white">
              <table className="min-w-full border-collapse border border-gray-400">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-700 border">Référence</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-700 border">Date</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-700 border">Statut</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-700 border">Montant Total</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-700 border">Montant Payé</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-700 border">Reliquat</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-700 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map(c => {
                    const reliquat = calculateReliquatCommande(c);
                    return (
                      <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-900 border">{c.reference}</td>
                        <td className="px-4 py-3 text-gray-700 border">{moment(c.dateCommande).format('DD/MM/YYYY')}</td>
                        <td className="px-4 py-3 border">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(c.statutBonDeCommande)}
                            <span>{getStatusLabel(c.statutBonDeCommande)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900 border">{formatCurrency(c.prixTotal, c.currency)}</td>
                        <td className="px-4 py-3 text-right text-green-600 border">{formatCurrency(c.montantPaye, c.currency)}</td>
                        <td className={`px-4 py-3 text-right border ${reliquat>0?'text-red-600 font-medium':'text-green-600'}`}>
                          {formatCurrency(reliquat, c.currency)}
                        </td>
                        <td className="px-4 py-3 text-center border">
                          <Button
                            onClick={() => { setSelectedCommande(c); setShowDetailsModal(true); }}
                            variant="primary"
                            size="sm"
                            leftIcon={<EyeIcon className="h-4 w-4" />}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredCommandes.length}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
          </>
        )}

        {/* Modal de détails */}
        {showDetailsModal && selectedCommande && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              <div className="bg-blue-600 text-white p-6 flex justify-between items-center rounded-t-xl">
                <div>
                  <h2 className="text-2xl font-bold">Détails de la Commande</h2>
                  <p className="text-blue-100 mt-1">Référence: {selectedCommande.reference}</p>
                </div>
                <button onClick={() => setShowDetailsModal(false)}>
                  <XCircleIcon className="h-8 w-8 text-white" />
                </button>
              </div>

              <div className="p-6 space-y-8">
                {/* Le reste des sections (générales, financières, articles, livraison, documents) */}
                {/* ... */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <Button onClick={() => setShowDetailsModal(false)} variant="secondary">
                    Fermer
                  </Button>
                  <Button
                    onClick={() => {
                      const data = [{
                        Référence: selectedCommande.reference,
                        Date: moment(selectedCommande.dateCommande).format('DD/MM/YYYY'),
                        Statut: getStatusLabel(selectedCommande.statutBonDeCommande),
                        'Montant Total': selectedCommande.prixTotal,
                        'Montant Payé': selectedCommande.montantPaye,
                        Reliquat: calculateReliquatCommande(selectedCommande),
                        Devise: selectedCommande.currency,
                        'N° Booking': selectedCommande.numeroBooking,
                        'N° Facture': selectedCommande.numeroFacture,
                        Destination: selectedCommande.destination,
                        Consigne: selectedCommande.consigne
                      }];
                      const ws = XLSX.utils.json_to_sheet(data);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Détails Commande');
                      XLSX.writeFile(wb, `details_commande_${selectedCommande.reference}_${moment().format('YYYY-MM-DD')}.xlsx`);
                    }}
                    variant="success"
                    leftIcon={<DocumentArrowDownIcon className="h-4 w-4" />}
                  >
                    Export Excel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

         {/* Modal de détails */}
        {showDetailsModal && selectedCommande && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              <div className="bg-blue-600 text-white p-6 flex justify-between items-center rounded-t-xl">
                <div>
                  <h2 className="text-2xl font-bold">Détails de la Commande</h2>
                  <p className="text-blue-100 mt-1">Référence: {selectedCommande.reference}</p>
                </div>
                <button onClick={() => setShowDetailsModal(false)}>
                  <XCircleIcon className="h-8 w-8 text-white" />
                </button>
              </div>

              <div className="p-6 space-y-8">
                {/* Informations Générales */}
                <section>
                  <h3 className="text-lg font-bold border-b-2 border-blue-500 pb-2 mb-4">INFORMATIONS GÉNÉRALES</h3>
                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <table className="w-full border-collapse">
                        <tbody>
                          <tr className="border-b border-gray-300">
                            <td className="py-2 px-3 bg-blue-100 font-semibold border">Référence</td>
                            <td className="py-2 px-3 border">{selectedCommande.reference}</td>
                          </tr>
                          <tr className="border-b border-gray-300">
                            <td className="py-2 px-3 bg-blue-100 font-semibold border">Date Commande</td>
                            <td className="py-2 px-3 border">{moment(selectedCommande.dateCommande).format('DD/MM/YYYY HH:mm')}</td>
                          </tr>
                          <tr className="border-b border-gray-300">
                            <td className="py-2 px-3 bg-blue-100 font-semibold border">Statut</td>
                            <td className="py-2 px-3 border">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(selectedCommande.statutBonDeCommande)}
                                <span>{getStatusLabel(selectedCommande.statutBonDeCommande)}</span>
                              </div>
                            </td>
                          </tr>
                          <tr className="border-b border-gray-300">
                            <td className="py-2 px-3 bg-blue-100 font-semibold border">Type Commande</td>
                            <td className="py-2 px-3 border">{selectedCommande.typeCommande || 'NORMALE'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <table className="w-full border-collapse">
                        <tbody>
                          <tr className="border-b border-gray-300">
                            <td className="py-2 px-3 bg-blue-100 font-semibold border">N° Booking</td>
                            <td className="py-2 px-3 border">{selectedCommande.numeroBooking || '-'}</td>
                          </tr>
                          <tr className="border-b border-gray-300">
                            <td className="py-2 px-3 bg-blue-100 font-semibold border">N° Facture</td>
                            <td className="py-2 px-3 border">{selectedCommande.numeroFacture || '-'}</td>
                          </tr>
                          <tr className="border-b border-gray-300">
                            <td className="py-2 px-3 bg-blue-100 font-semibold border">Destination</td>
                            <td className="py-2 px-3 border">{selectedCommande.destination || '-'}</td>
                          </tr>
                          <tr className="border-b border-gray-300">
                            <td className="py-2 px-3 bg-blue-100 font-semibold border">Consigne</td>
                            <td className="py-2 px-3 border">{selectedCommande.consigne || '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>

                {/* Informations Financières */}
                <section>
                  <h3 className="text-lg font-bold border-b-2 border-green-500 pb-2 mb-4">INFORMATIONS FINANCIÈRES</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <table className="w-full border-collapse">
                      <tbody>
                        <tr className="border-b border-gray-300">
                          <td className="py-3 px-4 bg-green-100 font-semibold border">Montant Total</td>
                          <td className="py-3 px-4 font-bold text-xl text-green-600 border">
                            {formatCurrency(selectedCommande.prixTotal, selectedCommande.currency)}
                          </td>
                          <td className="py-3 px-4 bg-blue-100 font-semibold border">Devise</td>
                          <td className="py-3 px-4 border">{selectedCommande.currency}</td>
                        </tr>
                        <tr className="border-b border-gray-300">
                          <td className="py-3 px-4 bg-green-100 font-semibold border">Montant Payé</td>
                          <td className="py-3 px-4 font-bold text-xl text-blue-600 border">
                            {formatCurrency(selectedCommande.montantPaye, selectedCommande.currency)}
                          </td>
                          <td className="py-3 px-4 bg-blue-100 font-semibold border">Statut Paiement</td>
                          <td className="py-3 px-4 border">
                            <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                              selectedCommande.statutDePaiement === 'PAYE' ? 'bg-green-100 text-green-800' :
                              selectedCommande.statutDePaiement === 'PARTIELLEMENT_PAYE' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {selectedCommande.statutDePaiement === 'PAYE' && <CheckCircleIcon className="h-4 w-4" />}
                              {selectedCommande.statutDePaiement === 'PARTIELLEMENT_PAYE' && <ExclamationCircleIcon className="h-4 w-4" />}
                              {selectedCommande.statutDePaiement === 'NON_PAYE' && <XCircleIcon className="h-4 w-4" />}
                              <span>
                                {selectedCommande.statutDePaiement === 'PAYE' ? 'Payé' :
                                 selectedCommande.statutDePaiement === 'PARTIELLEMENT_PAYE' ? 'Partiellement Payé' :
                                 'Non Payé'}
                              </span>
                            </span>
                          </td>
                        </tr>
                        <tr className="border-b border-gray-300">
                          <td className="py-3 px-4 bg-green-100 font-semibold border">Reliquat</td>
                          <td className="py-3 px-4 font-bold text-xl border">
                            {formatCurrency(calculateReliquatCommande(selectedCommande), selectedCommande.currency)}
                          </td>
                          <td className="py-3 px-4 bg-blue-100 font-semibold border">Moyen Paiement</td>
                          <td className="py-3 px-4 border">{selectedCommande.moyenDePaiement || '-'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Articles */}
                {selectedCommande.items?.length > 0 && (
                  <section>
                    <h3 className="text-lg font-bold border-b-2 border-purple-500 pb-2 mb-4">
                      ARTICLES COMMANDÉS ({selectedCommande.items.length})
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead className="bg-purple-100">
                          <tr>
                            <th className="py-3 px-4 border">Article</th>
                            <th className="py-3 px-4 text-center border">Qté (Kg)</th>
                            <th className="py-3 px-4 text-center border">Qté (Cartons)</th>
                            <th className="py-3 px-4 text-right border">Prix Unitaire</th>
                            <th className="py-3 px-4 text-right border">Prix Total</th>
                            <th className="py-3 px-4 text-center border">Statut Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCommande.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="py-3 px-4 border">
                                {item.article?.nom || item.article?.designation}
                              </td>
                              <td className="py-3 px-4 text-center border">
                                {formatNumber(item.quantiteKg)}
                              </td>
                              <td className="py-3 px-4 text-center border">
                                {formatNumber(item.quantiteCarton)}
                              </td>
                              <td className="py-3 px-4 text-right border">
                                {formatCurrency(item.prixUnitaire, selectedCommande.currency)}
                              </td>
                              <td className="py-3 px-4 text-right border">
                                {formatCurrency(item.prixTotal, selectedCommande.currency)}
                              </td>
                              <td className="py-3 px-4 text-center border">
                                <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                                  item.statutStock === 'DISPONIBLE' ? 'bg-green-100 text-green-800' :
                                  item.statutStock === 'PARTIEL'     ? 'bg-yellow-100 text-yellow-800' :
                                  item.statutStock === 'MANQUANT'    ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {item.statutStock}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* Livraison */}
                <section>
                  <h3 className="text-lg font-bold border-b-2 border-orange-500 pb-2 mb-4">INFORMATIONS DE LIVRAISON</h3>
                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <table className="w-full border-collapse">
                        <tbody>
                          <tr className="border-b border-gray-300">
                            <td className="py-2 px-3 bg-orange-100 font-semibold border">Date Prévue Chargement</td>
                            <td className="py-2 px-3 border">
                              {selectedCommande.datePrevueDeChargement
                                ? moment(selectedCommande.datePrevueDeChargement).format('DD/MM/YYYY')
                                : '-'}
                            </td>
                          </tr>
                          <tr className="border-b border-gray-300">
                            <td className="py-2 px-3 bg-orange-100 font-semibold border">N° Conteneur</td>
                            <td className="py-2 px-3 border">{selectedCommande.noDeConteneur || '-'}</td>
                          </tr>
                          <tr className="border-b border-gray-300">
                            <td className="py-2 px-3 bg-orange-100 font-semibold border">N° Plomb</td>
                            <td className="py-2 px-3 border">{selectedCommande.noPlomb || '-'}</td>
                          </tr>
                          <tr className="border-b border-gray-300">
                            <td className="py-2 px-3 bg-orange-100 font-semibold border">Seal Number</td>
                            <td className="py-2 px-3 border">{selectedCommande.sealNumber || '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <table className="w-full border-collapse">
                        <tbody>
                          <tr className="border-b border-gray-300">
                            <td className="py-2 px-3 bg-orange-100 font-semibold border">Poids Carton</td>
                            <td className="py-2 px-3 border">{selectedCommande.poidsCarton || 0} kg</td>
                          </tr>
                          <tr className="border-b border-gray-300">
                            <td className="py-2 px-3 bg-orange-100 font-semibold border">N° OP</td>
                            <td className="py-2 px-3 border">{selectedCommande.numeroOP || '-'}</td>
                          </tr>
                          <tr className="border-b border-gray-300">
                            <td className="py-2 px-3 bg-orange-100 font-semibold border">N° Bon Commande</td>
                            <td className="py-2 px-3 border">{selectedCommande.noBonDeCommande || '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>

                {/* Documents */}
                <section>
                  <h3 className="text-lg font-bold border-b-2 border-indigo-500 pb-2 mb-4">STATUTS DES DOCUMENTS</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Draft HC',     value: selectedCommande.draftHC },
                      { label: 'Facture',      value: selectedCommande.facture },
                      { label: 'Packing List', value: selectedCommande.packingList },
                      { label: 'Draft CO',     value: selectedCommande.draftCO },
                      { label: 'VGM',          value: selectedCommande.vgm },
                      { label: 'DHL',          value: selectedCommande.dhl },
                      { label: 'Étiquette',    value: selectedCommande.etiquette },
                      { label: 'Déclaration',  value: selectedCommande.declaration }
                    ].map((doc, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg border flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-700">{doc.label}</div>
                        <div className="inline-flex items-center space-x-1 text-xs font-medium">
                          {getDocStatusIcon(doc.value)}
                          <span>{doc.value || 'ÉTABLI'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Actions modal */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <Button onClick={() => setShowDetailsModal(false)} variant="secondary">
                    Fermer
                  </Button>
                  <Button
                    onClick={() => {
                      const data = [{
                        Référence: selectedCommande.reference,
                        Date: moment(selectedCommande.dateCommande).format('DD/MM/YYYY'),
                        Statut: getStatusLabel(selectedCommande.statutBonDeCommande),
                        'Montant Total': selectedCommande.prixTotal,
                        'Montant Payé': selectedCommande.montantPaye,
                        Reliquat: calculateReliquatCommande(selectedCommande),
                        Devise: selectedCommande.currency,
                        'N° Booking': selectedCommande.numeroBooking,
                        'N° Facture': selectedCommande.numeroFacture,
                        Destination: selectedCommande.destination,
                        Consigne: selectedCommande.consigne
                      }];
                      const ws = XLSX.utils.json_to_sheet(data);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Détails Commande');
                      XLSX.writeFile(wb, `details_commande_${selectedCommande.reference}_${moment().format('YYYY-MM-DD')}.xlsx`);
                    }}
                    variant="success"
                    leftIcon={<DocumentArrowDownIcon className="h-4 w-4" />}
                  >
                    Export Excel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ClientOrderHistory;
