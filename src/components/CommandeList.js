// frontend/src/components/CommandeList.js
import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import CommandeForm from './CommandeForm';
import CommandeDetails from './CommandeDetails';
import AutorisationSortieCommandeModal from './AutorisationSortieCommandeModal';
import Button from './Button';
import LivraisonPartielleModal from './LivraisonPartielleModal';
import BatchHistoryModal from './BatchHistoryModal';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  PlusIcon,
  PencilIcon,
  InformationCircleIcon,
  TruckIcon,
  TrashIcon,
  DocumentTextIcon
} from '@heroicons/react/24/solid';
import {
  ArrowPathIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  BellIcon,
  ClockIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import Pagination from './Pagination';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Imports pour le filtre de dates
import CustomDateRangePicker from './CustomDateRangePicker';
import moment from 'moment';
import 'moment/locale/fr';
// Import du logo (pour facture et packing list)
import logoBase64 from './logoBase64';
import { generateInvoicePDF, generatePackingListPDF } from './pdfGenerators';

moment.locale('fr');

const CommandeList = () => {
  const navigate = useNavigate();
  // États existants
  const [commandes, setCommandes] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCommande, setEditingCommande] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false); // Ajouter cet état s'il n'existe pas

  const [filtered, setFiltered] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [searchRef, setSearchRef] = useState('');
  // Remplacement du champ booking par numeroBooking
  const [searchNumeroBooking, setSearchNumeroBooking] = useState('');
  // Nouveau champ de recherche par numéro de facture
  const [searchNumeroFacture, setSearchNumeroFacture] = useState('');
  // Nouveau filtre pour le statut de commande
  const [selectedStatus, setSelectedStatus] = useState('');

  // États pour le filtre de dates
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const [error, setError] = useState(null);
  // const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsCommande, setDetailsCommande] = useState(null);
  
  // États pour le modal de livraison partielle
  const [showLivraisonModal, setShowLivraisonModal] = useState(false);
  const [selectedCommandeForLivraison, setSelectedCommandeForLivraison] = useState(null);

  // États pour le modal d'historique des batches
  const [showBatchHistoryModal, setShowBatchHistoryModal] = useState(false);
  const [selectedCommandeForBatchHistory, setSelectedCommandeForBatchHistory] = useState(null);

  // États pour le modal d'autorisation de sortie
  const [showAutorisationModal, setShowAutorisationModal] = useState(false);
  const [selectedCommandeForAutorisation, setSelectedCommandeForAutorisation] = useState(null);

  // États pour la suppression de commandes
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [commandeToDelete, setCommandeToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // État pour les informations de sorties (livraisons)
  const [sortiesData, setSortiesData] = useState({});

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  // Configuration responsive
  const isMobile = window.innerWidth < 768;

  // Fonctions de formatage pour éviter les erreurs dans LivraisonPartielleModal
  const formatCurrency = (value, currency = 'EUR') => {
    // Gérer les différentes devises
    let currencyCode = currency;
    if (currency === 'MRU') {
      currencyCode = 'MRU'; // Fallback car MRU n'est pas encore supporté par tous les navigateurs
    }
    
    try {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      }).format(value || 0);
    } catch (error) {
      // Fallback pour MRU ou autres devises non supportées
      if (currency === 'MRU') {
        return `${new Intl.NumberFormat('fr-FR', {
          minimumFractionDigits: 3,
          maximumFractionDigits: 3,
        }).format(value || 0)} MRU`;
      }
      return `${value || 0} ${currency}`;
    }
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('fr-FR').format(value || 0);
  };

  // Fonction pour afficher les informations de livraison
  const renderLivraisonInfo = (commandeId) => {
    const livraisons = sortiesData[commandeId];
    
    if (!livraisons || !livraisons.sorties || livraisons.sorties.length === 0) {
      return (
        <div className="text-center">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Aucune livraison
          </span>
        </div>
      );
    }

    const { stats } = livraisons;
    const isComplete = stats.pourcentageLivre >= 100;
    const isPartial = stats.pourcentageLivre > 0 && stats.pourcentageLivre < 100;

    return (
      <div className="text-center space-y-1">
        {/* Badge de statut principal */}
        <div>
          {isComplete ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✓ Complète
            </span>
          ) : isPartial ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              ⚡ Partielle
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              En attente
            </span>
          )}
        </div>

        {/* Barre de progression */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all ${
              isComplete ? 'bg-green-500' : 
              isPartial ? 'bg-orange-500' : 
              'bg-gray-300'
            }`}
            style={{ width: `${Math.min(stats.pourcentageLivre, 100)}%` }}
          />
        </div>

        {/* Détails textuels */}
        <div className="text-xs text-gray-600 space-y-0.5">
          <div>{stats.pourcentageLivre}% livré</div>
          <div>{stats.nombreSorties} sortie{stats.nombreSorties > 1 ? 's' : ''}</div>
          <div title={`${stats.quantiteTotaleLivree}kg / ${stats.quantiteTotaleCommande}kg`}>
            {formatNumber(stats.quantiteTotaleLivree)} / {formatNumber(stats.quantiteTotaleCommande)} kg
          </div>
        </div>

        {/* Dernière livraison */}
        {stats.derniereDate && (
          <div className="text-xs text-gray-500">
            Dernière: {new Date(stats.derniereDate).toLocaleDateString('fr-FR')}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtrage dès qu'un des filtres change
  useEffect(() => {
    filterCommandes();
  }, [commandes, selectedClient, searchRef, searchNumeroBooking, searchNumeroFacture, startDate, endDate, selectedStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cmdRes, cliRes] = await Promise.all([
        axios.get('/commandes'),
        axios.get('/clients'),
      ]);
      // Trier par dateCommande : du plus récent au plus ancien
      const sortedCommandes = cmdRes.data.sort(
        (a, b) => new Date(b.dateCommande) - new Date(a.dateCommande)
      );
      setCommandes(sortedCommandes);
      setClients(cliRes.data);
      setFiltered(sortedCommandes);

      // Récupérer les informations de sorties pour chaque commande
      await fetchSortiesInfo(sortedCommandes);

      setError(null);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour récupérer les informations de sorties pour les commandes
  const fetchSortiesInfo = async (commandes) => {
    try {
      const sortiesInfo = {};
      
      // Récupérer les sorties pour toutes les commandes en une seule requête
      const sortiesRes = await axios.get('/sorties');
      const allSorties = sortiesRes.data.data || sortiesRes.data;

      commandes.forEach(commande => {
        // Filtrer les sorties pour cette commande
        const commandeSorties = allSorties.filter(sortie => 
          sortie.commande?._id === commande._id || sortie.commande === commande._id
        );

        if (commandeSorties.length > 0) {
          // Calculer les statistiques pour cette commande
          const quantiteTotaleLivree = commandeSorties.reduce((sum, sortie) => 
            sum + sortie.items.reduce((itemSum, item) => itemSum + (item.quantiteKg || 0), 0), 0
          );

          const quantiteTotaleCommande = commande.items ? 
            commande.items.reduce((sum, item) => sum + (item.quantiteKg || 0), 0) : 0;

          const pourcentageLivre = quantiteTotaleCommande > 0 ? 
            Math.round((quantiteTotaleLivree / quantiteTotaleCommande) * 100) : 0;

          sortiesInfo[commande._id] = {
            sorties: commandeSorties.map(sortie => ({
              _id: sortie._id,
              reference: sortie.reference,
              typeLivraison: sortie.typeLivraison,
              dateSortie: sortie.dateSortie,
              quantite: sortie.items.reduce((sum, item) => sum + (item.quantiteKg || 0), 0),
              numeroLivraisonPartielle: sortie.numeroLivraisonPartielle
            })),
            stats: {
              nombreSorties: commandeSorties.length,
              quantiteTotaleLivree,
              quantiteTotaleCommande,
              pourcentageLivre,
              derniereDate: commandeSorties.length > 0 ? 
                Math.max(...commandeSorties.map(s => new Date(s.dateSortie).getTime())) : null
            }
          };
        }
      });

      setSortiesData(sortiesInfo);
    } catch (error) {
      console.error('Erreur lors de la récupération des sorties:', error);
    }
  };

  const filterCommandes = () => {
    let result = [...commandes];
    if (selectedClient) {
      result = result.filter((cmd) => cmd.client?._id === selectedClient);
    }
    if (searchRef) {
      result = result.filter((cmd) =>
        cmd.reference?.toLowerCase().includes(searchRef.toLowerCase())
      );
    }
    if (searchNumeroBooking) {
      result = result.filter((cmd) =>
        cmd.numeroBooking?.toLowerCase().includes(searchNumeroBooking.toLowerCase())
      );
    }
    if (searchNumeroFacture) {
      result = result.filter((cmd) =>
        cmd.numeroFacture?.toLowerCase().includes(searchNumeroFacture.toLowerCase()) ||
        cmd.numeroFactureProforma?.toLowerCase().includes(searchNumeroFacture.toLowerCase())
      );
    }
    if (selectedStatus) {
      result = result.filter((cmd) => cmd.statutBonDeCommande === selectedStatus);
    }
    if (startDate && endDate) {
      result = result.filter((cmd) => {
        const commandeDate = moment(cmd.dateCommande);
        return commandeDate.isBetween(startDate, endDate, 'day', '[]');
      });
    }
    setFiltered(result);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSelectedClient('');
    setSearchRef('');
    setSearchNumeroBooking('');
    setSearchNumeroFacture('');
    setSelectedStatus('');
    setStartDate(null);
    setEndDate(null);
  };

  // Fonction utilitaire pour obtenir la somme des quantités en KG des articles de la commande
  const getTotalQuantityKG = (commande) => {
    return commande.items
      ? commande.items.reduce((total, item) => total + (item.quantiteKg || 0), 0)
      : 0;
  };

  const formatEtatPaiement = (etatPaiement) => {
    return etatPaiement?.replace(/_/g, ' ') || 'Inconnu';
  };

  const getPaymentBadge = (etatPaiement) => {
    const config = {
      PAYE: {
        color: 'bg-green-800 text-white',
        icon: <CheckCircleIcon className="h-4 w-4 mr-1" />,
      },
      PARTIELLEMENT_PAYE: {
        color: 'bg-orange-600 text-white',
        icon: <ExclamationCircleIcon className="h-4 w-4 mr-1" />,
      },
      NON_PAYE: {
        color: 'bg-red-800 text-white',
        icon: <XCircleIcon className="h-4 w-4 mr-1" />,
      },
      default: {
        color: 'bg-gray-800 text-white',
        icon: null,
      },
    };
    const { color, icon } = config[etatPaiement] || config.default;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${color}`}>
        {icon}
        {formatEtatPaiement(etatPaiement)}
      </span>
    );
  };

  // Fonction utilitaire pour afficher un badge pour le statut de commande
  const getStatusBadge = (statut) => {
    const config = {
      LIVREE: {
        color: 'bg-green-600 text-white',
        label: 'Livrée',
      },
      EN_COURS: {
        color: 'bg-blue-600 text-white',
        label: 'En cours',
      },
      EN_ATTENTE_STOCK: {
        color: 'bg-orange-600 text-white',
        label: 'En attente de stock',
      },
      AVEC_QUANTITES_MANQUANTES: {
        color: 'bg-amber-600 text-white',
        label: 'Quantités manquantes',
      },
      PARTIELLEMENT_LIVREE: {
        color: 'bg-purple-600 text-white',
        label: 'Partiellement livrée',
      },
      INCOMPLET: {
        color: 'bg-red-600 text-white',
        label: 'Incomplet',
      },
    };
    const { color, label } = config[statut] || { color: 'bg-gray-600 text-white', label: statut || 'Inconnu' };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${color}`}>
        {label}
      </span>
    );
  };

  // Fonction pour calculer et afficher les indicateurs de quantités manquantes
  const getQuantitesManquantesIndicator = (commande) => {
    if (!commande.items || commande.items.length === 0) return null;
    
    const itemsAvecQuantitesManquantes = commande.items.filter(item => 
      item.quantiteManquante && item.quantiteManquante > 0
    );
    
    if (itemsAvecQuantitesManquantes.length === 0) return null;
    
    const totalManquant = itemsAvecQuantitesManquantes.reduce((total, item) => 
      total + (item.quantiteManquante || 0), 0
    );
    
    return (
      <div className="flex items-center space-x-2 mt-1">
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          ⚠️ {itemsAvecQuantitesManquantes.length} article(s) manquant(s)
        </span>
        <span className="text-xs text-gray-600">
          Total manquant: {totalManquant.toFixed(2)} Kg
        </span>
      </div>
    );
  };

  const formatItemsSummary = (items) => {
    if (!items || items.length === 0) return '—';
    return items
      .map(item => {
        const ref = item.article?.reference || 'Article';
        return `${ref} (${item.quantiteKg} Kg)`;
      })
      .join(', ');
  };

  const formatArticle = (a) => {
    if (!a) return '—';
    return [a.reference, a.specification, a.taille, a.typeCarton]
      .filter(Boolean)
      .join(' - ');
  };

  // Ouverture/fermeture des modales et actions diverses
  const handleOpenForm = () => {
    navigate('/commandes/nouvelle');
  };
  const handleCloseForm = () => {
    // setShowForm(false);
  };
  const handleCommandeCreatedOrUpdated = () => {
    // setShowForm(false);
    fetchData();
  };
  const handleEdit = (cmd) => {
    navigate(`/commandes/modifier/${cmd._id}`);
  };
  const handleShowDetails = (cmd) => {
    setDetailsCommande(cmd);
    setShowDetails(true);
  };
  const handleCloseDetails = () => {
    setShowDetails(false);
  };

  // Fonctions pour le modal de livraison partielle
  const handleShowLivraisonPartielle = (cmd) => {
    setSelectedCommandeForLivraison(cmd);
    setShowLivraisonModal(true);
  };

  const handleCloseLivraisonModal = () => {
    setShowLivraisonModal(false);
    setSelectedCommandeForLivraison(null);
  };

  const handleLivraisonCreated = () => {
    setShowLivraisonModal(false);
    setSelectedCommandeForLivraison(null);
    fetchData(); // Recharger les données
  };

  // Fonctions pour le modal d'historique des batches
  const handleShowBatchHistory = (cmd) => {
    setSelectedCommandeForBatchHistory(cmd);
    setShowBatchHistoryModal(true);
  };

  const handleCloseBatchHistoryModal = () => {
    setShowBatchHistoryModal(false);
    setSelectedCommandeForBatchHistory(null);
  };

  // Fonctions pour le modal d'autorisation de sortie
  const handleShowAutorisationModal = (cmd) => {
    setSelectedCommandeForAutorisation(cmd);
    setShowAutorisationModal(true);
  };

  const handleCloseAutorisationModal = () => {
    setShowAutorisationModal(false);
    setSelectedCommandeForAutorisation(null);
  };

  // Fonctions pour la suppression de commandes
  const handleShowDeleteModal = (commande) => {
    setCommandeToDelete(commande);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setCommandeToDelete(null);
  };

  const handleDeleteCommande = async () => {
    if (!commandeToDelete) return;

    setIsDeleting(true);
    try {
      await axios.delete(`/commandes/${commandeToDelete._id}`);
      
      // Afficher une notification de succès
      setNotificationDetails({
        type: 'success',
        message: 'Commande supprimée avec succès',
        details: `La commande ${commandeToDelete.reference} a été supprimée et le stock a été restauré`
      });
      setShowNotification(true);
      
      // Fermer le modal et recharger les données
      handleCloseDeleteModal();
      fetchData();
      
      // Cacher la notification après 5 secondes
      setTimeout(() => setShowNotification(false), 5000);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setNotificationDetails({
        type: 'error',
        message: 'Erreur lors de la suppression',
        details: error.response?.data?.message || 'Une erreur est survenue lors de la suppression de la commande'
      });
      setShowNotification(true);
    } finally {
      setIsDeleting(false);
    }
  };

  // Fonction pour vérifier si une commande peut être modifiée
  const canEditCommande = (commande) => {
    // Ne peut pas modifier seulement si la commande a des quantités manquantes ou est en attente
    return commande.statutBonDeCommande !== 'EN_ATTENTE_STOCK' &&
           commande.statutBonDeCommande !== 'AVEC_QUANTITES_MANQUANTES';
  };

  // Fonction pour obtenir le titre du bouton de modification
  const getEditButtonTitle = (commande) => {
    if (commande.statutBonDeCommande === 'EN_ATTENTE_STOCK') {
      return 'Commande en attente de stock - Modification désactivée';
    }
    if (commande.statutBonDeCommande === 'AVEC_QUANTITES_MANQUANTES') {
      return 'Commande avec quantités manquantes - Modification désactivée';
    }
    if (commande.statutBonDeCommande === 'LIVREE') {
      return 'Modifier la commande livrée';
    }
    return 'Modifier la commande';
  };

  // Fonction pour vérifier si une commande peut être supprimée
  const canDeleteCommande = (commande) => {
    return commande.statutBonDeCommande !== 'LIVREE';
  };

  // Fonctions d'export et d'impression (identiques aux versions précédentes)
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });
    const styles = {
      header: { fontSize: 16, bold: true, color: 'red' },
      subheader: { fontSize: 10, color: '#7f8c8d' },
      tableHeader: { fillColor: '#2c3e50', textColor: 0, fontStyle: 'bold', fontSize: 10, color: "#2c3e50" },
      currencyCell: { halign: 'right', cellWidth: 25, minCellHeight: 8 },
      numericCell: { halign: 'right', cellWidth: 20 },
    };
    const frenchNumber = (value) =>
      new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
    const columns = [
      { header: 'Réf.', dataKey: 'reference', cellWidth: 18 },
      { header: 'Client', dataKey: 'client', cellWidth: 35 },
      { header: 'Articles', dataKey: 'itemsSummary', cellWidth: 45 },
      { header: 'Type', dataKey: 'type', cellWidth: 25 },
      { header: 'Qte (Kg)', dataKey: 'quantiteKg', ...styles.numericCell, formatter: (v) => frenchNumber(v).replace('.', ',') },
      { header: 'Prix Total', dataKey: 'prixTotal', ...styles.currencyCell, formatter: (v) => `${frenchNumber(v)} €` },
      { header: 'Payé', dataKey: 'montantPaye', ...styles.currencyCell, formatter: (v) => `${frenchNumber(v)} €` },
      { header: 'Reliquat', dataKey: 'reliquat', ...styles.currencyCell, formatter: (v) => `${frenchNumber(v)} €` },
      { header: 'Date Création', dataKey: 'dateCommande', cellWidth: 25, formatter: (v) => new Date(v).toLocaleDateString('fr-FR') },
    ];
    const rows = filtered.map(cmd => ({
      ...cmd,
      client: cmd.client?.raisonSociale || 'N/A',
      itemsSummary: formatItemsSummary(cmd.items),
      type: cmd.typeCommande === 'LOCALE' ? 'LOCALE' : 'EXPORT',
      quantiteKg: cmd.items ? cmd.items.reduce((sum, item) => sum + (item.quantiteKg || 0), 0) : 0,
      prixUnitaire: cmd.prixUnitaire,
      prixTotal: cmd.prixTotal,
      montantPaye: cmd.montantPaye,
      reliquat: cmd.reliquat,
      dateCommande: cmd.dateCommande
    }));
    doc.setFontSize(styles.header.fontSize);
    doc.setFont(undefined, 'bold');
    doc.text('RAPPORT DES COMMANDES', 14, 20);
    doc.setFontSize(styles.subheader.fontSize);
    doc.setTextColor(styles.subheader.color);
    doc.text([
      `Généré le : ${new Date().toLocaleDateString('fr-FR')}`,
      `Nombre de commandes : ${filtered.length}`
    ], 14, 27);
    doc.autoTable({
      startY: 35,
      columns: columns.map(c => ({ title: c.header, dataKey: c.dataKey, ...c })),
      body: rows,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 1.8,
        textColor: styles.tableHeader.textColor,
        lineColor: '#e0e0e0',
        lineWidth: 0.3,
      },
      headerStyles: styles.tableHeader,
      bodyStyles: {
        textColor: '#2c3e50',
        cellPadding: 2,
        valign: 'middle',
      },
      columnStyles: columns.reduce((acc, col) => ({
        ...acc,
        [col.header]: { cellWidth: col.cellWidth, halign: col.halign, fontStyle: col.fontStyle },
      }), {}),
      didParseCell: (data) => {
        if (data.column.dataKey === 'itemsSummary') {
          data.cell.styles.cellWidth = 'auto';
          data.cell.styles.halign = 'left';
        }
      },
      willDrawCell: (data) => {
        if (data.row.index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
        }
      },
      margin: { horizontal: 14 },
    });
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Page ${i} / ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
    }
    doc.save(`commandes_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleExportExcel = () => {
    const data = filtered.map(cmd => ({
      'Référence': cmd.reference,
      'No BC': cmd.noBonDeCommande || '',
      'B/L': cmd.BL || '',
      'Client': cmd.client?.raisonSociale || '',
      'Articles': formatItemsSummary(cmd.items),
      'Type': cmd.typeCommande === 'LOCALE' ? 'LOCALE' : 'EXPORT',
      'Quantité (Kg)': cmd.items ? cmd.items.reduce((sum, item) => sum + (item.quantiteKg || 0), 0) : 0,
      'Quantité Carton': cmd.quantiteCarton || 0,
      'Prix Unitaire': cmd.prixUnitaire || 0,
      'Prix Total': cmd.prixTotal || 0,
      'Payé': cmd.montantPaye || 0,
      'Reliquat': cmd.reliquat || 0,
      'Statut Paiement': formatEtatPaiement(cmd.statutDePaiement),
      'Destination': cmd.destination || '',
      'Date Création': cmd.createdAt ? XLSX.SSF.parse_date_code(new Date(cmd.createdAt).getTime() / 1000) : ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Commandes');
    const columnFormats = {
      'Quantité (Kg)': '#,##0.00',
      'Quantité Carton': '#,##0',
      'Prix Unitaire': '#,##0.00\\ [€]',
      'Prix Total': '#,##0.00\\ [€]',
      'Payé': '#,##0.00\\ [€]',
      'Reliquat': '#,##0.00\\ [€]',
      'Date Création': 'dd/mm/yyyy',
    };
    Object.entries(columnFormats).forEach(([colName, format]) => {
      const colIndex = Object.keys(data[0]).indexOf(colName);
      if (colIndex > -1) {
        ws['!cols'] = ws['!cols'] || [];
        ws['!cols'][colIndex] = { wch: 20, numFmt: format };
      }
    });
    const headerRange = XLSX.utils.decode_range(ws['!ref']);
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cell = XLSX.utils.encode_cell({ r: 0, c: col });
      ws[cell].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "3A405A" } },
      };
    }
    ws['!autofilter'] = { ref: XLSX.utils.encode_range(headerRange) };
    ws['!freeze'] = { ySplit: 1 };
    XLSX.writeFile(wb, `commandes_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handlePrint = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
    });
    doc.setFontSize(18);
    doc.text("Rapport des Commandes", 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le: ${new Date().toLocaleDateString()}`, 14, 28);
    const columns = [
      { header: 'Référence', dataKey: 'reference', width: 30 },
      { header: 'Client', dataKey: 'client', width: 40 },
      { header: 'Articles', dataKey: 'articles', width: 60 },
      { header: 'Type', dataKey: 'type', width: 30 },
      { header: 'Quantité (Kg)', dataKey: 'quantiteKg', width: 25 },
      { header: 'Prix Total', dataKey: 'prixTotal', width: 30 },
      { header: 'Statut Paiement', dataKey: 'statutPaiement', width: 35 },
      { header: 'Destination', dataKey: 'destination', width: 40 },
      { header: 'Date Création', dataKey: 'dateCreation', width: 30 },
    ];
    const rows = filtered.map(cmd => ({
      reference: cmd.reference,
      client: cmd.client?.raisonSociale || '—',
      articles: formatItemsSummary(cmd.items),
      type: cmd.typeCommande === 'LOCALE' ? 'LOCALE' : 'EXPORT',
      quantiteKg: cmd.items ? cmd.items.reduce((sum, item) => sum + (item.quantiteKg || 0), 0) : 0,
      prixTotal: formatCurrency(cmd.prixTotal, cmd.currency || 'EUR'),
      statutPaiement: getPaymentBadge(cmd.statutDePaiement),
      destination: cmd.destination || '—',
      dateCreation: cmd.createdAt ? new Date(cmd.createdAt).toLocaleDateString() : '—',
    }));
    doc.autoTable({
      startY: 32,
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      columns,
      body: rows,
      theme: 'grid',
      styles: { cellWidth: 'wrap' },
    });
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(pdfUrl);
    printWindow.onload = () => {
      printWindow.print();
      URL.revokeObjectURL(pdfUrl);
    };
  };

  const fetchCommandes = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/commandes');
      // Log pour debug
      console.log('Commandes récupérées:', res.data.map(c => ({ 
        reference: c.reference, 
        typeCommande: c.typeCommande 
      })));
      setCommandes(res.data);
    } catch (err) {
      console.error('Erreur lors du chargement des commandes', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCommande = (commande) => {
    console.log('Édition commande:', { 
      reference: commande.reference, 
      typeCommande: commande.typeCommande,
      _id: commande._id 
    });
    setEditingCommande(commande);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingCommande(null);
    setIsModalOpen(false);
  };

  const handleCommandeCreated = () => {
    setIsModalOpen(false);
    setEditingCommande(null);
    fetchCommandes();
  };

  const [commandesCompletables, setCommandesCompletables] = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationDetails, setNotificationDetails] = useState(null);

  // Vérifier les commandes complétables périodiquement
  useEffect(() => {
    const checkCompletables = async () => {
      try {
        const response = await axios.get('/commandes/completables');
        setCommandesCompletables(response.data.commandesCompletables || []);
      } catch (error) {
        console.error('Erreur lors de la vérification des commandes complétables:', error);
      }
    };

    checkCompletables();
    const interval = setInterval(checkCompletables, 60000); // Vérifier toutes les minutes

    return () => clearInterval(interval);
  }, []);

  // Fonction pour obtenir le badge de statut
  const getStatutBadge = (commande) => {
    const isCompletable = commandesCompletables.some(
      c => c.commande._id === commande._id
    );

    if (isCompletable) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 animate-pulse">
          <CheckCircleIcon className="w-3 h-3 mr-1" />
          Peut être complétée
        </span>
      );
    }

    switch (commande.statutBonDeCommande) {
      case 'EN_ATTENTE_STOCK':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <ClockIcon className="w-3 h-3 mr-1" />
            En attente de stock
          </span>
        );
      case 'AVEC_QUANTITES_MANQUANTES':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ExclamationCircleIcon className="w-3 h-3 mr-1" />
            Quantités manquantes
          </span>
        );
      case 'COMPLET':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Complet
          </span>
        );
      case 'LIVREE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Livrée
          </span>
        );
      default:
        return null;
    }
  };

  // Fonction pour compléter une commande
  const handleCompleterCommande = async (commandeId) => {
    try {
      const response = await axios.post(`/commandes/${commandeId}/completer`);
      
      if (response.data.commande) {
        // Recharger les commandes
        const updatedCommandes = await axios.get('/commandes');
        setCommandes(updatedCommandes.data);
        
        // Afficher une notification de succès
        setNotificationDetails({
          type: 'success',
          message: 'Commande complétée avec succès',
          details: response.data.message
        });
        setShowNotification(true);
        
        // Cacher la notification après 5 secondes
        setTimeout(() => setShowNotification(false), 5000);
      }
    } catch (error) {
      setNotificationDetails({
        type: 'error',
        message: 'Erreur lors de la complétion de la commande',
        details: error.response?.data?.message || error.message
      });
      setShowNotification(true);
    }
  };

  // Fonction pour vérifier si une commande peut être livrée
  const canDeliver = (commande) => {
    return commande.statutBonDeCommande !== 'EN_ATTENTE_STOCK' && 
           commande.statutBonDeCommande !== 'AVEC_QUANTITES_MANQUANTES' &&
           commande.statutBonDeCommande !== 'LIVREE';
  };

  // Fonction pour obtenir le titre du bouton livrer
  const getDeliverButtonTitle = (commande) => {
    if (commande.statutBonDeCommande === 'LIVREE') {
      return 'Commande déjà livrée';
    } else if (commande.statutBonDeCommande === 'EN_ATTENTE_STOCK' || commande.statutBonDeCommande === 'AVEC_QUANTITES_MANQUANTES') {
      return 'Commande incomplète - Livraison impossible';
    }
    return 'Livraison partielle';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      {/* Notification */}
      {showNotification && notificationDetails && (
        <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-lg ${
          notificationDetails.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start">
            {notificationDetails.type === 'success' ? (
              <CheckCircleIcon className="h-6 w-6 text-green-400 mr-3" />
            ) : (
              <ExclamationCircleIcon className="h-6 w-6 text-red-400 mr-3" />
            )}
            <div>
              <h3 className={`text-sm font-medium ${
                notificationDetails.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {notificationDetails.message}
              </h3>
              {notificationDetails.details && (
                <p className={`mt-1 text-sm ${
                  notificationDetails.type === 'success' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {notificationDetails.details}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowNotification(false)}
              className="ml-4 text-gray-400 hover:text-gray-500"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Badge pour les commandes complétables */}
      {commandesCompletables.length > 0 && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <BellIcon className="h-6 w-6 text-green-600 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-green-800">
                {commandesCompletables.length} commande(s) peuvent maintenant être complétées
              </h3>
              <p className="mt-1 text-sm text-green-700">
                Le stock nécessaire est maintenant disponible
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Commandes Confirmées</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => navigate('/commandes/nouvelle')}
            variant="primary"
            size="md"
            icon={<PlusIcon className="h-5 w-5" />}
          >
            Nouvelle Commande
          </Button>
          <Button
            onClick={handleExportPDF}
            variant="success"
            size="md"
            icon={<DocumentArrowDownIcon className="h-5 w-5" />}
          >
            Export PDF
          </Button>
          <Button
            onClick={handleExportExcel}
            variant="warning"
            size="md"
            icon={<DocumentArrowDownIcon className="h-5 w-5" />}
          >
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <select
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              <option value="">Tous les clients</option>
              {clients.map(cli => (
                <option key={cli._id} value={cli._id}>
                  {cli.raisonSociale}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
            <input
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              type="text"
              placeholder="Recherche par référence"
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Numéro Booking</label>
            <input
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              type="text"
              placeholder="Recherche par numéro booking"
              value={searchNumeroBooking}
              onChange={(e) => setSearchNumeroBooking(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de Facture</label>
            <input
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              type="text"
              placeholder="Recherche par n° facture/proforma"
              value={searchNumeroFacture}
              onChange={(e) => setSearchNumeroFacture(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">Tous les statuts</option>
              <option value="EN_COURS">En cours</option>
              <option value="LIVREE">Livrée</option>
              <option value="PARTIELLEMENT_LIVREE">Partiellement livrée</option>
              <option value="EN_ATTENTE_STOCK">En attente de stock</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={resetFilters}
              variant="secondary"
              size="md"
              icon={<ArrowPathIcon className="h-4 w-4" />}
            >
              Réinitialiser
            </Button>
          </div>
        </div>

        {/* Filtre de dates */}
        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
          <CustomDateRangePicker
            startDate={startDate}
            endDate={endDate}
            onDatesChange={({ startDate, endDate }) => {
              setStartDate(startDate);
              setEndDate(endDate);
            }}
            displayFormat="dd/MM/yyyy"
            small={isMobile}
            numberOfMonths={isMobile ? 1 : 2}
            showClearDates={true}
            startDatePlaceholderText="Date de début"
            endDatePlaceholderText="Date de fin"
          />
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Chargement...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Statistiques */}
          {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-600">Total Commandes</h3>
              <p className="text-2xl font-bold text-blue-900">{filtered.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-600">Quantité Totale</h3>
              <p className="text-2xl font-bold text-green-900">
                {formatNumber(filtered.reduce((sum, cmd) => sum + getTotalQuantityKG(cmd), 0))} kg
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-yellow-600">Valeur Totale</h3>
              <div className="text-sm font-bold text-yellow-900">
                {(() => {
                  const totals = filtered.reduce((acc, cmd) => {
                    const currency = cmd.currency || 'EUR';
                    acc[currency] = (acc[currency] || 0) + (cmd.prixTotal || 0);
                    return acc;
                  }, {});
                  return Object.entries(totals).map(([currency, total]) => (
                    <div key={currency}>
                      {formatCurrency(total, currency)}
                    </div>
                  ));
                })()}
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-red-600">Impayés</h3>
              <div className="text-sm font-bold text-red-900">
                {(() => {
                  const totals = filtered.reduce((acc, cmd) => {
                    const currency = cmd.currency || 'EUR';
                    acc[currency] = (acc[currency] || 0) + (cmd.reliquat || 0);
                    return acc;
                  }, {});
                  return Object.entries(totals).map(([currency, total]) => (
                    <div key={currency}>
                      {formatCurrency(total, currency)}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div> */}

          {/* Table responsive */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {isMobile ? (
              // Vue mobile - cartes
              <div className="divide-y divide-gray-200">
                {currentItems.map((commande) => (
                  <div key={commande._id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{commande.reference}</h3>
                        {commande.numeroFacture && (
                          <p className="text-xs text-blue-600 font-medium">Facture: {commande.numeroFacture}</p>
                        )}
                        {commande.numeroFactureProforma && (
                          <p className="text-xs text-purple-600 font-medium">Proforma: {commande.numeroFactureProforma}</p>
                        )}
                        <p className="text-sm text-gray-600">{commande.client?.raisonSociale}</p>
                      </div>
                      <div className="flex flex-col space-y-2">
                        {getStatusBadge(commande.statutBonDeCommande)}
                        {getQuantitesManquantesIndicator(commande)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Quantité:</span>
                        <span className="ml-1 font-medium">{formatNumber(getTotalQuantityKG(commande))} kg</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Prix:</span>
                        <span className="ml-1 font-medium">{formatCurrency(commande.prixTotal, commande.currency)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Type:</span>
                        <span className="ml-1">
                          {commande.typeCommande === 'LOCALE' ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                              🏠 LOCALE
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                              🚢 EXPORT
                            </span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Date:</span>
                        <span className="ml-1">{new Date(commande.dateCommande).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Section Livraisons pour mobile */}
                    <div className="border-t pt-3">
                      <div className="text-gray-500 text-sm mb-2">Livraisons:</div>
                      {renderLivraisonInfo(commande._id)}
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      {getPaymentBadge(commande.statutDePaiement)}
                      <div className="flex space-x-4">
                        <Button
                          onClick={() => handleShowDetails(commande)}
                          variant="info"
                          size="md"
                          icon={<InformationCircleIcon className="h-5 w-5" />}
                          title="Voir détails"
                          className="font-semibold min-w-[90px]"
                        >
                          Détails
                        </Button>
                        <Button
                          onClick={() => canEditCommande(commande) ? handleEdit(commande) : null}
                          variant={canEditCommande(commande) ? "warning" : "secondary"}
                          size="md"
                          icon={<PencilIcon className="h-5 w-5" />}
                          title={getEditButtonTitle(commande)}
                          className={`font-semibold min-w-[90px] ${!canEditCommande(commande) ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={!canEditCommande(commande)}
                        >
                          Modifier
                        </Button>
                        <Button
                          onClick={() => handleShowAutorisationModal(commande)}
                          variant="primary"
                          size="md"
                          icon={<DocumentTextIcon className="h-4 w-4" />}
                          title="Générer autorisation de sortie"
                          className="font-semibold min-w-[40px]"
                        >
                        </Button>
                        <Button
                          onClick={() => handleShowLivraisonPartielle(commande)}
                          variant="success"
                          size="md"
                          icon={<TruckIcon className="h-5 w-5" />}
                          title={commande.statutBonDeCommande === 'LIVREE' ? "Commande déjà livrée" : "Livraison partielle"}
                          className="font-semibold min-w-[90px]"
                          disabled={commande.statutBonDeCommande === 'LIVREE'}
                        >
                          Livrer
                        </Button>
                        
                        {/* Nouveau bouton pour l'historique des batches */}
                        <Button
                          onClick={() => handleShowBatchHistory(commande)}
                          variant="outline"
                          size="md"
                          icon={<CubeIcon className="h-5 w-5" />}
                          title="Voir l'historique des batches utilisés dans cette commande"
                          className="font-semibold min-w-[90px]"
                        >
                          Batches
                        </Button>
                        {/* Bouton de suppression - toujours affiché mais grisé pour les commandes livrées */}
                        <Button
                          onClick={() => canDeleteCommande(commande) ? handleShowDeleteModal(commande) : null}
                          variant={canDeleteCommande(commande) ? "danger" : "secondary"}
                          size="md"
                          icon={<TrashIcon className="h-5 w-5" />}
                          title={canDeleteCommande(commande) ? "Supprimer la commande" : "Impossible de supprimer une commande livrée"}
                          className={`font-semibold min-w-[90px] ${!canDeleteCommande(commande) ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={!canDeleteCommande(commande)}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Vue desktop - table
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider max-w-[130px]">
                      Commande
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider max-w-[150px]">
                      Client
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider max-w-[120px]">
                      Type
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      Statut
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                      Livraisons
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-72">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.map((commande) => (
                    <tr key={commande._id} className="hover:bg-gray-50">
                      <td className="px-3 py-4 whitespace-nowrap max-w-[130px]">
                        <div className="truncate">
                          <div className="text-sm font-medium text-gray-900 truncate mb-1">{commande.reference}</div>
                          {commande.numeroFacture && (
                            <div className="text-xs text-blue-600 truncate font-medium">Fact: {commande.numeroFacture}</div>
                          )}
                          {commande.numeroFactureProforma && (
                            <div className="text-xs text-purple-600 truncate font-medium">Prof: {commande.numeroFactureProforma}</div>
                          )}
                          {commande.noBonDeCommande && (
                            <div className="text-xs text-gray-500 truncate">BC: {commande.noBonDeCommande}</div>
                          )}
                          {commande.BL && (
                            <div className="text-xs text-gray-500 truncate">B/L: {commande.BL}</div>
                          )}
                          {commande.numeroBooking && (
                            <div className="text-xs text-gray-500 truncate">Booking: {commande.numeroBooking}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap max-w-[150px]">
                        <div className="truncate">
                          <div className="text-sm text-gray-900 truncate">{commande.client?.raisonSociale || '—'}</div>
                          {commande.client?.email && (
                            <div className="text-xs text-gray-500 truncate">{commande.client.email}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 max-w-[120px]">
                        <div className="flex items-center justify-center">
                          {commande.typeCommande === 'LOCALE' ? (
                            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full border border-green-300 whitespace-nowrap">
                              🏠 LOCALE
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full border border-blue-300 whitespace-nowrap">
                              🚢 EXPORT
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {getStatusBadge(commande.statutBonDeCommande)}
                          {getQuantitesManquantesIndicator(commande)}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        {renderLivraisonInfo(commande._id)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(commande.dateCommande).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            onClick={() => handleShowDetails(commande)}
                            variant="info"
                            size="md"
                            icon={<InformationCircleIcon className="h-5 w-5" />}
                            title="Voir détails"
                            className="font-semibold min-w-[90px]"
                          >
                            {/* Détails */}
                          </Button>
                          <Button
                            onClick={() => canEditCommande(commande) ? handleEdit(commande) : null}
                            variant={canEditCommande(commande) ? "warning" : "secondary"}
                            size="md"
                            icon={<PencilIcon className="h-5 w-5" />}
                            title={getEditButtonTitle(commande)}
                            className={`font-semibold min-w-[90px] ${!canEditCommande(commande) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={!canEditCommande(commande)}
                          >
                            {/* Modifier */}
                          </Button>
                          {/* Bouton d'autorisation de sortie */}
                          <Button
                            onClick={() => handleShowAutorisationModal(commande)}
                            variant="primary"
                            size="md"
                            icon={<DocumentTextIcon className="h-4 w-4" />}
                            title="Générer autorisation de sortie"
                            className="font-semibold min-w-[40px]"
                          >
                          </Button>
                          {/* Bouton de livraison avec indication si désactivé */}
                          <Button
                            onClick={() => handleShowLivraisonPartielle(commande)}
                            className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs leading-4 font-medium rounded-md ${
                              canDeliver(commande)
                                ? 'text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                                : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                            }`}
                            disabled={!canDeliver(commande)}
                            title={getDeliverButtonTitle(commande)}
                          >
                            <TruckIcon className="h-4 w-4 mr-1" />
                            {/* Livrer */}
                          </Button>
                          {/* Bouton de suppression - toujours affiché mais grisé pour les commandes livrées */}
                          <Button
                            onClick={() => canDeleteCommande(commande) ? handleShowDeleteModal(commande) : null}
                            variant={canDeleteCommande(commande) ? "danger" : "secondary"}
                            size="md"
                            icon={<TrashIcon className="h-5 w-5" />}
                            title={canDeleteCommande(commande) ? "Supprimer la commande" : "Impossible de supprimer une commande livrée"}
                            className={`font-semibold min-w-[90px] ${!canDeleteCommande(commande) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={!canDeleteCommande(commande)}
                          >
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filtered.length / itemsPerPage)}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
              totalItems={filtered.length}
            />
          </div>
        </>
      )}

      {/* Modal de détails */}
      {showDetails && detailsCommande && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-y-auto">
            <CommandeDetails
              commande={detailsCommande}
              onClose={handleCloseDetails}
              formatCurrency={formatCurrency}
              formatNumber={formatNumber}
            />
          </div>
        </div>
      )}

      {/* Modal de livraison partielle */}
      {showLivraisonModal && selectedCommandeForLivraison && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <LivraisonPartielleModal
              commande={selectedCommandeForLivraison}
              onClose={handleCloseLivraisonModal}
              onLivraisonCreated={handleLivraisonCreated}
              formatCurrency={formatCurrency}
              formatNumber={formatNumber}
            />
          </div>
        </div>
      )}

      {/* Modal d'historique des batches */}
      {showBatchHistoryModal && selectedCommandeForBatchHistory && (
        <BatchHistoryModal
          commande={selectedCommandeForBatchHistory}
          onClose={handleCloseBatchHistoryModal}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
        />
      )}

      {/* Modal d'autorisation de sortie */}
      {showAutorisationModal && selectedCommandeForAutorisation && (
        <AutorisationSortieCommandeModal
          commande={selectedCommandeForAutorisation}
          onClose={handleCloseAutorisationModal}
        />
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && commandeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <ExclamationCircleIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                  Confirmer la suppression
                </h3>
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2">
                    Êtes-vous sûr de vouloir supprimer la commande suivante ?
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg text-left">
                    <p className="text-sm font-medium text-gray-900">
                      Référence: {commandeToDelete.reference}
                    </p>
                    <p className="text-sm text-gray-600">
                      Client: {commandeToDelete.client?.raisonSociale || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Prix total: {formatCurrency(commandeToDelete.prixTotal, commandeToDelete.currency)}
                    </p>
                  </div>
                  <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ <strong>Attention :</strong> Cette action est irréversible. 
                      Le stock des articles sera automatiquement restauré.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3 justify-end">
                <Button
                  onClick={handleCloseDeleteModal}
                  variant="secondary"
                  size="md"
                  disabled={isDeleting}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleDeleteCommande}
                  variant="danger"
                  size="md"
                  loading={isDeleting}
                  disabled={isDeleting}
                  icon={<TrashIcon className="h-5 w-5" />}
                >
                  {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandeList;
