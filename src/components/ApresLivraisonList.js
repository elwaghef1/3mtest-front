// frontend/src/components/ApresLivraisonList.js
import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import Button from './Button';
import ApresLivraisonForm from './ApresLivraisonForm';
import ApresLivraisonDetails from './ApresLivraisonDetails';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  PencilIcon,
} from '@heroicons/react/24/solid';
import Pagination from './Pagination';

function ApresLivraisonList() {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pour l'ouverture du formulaire (création / modification)
  const [showForm, setShowForm] = useState(false);
  const [editingCommande, setEditingCommande] = useState(null);

  // Pour l'ouverture des détails
  const [showDetails, setShowDetails] = useState(false);
  const [detailsCommande, setDetailsCommande] = useState(null);

  const [filtered, setFiltered] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Calcul des éléments à afficher
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    fetchCommandes();
  }, []);

  const fetchCommandes = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/commandes');
      // On suppose que la commande comporte déjà des totaux calculés (prixTotal, quantiteKg, quantiteCarton)
      setCommandes(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.error(err);
      setError('Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = () => {
    setEditingCommande(null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
  };

  const handleCommandeCreatedOrUpdated = () => {
    setShowForm(false);
    fetchCommandes();
  };

  const handleEdit = (cmd) => {
    setEditingCommande(cmd);
    setShowForm(true);
  };

  const handleShowDetails = (cmd) => {
    setDetailsCommande(cmd);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
  };

  // Même fonction pour obtenir le badge de paiement (rappelé depuis CommandeList)
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

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Plan de Chargement</h1>
        {/* Bouton de création : si besoin, vous pouvez décommenter */}
        {/* <button
          onClick={handleOpenForm}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Créer un nouveau plan
        </button> */}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
          {error} - Veuillez rafraîchir la page
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Chargement en cours...</p>
        </div>
      ) : commandes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <InformationCircleIcon className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">Aucune commande trouvée</h3>
          <p className="mt-1 text-gray-500">Aucun plan de chargement n'a été créé</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border shadow-sm">
  <table className="min-w-full border-collapse border border-gray-400 text-sm">
    <thead className="bg-gray-50">
      <tr>
        <th className="px-4 py-3 text-left font-medium text-gray-700 border border-gray-400">
          Référence
        </th>
        <th className="px-4 py-3 text-left font-medium text-gray-700 border border-gray-400">
          Client
        </th>
        <th className="px-4 py-3 text-left font-medium text-gray-700 border border-gray-400">
          OP
        </th>
        <th className="px-4 py-3 text-left font-medium text-gray-700 border border-gray-400">
          Booking
        </th>
        <th className="px-4 py-3 text-left font-medium text-gray-700 border border-gray-400">
          Cargo
        </th>
        <th className="px-4 py-3 text-left font-medium text-gray-700 border border-gray-400">
          Date Prévue
        </th>
        <th className="px-4 py-3 text-right font-medium text-gray-700 border border-gray-400">
          Quantité (Kg)
        </th>
        <th className="px-4 py-3 text-right font-medium text-gray-700 border border-gray-400">
          Quantité (Cartons)
        </th>
        <th className="px-4 py-3 text-left font-medium text-gray-700 border border-gray-400">
          Statut BC
        </th>
        <th className="px-4 py-3 text-center font-medium text-gray-700 border border-gray-400">
          Statut Paiement
        </th>
        <th className="px-4 py-3 text-center font-medium text-gray-700 border border-gray-400">
          Actions
        </th>
      </tr>
    </thead>
    <tbody className="bg-white">
      {currentItems.map((cmd) => (
        <tr key={cmd._id} className="hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3 border border-gray-400">
            {cmd.reference || '—'}
            {(!cmd.reference || !cmd.numeroOP) && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                À compléter
              </span>
            )}
          </td>
          <td className="px-4 py-3 border border-gray-400">
            {cmd.client?.raisonSociale || '—'}
          </td>
          <td className="px-4 py-3 border border-gray-400">
            {cmd.numeroOP || '—'}
          </td>
          <td className="px-4 py-3 border border-gray-400">
            {cmd.booking || '—'}
          </td>
          <td className="px-4 py-3 border border-gray-400">
            {cmd.cargo || '—'}
          </td>
          <td className="px-4 py-3 border border-gray-400">
            {cmd.datePrevueDeChargement
              ? new Date(cmd.datePrevueDeChargement).toLocaleDateString()
              : '—'}
          </td>
          <td className="px-4 py-3 text-right border border-gray-400">
            {cmd.quantiteKg || '—'}
          </td>
          <td className="px-4 py-3 text-right border border-gray-400">
            {cmd.quantiteCarton || '—'}
          </td>
          <td className="px-4 py-3 border border-gray-400">
            {cmd.statutBonDeCommande || '—'}
          </td>
          <td className="px-4 py-3 text-center border border-gray-400">
            {getPaymentBadge(cmd.statutDePaiement)}
          </td>
          <td className="px-4 py-3 text-center border border-gray-400">
            <div className="flex justify-center space-x-2">
              <Button
                onClick={() => handleShowDetails(cmd)}
                variant="ghost"
                size="sm"
                leftIcon={<InformationCircleIcon className="h-5 w-5" />}
                title="Voir détails"
              >
                <span className="hidden sm:inline">Voir détails</span>
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

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-8">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[100vh] overflow-y-auto">
            <ApresLivraisonForm
              onClose={handleCloseForm}
              onPlanCreated={handleCommandeCreatedOrUpdated}
              initialCommande={editingCommande}
            />
          </div>
        </div>
      )}

      {/* Modal Détails */}
      {showDetails && detailsCommande && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-8">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[100vh] overflow-y-auto">
            <ApresLivraisonDetails commande={detailsCommande} onClose={handleCloseDetails} />
          </div>
        </div>
      )}
    </div>
  );
}

export default ApresLivraisonList;
