// frontend/src/components/ClientList.js
import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import Button from './Button';
import ClientForm from './ClientForm';
import Pagination from './Pagination';
import { PlusIcon, PencilIcon, TrashIcon, InformationCircleIcon, ClockIcon } from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';

function ClientList() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [error, setError] = useState(null);

  // États pagination et filtres
  const [filtered, setFiltered] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Calcul des éléments à afficher
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/clients');
      setClients(response.data);
      setFiltered(response.data); // Initialiser les données filtrées
    } catch (err) {
      console.error('Erreur récupération clients:', err);
      setError('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFormToCreate = () => {
    setEditingClient(null);
    setShowForm(true);
  };

  const handleOpenFormToEdit = async (client) => {
    try {
      setLoading(true);
      setError(null);
      // On récupère les toutes dernières données du client
      const response = await axios.get(`/clients/${client._id}`);
      setEditingClient(response.data);
      setShowForm(true);
    } catch (err) {
      console.error('Erreur chargement client pour édition :', err);
      setError('Impossible de charger le client pour modification');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingClient(null);
  };

  const handleClientCreatedOrUpdated = () => {
    setShowForm(false);
    fetchClients();
  };

  const handleDeleteClient = async (clientId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      try {
        await axios.delete(`/clients/${clientId}`);
        fetchClients();
      } catch (err) {
        console.error('Erreur lors de la suppression du client :', err);
        setError('Erreur lors de la suppression du client');
      }
    }
  };

  return (
    <div className="p-4 lg:p-6">
      {/* Titre + Bouton principal */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Liste des Clients</h1>
        <Button
          onClick={handleOpenFormToCreate}
          variant="primary"
          size="md"
          leftIcon={<PlusIcon className="h-5 w-5" />}
        >
          Nouveau Client
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Chargement en cours...</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <InformationCircleIcon className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">Aucun client trouvé</h3>
          <p className="mt-1 text-gray-500">
            Cliquez sur “Nouveau Client” pour en créer un
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border shadow-sm">
          <table className="min-w-full border-collapse border border-gray-400">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border border-gray-400">
                  Raison Sociale
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border border-gray-400">
                  Adresse
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border border-gray-400">
                  Mail
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {currentItems.map((client) => (
                <tr key={client._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900 border border-gray-400">
                    {client.raisonSociale}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border border-gray-400">
                    {client.adresse}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border border-gray-400">
                    {client.mail}
                  </td>
                  <td className="px-4 py-3 text-center border border-gray-400">
                    <div className="flex justify-center space-x-2">
                      <Button
                        onClick={() => navigate(`/clients/${client._id}/historique`)}
                        variant="primary"
                        size="sm"
                        leftIcon={<ClockIcon className="h-4 w-4" />}
                        title="Historique des commandes"
                      >Historique</Button>

                      <Button
                        onClick={() => handleOpenFormToEdit(client)}
                        variant="warning"
                        size="sm"
                        leftIcon={<PencilIcon className="h-4 w-4" />}
                        title="Modifier"
                      >Modifier</Button>
                      {/* <Button
                        onClick={() => handleDeleteClient(client._id)}
                        variant="danger"
                        size="sm"
                        leftIcon={<TrashIcon className="h-4 w-4" />}
                        title="Supprimer"
                      /> */}
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

      {/* Modal Form sans prop key */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <ClientForm
              onClose={handleCloseForm}
              onClientCreated={handleClientCreatedOrUpdated}
              initialClient={editingClient}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientList;
