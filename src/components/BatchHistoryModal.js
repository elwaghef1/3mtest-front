// Components/BatchHistoryModal.js - Modal pour afficher l'historique détaillé des batches
import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Button from './Button';
import {
  XMarkIcon,
  ClockIcon,
  CubeIcon,
  TruckIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const BatchHistoryModal = ({ 
  commande, 
  onClose,
  formatCurrency,
  formatNumber 
}) => {
  const [historique, setHistorique] = useState([]);
  const [statistiques, setStatistiques] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedLivraisons, setExpandedLivraisons] = useState({});

  // Fonctions de formatage par défaut
  const defaultFormatCurrency = (value, currency = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  const defaultFormatNumber = (value) => {
    return new Intl.NumberFormat('fr-FR').format(value || 0);
  };

  const formatCurrencyFunc = formatCurrency || defaultFormatCurrency;
  const formatNumberFunc = formatNumber || defaultFormatNumber;

  useEffect(() => {
    if (commande) {
      fetchHistorique();
    }
  }, [commande]);

  const fetchHistorique = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/commandes/${commande._id}/historique-livraisons`);
      const { historique, statistiquesBatches } = response.data;
      
      setHistorique(historique || []);
      setStatistiques(statistiquesBatches);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
      alert('Erreur lors du chargement de l\'historique des batches');
    } finally {
      setLoading(false);
    }
  };

  const toggleLivraison = (index) => {
    setExpandedLivraisons(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!commande) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CubeIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Historique des Batches
                </h2>
                <p className="text-gray-600">
                  Commande {commande.reference} - {commande.client?.raisonSociale}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              icon={<XMarkIcon className="h-5 w-5" />}
            />
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-4 text-gray-600">Chargement de l'historique...</span>
            </div>
          ) : (
            <>
              {/* Statistiques globales */}
              {statistiques && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <TruckIcon className="h-6 w-6 text-blue-600 mr-2" />
                      <div>
                        <p className="text-sm text-blue-600">Livraisons</p>
                        <p className="text-xl font-bold text-blue-800">
                          {statistiques.totalLivraisons}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <CubeIcon className="h-6 w-6 text-green-600 mr-2" />
                      <div>
                        <p className="text-sm text-green-600">Batches uniques</p>
                        <p className="text-xl font-bold text-green-800">
                          {statistiques.batchesUniques?.length || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-6 w-6 text-purple-600 mr-2" />
                      <div>
                        <p className="text-sm text-purple-600">Avec traçabilité</p>
                        <p className="text-xl font-bold text-purple-800">
                          {statistiques.livraisonsAvecBatches}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <InformationCircleIcon className="h-6 w-6 text-yellow-600 mr-2" />
                      <div>
                        <p className="text-sm text-yellow-600">Quantité totale</p>
                        <p className="text-xl font-bold text-yellow-800">
                          {formatNumberFunc(statistiques.quantiteTotaleHistorique)} kg
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Liste des batches uniques */}
              {statistiques?.batchesUniques?.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Batches utilisés dans cette commande
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {statistiques.batchesUniques.map((batch, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        <CubeIcon className="h-4 w-4 mr-1" />
                        {batch}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Historique des livraisons */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Historique détaillé des livraisons
                </h3>
                
                {historique.length === 0 ? (
                  <div className="text-center py-8">
                    <CubeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Aucune livraison avec traçabilité de batches</p>
                  </div>
                ) : (
                  historique.map((livraison, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <div
                        className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => toggleLivraison(index)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {expandedLivraisons[index] ? (
                              <ChevronDownIcon className="h-5 w-5 text-gray-500 mr-2" />
                            ) : (
                              <ChevronRightIcon className="h-5 w-5 text-gray-500 mr-2" />
                            )}
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                Livraison #{index + 1}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {formatDate(livraison.dateLivraison)} - {livraison.referenceLivraison}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {formatNumberFunc(livraison.quantiteLivree)} kg
                            </p>
                            {livraison.resumeBatches && (
                              <p className="text-sm text-blue-600">
                                {livraison.resumeBatches.nombreBatches} batch(es)
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {expandedLivraisons[index] && (
                        <div className="p-4 border-t border-gray-200">
                          {livraison.resumeBatches ? (
                            <div className="space-y-4">
                              {/* Résumé des batches */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-blue-50 p-3 rounded">
                                  <p className="text-sm text-blue-600">Batches utilisés</p>
                                  <p className="font-semibold text-blue-800">
                                    {livraison.resumeBatches.batchesUtilises.join(', ')}
                                  </p>
                                </div>
                                <div className="bg-green-50 p-3 rounded">
                                  <p className="text-sm text-green-600">Articles affectés</p>
                                  <p className="font-semibold text-green-800">
                                    {livraison.resumeBatches.articlesAffectes.join(', ')}
                                  </p>
                                </div>
                                <div className="bg-purple-50 p-3 rounded">
                                  <p className="text-sm text-purple-600">Dépôts affectés</p>
                                  <p className="font-semibold text-purple-800">
                                    {livraison.resumeBatches.depotsAffectes.join(', ')}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Détails des batches */}
                              {livraison.detailsBatches && livraison.detailsBatches.length > 0 && (
                                <div>
                                  <h5 className="font-semibold text-gray-900 mb-3">
                                    Détails des prélèvements
                                  </h5>
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                            Batch
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                            Article
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                            Quantité prélevée
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                            Avant / Après
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                            Dépôt
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        {livraison.detailsBatches.map((detail, detailIndex) => (
                                          <tr key={detailIndex} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                              {detail.batchNumber}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-600">
                                              {detail.articleId?.reference || detail.articleId?.intitule || 'N/A'}
                                            </td>
                                            <td className="px-4 py-2 text-sm font-semibold text-blue-600">
                                              {formatNumberFunc(detail.quantiteEnlevee)} kg
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-600">
                                              {formatNumberFunc(detail.quantiteAvantPrelevement)} kg → {formatNumberFunc(detail.quantiteApresPrelevement)} kg
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-600">
                                              {detail.depotId?.intitule || 'N/A'}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-gray-500">
                                Aucun détail de batch disponible pour cette livraison
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Fermer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchHistoryModal;
