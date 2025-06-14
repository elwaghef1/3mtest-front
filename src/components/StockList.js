// frontend/src/components/StockList.js
import React, { useEffect, useState, useCallback } from 'react';
import axios from '../api/axios';
import Button from './Button';
import {
  InformationCircleIcon,
  ArrowPathIcon,
  ScaleIcon,
  CubeIcon,
  PrinterIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/solid';
import AdjustStockModal from './AdjustStockModal';
import StockAlertsModal from './StockAlertsModal';
import Pagination from './Pagination';
import CostCalculatorModal from './CostCalculatorModal';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';

export default function StockList() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtres
  const [filtered, setFiltered] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState('');
  const [selectedDepot, setSelectedDepot] = useState('');

  // Options pour les filtres
  const [depotOptions, setDepotOptions] = useState([]);

  // Monnaie d'affichage et taux de conversion (les taux sont récupérés via l'API)
  const [displayCurrency, setDisplayCurrency] = useState('MRU');
  const [conversionRates, setConversionRates] = useState({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Pour gérer le modal, nous stockons la ligne sélectionnée
  const [showCostModal, setShowCostModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [stockToAdjust, setStockToAdjust] = useState(null);

  // Alertes de stock
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [alertsCount, setAlertsCount] = useState(0);

  const isMobile = window.innerWidth < 768;

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  // Déterminer le nombre total de colonnes selon l'affichage (mobile ou non)
  const numColumns = isMobile ? 5 : 10;

  // Fonction utilitaire pour formater un article
  const formatArticle = (a) => {
    if (!a) return '—';
    return [a.reference, a.specification, a.taille]
      .filter(Boolean)
      .join(' - ');
  };

  // Fonction de filtrage avec useCallback pour éviter les re-rendus
  const filterStocks = useCallback(() => {
    let result = [...stocks];
  
    if (selectedArticle !== '') {
      result = result.filter(
        (stock) => formatArticle(stock.article).toLowerCase().includes(selectedArticle.toLowerCase())
      );
    }
  
    if (selectedDepot !== '') {
      result = result.filter(
        (stock) => stock.depot?.intitule === selectedDepot
      );
    }
  
    // Trier par article alphabétiquement croissant
    result.sort((a, b) =>
      formatArticle(a.article)
        .localeCompare(formatArticle(b.article), 'fr', { sensitivity: 'base' })
    );
  
    setFiltered(result);
    setCurrentPage(1);
  }, [stocks, selectedArticle, selectedDepot]);

  useEffect(() => {
    fetchStocks();
    fetchAlertsCount();
  }, []);

  useEffect(() => {
    filterStocks();
  }, [stocks, selectedArticle, selectedDepot, filterStocks]);

  useEffect(() => {
    const depots = stocks
      .map((s) => s.depot?.intitule)
      .filter((d) => d);
    const uniqueDepots = [...new Set(depots)];
    setDepotOptions(uniqueDepots);
  }, [stocks]);

  useEffect(() => {
    const fetchConversionRates = async () => {
      const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
      // Vérifier si des taux sont déjà stockés pour aujourd'hui
      const cachedData = localStorage.getItem("conversionRates");
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        if (parsedData.date === today) {
          setConversionRates(parsedData.rates);
          return; // On utilise les taux mis en cache
        }
      }

      try {
        // Ici, nous utilisons USD comme base et demandons EUR et MRU
        const response = await fetch(
          'https://api.exchangerate.host/live?access_key=2a1159afb2691e129d97fdfb5ebb5ca7&currencies=EUR,MRU&base=USD'
        );
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        const data = await response.json();
        const quotes = data.quotes;
        // Construction de l'objet rates avec USD = 1
        const rates = {
          USD: 1,
          EUR: quotes['USDEUR'],
          MRU: quotes['USDMRU']
        };
        setConversionRates(rates);
        localStorage.setItem("conversionRates", JSON.stringify({ date: today, rates }));
      } catch (err) {
        console.error('Erreur lors de la récupération des taux de conversion:', err);
        setConversionRates({ USD: 1, EUR: 0.85, MRU: 41.5 });
      }
    };

    fetchConversionRates();
  }, []);

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/stock');
      setStocks(res.data);
      setFiltered(res.data);
      setError(null);
    } catch (err) {
      console.error('Erreur récupération stocks:', err);
      setError('Erreur de chargement du stock');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlertsCount = async () => {
    try {
      const response = await axios.get('/stock/alerts');
      setAlertsCount(response.data.length);
    } catch (error) {
      console.error('Erreur lors du chargement des alertes:', error);
      setAlertsCount(0);
    }
  };

  // Fonction de formatage des nombres sans slash
  const formatNumber = (value) => {
    const formatted = new Intl.NumberFormat('fr-FR').format(value || 0);
    return formatted.replace(/\//g, '');
  };

  // Formateur de nombres pour le PDF (format français avec 0 décimale et espaces pour milliers)
  const pdfNumber = (value) => {
    const num = parseFloat(value || 0);
    // Utiliser l'espace non-sécable (Unicode 00A0) pour le PDF
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true
    }).format(num).replace(/\s/g, '\u00A0');
  };

  // Calcul du CUMP global en devise d'affichage (moyenne pondérée sur la quantité)
  const totalValueInDisplay = filtered.reduce((acc, s) => {
    const stockCurrency = s.monnaie || 'USD';
    const factor = conversionRates[displayCurrency] / conversionRates[stockCurrency];
    return acc + (s.valeur * s.quantiteKg * factor);
  }, 0);
  const totalQuantity = filtered.reduce((acc, s) => acc + (s.quantiteKg || 0), 0);
  const globalCump = totalQuantity > 0 ? (totalValueInDisplay / totalQuantity) * 1000 : 0;

  const getCurrencyLabel = () => {
    if (displayCurrency === 'EUR') return '€';
    if (displayCurrency === 'USD') return '$';
    return 'MRU';
  };

  const resetFilters = () => {
    setSelectedArticle('');
    setSelectedDepot('');
  };

  // Conversion de SMCP en MRU en fonction de la monnaie de l'article (inchangé)
  const getInitialSmcpMRU = (article) => {
    if (!article || article.prixSMCP == null) return 4462; // valeur par défaut
    const { prixSMCP, prixSMCPCurrency } = article;
    if (prixSMCPCurrency === 'MRU') {
      return prixSMCP;
    } else if (prixSMCPCurrency === 'EUR') {
      return prixSMCP * (conversionRates['MRU'] || 1);
    } else if (prixSMCPCurrency === 'USD') {
      const rateMRU = conversionRates['MRU'] || 1;
      const rateUSD = conversionRates['USD'] || 1;
      return prixSMCP * (rateMRU / rateUSD);
    }
    return prixSMCP;
  };

  // ------------------------------
  // Fonction d'export PDF incluant les statistiques et la valeur du stock
  // ------------------------------
  const exportToPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    // Styles et configuration de base
    const styles = {
      headerFontSize: 16,
      subheaderFontSize: 10,
      tableHeader: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255], // Texte blanc pour les en-têtes
        fontStyle: 'bold',
        fontSize: 10,
      },
      numericCell: {
        halign: 'right',
      },
    };

    // Entête du PDF
    doc.setFontSize(styles.headerFontSize);
    doc.setFont(undefined, 'bold');
    doc.text('ÉTAT DE STOCK', 14, 20);

    doc.setFontSize(styles.subheaderFontSize);
    doc.setTextColor(100);
    doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, 14, 28);

    // Calcul des statistiques globales
    const totalKg = filtered.reduce((acc, s) => acc + (s.quantiteKg || 0), 0);
    const totalTonnes = totalKg / 1000;
    const totalCartons = totalKg / 20;
    const totalCommercialisableKg = filtered.reduce(
      (acc, s) => acc + (s.quantiteCommercialisableKg || 0),
      0
    );
    const totalCommercialisableTonnes = totalCommercialisableKg / 1000;
    const totalCommercialisableCartons = totalCommercialisableKg / 20;

    let statsY = 35;
    doc.text(`Disponible (Tonnes) : ${pdfNumber(totalTonnes)} T`, 14, statsY);
    statsY += 5;
    doc.text(`Disponible (Cartons) : ${pdfNumber(totalCartons)}`, 14, statsY);
    statsY += 5;
    doc.text(`Commercialisable (Tonnes) : ${pdfNumber(totalCommercialisableTonnes)} T`, 14, statsY);
    statsY += 5;
    doc.text(`Commercialisable (Cartons) : ${pdfNumber(totalCommercialisableCartons)}`, 14, statsY);
    statsY += 5;
    doc.text(`CUMP/T (${getCurrencyLabel()}) : ${pdfNumber(globalCump)}`, 14, statsY);

    const startY = statsY + 7;

    // Définition des colonnes pour l'export
    const columns = [
      { header: 'Article', dataKey: 'article', width: 80 },
      { header: 'Dépôt', dataKey: 'depot', width: 25 },
      {
        header: 'Quantité (Kg)',
        dataKey: 'quantiteKg',
        width: 25,
        ...styles.numericCell,
      },
      {
        header: 'Cartons',
        dataKey: 'cartons',
        width: 20,
        ...styles.numericCell,
      },
      {
        header: 'Commercialisable (Kg)',
        dataKey: 'commercialisableKg',
        width: 30,
        ...styles.numericCell,
      },
      {
        header: 'Commercialisable (Cartons)',
        dataKey: 'commercialisableCartons',
        width: 30,
        ...styles.numericCell,
      },
      {
        header: `CUMP (${getCurrencyLabel()}/Tonne)`,
        dataKey: 'cump',
        width: 30,
        ...styles.numericCell,
      },
    ];

    const rows = filtered.map((stock) => {
      const stockCurrency = stock.monnaie || 'USD';
      const factor = conversionRates[displayCurrency] / conversionRates[stockCurrency];
      return {
        article: formatArticle(stock.article),
        depot: stock.depot?.intitule || '—',
        quantiteKg: pdfNumber(stock.quantiteKg || 0),
        cartons: pdfNumber((stock.quantiteKg || 0) / 20),
        commercialisableKg: pdfNumber(stock.quantiteCommercialisableKg || 0),
        commercialisableCartons: pdfNumber((stock.quantiteCommercialisableKg || 0) / 20),
        cump: pdfNumber((stock.valeur || 0) * 1000 * factor),
      };
    });

    // Génération du tableau sans le pied de page
    doc.autoTable({
      startY: startY,
      columns: columns.map((col) => ({
        title: col.header,
        dataKey: col.dataKey,
        ...col,
      })),
      body: rows,
      theme: 'grid',
      headStyles: styles.tableHeader,
      bodyStyles: {
        fontSize: 9,
        cellPadding: 2,
        valign: 'middle',
      },
      styles: { cellWidth: 'wrap' },
      margin: { horizontal: 14 },
      didParseCell: (data) => {
        if (data.column.dataKey === 'article') {
          data.cell.styles.cellWidth = 'auto';
          data.cell.styles.halign = 'left';
        }
        // Alignement à droite pour les colonnes numériques
        if (['quantiteKg', 'cartons', 'commercialisableKg', 'commercialisableCartons', 'cump'].includes(data.column.dataKey)) {
          data.cell.styles.halign = 'right';
        }
      },
      willDrawCell: (data) => {
        if (data.row.index % 2 === 0 && data.section === 'body') {
          doc.setFillColor(245, 245, 245);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
        }
      },
      columnStyles: {
        quantiteKg: { halign: 'right' },
        cartons: { halign: 'right' },
        commercialisableKg: { halign: 'right' },
        commercialisableCartons: { halign: 'right' },
        cump: { halign: 'right' }
      }
    });

    // Obtenir la position finale du tableau
    const finalY = doc.lastAutoTable.finalY;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageCount = doc.internal.getNumberOfPages();

    // Ajouter le total uniquement sur la dernière page
    doc.setPage(pageCount);
    
    // Vérifier s'il y a assez d'espace sur la dernière page (30mm pour le total)
    if (finalY + 30 > pageHeight - 20) {
      // Ajouter une nouvelle page si nécessaire
      doc.addPage();
    }
    
    // Dessiner le tableau de total
    const totalY = doc.lastAutoTable.finalY + 10;
    const tableWidth = doc.internal.pageSize.getWidth() - 28; // marge horizontale de 14 de chaque côté
    
    // Ligne de total
    doc.setFillColor(255, 255, 255);
    doc.rect(14, totalY, tableWidth * 0.8, 10, 'F');
    doc.setFillColor(255, 0, 0);
    doc.rect(14 + tableWidth * 0.8, totalY, tableWidth * 0.2, 10, 'F');
    
    // Texte
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('Valeur du stock :', 14 + tableWidth * 0.8 - 5, totalY + 6, { align: 'right' });
    
    doc.setTextColor(255, 255, 255);
    doc.text(`${pdfNumber(totalValueInDisplay)} ${getCurrencyLabel()}`, 14 + tableWidth * 0.9, totalY + 6, { align: 'center' });
    
    // Bordure autour du total
    doc.setDrawColor(0, 0, 0);
    doc.rect(14, totalY, tableWidth, 10, 'S');

    // Ajouter les numéros de page
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        `Page ${i} / ${totalPages}`,
        doc.internal.pageSize.getWidth() - 25,
        doc.internal.pageSize.getHeight() - 10
      );
    }

    doc.save(`stock_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Nouvelle fonction pour exporter le stock commercialisable en PDF
  const exportCommercialisableToPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 10;
    const marginRight = 10;
    
    // Entête du PDF
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text("Stock Commercialisable", pageWidth / 2, 20, { align: 'center' });
    
    // Définition des colonnes : Article, Dépôt, Quantité commercialisable (Kg)
    const columns = ["Article", "Dépôt", "Quantité (Kg)"];
    
    // Construction des données à partir de la liste filtrée
    const data = filtered.map(s => ({
      article: s.article ? formatArticle(s.article) : '—',
      depot: s.depot ? s.depot.intitule : '—',
      quantite: pdfNumber(s.quantiteCommercialisableKg || 0)
    }));
    
    // Ajout du tableau avec jsPDF-AutoTable
    doc.autoTable({
      head: [columns],
      body: data.map(row => [row.article, row.depot, row.quantite]),
      startY: 30,
      margin: { left: marginLeft, right: marginRight },
      styles: { fontSize: 10 }
    });
    
    doc.save(`stock_commercialisable_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  // Export Excel (avec formatage comptable français et design amélioré)
  const exportToExcel = () => {
    // Préparation des données avec calculs
    const data = filtered.map((stock) => {
      const stockCurrency = stock.monnaie || 'USD';
      const factor = conversionRates[displayCurrency] / conversionRates[stockCurrency];
      const valeurKg = stock.valeur * factor; // Valeur par kg
      const valeurTotale = (stock.quantiteKg || 0) * valeurKg; // Valeur totale de l'article
      
      return {
        'Article': formatArticle(stock.article),
        'Dépôt': stock.depot?.intitule || '—',
        'Quantité (Kg)': new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(stock.quantiteKg || 0),
        'Cartons': new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((stock.quantiteKg || 0) / 20),
        'Commercialisable (Kg)': new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(stock.quantiteCommercialisableKg || 0),
        'Commercialisable (Cartons)': new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((stock.quantiteCommercialisableKg || 0) / 20),
        [`Valeur kg (${displayCurrency})`]: new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valeurKg),
        [`Valeur Totale (${displayCurrency})`]: new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valeurTotale),
      };
    });

    // Ajouter une ligne de total
    const totalValueInDisplay = filtered.reduce((acc, s) => {
      const stockCurrency = s.monnaie || 'USD';
      const factor = conversionRates[displayCurrency] / conversionRates[stockCurrency];
      return acc + (s.valeur * s.quantiteKg * factor);
    }, 0);

    // Ligne de séparation
    data.push({
      'Article': '',
      'Dépôt': '',
      'Quantité (Kg)': '',
      'Cartons': '',
      'Commercialisable (Kg)': '',
      'Commercialisable (Cartons)': '',
      [`Valeur kg (${displayCurrency})`]: '',
      [`Valeur Totale (${displayCurrency})`]: ''
    });

    // Ligne de total
    data.push({
      'Article': '',
      'Dépôt': '',
      'Quantité (Kg)': '',
      'Cartons': '',
      'Commercialisable (Kg)': '',
      'Commercialisable (Cartons)': '',
      [`Valeur kg (${displayCurrency})`]: '*** TOTAL STOCK ***',
      [`Valeur Totale (${displayCurrency})`]: new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalValueInDisplay),
      'Coût de Revient': '',
    });

    // Créer la feuille de calcul
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Définir la largeur des colonnes pour une meilleure lisibilité
    const colWidths = [
      { wch: 50 }, // Article
      { wch: 20 }, // Dépôt
      { wch: 15 }, // Quantité (Kg)
      { wch: 12 }, // Cartons
      { wch: 20 }, // Commercialisable (Kg)
      { wch: 25 }, // Commercialisable (Cartons)
      { wch: 18 }, // Valeur kg
      { wch: 25 }, // Valeur Totale
      { wch: 15 }, // Coût de Revient
    ];
    worksheet['!cols'] = colWidths;

    // Créer le classeur et ajouter la feuille
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock');
    
    // Sauvegarder avec un nom incluant la date
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `stock_report_${today}.xlsx`);
  };

  return (
    <div className="p-4 lg:p-6">
      {/* Titre et sélecteur de devise */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">État de Stock</h1>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">
            Afficher les prix en :
          </label>
          <select
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value)}
            className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="MRU">MRU</option>
          </select>
        </div>
      </div>

      {/* Cartes de synthèse */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-600 p-4 rounded-lg shadow-sm text-white">
          <div className="flex items-center">
            <ScaleIcon className="h-8 w-8 mr-3" />
            <div>
              <div className="text-2xl font-bold">
                {formatNumber(filtered.reduce((acc, s) => acc + (s.quantiteKg || 0), 0) / 1000)} T
              </div>
              <div className="text-sm">Disponible (Tonnes)</div>
            </div>
          </div>
        </div>

        <div className="bg-blue-700 p-4 rounded-lg shadow-sm text-white">
          <div className="flex items-center">
            <CubeIcon className="h-8 w-8 mr-3" />
            <div>
              <div className="text-2xl font-bold">
                {formatNumber(filtered.reduce((acc, s) => acc + (s.quantiteKg || 0), 0) / 20)}
              </div>
              <div className="text-sm">Disponible (Cartons)</div>
            </div>
          </div>
        </div>

        <div className="bg-green-600 p-4 rounded-lg shadow-sm text-white">
          <div className="flex items-center">
            <ScaleIcon className="h-8 w-8 mr-3" />
            <div>
              <div className="text-2xl font-bold">
                {formatNumber(filtered.reduce((acc, s) => acc + (s.quantiteCommercialisableKg || 0), 0) / 1000)} T
              </div>
              <div className="text-sm">Commercialisable (Tonnes)</div>
            </div>
          </div>
        </div>

        <div className="bg-green-700 p-4 rounded-lg shadow-sm text-white">
          <div className="flex items-center">
            <CubeIcon className="h-8 w-8 mr-3" />
            <div>
              <div className="text-2xl font-bold">
                {formatNumber(filtered.reduce((acc, s) => acc + (s.quantiteCommercialisableKg || 0), 0) / 20)}
              </div>
              <div className="text-sm">Commercialisable (Cartons)</div>
            </div>
          </div>
        </div>

        <div className="bg-purple-600 p-4 rounded-lg shadow-sm text-white">
          <div className="flex items-center">
            <ScaleIcon className="h-8 w-8 mr-3" />
            <div>
              <div className="text-2xl font-bold">
                {formatNumber(globalCump)}
              </div>
              <div className="text-sm">
                CUMP/T ({getCurrencyLabel()})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recherche par Article
            </label>
            <input
              type="text"
              value={selectedArticle}
              onChange={(e) => setSelectedArticle(e.target.value)}
              placeholder="Rechercher par article"
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dépôt
            </label>
            <select
              value={selectedDepot}
              onChange={(e) => setSelectedDepot(e.target.value)}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les dépôts</option>
              {depotOptions.map((depot, index) => (
                <option key={index} value={depot}>
                  {depot}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={resetFilters}
              variant="secondary"
              size="md"
              leftIcon={<ArrowPathIcon className="h-4 w-4" />}
              className="w-full"
            >
              Réinitialiser
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
          {error} - Veuillez rafraîchir la page
        </div>
      )}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Chargement en cours...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <InformationCircleIcon className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">Aucun stock trouvé</h3>
          <p className="mt-1 text-gray-500">Le stock semble vide</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border shadow-sm">
          <div className="flex justify-between mb-4">
            <div className="flex items-center">
              <Button
                onClick={() => setShowAlertsModal(true)}
                variant="warning"
                size="md"
                leftIcon={<ExclamationTriangleIcon className="h-4 w-4" />}
                className="relative"
              >
                Alertes de Stock
                {alertsCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {alertsCount}
                  </span>
                )}
              </Button>
            </div>
            <div className="flex space-x-4">
              <Button
                onClick={exportCommercialisableToPDF}
                variant="info"
                size="md"
                leftIcon={<PrinterIcon className="h-4 w-4" />}
              >
                Télécharger Stock Commercialisable
              </Button>
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
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border shadow-sm">
            <table className="min-w-full border-collapse border border-gray-400">
              <thead className="bg-gray-50">
                <tr>
                  {!isMobile && (
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border border-gray-400">
                      Article
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border border-gray-400">
                    Dépôt
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-400">
                    Détails
                  </th>
                  {!isMobile && (
                    <>
                      <th className="px-4 py-3 text-right text-sm font-bold text-gray-700 border border-gray-400">
                        Quantité (Kg)
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-gray-700 border border-gray-400">
                        Cartons
                      </th>
                    </>
                  )}
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-400">
                    Commercialisable (Kg)
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-400">
                    Commercialisable (Cartons)
                  </th>
                  {!isMobile && (
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-400">
                      Valeur kg ({displayCurrency})
                    </th>
                  )}
                  {!isMobile && (
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-400">
                      Valeur Totale ({displayCurrency})
                    </th>
                  )}
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-400">
                    Coût de Revient
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border border-gray-400">
                    Ajustement
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {currentItems.map((s) => {
                  const stockCurrency = s.monnaie || 'USD';
                  const factor = conversionRates[displayCurrency] / conversionRates[stockCurrency];
                  return (
                    <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                      {!isMobile && (
                        <td className="px-4 py-3 text-sm text-gray-700 min-w-[300px] border border-gray-400">
                          {formatArticle(s.article)}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-900 border border-gray-400">
                        {s.depot?.intitule || '—'}
                      </td>
                      <td className="px-4 py-3 text-center border border-gray-400">
                        <Link
                          to={`/lots/${s.depot?._id}/${s.article?._id}`}
                          className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                        >
                          Détails
                        </Link>
                      </td>
                      {!isMobile && (
                        <>
                          <td className="px-4 py-3 text-sm text-right text-gray-700 border border-gray-400">
                            <span className="bg-red-800 px-3 py-1 rounded-full text-sm text-white">
                              {formatNumber(s.quantiteKg)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700 border border-gray-400">
                            <span className="bg-red-800 px-3 py-1 rounded-full text-sm text-white">
                              {formatNumber(s.quantiteKg / 20)}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-center border border-gray-400">
                        <span className="bg-green-800 px-3 py-1 rounded-full text-sm text-white">
                          {formatNumber(s.quantiteCommercialisableKg)} Kg
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center border border-gray-400">
                        <span className="bg-green-800 px-3 py-1 rounded-full text-sm text-white">
                          {formatNumber(s.quantiteCommercialisableKg / 20)}
                        </span>
                      </td>
                      {!isMobile && (
                        <td className="px-4 py-3 text-center border border-gray-400">
                          <span className="bg-purple-800 px-3 py-1 rounded-full text-sm text-white">
                            {formatNumber(s.valeur * factor)}
                          </span>
                        </td>
                      )}
                      {!isMobile && (
                        <td className="px-4 py-3 text-center border border-gray-400">
                          <span className="bg-orange-600 px-3 py-1 rounded-full text-sm text-white">
                            {formatNumber((s.quantiteKg || 0) * s.valeur * factor)}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 text-center border border-gray-400">
                        <Button
                          onClick={() => {
                            setSelectedStock(s);
                            setShowCostModal(true);
                          }}
                          variant="primary"
                          size="sm"
                        >
                          Calculer
                        </Button>
                      </td>
                      <td className="px-4 py-3 text-center border border-gray-400">
                        <Button
                          onClick={() => {
                            setStockToAdjust(s);
                            setShowAdjustModal(true);
                          }}
                          variant="warning"
                          size="sm"
                        >
                          Ajuster
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Ajout du pied de tableau pour afficher la "Valeur du stock" */}
              <tfoot>
                <tr>
                  <td colSpan={numColumns - 2} className="text-right font-bold bg-white px-4 py-3 border border-gray-400">
                    Valeur du stock :
                  </td>
                  <td colSpan={2} className="bg-red-600 text-white text-center font-bold px-4 py-3 border border-gray-400">
                    <strong>{formatNumber(totalValueInDisplay.toFixed(2))} {getCurrencyLabel()}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
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

      {/* Modal de calcul du coût de revient pour la ligne sélectionnée */}
      <CostCalculatorModal
        isOpen={showCostModal}
        onClose={() => setShowCostModal(false)}
        displayCurrency={displayCurrency}
        currentCump={
          selectedStock
            ? selectedStock.valeur * 1000 *
              (conversionRates[displayCurrency] / conversionRates[selectedStock.monnaie || 'USD'])
            : 0
        }
        initialSmcp={
          selectedStock && selectedStock.article
            ? getInitialSmcpMRU(selectedStock.article)
            : 4462
        }
        formattedArticle={
          selectedStock && selectedStock.article
            ? formatArticle(selectedStock.article)
            : ''
        }
        conversionRates={conversionRates} 
      />
      <AdjustStockModal
          isOpen={showAdjustModal}
          onClose={() => setShowAdjustModal(false)}
          stock={stockToAdjust}
          onAdjusted={fetchStocks}
        />
      <StockAlertsModal
        isOpen={showAlertsModal}
        onClose={() => {
          setShowAlertsModal(false);
          fetchAlertsCount(); // Rafraîchir le nombre d'alertes après fermeture
        }}
      />
    </div>
  );
}
