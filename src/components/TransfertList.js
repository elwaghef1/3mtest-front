import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import Button from './Button';
import TransfertForm from './TransfertForm';
import TransfertDetails from './TransfertDetails';
import { PlusIcon, InformationCircleIcon, PrinterIcon } from '@heroicons/react/24/solid';
import Pagination from './Pagination';

// Exports PDF & Excel
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Logo base64 (fichier séparé)
import logoBase64 from './logoBase64';

function TransfertList() {
  const [transferts, setTransferts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTransfert, setEditingTransfert] = useState(null);
  const [error, setError] = useState(null);

  const [filtered, setFiltered] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Pour un modal de détails
  const [selectedTransfert, setSelectedTransfert] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchTransferts();
  }, []);

  useEffect(() => {
    setFiltered(transferts);
  }, [transferts]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  const fetchTransferts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/transferts');
      // Tri décroissant par date
      const sortedData = res.data.sort(
        (a, b) => new Date(b.dateTransfert) - new Date(a.dateTransfert)
      );
      setTransferts(sortedData);
      setFiltered(sortedData);
    } catch (err) {
      console.error('Erreur récupération transferts:', err);
      setError('Erreur lors du chargement des transferts');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFormToCreate = () => {
    setEditingTransfert(null);
    setShowForm(true);
  };

  const handleOpenFormToEdit = (t) => {
    setEditingTransfert(t);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
  };

  const handleTransfertCreatedOrUpdated = () => {
    setShowForm(false);
    fetchTransferts();
  };

  const handleOpenDetailsModal = (transfert) => {
    setSelectedTransfert(transfert);
    setShowDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
  };

  // Formatage d'article
  const formatArticle = (a) => {
    if (!a) return '—';
    const ref = a.reference || '';
    const spec = a.specification || '';
    const taille = a.taille || '';
    const tCarton = a.typeCarton || '';
    return [ref, spec, taille, tCarton].filter(Boolean).join(' - ');
  };

  // ------------------------------
  // Export PDF du listing
  // ------------------------------
  const exportToPDF = () => {
    // Initialisation du document en mode paysage
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });
  
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 14;
    const marginTop = 20;
  
    // =============================
    // 1. Titre principal
    // =============================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('Liste des Transferts', pageWidth / 2, marginTop, { align: 'center' });
  
    // Ligne de séparation sous le titre
    doc.setDrawColor(0, 102, 204); // Couleur bleue
    doc.setLineWidth(0.5);
    doc.line(marginLeft, marginTop + 3, pageWidth - marginLeft, marginTop + 3);
  
    // =============================
    // 2. Date de génération
    // =============================
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    const dateStr = new Date().toLocaleDateString('fr-FR');
    doc.text(`Généré le : ${dateStr}`, marginLeft, marginTop + 10);
  
    // =============================
    // 3. Préparation des données du tableau
    // =============================
    const columns = [
      { header: 'Date', dataKey: 'date' },
      { header: 'Article', dataKey: 'article' },
      { header: 'Dépôt Départ', dataKey: 'depotDepart' },
      { header: 'Dépôt Arrivée', dataKey: 'depotArrivee' },
      { header: 'Quantité (Kg)', dataKey: 'quantiteKg' },
      { header: 'Quantité (Carton)', dataKey: 'quantiteCarton' },
      { header: 'Pointeur', dataKey: 'pointeur' },
      { header: 'Moyen Transfert', dataKey: 'moyenTransfert' },
      { header: 'Immatricule', dataKey: 'immatricule' },
    ];
  
    const rows = filtered.map((t) => ({
      date: t.dateTransfert
        ? new Date(t.dateTransfert).toLocaleDateString()
        : '—',
      article: formatArticle(t.article),
      depotDepart: t.depotDepart?.intitule || '—',
      depotArrivee: t.depotArrivee?.intitule || '—',
      quantiteKg: t.quantiteKg,
      quantiteCarton: t.quantiteKg ? (t.quantiteKg / 20).toFixed(2) : '—',
      pointeur: t.pointeur || '—',
      moyenTransfert: t.moyenDeTransfert || '—',
      immatricule: t.immatricule || '—',
    }));
  
    // =============================
    // 4. Génération du tableau
    // =============================
    doc.autoTable({
      startY: marginTop + 15,
      head: [columns.map((col) => col.header)],
      body: rows.map((row) => columns.map((col) => row[col.dataKey])),
      theme: 'striped', // Lignes alternées
      headStyles: {
        fillColor: [0, 102, 204],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center',
      },
      styles: {
        fontSize: 9,
        cellPadding: 2,
        valign: 'middle',
        textColor: [30, 30, 30],
      },
      margin: { left: marginLeft, right: marginLeft },
    });
  
    // =============================
    // 5. Pagination (pied de page)
    // =============================
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        `Page ${i} / ${pageCount}`,
        doc.internal.pageSize.getWidth() - 25,
        doc.internal.pageSize.getHeight() - 10
      );
    }
  
    // =============================
    // 6. Sauvegarde du document
    // =============================
    doc.save(`transferts_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ------------------------------
  // Export Excel du listing
  // ------------------------------
  const exportToExcel = () => {
    const worksheetData = filtered.map((t) => ({
      Date: t.dateTransfert
        ? new Date(t.dateTransfert).toLocaleDateString()
        : '—',
      Article: formatArticle(t.article),
      'Dépôt Départ': t.depotDepart?.intitule || '—',
      'Dépôt Arrivée': t.depotArrivee?.intitule || '—',
      'Quantité (Kg)': t.quantiteKg,
      'Quantité (Carton)': t.quantiteKg
        ? (t.quantiteKg / 20).toFixed(2)
        : '—',
      Pointeur: t.pointeur || '—',
      'Moyen Transfert': t.moyenDeTransfert || '—',
      Immatricule: t.immatricule || '—',
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transferts');
    XLSX.writeFile(workbook, 'transferts_report.xlsx');
  };

  // Impression d’un bon de transfert PDF (optionnel, code existant)
  const generateBonDeTransfertPDF = (transfer) => {
    const doc = new jsPDF('p', 'mm', 'a5');

    // En-tête
    doc.addImage(logoBase64, 'PNG', 10, 10, 30, 30);
    doc.setFontSize(18);
    doc.text('MSM SEAFOOD', 45, 20);
    doc.setFontSize(12);
    doc.text('RC 576', 45, 28);
    doc.text('Agrément Sanitaire NO 02 133', 45, 34);

    const dateStr = new Date().toLocaleDateString('fr-FR');
    doc.text(`Date: ${dateStr}`, 150, 20);

    doc.setFontSize(16);
    doc.text('Bon de Transfert', 105, 50, { align: 'center' });

    // Table
    const headers = [
      [
        'Article',
        'Dépôt Départ',
        'Dépôt Arrivée',
        'Quantité (Kg)',
        'Quantité (Carton)',
        'Pointeur',
      ],
    ];
    const articleStr = transfer.article
      ? formatArticle(transfer.article)
      : 'Article non trouvé';
    const depotDepartStr = transfer.depotDepart
      ? transfer.depotDepart.intitule
      : '—';
    const depotArriveeStr = transfer.depotArrivee
      ? transfer.depotArrivee.intitule
      : '—';
    const quantiteKg = transfer.quantiteKg || '—';
    const quantiteCarton = transfer.quantiteKg
      ? (transfer.quantiteKg / 20).toFixed(2)
      : '—';
    const pointeurStr = transfer.pointeur || '—';

    const rows = [
      [
        articleStr,
        depotDepartStr,
        depotArriveeStr,
        quantiteKg,
        quantiteCarton,
        pointeurStr,
      ],
    ];

    doc.autoTable({
      startY: 60,
      head: headers,
      body: rows,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: {
        fillColor: 'gray',
        textColor: 'white',
        fontStyle: 'bold',
      },
    });

    // Signatures
    const finalY = doc.lastAutoTable.finalY || 70;
    doc.setFontSize(12);
    doc.text('Signature pointeur:', 10, finalY + 15);
    doc.text('Signature responsable:', 80, finalY + 15);

    doc.line(10, finalY + 17, 70, finalY + 17);
    doc.line(80, finalY + 17, 140, finalY + 17);

    doc.save(`bon_transfert_${transfer._id}.pdf`);
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Liste des Transferts</h1>
        <div className="flex items-center space-x-4">
          {/* Boutons d'export */}
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
          <Button
            onClick={handleOpenFormToCreate}
            variant="primary"
            size="md"
            icon={<PlusIcon className="h-5 w-5" />}
          >
            Nouveau Transfert
          </Button>
        </div>
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
      ) : transferts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <InformationCircleIcon className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">Aucun transfert trouvé</h3>
          <p className="mt-1 text-gray-500">
            Cliquez sur “Nouveau Transfert” pour en créer un
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border shadow-sm">
          <table className="min-w-full border-collapse border border-gray-400 text-center">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">
                  Date
                </th>
                <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">
                  Article
                </th>
                <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">
                  Dépôt Départ
                </th>
                <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">
                  Dépôt Arrivée
                </th>
                <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">
                  Quantité (Kg)
                </th>
                {/* <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">
                  Quantité (Carton)
                </th> */}
                <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">
                  Pointeur
                </th>
                <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">
                  Moyen Transfert
                </th>
                {/* <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">
                  Immatricule
                </th> */}
                <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {currentItems.map((t) => (
                <tr key={t._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-700 border border-gray-400">
                    {t.dateTransfert
                      ? new Date(t.dateTransfert).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border border-gray-400">
                    {formatArticle(t.article)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border border-gray-400">
                    {t.depotDepart?.intitule || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border border-gray-400">
                    {t.depotArrivee?.intitule || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border border-gray-400">
                    {t.quantiteKg}
                  </td>
                  {/* <td className="px-4 py-3 text-sm text-gray-700 border border-gray-400">
                    {t.quantiteKg ? (t.quantiteKg / 20).toFixed(2) : '—'}
                  </td> */}
                  <td className="px-4 py-3 text-sm text-gray-700 border border-gray-400">
                    {t.pointeur || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border border-gray-400">
                    {t.moyenDeTransfert || '—'}
                  </td>
                  {/* <td className="px-4 py-3 text-sm text-gray-700 border border-gray-400">
                    {t.immatricule || '—'}
                  </td> */}
                  <td className="px-4 py-3 flex text-sm text-gray-700 border border-gray-400">
                    {/* Bouton d'impression */}
                    <Button
                      onClick={() => generateBonDeTransfertPDF(t)}
                      variant="info"
                      size="sm"
                      icon={<PrinterIcon className="h-4 w-4" />}
                      className="mb-2"
                    >
                      Imprimer
                    </Button>
                    {/* Bouton de détails */}
                    <Button
                      onClick={() => handleOpenDetailsModal(t)}
                      variant="primary"
                      size="sm"
                      className="ml-3"
                    >
                      Détails
                    </Button>
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
            <TransfertForm
              onClose={handleCloseForm}
              onTransfertCreated={handleTransfertCreatedOrUpdated}
              initialTransfert={editingTransfert}
            />
          </div>
        </div>
      )}

      {/* Modal Détails */}
      {showDetailsModal && selectedTransfert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4">
            <TransfertDetails transfert={selectedTransfert} onClose={handleCloseDetailsModal} />
          </div>
        </div>
      )}
    </div>
  );
}

export default TransfertList;
