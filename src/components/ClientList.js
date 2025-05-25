// frontend/src/components/ClientList.js
import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import Button from './Button';
import ClientForm from './ClientForm';
import Pagination from './Pagination';
import { PlusIcon, PencilIcon, InformationCircleIcon } from '@heroicons/react/24/solid';

function ClientList() {
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

  // Ajouter une logique de filtrage si nécessaire
  const filterClients = () => {
    // Exemple de filtre simple (à adapter selon vos besoins)
    setFiltered([...clients]);
  };

  const handleOpenFormToCreate = () => {
    setEditingClient(null);
    setShowForm(true);
  };

  const handleOpenFormToEdit = (client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
  };

  const handleClientCreatedOrUpdated = () => {
    setShowForm(false);
    fetchClients();
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

      {/* Affichage erreur éventuelle */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* État de chargement */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Chargement en cours...</p>
        </div>
      ) : clients.length === 0 ? (
        // Aucun client
        <div className="text-center py-12 bg-white rounded-lg border">
          <InformationCircleIcon className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">Aucun client trouvé</h3>
          <p className="mt-1 text-gray-500">
            Cliquez sur “Nouveau Client” pour en créer un
          </p>
        </div>
      ) : (
        // Tableau
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
              </tr>
            </thead>
            <tbody className="bg-white">
              {currentItems.map((client) => (
                <tr
                  key={client._id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-gray-900 border border-gray-400">
                    {client.raisonSociale}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border border-gray-400">
                    {client.adresse}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border border-gray-400">
                    {client.mail}
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
