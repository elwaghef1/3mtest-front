// frontend/src/components/EntreeList.js
import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import Button from './Button';
import EntreeForm from './EntreeForm';
import EntreeDetails from './EntreeDetails';
import {
  PlusIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  PrinterIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from '@heroicons/react/24/solid';
import Pagination from './Pagination';

// Gestion des dates
import CustomDateRangePicker from './CustomDateRangePicker';
import moment from 'moment';
import 'moment/locale/fr';

// Export PDF & Excel
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Import de QRCode
import QRCode from 'qrcode';

// Import du logo en base64

// Import des utilitaires de conversion
import { convertKgToCarton } from '../utils/cartonsUtils';
import logoBase64 from './logoBase64';

moment.locale('fr');

// Fonction utilitaire pour calculer la quantité totale
function totalQuantity(items) {
  if (!items) return 0;
  return items.reduce((sum, item) => sum + (item.quantiteKg || 0), 0);
}

// Fonction utilitaire pour calculer le total des cartons
function totalCartons(items) {
  if (!items) return 0;
  return items.reduce((sum, item) => {
    const cartons = convertKgToCarton(item.quantiteKg || 0, item.article);
    return sum + cartons;
  }, 0);
}

// Fonction utilitaire pour calculer le total monétaire
function totalPrice(items) {
  if (!items) return 0;
  return items.reduce(
    (sum, item) => sum + (item.quantiteKg || 0) * (item.prixUnitaire || 0),
    0
  );
}

// Fonction utilitaire pour calculer la différence tunnel totale
function totalTunnelDifference(items) {
  if (!items) return 0;
  return items.reduce((sum, item) => {
    const quantite = item.quantiteKg || 0;
    const quantiteTunnel = item.quantiteTunnel || 0;
    return sum + (quantite - quantiteTunnel);
  }, 0);
}

// Fonction pour formater la différence tunnel avec couleurs
function formatTunnelDifference(difference) {
  if (difference === 0) {
    return <span className="text-gray-600">0</span>;
  }
  
  if (difference > 0) {
    return <span className="text-green-600 font-medium">+{difference.toFixed(2)}</span>;
  } else {
    return <span className="text-red-600 font-medium">{difference.toFixed(2)}</span>;
  }
}

function EntreeList() {
  const [entrees, setEntrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntree, setEditingEntree] = useState(null);

  // États pour la fenêtre de détails
  const [selectedEntree, setSelectedEntree] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [filtered, setFiltered] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filtres par date
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Filtres : Dépôt et recherche "Batch Number"
  const [selectedDepot, setSelectedDepot] = useState('');
  const [batchSearch, setBatchSearch] = useState('');
  const [articleSearch, setArticleSearch] = useState('');

  const [error, setError] = useState(null);

  // États pour la suppression
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [entreeToDelete, setEntreeToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  // Récupération des noms de dépôts distincts
  const depotOptions = Array.from(
    new Set(entrees.map((e) => e.depot?.intitule).filter(Boolean))
  );

  const formatNumber = (n) => {
    const s = Number(n).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    // remplace NBSP (U+00A0) et NNBSP (U+202F) par espace normal
    return s.replace(/[\u00A0\u202F]/g, ' ');
  };

  useEffect(() => {
    fetchEntrees();
  }, []);

  useEffect(() => {
    filterEntrees();
  }, [entrees, startDate, endDate, selectedDepot, batchSearch, articleSearch]);

  const fetchEntrees = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/entrees');
      // Tri par date décroissante
      const sorted = res.data.sort(
        (a, b) => new Date(b.dateEntree) - new Date(a.dateEntree)
      );
      setEntrees(sorted);
      setFiltered(sorted);
    } catch (err) {
      console.error('Erreur récupération entrées:', err);
      setError("Erreur lors du chargement des entrées");
    } finally {
      setLoading(false);
    }
  };

  const filterEntrees = () => {
    let result = [...entrees];

    // Filtrer par date
    if (startDate && endDate) {
      result = result.filter((e) => {
        const d = moment(e.dateEntree);
        return d.isBetween(startDate, endDate, 'day', '[]');
      });
    }

    // Filtrer par dépôt
    if (selectedDepot !== '') {
      result = result.filter(
        (e) => e.depot && e.depot.intitule === selectedDepot
      );
    }

    // Filtrer par batch number
    if (batchSearch !== '') {
      result = result.filter((e) => {
        const batchNumber = e.batchNumber || '';
        return batchNumber.toLowerCase().includes(batchSearch.toLowerCase());
      });
    }

    // Filtrer par article
    if (articleSearch !== '') {
      result = result.filter((e) => {
        return e.items.some((item) =>
          item.article.intitule
            .toLowerCase()
            .includes(articleSearch.toLowerCase())
        );
      });
    }

    setFiltered(result);
    setCurrentPage(1);
  };

  const handleOpenFormToCreate = () => {
    setEditingEntree(null);
    setShowForm(true);
  };

  const handleOpenFormToEdit = (entree) => {
    setEditingEntree(entree);
    setShowForm(true);
  };

  const handleCloseForm = () => setShowForm(false);

  const handleEntreeCreatedOrUpdated = () => {
    setShowForm(false);
    fetchEntrees();
  };

  // Affichage pour tooltip
  const formatAllArticles = (items) => {
    if (!items || items.length === 0) return '—';
    return items
      .map((item) => {
        const article = item.article;
        const name = article
          ? `${article.reference} - ${article.specification}`
          : 'Article inconnu';
        return `${name} (${item.quantiteKg} Kg)`;
      })
      .join(', ');
  };

  // Affichage du premier article
  const formatFirstArticle = (items) => {
    if (!items || items.length === 0) return '—';
    const item = items[0];
    const article = item.article;
    const name = article
      ? `${article.reference} - ${article.specification}`
      : 'Article inconnu';
    return `${name} (${item.quantiteKg} Kg)`;
  };

  // Ouvre la fenêtre de détails
  const handleShowDetails = (entree) => {
    setSelectedEntree(entree);
    setShowDetailsModal(true);
  };

  // Génération du Bon d'Entrée PDF

  // Génération d'un PDF avec QR Code
  const generateQRCodePDF = async (entree) => {
    try {
      const codeText = `Batch: ${entree.batchNumber}\nDepot: ${entree.depot?.intitule || '—'}\nQuantité: ${totalQuantity(entree.items)} Kg`;
      const qrDataUrl = await QRCode.toDataURL(codeText, { errorCorrectionLevel: 'H', scale: 4, margin: 1 });

      const doc = new jsPDF('p', 'mm', 'a4');
      doc.addImage(logoBase64, 'PNG', 10, 10, 30, 30);
      doc.setFont('helvetica', 'bold').setFontSize(18).text('MSM SEAFOOD', 45, 20);
      doc.setFont('helvetica', 'normal').setFontSize(12)
        .text('RC 576', 45, 28)
        .text('Agrément Sanitaire NO 02 133', 45, 34);
      doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 150, 20);
      doc.setFontSize(16).text('QR Code du Lot', doc.internal.pageSize.getWidth() / 2, 50, { align: 'center' });
      doc.addImage(qrDataUrl, 'PNG', 50, 60, 100, 100);

      let infoY = 170;
      doc.setFontSize(14)
        .text(`Batch Number: ${entree.batchNumber}`, 20, infoY)
        .text(`Dépôt: ${entree.depot?.intitule || '—'}`, 20, infoY + 8)
        .text(`Quantité Totale: ${totalQuantity(entree.items)} Kg`, 20, infoY + 16);

      doc.save(`qrcode_batch_${entree.batchNumber}.pdf`);
    } catch (error) {
      console.error('Erreur génération QR Code PDF:', error);
    }
  };

  // Génération du Bon d'Entrée PDF
  function generateBonDEntreePDF(entree) {
    const totalWeight = entree.items.reduce((acc, i) => acc + (i.quantiteKg || 0), 0);
    const totalCartonsCount = totalCartons(entree.items);
    const totalMoney = entree.items.reduce(
      (acc, i) => acc + (i.quantiteKg || 0) * (i.prixUnitaire || 0),
      0
    );
  
    const rows = entree.items.map((item) => {
      const parts = [item.article.reference, item.article.specification, item.article.taille].filter(Boolean);
      const articleStr = item.article
        ? `${parts.join(' – ')}`
        : 'Article inconnu';
      const qte = item.quantiteKg || 0;
      const cartons = convertKgToCarton(qte, item.article);
      const pu  = item.prixUnitaire || 0;
      return [
        articleStr,
        formatNumber(qte),
        formatNumber(cartons),
        formatNumber(pu),
        formatNumber(qte * pu),
      ];
    });
  
    const doc = new jsPDF('p', 'mm', 'a4');
    const w = doc.internal.pageSize.getWidth();
    const m = 10;
    
    // --- HEADER ---
    let y = 10;
    // Logo
    doc.addImage(logoBase64, 'PNG', m, y+2, 30, 30);
    // Texte à droite du logo
    const startX = m + 35;
    const lineHeight = 5;
  
    doc.setFont('helvetica', 'bold').setFontSize(12)
       .text('MSM SEAFOOD SARL', startX, y + 5);
  
    doc.setFont('helvetica', 'normal').setFontSize(9);
    y += lineHeight; // 16
    doc.text('Zone idustrielle', startX, y + 5);
    y += lineHeight; // 16
    doc.text('Dakhlet Nouâdhibou', startX, y + 5);
    y += lineHeight; // 22
    doc.text('Mauritanie', startX, y + 5);
    y += lineHeight; // 28
    doc.text('msmseafoodsarl@gmail.com', startX, y + 5);
    y += lineHeight; // 40
    doc.text('Tél. : +222 46 00 89 08', startX, y + 5);
  
    // Date en haut à droite
    doc.setFontSize(10)
       .text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, w - m, 15, { align: 'right' });
    doc.setFontSize(10)
      .text(`Bon d'entrée No : ${entree.bonCommande || '—'}`, w - m, 20, { align: 'right' });
  
    // --- TITRE ---
    const titleY = 60;
    doc.setFont('helvetica','bold').setFontSize(15)
       .text("Bon d'Entrée", w / 2, titleY, { align: 'center' })
       .setDrawColor(0,102,204).setLineWidth(0.5)
       .line(m, titleY + 3, w - m, titleY + 3);
  
    // --- TABLEAU D’ENTRÉE ---
    doc.autoTable({
      startY: titleY + 10,
      head: [['Article','Quantité (Kg)','Quantité (Cartons)','Prix Unitaire','Total']],
      body: rows,
      foot: [[
        { content: 'Total', colSpan: 1, styles: { halign: 'left', fontStyle: 'bold' } },
        { content: formatNumber(totalWeight), styles: { halign: 'left', fontStyle: 'bold' } },
        { content: formatNumber(totalCartonsCount), styles: { halign: 'left', fontStyle: 'bold' } },
        { content: '' },
        { content: formatNumber(totalMoney), styles: { halign: 'left', fontStyle: 'bold' } },
      ]],
      styles:     { fontSize: 9, halign: 'left' },
      headStyles: { fillColor: [0,102,204], textColor: 255, fontStyle: 'bold' },
      footStyles: { fontStyle: 'bold' },
      margin:     { left: m, right: m },
    });
  
    // --- SIGNATURE ---
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFont('helvetica','bold').setFontSize(12)
       .text('Signature responsable :', m, finalY)
       .setLineWidth(0.5)
       .line(m, finalY + 2, m + 60, finalY + 2);
  
    doc.save(`bon_entree_${entree._id}.pdf`);
  }

