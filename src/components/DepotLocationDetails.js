// frontend/src/components/DepotLocationDetails.js
import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import { 
  XMarkIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/solid';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

function DepotLocationDetails({ depot, onClose }) {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLotsDetails();
  }, [depot._id]);

  const fetchLotsDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/entrees');
      
      // Filtrer les entrées pour ce dépôt et qui ont des quantités restantes
      const filteredEntrees = res.data.filter(entree => {
        const depotId = typeof entree.depot === 'object' ? entree.depot._id : entree.depot;
        return depotId === depot._id && entree.items.some(item => (item.quantiteRestante || 0) > 0);
      });

      // Traiter chaque entrée pour extraire les détails des lots
      const lotsData = [];
      
      filteredEntrees.forEach(entree => {
        entree.items.forEach(item => {
          if ((item.quantiteRestante || 0) > 0) {
            const locationCost = calculateLocationCost(entree, item);
            
            // Ne garder que les lots avec un coût de location > 0
            if (locationCost > 0) {
              lotsData.push({
                batchNumber: entree.batchNumber,
                article: item.article ? `${item.article.reference} - ${item.article.specification}` : 'Article inconnu',
                dateEntree: entree.dateEntree,
                quantiteRestante: item.quantiteRestante || 0,
                prixLocation: depot.prixLocation || item.prixLocation || 0,
                locationCost: locationCost,
                joursGrace: entree.joursGracePeriod || 21,
                entreeId: entree._id
              });
            }
          }
        });
      });

      setLots(lotsData);
    } catch (err) {
      console.error('Erreur lors du chargement des lots:', err);
      setError('Erreur lors du chargement des détails');
    } finally {
      setLoading(false);
    }
  };

  // Calcul du coût de location pour un item spécifique
  const calculateLocationCost = (entree, item) => {
    const now = new Date();
    const gracePeriodDays = entree.joursGracePeriod || 21;
    const gracePeriodMs = gracePeriodDays * 24 * 60 * 60 * 1000;
    const elapsedMs = now - new Date(entree.dateEntree);
    
    if (elapsedMs <= gracePeriodMs) return 0;
    
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const weeks = Math.ceil((elapsedMs - gracePeriodMs) / weekMs);
    const quantityTonnes = (item.quantiteRestante || 0) / 1000;
    const prixLocation = depot.prixLocation || item.prixLocation || 0;
    
    return weeks * prixLocation * quantityTonnes;
  };

  // Calcul du total
  const totalLocationCost = lots.reduce((sum, lot) => sum + lot.locationCost, 0);

  // Export PDF
  const exportToPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // En-tête
    doc.setFontSize(16).setFont(undefined, 'bold');
    doc.text(`Détails Location - ${depot.intitule}`, 14, 20);
    
    doc.setFontSize(10).setFont(undefined, 'normal');
    doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, 14, 28);
    
    // Tableau
    const columns = [
      'Batch Number',
      'Article',
      'Date Entrée',
      'Qty Restante (Kg)',
      'Prix Location',
      'Montant Dû (MRU)'
    ];
    
    const rows = lots.map(lot => [
      lot.batchNumber,
      lot.article,
      new Date(lot.dateEntree).toLocaleDateString('fr-FR'),
      new Intl.NumberFormat('fr-FR').format(lot.quantiteRestante),
      `${lot.prixLocation} MRU/T/sem`,
      new Intl.NumberFormat('fr-FR').format(lot.locationCost)
    ]);
    
    doc.autoTable({
      startY: 35,
      head: [columns],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold', textColor: 'black' },
      foot: [['TOTAL', '', '', '', '', new Intl.NumberFormat('fr-FR').format(totalLocationCost) + ' MRU']],
      styles: { fontSize: 8 }
    });
    
    doc.save(`details-location-${depot.intitule}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-center text-gray-600">Chargement des détails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
        {/* En-tête */}
        <div className="bg-blue-600 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Détails Location</h2>
            <p className="text-blue-100">{depot.intitule} - {depot.code}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-700 p-2 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Statistiques */}
        <div className="bg-gray-50 p-4 border-b">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center">
                <ArchiveBoxIcon className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Nombre de Lots</p>
                  <p className="text-2xl font-bold text-gray-900">{lots.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Prix Location</p>
                  <p className="text-2xl font-bold text-green-600">{depot.prixLocation || 0} MRU/T/sem</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center">
                <ArchiveBoxIcon className="h-8 w-8 text-orange-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Qty Restante</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {new Intl.NumberFormat('fr-FR').format(
                      lots.reduce((sum, lot) => sum + lot.quantiteRestante, 0)
                    )} Kg
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-8 w-8 text-red-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Dû</p>
                  <p className="text-2xl font-bold text-red-600">
                    {new Intl.NumberFormat('fr-FR').format(totalLocationCost)} MRU
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Lots avec Coût de Location</h3>
            <p className="text-sm text-gray-600">
              Seuls les lots hors période de grâce sont affichés
            </p>
          </div>
          <button
            onClick={exportToPDF}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Exporter PDF
          </button>
        </div>

        {/* Tableau */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 350px)' }}>
          {error ? (
            <div className="p-8 text-center">
              <p className="text-red-600">{error}</p>
            </div>
          ) : lots.length === 0 ? (
            <div className="p-8 text-center">
              <ArchiveBoxIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucun lot avec coût de location pour ce dépôt</p>
              <p className="text-sm text-gray-400 mt-2">
                Les lots dans leur période de grâce n'apparaissent pas ici
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Batch Number</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Article</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date Entrée</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Qty Restante (Kg)</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Jours Grâce</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Prix Location</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Montant Dû (MRU)</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((lot, index) => (
                  <tr key={`${lot.entreeId}-${index}`} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">
                      {lot.batchNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {lot.article}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex items-center">
                        <CalendarDaysIcon className="h-4 w-4 text-gray-400 mr-2" />
                        {new Date(lot.dateEntree).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {new Intl.NumberFormat('fr-FR').format(lot.quantiteRestante)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">
                      {lot.joursGrace}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">
                      {lot.prixLocation} MRU/T/sem
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold">
                      <span className={lot.locationCost > 0 ? 'text-red-600' : 'text-green-600'}>
                        {new Intl.NumberFormat('fr-FR').format(lot.locationCost)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 sticky bottom-0">
                <tr>
                  <td colSpan="6" className="px-4 py-3 text-right font-bold text-gray-700">
                    TOTAL :
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-lg text-red-600">
                    {new Intl.NumberFormat('fr-FR').format(totalLocationCost)} MRU
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default DepotLocationDetails;
