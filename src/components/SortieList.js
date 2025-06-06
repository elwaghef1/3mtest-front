import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import Button from './Button';
import SortieDetails from './SortieDetails';
import SortieForm from './SortieForm';
import sortieService from '../services/sortieService';
import { InformationCircleIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { PrinterIcon, Package, Truck } from '@heroicons/react/24/outline';
import Pagination from './Pagination';
import moment from 'moment';
import 'moment/locale/fr';

// DateRangePicker
import CustomDateRangePicker from './CustomDateRangePicker';

// PDF generators
import { generateBonDeCommandePDF, generateInvoicePDF, generatePackingListPDF } from './pdfGenerators';
import { generateUnifiedSortiePDF } from '../services/unifiedDeliveryPDFService';

const SortieList = () => {
  const [sorties, setSorties] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [searchRef, setSearchRef] = useState('');
  const [searchBooking, setSearchBooking] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsSortie, setDetailsSortie] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    fetchData();
  }, []);

  // Charger la liste des sorties + clients
  const fetchData = async () => {
    try {
      setLoading(true);
      const [sortiesRes, cliRes] = await Promise.all([
        sortieService.getAllSorties(),
        axios.get('/clients'),
      ]);
      setSorties(sortiesRes);
      setFiltered(sortiesRes);
      setClients(cliRes.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Erreur de chargement des sorties.');
    } finally {
      setLoading(false);
    }
  };

  // Filtres
  useEffect(() => {
    let result = [...sorties];
    if (selectedClient) {
      result = result.filter(s => s.commande?.client?._id === selectedClient);
    }
    if (searchRef) {
      result = result.filter(s =>
        s.reference?.toLowerCase().includes(searchRef.toLowerCase()) ||
        s.commande?.reference?.toLowerCase().includes(searchRef.toLowerCase())
      );
    }
    if (searchBooking) {
      result = result.filter(s =>
        s.commande?.numeroBooking?.toLowerCase().includes(searchBooking.toLowerCase())
      );
    }
    if (startDate && endDate) {
      result = result.filter(s => {
        const d = moment(s.createdAt);
        return d.isBetween(startDate, endDate, 'day', '[]');
      });
    }
    setFiltered(result);
    setCurrentPage(1);
  }, [sorties, selectedClient, searchRef, searchBooking, startDate, endDate]);

  const resetFilters = () => {
    setSelectedClient('');
    setSearchRef('');
    setSearchBooking('');
    setStartDate(null);
    setEndDate(null);
  };

  const formatCurrency = (v, curr='EUR') =>
    new Intl.NumberFormat('fr-FR',{ style:'currency',currency:curr }).format(v||0);

  const formatDate = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

  const openForm = () => setShowForm(true);
  const closeForm = () => setShowForm(false);
  const onSortieCreated = () => {
    closeForm();
    fetchData();
  };

  const showDetailsFor = s => { setDetailsSortie(s); setShowDetails(true); };
  const closeDetails = () => setShowDetails(false);

  // Handler pour générer le PDF unifié
  const handleGenerateUnifiedPDF = (sortie) => {
    try {
      generateUnifiedSortiePDF(sortie);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Erreur lors de la génération du PDF');
    }
  };

  // Handler pour afficher les détails
  const handleShowDetails = (sortie) => {
    // Log pour débugger
    console.log('Sortie sélectionnée:', sortie);
    console.log('Commande de la sortie:', sortie.commande);
    
    // S'assurer que la commande est bien chargée avec toutes ses informations
    const sortieWithFullData = {
      ...sortie,
      commande: sortie.commande
    };
    setDetailsSortie(sortieWithFullData);
    setShowDetails(true);
  };

  return (
    <div className="p-4 lg:p-6">
      {/* En-tête + bouton “Nouvelle sortie” */}
      {/* <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Sorties (Commandes livrées)</h1>
        <Button
          onClick={openForm}
          variant="success"
          size="md"
        >
          Nouvelle sortie
        </Button>
      </div> */}

      {/* Filtres */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <select
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
            >
              <option value="">Tous les clients</option>
              {clients.map(c => (
                <option key={c._id} value={c._id}>{c.raisonSociale}</option>
              ))}
            </select>
          </div>
          {/* Référence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
            <input
              type="text"
              placeholder="Recherche par référence"
              value={searchRef}
              onChange={e => setSearchRef(e.target.value)}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* Numéro Booking */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Numéro Booking</label>
            <input
              type="text"
              placeholder="Recherche par booking"
              value={searchBooking}
              onChange={e => setSearchBooking(e.target.value)}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* Reset */}
          <div className="flex items-end">
            <Button
              onClick={resetFilters}
              variant="secondary"
              size="md"
              icon={<ArrowPathIcon className="h-4 w-4" />}
              className="w-full"
            >
              Réinitialiser
            </Button>
          </div>
        </div>
        {/* Plage de dates */}
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filtrer par plage de dates
          </label>
          <CustomDateRangePicker
            startDate={startDate}
            endDate={endDate}
            onDatesChange={({ startDate, endDate }) => {
              setStartDate(startDate);
              setEndDate(endDate);
            }}
            displayFormat="dd/MM/yyyy"
            numberOfMonths={1}
            showClearDates={true}
            startDatePlaceholderText="Date de début"
            endDatePlaceholderText="Date de fin"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
          {error} — veuillez rafraîchir la page
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent" />
          <p className="mt-2 text-gray-600">Chargement...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <InformationCircleIcon className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-bold">Aucune sortie trouvée</h3>
          <p className="mt-1 text-gray-500">Ajustez vos filtres</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border shadow-sm">
          <table className="min-w-full border-collapse border border-gray-400">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-400">Date</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border border-gray-400">Réf. Sortie</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border border-gray-400">Réf. Commande</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border border-gray-400">Client</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-400">Type</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700 border border-gray-400">Quantité (kg)</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {currentItems.map(s => (
                <tr key={s._id} className="hover:bg-gray-100">
                  <td className="px-4 py-3 text-center border border-gray-400">
                    {formatDate(s.createdAt)}
                  </td>
                  <td className="px-4 py-3 border border-gray-400">
                    {s.reference || s.numeroLivraisonPartielle || 'N/A'}
                  </td>
                  <td className="px-4 py-3 border border-gray-400">
                    {s.commande?.reference || 'N/A'}
                  </td>
                  <td className="px-4 py-3 border border-gray-400">
                    {s.commande?.client?.raisonSociale || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-center border border-gray-400">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      s.typeLivraison === 'PARTIELLE' 
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {s.typeLivraison === 'PARTIELLE' ? 'Partielle' : 'Complète'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right border border-gray-400">
                    {s.items?.reduce((total, item) => total + item.quantiteKg, 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center border border-gray-400">
                    <div className="flex flex-col sm:flex-row justify-center gap-2">
                      <Button
                        onClick={() => handleGenerateUnifiedPDF(s)}
                        variant="primary"
                        size="sm"
                        icon={<PrinterIcon className="h-5 w-5" />}
                        title="Télécharger PDF complet"
                      >
                        <span className="hidden sm:inline">PDF Complet</span>
                      </Button>
                      <Button
                        onClick={() => handleShowDetails(s)}
                        variant="ghost"
                        size="sm"
                        icon={<InformationCircleIcon className="h-5 w-5" />}
                        title="Voir détails"
                      >
                        <span className="hidden sm:inline">Détails</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <Pagination
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalItems={filtered.length}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}

      {/* Modal détails */}
      {showDetails && detailsSortie && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <SortieDetails
              sortie={detailsSortie}
              commande={detailsSortie.commande}
              onClose={closeDetails}
              formatCurrency={formatCurrency}
              formatNumber={(value) => new Intl.NumberFormat('fr-FR').format(value || 0)}
            />
          </div>
        </div>
      )}

      {/* Modal nouveau formulaire */}
      {showForm && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-6xl w-full max-w-6xl overflow-y-auto">
          <SortieForm onClose={closeForm} onSortieCreated={onSortieCreated} />
        </div>
      </div>
    )}
    </div>
  );
};

export default SortieList;
