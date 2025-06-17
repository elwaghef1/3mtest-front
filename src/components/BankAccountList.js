// frontend/src/components/BankAccountList.js
import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import Button from './Button';
import BankAccountForm from './BankAccountForm';
import Pagination from './Pagination';
import { PlusIcon, InformationCircleIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/solid';

function BankAccountList() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [error, setError] = useState(null);

  // États pour la pagination
  const [filtered, setFiltered] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/bankaccounts');
      setAccounts(response.data);
      setFiltered(response.data);
    } catch (err) {
      console.error('Erreur lors de la récupération des comptes bancaires:', err);
      setError('Erreur lors du chargement des comptes bancaires');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFormForCreate = () => {
    setEditingAccount(null);
    setShowForm(true);
  };

  const handleOpenFormForEdit = (account) => {
    setEditingAccount(account);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
  };

  const handleAccountCreated = () => {
    setShowForm(false);
    fetchBankAccounts();
  };

  const handleDeleteAccount = async (accountId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce compte bancaire ?')) {
      try {
        await axios.delete(`/bankaccounts/${accountId}`);
        fetchBankAccounts();
      } catch (err) {
        console.error('Erreur lors de la suppression du compte bancaire:', err);
        setError('Erreur lors de la suppression du compte bancaire');
      }
    }
  };

  return (
    <div className="p-4 lg:p-6">
      {/* Titre et bouton pour ajouter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Comptes Bancaires</h1>
        <Button
          onClick={handleOpenFormForCreate}
          variant="primary"
          size="md"
          leftIcon={<PlusIcon className="h-5 w-5" />}
        >
          Nouveau Compte
        </Button>
      </div>

      {/* Message d'erreur */}
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
      ) : accounts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <InformationCircleIcon className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">Aucun compte bancaire trouvé</h3>
          <p className="mt-1 text-gray-500">
            Cliquez sur “Nouveau Compte” pour en créer un
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border shadow-sm">
          <table className="min-w-full border-collapse border border-gray-400">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border border-gray-400">
                  Banque
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border border-gray-400">
                  Titulaire
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border border-gray-400">
                  IBAN
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border border-gray-400">
                  Code Swift
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border border-gray-400">
                  Banque Intermédiaire
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border border-gray-400">
                  Swift Intermédiaire
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {currentItems.map((account) => (
                <tr key={account._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900 border border-gray-400">{account.banque}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 border border-gray-400">{account.titulaire}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 border border-gray-400">{account.iban}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 border border-gray-400">{account.codeSwift}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 border border-gray-400">
                    {account.compteIntermediaire || '—'}
                  </td>
                  <td className="px-4 py-3 text-center border border-gray-400">
                    <div className="flex justify-center space-x-2">
                      <Button
                        onClick={() => handleOpenFormForEdit(account)}
                        variant="warning"
                        size="sm"
                        leftIcon={<PencilIcon className="h-4 w-4" />}
                        title="Modifier"
                      />
                      <Button
                        onClick={() => handleDeleteAccount(account._id)}
                        variant="danger"
                        size="sm"
                        leftIcon={<TrashIcon className="h-4 w-4" />}
                        title="Supprimer"
                      />
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

      {/* Modal du formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <BankAccountForm
              onClose={handleCloseForm}
              onAccountCreated={handleAccountCreated}
              initialAccount={editingAccount}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default BankAccountList;
