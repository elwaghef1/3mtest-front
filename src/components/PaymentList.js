import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import Button from './Button';
import CommandeDetails from './CommandeDetails';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/solid';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import Pagination from './Pagination';

function PaymentList() {
  const [commandes, setCommandes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [searchRef, setSearchRef] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showDetails, setShowDetails] = useState(false);
  const [detailsCommande, setDetailsCommande] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Calcul des éléments à afficher pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  // Calcul des totaux sur l'ensemble des commandes filtrées
  const totals = filtered.reduce(
    (acc, cmd) => {
      acc.prixTotal += cmd.prixTotal || 0;
      acc.montantPaye += cmd.montantPaye || 0;
      acc.reliquat += cmd.reliquat || 0;
      return acc;
    },
    { prixTotal: 0, montantPaye: 0, reliquat: 0 }
  );

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterCommandes();
  }, [commandes, selectedClient, searchRef]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [cmdRes, cliRes] = await Promise.all([
        axios.get('/commandes'),
        axios.get('/clients'),
      ]);

      setCommandes(cmdRes.data);
      setClients(cliRes.data);
      setFiltered(cmdRes.data);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const filterCommandes = () => {
    let result = [...commandes];

    if (selectedClient) {
      result = result.filter((cmd) => cmd.client?._id === selectedClient);
    }

    if (searchRef) {
      result = result.filter((cmd) =>
        cmd.reference?.toLowerCase().includes(searchRef.toLowerCase())
      );
    }

    setFiltered(result);
  };

  const resetFilters = () => {
    setSelectedClient('');
    setSearchRef('');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  // Génère un badge de statut de paiement
  const getPaymentBadge = (etatPaiement) => {
    const config = {
      PAYE: {
        color: 'bg-green-800 text-white',
        icon: <CheckCircleIcon className="h-4 w-4 mr-1" />,
      },
      PARTIELLEMENT_PAYE: {
        color: 'bg-orange-600 text-white',
        icon: <ExclamationCircleIcon className="h-4 w-4 mr-1" />,
      },
      NON_PAYE: {
        color: 'bg-red-800 text-white',
        icon: <XCircleIcon className="h-4 w-4 mr-1" />,
      },
      default: {
        color: 'bg-gray-800 text-white',
        icon: null,
      },
    };

    const { color, icon } = config[etatPaiement] || config.default;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${color}`}>
        {icon}
        {etatPaiement ? etatPaiement.replace(/_/g, ' ') : 'Inconnu'}
      </span>
    );
  };

  // Gestion du popup "Détails"
  const handleShowDetails = (cmd) => {
    setDetailsCommande(cmd);
    setShowDetails(true);
  };
  const handleCloseDetails = () => {
    setShowDetails(false);
  };

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Gestion des Paiements</h1>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <select
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              <option value="">Tous les clients</option>
              {clients.map((cli) => (
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

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
          {error} - Veuillez rafraîchir la page
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Chargement en cours...</p>
        </div>
      ) : filtered.length === 0 ? (
        // Aucun résultat
        <div className="text-center py-12 bg-white rounded-lg border">
          <InformationCircleIcon className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">Aucune commande trouvée</h3>
          <p className="mt-1 text-gray-500">Essayez d'ajuster vos filtres de recherche</p>
        </div>
      ) : (
        // Tableau avec ligne de totaux et bordures style Excel
        <div className="overflow-x-auto rounded-lg border shadow-sm">
          <table className="min-w-full border-collapse border border-gray-400">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border border-gray-400">Référence</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border border-gray-400">Client</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700 border border-gray-400">Prix Total</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700 border border-gray-400">Montant Payé</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700 border border-gray-400">Reliquat</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-400">Statut Paiement</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border border-gray-400">Date Livraison</th>
                {/* <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-400">Actions</th> */}
              </tr>
            </thead>
            <tbody className="bg-white">
              {currentItems.map((cmd) => (
                <tr key={cmd._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900 border border-gray-400">
                    <div className="font-medium">{cmd.reference}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 border border-gray-400">
                    {cmd.client?.raisonSociale || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium border border-gray-400">
                    {formatCurrency(cmd.prixTotal)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium border border-gray-400">
                    {formatCurrency(cmd.montantPaye)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium border border-gray-400">
                    {formatCurrency(cmd.reliquat)}
                  </td>
                  <td className="px-4 py-3 text-center border border-gray-400">
                    {getPaymentBadge(cmd.statutDePaiement)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 border border-gray-400">
                    {cmd.datePrevueDeChargement
                      ? new Date(cmd.datePrevueDeChargement).toLocaleDateString()
                      : '—'}
                  </td>
                  {/* <td className="px-4 py-3 text-center border border-gray-400">
                    <button
                      onClick={() => handleShowDetails(cmd)}
                      className="p-2 text-gray-600 hover:bg-blue-50 rounded-md"
                      title="Détails"
                    >
                      <InformationCircleIcon className="h-5 w-5" />
                    </button>
                  </td> */}
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100">
              <tr>
                <td className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400" colSpan="2">
                  Total
                </td>
                <td className="px-4 py-3 text-sm font-bold text-white text-right bg-blue-800 border border-gray-400">
                  {formatCurrency(totals.prixTotal)}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-white text-right bg-green-800 border border-gray-400">
                  {formatCurrency(totals.montantPaye)}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-white text-right bg-red-800 border border-gray-400">
                  {formatCurrency(totals.reliquat)}
                </td>
                <td className="border border-gray-400" colSpan="3"></td>
              </tr>
            </tfoot>
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

      {/* Modal Détails */}
      {showDetails && detailsCommande && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-8">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[100vh] overflow-y-auto">
            <CommandeDetails 
              commande={detailsCommande} 
              onClose={handleCloseDetails}
              formatCurrency={formatCurrency}
              formatNumber={(value) => new Intl.NumberFormat('fr-FR').format(value || 0)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentList;
