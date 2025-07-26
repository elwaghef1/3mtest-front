
import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import { useParams, Link } from 'react-router-dom';
import Button from './Button';
import {
  InformationCircleIcon,
  ScaleIcon,
  CubeIcon,
} from '@heroicons/react/24/solid';
import Pagination from './Pagination';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Fonction utilitaire pour formater l'article
const formatArticle = (article) => {
  if (!article) return '—';
  return [article.reference, article.specification, article.taille, article.typeCarton]
    .filter(Boolean)
    .join(' - ');
};

// Fonction de formatage des nombres
const formatNumber = (value) => {
  return new Intl.NumberFormat('fr-FR').format(value || 0);
};

function LotList() {
  // Récupération des paramètres depotId et articleId depuis l'URL
  const { depotId, articleId } = useParams();
  const [lots, setLots] = useState([]); // on stocke ici les entrées (lots) qui contiennent le bon item
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = lots.slice(indexOfFirstItem, indexOfLastItem);

  // Fonction utilitaire pour vérifier si un item correspond à l'article recherché et possède une quantité restante > 0
  const isMatchingItem = (item) => {
    if (!item || !item.article) return false;
    // On gère le cas où l'article est peuplé (objet) ou une simple chaîne
    const id = item.article._id ? item.article._id : item.article;
    return id === articleId && (item.quantiteRestante > 0);
  };

  // Fonction utilitaire pour calculer le coût de location pour un item donné en se basant sur la date d'entrée
  const computeLocationCost = (entryDate, item, entry) => {
    const now = new Date();
    // Utilise la période de grâce personnalisée de l'entrée ou 21 jours par défaut
    const gracePeriodDays = entry.joursGracePeriod || 21;
    const gracePeriodMs = gracePeriodDays * 24 * 60 * 60 * 1000; // Convertir en millisecondes
    const elapsedMs = now - new Date(entryDate);
    if (elapsedMs <= gracePeriodMs) return 0;
    
    // Calculer le nombre de semaines depuis la fin de la période de grâce
    const weekMs = 7 * 24 * 60 * 60 * 1000; // 1 semaine en millisecondes
    const weeks = Math.ceil((elapsedMs - gracePeriodMs) / weekMs);
    const quantityTonnes = (item.quantiteRestante || item.quantiteKg) / 1000;
    
    // Utiliser le prix location du dépôt si disponible, sinon le prix de l'item (compatibilité)
    const depotPrixLocation = entry.depot && entry.depot.prixLocation ? entry.depot.prixLocation : 0;
    const prixLocation = depotPrixLocation || item.prixLocation || 0;
    
    return weeks * prixLocation * quantityTonnes;
  };

  useEffect(() => {
    const fetchLots = async () => {
      try {
        // Récupération de toutes les entrées
        const res = await axios.get('/entrees');
        // Filtrer pour ne garder que les entrées du dépôt concerné ET qui contiennent au moins un item pour l'article demandé
        const filteredLots = res.data.filter((entry) => {
          if (!entry.depot || !entry.items || entry.items.length === 0) return false;
          if (entry.depot._id !== depotId) return false;
          const matchingItem = entry.items.find(isMatchingItem);
          return !!matchingItem;
        });
        setLots(filteredLots);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Erreur lors de la récupération des lots.");
      } finally {
        setLoading(false);
      }
    };
    fetchLots();
  }, [depotId, articleId]);

  // Calcul des statistiques pour les bannières (en se basant sur le item correspondant de chaque entrée)
  const totalEntreeKg = lots.reduce((acc, entry) => {
    const item = entry.items.find(isMatchingItem);
    return acc + (item ? item.quantiteKg : 0);
  }, 0);
  const totalRestanteKg = lots.reduce((acc, entry) => {
    const item = entry.items.find(isMatchingItem);
    return acc + (item ? item.quantiteRestante : 0);
  }, 0);
  const totalLocationCost = lots.reduce((acc, entry) => {
    const item = entry.items.find(isMatchingItem);
    const cost = item ? computeLocationCost(entry.dateEntree, item, entry) : 0;
    return acc + cost;
  }, 0);

  // Fonction d'export en PDF
  const exportToPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    // En-tête du PDF
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Détails des Lots', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, 14, 28);

    // Définition des colonnes pour l'export
    const columns = [
      { header: 'Batch Number', dataKey: 'batchNumber' },
      { header: 'Article', dataKey: 'article' },
      { header: 'Quantité Entrée (Kg)', dataKey: 'quantiteKg' },
      { header: 'Quantité Restante (Kg)', dataKey: 'quantiteRestante' },
      { header: 'Date Entrée', dataKey: 'dateEntree' },
      { header: 'Montant Location', dataKey: 'locationCost' },
    ];

    // Préparation des lignes en récupérant pour chaque entrée le item correspondant
    const rows = lots.map((entry) => {
      const item = entry.items.find(isMatchingItem);
      const cost = item ? computeLocationCost(entry.dateEntree, item, entry) : 0;
      return {
        batchNumber: entry.batchNumber,
        article: formatArticle(item ? item.article : null),
        quantiteKg: item ? item.quantiteKg : 0,
        quantiteRestante: item ? item.quantiteRestante : 0,
        dateEntree: new Date(entry.dateEntree).toLocaleDateString('fr-FR'),
        locationCost: cost,
      };
    });

    // Génération du tableau dans le PDF
    doc.autoTable({
      startY: 35,
      columns: columns.map((col) => ({
        title: col.header,
        dataKey: col.dataKey,
      })),
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 'black',
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: { fontSize: 9, cellPadding: 2, valign: 'middle' },
      styles: { cellWidth: 'wrap' },
      margin: { horizontal: 14 },
    });

    // Sauvegarde du PDF
    doc.save(`lots_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Fonction d'export en Excel
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      lots.map((entry) => {
        const item = entry.items.find(isMatchingItem);
        const cost = item ? computeLocationCost(entry.dateEntree, item, entry) : 0;
        return {
          "Batch Number": entry.batchNumber,
          "Article": formatArticle(item ? item.article : null),
          "Quantité Entrée (Kg)": item ? item.quantiteKg : 0,
          "Quantité Restante (Kg)": item ? item.quantiteRestante : 0,
          "Date Entrée": new Date(entry.dateEntree).toLocaleDateString('fr-FR'),
          "Montant Location": cost,
        };
      })
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lots');
    XLSX.writeFile(workbook, `lots_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-4 lg:p-6">
      {/* En-tête avec titre et lien de retour */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Détails des lots</h1>
        <div>
          <Link to="/stock" className="text-blue-600 hover:underline">
            &larr; Retour au stock
          </Link>
        </div>
      </div>

      {/* Bannières de synthèse */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        {/* Entrée Totale (Tonnes) */}
        <div className="bg-blue-600 p-4 rounded-lg shadow-sm text-white">
          <div className="flex items-center">
            <ScaleIcon className="h-8 w-8 mr-3" />
            <div>
              <div className="text-2xl font-bold">
                {formatNumber(totalEntreeKg / 1000)} T
              </div>
              <div className="text-sm">Entrée Totale (Tonnes)</div>
            </div>
          </div>
        </div>

        {/* Entrée Totale (Cartons) */}
        <div className="bg-blue-700 p-4 rounded-lg shadow-sm text-white">
          <div className="flex items-center">
            <CubeIcon className="h-8 w-8 mr-3" />
            <div>
              <div className="text-2xl font-bold">
                {formatNumber(totalEntreeKg / 20)}
              </div>
              <div className="text-sm">Entrée Totale (Cartons)</div>
            </div>
          </div>
        </div>

        {/* Restant Total (Tonnes) */}
        <div className="bg-green-600 p-4 rounded-lg shadow-sm text-white">
          <div className="flex items-center">
            <ScaleIcon className="h-8 w-8 mr-3" />
            <div>
              <div className="text-2xl font-bold">
                {formatNumber(totalRestanteKg / 1000)} T
              </div>
              <div className="text-sm">Restant Total (Tonnes)</div>
            </div>
          </div>
        </div>

        {/* Restant Total (Cartons) */}
        <div className="bg-green-700 p-4 rounded-lg shadow-sm text-white">
          <div className="flex items-center">
            <CubeIcon className="h-8 w-8 mr-3" />
            <div>
              <div className="text-2xl font-bold">
                {formatNumber(totalRestanteKg / 20)}
              </div>
              <div className="text-sm">Restant Total (Cartons)</div>
            </div>
          </div>
        </div>

        {/* Nombre de Lots */}
        <div className="bg-purple-600 p-4 rounded-lg shadow-sm text-white">
          <div className="flex items-center">
            <ScaleIcon className="h-8 w-8 mr-3" />
            <div>
              <div className="text-2xl font-bold">
                {formatNumber(lots.length)}
              </div>
              <div className="text-sm">Nombre de Lots</div>
            </div>
          </div>
        </div>

        {/* Montant Total de Location */}
        <div className="bg-indigo-600 p-4 rounded-lg shadow-sm text-white">
          <div className="flex items-center">
            <ScaleIcon className="h-8 w-8 mr-3" />
            <div>
              <div className="text-2xl font-bold">
                {formatNumber(totalLocationCost)}
              </div>
              <div className="text-sm">Montant Total de Location</div>
            </div>
          </div>
        </div>
      </div>

      {/* Gestion des états de chargement et d'erreur */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Chargement en cours...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
          {error} - Veuillez rafraîchir la page
        </div>
      ) : lots.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <InformationCircleIcon className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">Aucun lot trouvé</h3>
          <p className="mt-1 text-gray-500">
            Aucun lot n'est disponible pour cet article dans ce dépôt.
          </p>
        </div>
      ) : (
        <>
          {/* Boutons d'export */}
          <div className="flex justify-end mb-4 space-x-4">
            <Button
              onClick={exportToPDF}
              variant="primary"
              size="md"
            >
              Exporter en PDF
            </Button>
            <Button
              onClick={exportToExcel}
              variant="success"
              size="md"
            >
              Exporter en Excel
            </Button>
          </div>

          {/* Tableau des lots */}
          <div className="overflow-x-auto rounded-lg border shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border border-gray-400">
                    Batch Number
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border border-gray-400">
                    Article
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700 border border-gray-400">
                    Quantité Entrée (Kg)
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700 border border-gray-400">
                    Quantité Restante (Kg)
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-400">
                    Date Entrée
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700 border border-gray-400">
                    Montant Location
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.map((entry) => {
                  const item = entry.items.find(isMatchingItem);
                  const cost = item ? computeLocationCost(entry.dateEntree, item, entry) : 0;
                  return (
                    <tr key={entry._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 text-sm text-gray-700 border border-gray-400">
                        {entry.batchNumber}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700 border border-gray-400">
                        {formatArticle(item ? item.article : null)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700 text-right border border-gray-400">
                        {formatNumber(item ? item.quantiteKg : 0)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700 text-right border border-gray-400">
                        {formatNumber(item ? item.quantiteRestante : 0)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700 text-center border border-gray-400">
                        {new Date(entry.dateEntree).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700 text-right border border-gray-400">
                        {formatNumber(cost)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {lots.length > 0 && (
            <Pagination
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalItems={lots.length}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}
        </>
      )}
    </div>
  );
}

export default LotList;