// Export PDF de la liste complète
const exportToPDF = () => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();

  // Titre
  doc.setFontSize(16).setFont('helvetica','bold').text('Liste des Entrées', 14, 20);
  doc.setFontSize(10).text(
    `Généré le : ${new Date().toLocaleDateString('fr-FR')}`,
    14, 28
  );

  // Colonnes
  const columns = [
    'Date Entrée','Batch Number','Type','Dépôt',
    'Articles','Quantité Totale (Kg)','Prix Total','Coût Location'
  ];
  // Lignes
  const rows = filtered.map((e) => {
    const quantite = totalQuantity(e.items);
    const prix     = totalPrice(e.items);
    const locCost  = parseFloat(e.locationCost || 0);

    return [
      e.dateEntree ? new Date(e.dateEntree).toLocaleDateString('fr-FR') : '—',
      e.batchNumber || '—',
      e.origine === 'TRANSFERT' ? 'TRANSFERT' : 'NORMAL',
      e.depot?.intitule || '—',
      formatAllArticles(e.items),
      formatNumber(quantite),                              // e.g. "59 118,00"
      `${formatNumber(prix)} ${e.items[0]?.monnaie || ''}`,// e.g. "1 616 877,30 MRU"
      `${formatNumber(locCost)} MRU`,
    ];
  });

  // Construction du tableau
  doc.autoTable({
    startY: 35,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [128,128,128], textColor: 255, fontStyle: 'bold', fontSize: 10 },
    styles:     { fontSize: 9, cellPadding: 2 },
    margin:     { horizontal: 14 },
  });

  // Pagination
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
       .setFontSize(8)
       .text(`Page ${i} / ${pageCount}`, w - 25, doc.internal.pageSize.getHeight() - 10);
  }

  doc.save(`entrees_${new Date().toISOString().slice(0, 10)}.pdf`);
};


  // Export Excel de la liste complète
  const exportToExcel = () => {
    const data = filtered.map((e) => ({
      'Date Entrée': e.dateEntree ? new Date(e.dateEntree).toLocaleDateString() : '—',
      'Batch Number': e.batchNumber || '—',
      'Type': e.origine === 'TRANSFERT' ? 'TRANSFERT' : 'NORMAL',
      'Dépôt': e.depot?.intitule || '—',
      'Articles': formatAllArticles(e.items),
      'Quantité Totale (Kg)': totalQuantity(e.items),
      'Prix Total': `${totalPrice(e.items).toFixed(0)} ${e.items[0]?.monnaie || ''}`,
      'Coût Location': `${parseFloat(e.locationCost || 0).toFixed(0)} MRU`
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Entrees');
    XLSX.writeFile(wb, 'entrees_report.xlsx');
  };

  // Fonctions de suppression
  const [deletionCheckResults, setDeletionCheckResults] = useState({});

  // Fonction pour vérifier si une entrée peut être supprimée
  const checkCanDeleteEntree = async (entree) => {
    try {
      // Vérifier pour chaque article de l'entrée si une partie a été utilisée
      const utilizationChecks = [];
      
      for (const item of entree.items) {
        const quantiteOriginale = item.quantiteKg;
        const quantiteRestante = item.quantiteRestante || 0;
        const quantiteUtilisee = quantiteOriginale - quantiteRestante;
        
        const canDelete = quantiteUtilisee === 0; // Suppression autorisée seulement si rien n'a été utilisé
        
        utilizationChecks.push({
          articleId: item.article._id,
          articleRef: item.article.reference,
          articleSpec: item.article.specification,
          quantiteOriginale,
          quantiteRestante,
          quantiteUtilisee,
          canDelete,
          status: canDelete ? 'OK - Aucune utilisation' : 'Partiellement utilisée'
        });
      }

      const canDeleteAll = utilizationChecks.every(check => check.canDelete);
      const articlesBloquants = utilizationChecks.filter(check => !check.canDelete);

      return {
        canDelete: canDeleteAll,
        utilizationChecks,
        articlesBloquants,
        summary: {
          totalArticles: utilizationChecks.length,
          articlesOK: utilizationChecks.filter(check => check.canDelete).length,
          articlesBloquants: articlesBloquants.length
        }
      };
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      return {
        canDelete: false,
        error: 'Erreur lors de la vérification de la suppression',
        utilizationChecks: [],
        articlesBloquants: []
      };
    }
  };

  const handleDeleteClick = async (entree) => {
    setDeleteLoading(true);
    setError('');
    
    try {
      // Vérifier d'abord si la suppression est possible
      const checkResult = await checkCanDeleteEntree(entree);
      setDeletionCheckResults({ [entree._id]: checkResult });
      
      setEntreeToDelete(entree);
      setShowDeleteModal(true);
    } catch (error) {
      setError('Erreur lors de la vérification de la suppression');
      console.error('Erreur:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!entreeToDelete) return;

    setDeleteLoading(true);
    setError('');

    try {
      const response = await axios.delete(`/entrees/${entreeToDelete._id}`);
      setSuccessMessage('Entrée supprimée avec succès et stock restauré');
      setShowDeleteModal(false);
      setEntreeToDelete(null);
      setDeletionCheckResults({});
      fetchEntrees();
      
      // Effacer le message de succès après 3 secondes
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      
      if (error.response?.status === 400 && error.response?.data?.canDelete === false) {
        // Erreur de logique métier - quantités déjà utilisées
        setError({
          type: 'business',
          message: error.response.data.message,
          details: error.response.data.details,
          articlesBloquants: error.response.data.articlesBloquants
        });
      } else {
        // Erreur technique
        setError({
          type: 'technical',
          message: error.response?.data?.error || 'Erreur lors de la suppression'
        });
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setEntreeToDelete(null);
    setDeletionCheckResults({});
    setError('');
  };

  return (
    <div className="p-4 lg:p-6 max-w-8xl mx-auto">
      {/* Titre + boutons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Gestion des Entrées</h1>
        <div className="flex items-center space-x-4">
          <Button
            onClick={exportToPDF}
            variant="primary"
            size="md"
            leftIcon={<PrinterIcon className="h-4 w-4" />}
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
            variant="info"
            size="md"
            leftIcon={<PlusIcon className="h-5 w-5" />}
          >
            Nouvelle Entrée
          </Button>
        </div>
      </div>

      {/* Filtre par plage de dates */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filtrer les entrées par plage de dates
        </label>
        <CustomDateRangePicker
          startDate={startDate}
          endDate={endDate}
          onDatesChange={({ startDate, endDate }) => {
            setStartDate(startDate);
            setEndDate(endDate);
          }}
          numberOfMonths={1}
          showClearDates={true}
          startDatePlaceholderText="Date de début"
          endDatePlaceholderText="Date de fin"
          displayFormat="dd/MM/yyyy"
        />
      </div>

      {/* Filtres Dépôt + Batch Number + Article */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dépôt</label>
            <select
              value={selectedDepot}
              onChange={(e) => setSelectedDepot(e.target.value)}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les dépôts</option>
              {depotOptions.map((depot, i) => (
                <option key={i} value={depot}>{depot}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
            <input
              type="text"
              value={batchSearch}
              onChange={(e) => setBatchSearch(e.target.value)}
              placeholder="Rechercher par batch number"
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recherche par Article</label>
            <input
              type="text"
              value={articleSearch}
              onChange={(e) => setArticleSearch(e.target.value)}
              placeholder="Rechercher par article"
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedDepot('');
                setBatchSearch('');
                setArticleSearch('');
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md flex items-center justify-center"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{error}</div>
      )}

      {/* Chargement ou Liste */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Chargement en cours...</p>
        </div>
      ) : entrees.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <InformationCircleIcon className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">Aucune entrée trouvée</h3>
          <p className="mt-1 text-gray-500">Cliquez sur “Nouvelle Entrée” pour en créer une</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border shadow-sm">
          <table className="min-w-full border-collapse border border-gray-400 text-center">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">Date Entrée</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">Batch Number</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">Type</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">Dépôt</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">Articles</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">Quantité Totale (Kg)</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">Quantité Totale (Cartons)</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">Différence Tunnel</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">Prix Total</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">Coût Location</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">Détails</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">Modifier</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">Bon d'entrée</th>
                <th className="px-4 py-3 text-sm font-bold text-gray-700 border border-gray-400">Supprimer</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {currentItems.map((e) => {
                const firstItem = e.items[0];
                const moreItems = e.items.length > 1;
                const tooltipContent = formatAllArticles(e.items);
                return (
                  <tr key={e._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-700 border border-gray-400">
                      {e.dateEntree ? new Date(e.dateEntree).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 border border-gray-400">
                      {e.batchNumber || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 border border-gray-400">
                      {e.origine === 'TRANSFERT' ? (
                        <span className="px-2 py-1 bg-blue-800 rounded-full text-xs text-white">TRANSFERT</span>
                      ) : (
                        <span className="px-2 py-1 bg-green-800 rounded-full text-xs text-white">NORMAL</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 border border-gray-400">
                      {e.depot?.intitule || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 border border-gray-400">
                      {firstItem ? (
                        <div className="flex items-center justify-center space-x-1">
                          <span>
                            {firstItem.article ? firstItem.article.intitule : 'Article inconnu'} 
                          </span>
                          {moreItems && (
                            <div className="relative group inline-block">
                              <ExclamationTriangleIcon className="h-4 w-4 text-orange-600 cursor-pointer ml-1" />
                              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded hidden group-hover:block w-64 z-50">
                                {tooltipContent}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 border border-gray-400">
                      {totalQuantity(e.items)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 border border-gray-400">
                      {totalCartons(e.items).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center border border-gray-400">
                      {formatTunnelDifference(totalTunnelDifference(e.items))}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 border border-gray-400">
                      {`${totalPrice(e.items).toFixed(0)} ${e.items[0]?.monnaie || ''}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-center border border-gray-400">
                      {`${parseFloat(e.locationCost || 0).toFixed(0)} MRU`}
                    </td>
                    <td className="px-4 py-3 text-center border border-gray-400">
                      <Button
                        onClick={() => handleShowDetails(e)}
                        variant="info"
                        size="sm"
                      >
                        Détails
                      </Button>
                    </td>
                    <td className="px-4 py-3 text-center border border-gray-400">
                      <Button
                        onClick={() => handleOpenFormToEdit(e)}
                        variant="warning"
                        size="sm"
                      >
                        Modifier
                      </Button>
                    </td>
                    <td className="px-4 py-3 text-center border border-gray-400">
                      <Button
                        onClick={() => generateBonDEntreePDF(e)}
                        variant="primary"
                        size="sm"
                        leftIcon={<PrinterIcon className="h-4 w-4" />}
                      >
                        Imprimer
                      </Button>
                    </td>
                    <td className="px-4 py-3 text-center border border-gray-400">
                      <Button
                        onClick={() => handleDeleteClick(e)}
                        variant="danger"
                        size="sm"
                        leftIcon={<TrashIcon className="h-4 w-4" />}
                      >
                        Supprimer
                      </Button>
                    </td>
                  </tr>
                );
              })}
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

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[100vh] overflow-y-auto">
            <EntreeForm
              onClose={handleCloseForm}
              onEntreeCreated={handleEntreeCreatedOrUpdated}
              initialEntree={editingEntree}
            />
          </div>
        </div>
      )}

      {/* Message de succès */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-50 text-green-700 p-4 rounded-lg shadow-lg z-50 border border-green-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="font-medium">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && selectedEntree && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <EntreeDetails
              entree={selectedEntree}
              onClose={() => setShowDetailsModal(false)}
            />
          </div>
        </div>
      )}

      {/* Modale de confirmation de suppression */}
      {showDeleteModal && entreeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirmer la suppression
                </h3>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-2">
                  Êtes-vous sûr de vouloir supprimer cette entrée ?
                </p>
                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <p className="text-sm font-medium text-gray-900">
                    Batch Number: {entreeToDelete.batchNumber}
                  </p>
                  <p className="text-sm text-gray-600">
                    Dépôt: {entreeToDelete.depot?.intitule || '—'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Quantité totale: {totalQuantity(entreeToDelete.items)} Kg
                  </p>
                </div>

                {/* Affichage des vérifications de stock */}
                {deletionCheckResults[entreeToDelete._id] && (
                  <div className="mb-4">
                    {deletionCheckResults[entreeToDelete._id].canDelete ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center">
                          <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <p className="text-sm font-medium text-green-800">
                            ✅ Suppression autorisée
                          </p>
                        </div>
                        <p className="text-xs text-green-700 mt-1">
                          Toutes les quantités sont encore présentes dans le stock
                        </p>
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center mb-2">
                          <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <p className="text-sm font-medium text-red-800">
                            ❌ Suppression impossible
                          </p>
                        </div>
                        <p className="text-xs text-red-700 mb-3">
                          Une partie des quantités a déjà été utilisée dans des sorties
                        </p>
                        
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-700">Articles problématiques :</p>
                          {deletionCheckResults[entreeToDelete._id].articlesBloquants.map((blocage, index) => (
                            <div key={index} className="bg-white border border-red-200 rounded p-2">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-gray-900">
                                    {blocage.articleRef} {blocage.articleSpec && `- ${blocage.articleSpec}`}
                                  </p>
                                  <div className="flex space-x-4 text-xs text-gray-600 mt-1">
                                    <span>Quantité originale: {blocage.quantiteOriginale}kg</span>
                                    <span>Restante: {blocage.quantiteRestante}kg</span>
                                    <span className="text-red-600 font-medium">
                                      Utilisée: {blocage.quantiteUtilisee}kg
                                    </span>
                                  </div>
                                  <p className="text-xs text-red-600 mt-1">{blocage.status}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Message d'avertissement */}
                {deletionCheckResults[entreeToDelete._id]?.canDelete && (
                  <p className="text-sm text-orange-600 mt-2">
                    ⚠️ Cette action supprimera l'entrée et restaurera automatiquement le stock.
                  </p>
                )}

                {/* Affichage des erreurs */}
                {error && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm font-medium text-red-800">
                        {typeof error === 'string' ? error : error.message}
                      </p>
                    </div>
                    {error.details && (
                      <p className="text-xs text-red-700 mt-1">{error.details}</p>
                    )}
                    {error.articlesBloquants && error.articlesBloquants.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {error.articlesBloquants.map((article, index) => (
                          <div key={index} className="text-xs text-red-700 bg-red-100 p-2 rounded">
                            <span className="font-medium">{article.reference}</span>
                            {article.specification && ` - ${article.specification}`}
                            <div className="mt-1">
                              Entrée: {article.quantiteEntree}kg | 
                              Stock: {article.quantiteStock}kg | 
                              Utilisé: {article.quantiteUtilisee}kg
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  onClick={handleDeleteCancel}
                  variant="secondary"
                  size="sm"
                  disabled={deleteLoading}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleDeleteConfirm}
                  variant="danger"
                  size="sm"
                  loading={deleteLoading}
                  leftIcon={<TrashIcon className="h-4 w-4" />}
                  disabled={deletionCheckResults[entreeToDelete._id] && !deletionCheckResults[entreeToDelete._id].canDelete}
                >
                  {deleteLoading ? 'Vérification...' : 'Supprimer'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EntreeList;
