import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { CheckCircleIcon, ClockIcon, ExclamationCircleIcon, BellIcon } from '@heroicons/react/24/outline';

const AutoCompletionDashboard = () => {
  const [serviceStatus, setServiceStatus] = useState(null);
  const [pendingCommandes, setPendingCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState(null);

  useEffect(() => {
    fetchServiceStatus();
    fetchPendingCommandes();
    
    // Actualiser toutes les 30 secondes
    const interval = setInterval(() => {
      fetchServiceStatus();
      fetchPendingCommandes();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchServiceStatus = async () => {
    try {
      const response = await axios.get('/auto-completion/status');
      setServiceStatus(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération du statut:', error);
    }
  };

  const fetchPendingCommandes = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/auto-completion/pending');
      setPendingCommandes(response.data.commandesCompletables || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes en attente:', error);
      setPendingCommandes([]);
    } finally {
      setLoading(false);
    }
  };

  const triggerManualCheck = async () => {
    try {
      setLastCheck('En cours...');
      const response = await axios.post('/auto-completion/trigger');
      setLastCheck(new Date().toLocaleTimeString());
      
      // Actualiser les données après vérification
      setTimeout(() => {
        fetchPendingCommandes();
      }, 2000);
      
      return response.data;
    } catch (error) {
      setLastCheck('Erreur');
      console.error('Erreur lors de la vérification manuelle:', error);
    }
  };

  const startService = async () => {
    try {
      await axios.post('/auto-completion/start');
      fetchServiceStatus();
    } catch (error) {
      console.error('Erreur lors du démarrage du service:', error);
    }
  };

  const stopService = async () => {
    try {
      await axios.post('/auto-completion/stop');
      fetchServiceStatus();
    } catch (error) {
      console.error('Erreur lors de l\'arrêt du service:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Auto-Complétion des Commandes</h1>
          <div className="flex space-x-3">
            <button
              onClick={triggerManualCheck}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <BellIcon className="h-4 w-4 mr-2" />
              Vérification Manuelle
            </button>
          </div>
        </div>

        {/* Statut du Service */}
        <div className="bg-white rounded-lg shadow-sm border mb-6 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Statut du Service</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${serviceStatus?.isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">
                <strong>Service:</strong> {serviceStatus?.isRunning ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-2 text-gray-500" />
              <span className="text-sm">
                <strong>Fréquence:</strong> {serviceStatus?.nextRun || 'N/A'}
              </span>
            </div>
            <div className="flex items-center">
              <CheckCircleIcon className="h-4 w-4 mr-2 text-gray-500" />
              <span className="text-sm">
                <strong>Dernière vérif.:</strong> {lastCheck || 'Jamais'}
              </span>
            </div>
          </div>
          
          <div className="mt-4 flex space-x-3">
            {!serviceStatus?.isRunning ? (
              <button
                onClick={startService}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700"
              >
                Démarrer le Service
              </button>
            ) : (
              <button
                onClick={stopService}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700"
              >
                Arrêter le Service
              </button>
            )}
          </div>
        </div>

        {/* Commandes En Attente */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Commandes en Attente de Complétion
            </h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {pendingCommandes.length} en attente
            </span>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Chargement...</p>
            </div>
          ) : pendingCommandes.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">Aucune commande en attente de complétion</p>
              <p className="text-sm text-gray-500 mt-1">
                Toutes les commandes sont soit complètes, soit en attente de stock
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingCommandes.map((item, index) => {
                const commande = item.commande;
                return (
                  <div key={commande._id} className="border border-green-200 rounded-lg p-4 bg-green-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Commande {commande.reference}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Client: {commande.client?.raisonSociale || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Date: {new Date(commande.dateCommande).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircleIcon className="w-3 h-3 mr-1" />
                          Peut être complétée
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {item.message}
                        </p>
                      </div>
                    </div>

                    {commande.items && commande.items.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <p className="text-xs text-gray-600 mb-2">Articles avec quantités manquantes:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {commande.items
                            .filter(item => item.quantiteManquante > 0)
                            .map((item, idx) => (
                              <div key={idx} className="text-xs bg-white rounded p-2">
                                <span className="font-medium">{item.article?.reference || 'Article'}</span>
                                <span className="text-gray-600"> - {item.quantiteManquante}kg manquants</span>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Information */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationCircleIcon className="h-5 w-5 text-blue-400 mr-3 mt-0.5" />
            <div className="text-sm text-blue-800">
              <h3 className="font-medium mb-1">Comment ça fonctionne ?</h3>
              <ul className="space-y-1 text-xs">
                <li>• Le service vérifie automatiquement toutes les 5 minutes si des commandes peuvent être complétées</li>
                <li>• Quand du stock est ajouté (via entrées), une vérification immédiate est déclenchée</li>
                <li>• Les commandes avec stock suffisant passent automatiquement à "COMPLET"</li>
                <li>• Le stock est automatiquement déduit lors de la complétion</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoCompletionDashboard;
