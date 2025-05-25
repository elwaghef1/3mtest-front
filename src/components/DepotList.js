// frontend/src/components/DepotList.js
import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import DepotForm from './DepotForm';
import {
  PlusIcon,
  PencilIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/solid';
import Pagination from './Pagination';

function DepotList() {
  const [depots, setDepots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDepot, setEditingDepot] = useState(null);

  const [filtered, setFiltered] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDepots();
  }, []);

  const fetchDepots = async () => {
    try {
      setLoading(true);
      setError(null);
      // La route GET /depots renverra maintenant pour chaque dépôt un champ "locationTotal"
      const res = await axios.get('/depots');
      setDepots(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.error('Erreur récupération depots:', err);
      setError('Erreur lors du chargement des dépôts');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFormToCreate = () => {
    setEditingDepot(null);
    setShowForm(true);
  };

  const handleOpenFormToEdit = (depot) => {
    setEditingDepot(depot);
    setShowForm(true);
  };

  const handleCloseForm = () => setShowForm(false);

  const handleDepotCreatedOrUpdated = () => {
    setShowForm(false);
    fetchDepots();
  };

  return (
    <div className="p-4 lg:p-6">
      {/* Titre + bouton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Liste des Dépôts</h1>
        <button
          onClick={handleOpenFormToCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nouveau Dépôt
        </button>
      </div>

      {/* Erreur éventuelle */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Chargement */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Chargement en cours...</p>
        </div>
      ) : depots.length === 0 ? (
        // Aucun dépôt
        <div className="text-center py-12 bg-white rounded-lg border">
          <InformationCircleIcon className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">Aucun dépôt trouvé</h3>
          <p className="mt-1 text-gray-500">
            Cliquez sur “Nouveau Dépôt” pour en créer un
          </p>
        </div>
      ) : (
        // Tableau
        <div className="overflow-x-auto rounded-lg border shadow-sm">
          <table className="min-w-full border-collapse border border-gray-400">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-400">
                  Intitulé
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-400">
                  Location
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-400">
                  Code
                </th>
                {/* <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-400">
                  Total Location
                </th> */}
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {currentItems.map((depot) => (
                <tr key={depot._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-center text-sm text-gray-900 border border-gray-400">
                    {depot.intitule}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-700 border border-gray-400">
                    {depot.location || '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-700 border border-gray-400">
                    {depot.code || '—'}
                  </td>
                  {/* <td className="px-4 py-3 text-center font-bold text-white border border-gray-400 bg-red-800">
                    {new Intl.NumberFormat('fr-FR').format(depot.locationTotal || 0)} MRU
                  </td> */}
                  <td className="px-4 py-3 text-center text-sm text-gray-700 border border-gray-400">
                    <button
                      onClick={() => handleOpenFormToEdit(depot)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Modifier ce dépôt"
                    >
                      <PencilIcon className="h-5 w-5 inline" />
                    </button>
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <DepotForm
              onClose={handleCloseForm}
              onDepotCreated={handleDepotCreatedOrUpdated}
              initialDepot={editingDepot}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default DepotList;
