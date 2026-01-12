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
import { getCartonQuantityFromKg } from '../utils/cartonsUtils';
import { convertKgToCarton } from '../utils/cartonsUtils';
import logoBase64 from './logoBase64';
import ExcelJS from 'exceljs';

// Fonction helper pour récupérer l'article correspondant à un stock
const getArticleForStock = (stock, articles) => {
  if (!stock || !stock.article) return null;
  const articleId = typeof stock.article === 'object' ? stock.article._id : stock.article;
  return articles.find(article => article._id === articleId) || stock.article;
};

export default function StockList() {
  const [stocks, setStocks] = useState([]);
  const [articles, setArticles] = useState([]);
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
      const [stockRes, articlesRes] = await Promise.all([
        axios.get('/stock'),
        axios.get('/articles')
      ]);
      setStocks(stockRes.data);
      setArticles(articlesRes.data);
      setFiltered(stockRes.data);
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

  // Formateur de nombres pour les cartons (avec 2 décimales exactes) - web et PDF
  const formatCartons = (value) => {
    const num = parseFloat(value || 0);
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    }).format(num);
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

  // Formateur de nombres pour les cartons (avec 2 décimales exactes) - PDF avec espaces non-sécables
  const pdfNumberDecimal = (value) => {
    const num = parseFloat(value || 0);
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    }).format(num).replace(/\s/g, '\u00A0');
  };

  // Calcul du CUMP global en devise d'affichage (moyenne pondérée sur la quantité disponible)
  const totalValueInDisplay = filtered.reduce((acc, s) => {
    const stockCurrency = s.monnaie || 'USD';
    const factor = conversionRates[displayCurrency] / conversionRates[stockCurrency];
    return acc + (s.valeur * (s.quantiteKg || 0) * factor);
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
  // Nouvelle fonction d'export PDF avec le même design que l'Excel
  // ------------------------------

 const exportToExcelStylePDF = () => {
    // 1. Collecte des dépôts uniques
    const depotsSet = new Set();
    filtered.forEach(s => {
      if (s.depot?.intitule) depotsSet.add(s.depot.intitule);
    });
    const uniqueDepots = Array.from(depotsSet).sort();

    // 2. Groupement & agrégation (identique à exportToExcel)
    const speciesMap = new Map();
    for (const stock of filtered) {
      const name = formatArticle(stock.article);
      if (!speciesMap.has(name)) {
        const depotsObj = {};
        uniqueDepots.forEach(d => (depotsObj[d] = { commercialisable: 0, disponible: 0 }));
        speciesMap.set(name, {
          name,
          depots: depotsObj,
          totalValue: 0,
          totalValueForCump: 0,
          totalQuantityForCump: 0
        });
      }
      const grp = speciesMap.get(name);
      const qtyCommercialisable = stock.quantiteCommercialisableKg || 0;
      const qtyDisponible = stock.quantiteKg || 0;
      const depotName = stock.depot?.intitule || '';
      
      if (depotName && grp.depots.hasOwnProperty(depotName)) {
        grp.depots[depotName].commercialisable += qtyCommercialisable;
        grp.depots[depotName].disponible += qtyDisponible;
      }
      
      if (stock.valeur != null) {
        const factor = conversionRates[displayCurrency] / conversionRates[stock.monnaie || 'USD'];
        grp.totalValue += stock.valeur * qtyDisponible * factor;
        grp.totalValueForCump += stock.valeur * qtyDisponible * factor;
        grp.totalQuantityForCump += qtyDisponible;
      }
    }

    // 3. Préparer le tableau final
    const groupedData = [];
    speciesMap.forEach(grp => {
      const totalKgCommercialisable = Object.values(grp.depots).reduce((a, b) => a + b.commercialisable, 0);
      const totalKgDisponible = Object.values(grp.depots).reduce((a, b) => a + b.disponible, 0);
      const cumpPerKg = grp.totalQuantityForCump > 0 ? (grp.totalValueForCump / grp.totalQuantityForCump) : 0;
      const realArticle = articles.find(art => formatArticle(art) === grp.name) || null;
      
      groupedData.push({
        name: grp.name,
        depots: grp.depots,
        totalKgCommercialisable,
        totalKgDisponible,
        cartonsCommercialisable: getCartonQuantityFromKg(totalKgCommercialisable, realArticle),
        cartonsDisponible: getCartonQuantityFromKg(totalKgDisponible, realArticle),
        totalValue: grp.totalValue,
        cumpPerKg: cumpPerKg,
        article: realArticle
      });
    });

    // Création du PDF
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const tableWidth = pageWidth - 2 * margin;
    
    // Calcul optimisé des largeurs de colonnes (réduction des colonnes de totaux)
    const numDepots = uniqueDepots.length;
    const articleWidth = 45;
    const cumpWidth = 15;
    const totalCommWidth = 15;    // Réduit de 20 à 15
    const totalDispWidth = 15;     // Réduit de 20 à 15
    const cartonsWidth = 15;       // Réduit de 20 à 15
    const valueWidth = 25;         // Réduit de 30 à 25
    
    const fixedColumnsWidth = articleWidth + cumpWidth + totalCommWidth + totalDispWidth + cartonsWidth + valueWidth;
    const availableForDepots = tableWidth - fixedColumnsWidth;
    const depotPairWidth = availableForDepots / numDepots;
    const depotColumnWidth = depotPairWidth / 2;

    // Fonction pour dessiner le titre principal
    const drawMainTitle = (y) => {
      doc.setFillColor(255, 0, 0); // Rouge
      doc.rect(margin, y, tableWidth, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text('ETAT DE STOCK', pageWidth / 2, y + 7, { align: 'center' });
      return y + 15;
    };

    // Fonction pour dessiner l'en-tête du tableau
    const drawTableHeader = (startY) => {
      let currentX = margin;
      const headerHeight = 15;
      const subHeaderHeight = 10;
      
      // Article (fusionné verticalement)
      doc.setFillColor(31, 73, 125); // Bleu foncé
      doc.rect(currentX, startY, articleWidth, headerHeight + subHeaderHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Article', currentX + articleWidth/2, startY + (headerHeight + subHeaderHeight)/2, { align: 'center' });
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(currentX, startY, articleWidth, headerHeight + subHeaderHeight);
      currentX += articleWidth;
      
      // CUMP(kg) (fusionné verticalement)
      doc.setFillColor(31, 73, 125);
      doc.rect(currentX, startY, cumpWidth, headerHeight + subHeaderHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.text('CUMP(kg)', currentX + cumpWidth/2, startY + (headerHeight + subHeaderHeight)/2 - 2, { align: 'center' });
      doc.setFontSize(6);
      doc.text(`(${getCurrencyLabel()})`, currentX + cumpWidth/2, startY + (headerHeight + subHeaderHeight)/2 + 2, { align: 'center' });
      doc.rect(currentX, startY, cumpWidth, headerHeight + subHeaderHeight);
      currentX += cumpWidth;
      
      // En-têtes des dépôts
      uniqueDepots.forEach(depot => {
        // En-tête principal du dépôt
        doc.setFillColor(255, 255, 0); // Jaune
        doc.rect(currentX, startY, depotPairWidth, headerHeight, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(depot, currentX + depotPairWidth/2, startY + headerHeight/2, { align: 'center' });
        doc.rect(currentX, startY, depotPairWidth, headerHeight);
        
        // Sous-en-têtes
        doc.setFillColor(255, 255, 0);
        doc.rect(currentX, startY + headerHeight, depotColumnWidth, subHeaderHeight, 'F');
        doc.rect(currentX + depotColumnWidth, startY + headerHeight, depotColumnWidth, subHeaderHeight, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Com.', currentX + depotColumnWidth/2, startY + headerHeight + subHeaderHeight/2, { align: 'center' });
        doc.text('Dis.', currentX + depotColumnWidth + depotColumnWidth/2, startY + headerHeight + subHeaderHeight/2, { align: 'center' });
        doc.rect(currentX, startY + headerHeight, depotColumnWidth, subHeaderHeight);
        doc.rect(currentX + depotColumnWidth, startY + headerHeight, depotColumnWidth, subHeaderHeight);
        
        currentX += depotPairWidth;
      });
      
      // En-têtes des totaux (avec nouvelles largeurs réduites)
      const totalHeaders = [
        { text: 'Total\nComm.', width: totalCommWidth },
        { text: 'Total\nDisp.', width: totalDispWidth },
        { text: 'Cartons\nComm.', width: cartonsWidth },
        { text: `Valeur stock\ndisponible\n(${displayCurrency})`, width: valueWidth }
      ];
      
      totalHeaders.forEach(header => {
        doc.setFillColor(146, 208, 80); // Vert
        doc.rect(currentX, startY, header.width, headerHeight + subHeaderHeight, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        
        // Diviser le texte sur plusieurs lignes
        const lines = header.text.split('\n');
        if (lines.length === 3) {
          // Pour "Valeur stock disponible" sur 3 lignes
          doc.text(lines[0], currentX + header.width/2, startY + (headerHeight + subHeaderHeight)/2 - 4, { align: 'center' });
          doc.text(lines[1], currentX + header.width/2, startY + (headerHeight + subHeaderHeight)/2, { align: 'center' });
          doc.text(lines[2], currentX + header.width/2, startY + (headerHeight + subHeaderHeight)/2 + 4, { align: 'center' });
        } else if (lines.length === 2) {
          doc.text(lines[0], currentX + header.width/2, startY + (headerHeight + subHeaderHeight)/2 - 2, { align: 'center' });
          doc.text(lines[1], currentX + header.width/2, startY + (headerHeight + subHeaderHeight)/2 + 2, { align: 'center' });
        } else {
          doc.text(header.text, currentX + header.width/2, startY + (headerHeight + subHeaderHeight)/2, { align: 'center' });
        }
        doc.rect(currentX, startY, header.width, headerHeight + subHeaderHeight);
        
        currentX += header.width;
      });
      
      // Ligne horizontale de séparation pour les dépôts
      doc.line(margin + articleWidth + cumpWidth, startY + headerHeight, 
               margin + articleWidth + cumpWidth + (depotPairWidth * numDepots), startY + headerHeight);
      
      return startY + headerHeight + subHeaderHeight;
    };

    // Fonction pour dessiner une ligne de données
    const drawDataRow = (y, item, isEven) => {
      const rowHeight = 8;
      let currentX = margin;
      
      // Fond alterné
      if (isEven) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y, tableWidth, rowHeight, 'F');
      }
      
      // Bordures complètes de la ligne
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.1);
      doc.rect(margin, y, tableWidth, rowHeight);
      
      // Article
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      const articleText = item.name.length > 23 ? item.name.substring(0, 23) + '...' : item.name;
      doc.text(articleText, currentX + 2, y + rowHeight/2 + 1, { align: 'left' });
      doc.line(currentX + articleWidth, y, currentX + articleWidth, y + rowHeight);
      currentX += articleWidth;
      
      // CUMP(kg)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(pdfNumberDecimal(item.cumpPerKg), currentX + cumpWidth - 1, y + rowHeight/2 + 1, { align: 'right' });
      doc.line(currentX + cumpWidth, y, currentX + cumpWidth, y + rowHeight);
      currentX += cumpWidth;
      
      // Fonction helper pour ajuster la taille du texte
      const drawNumberInCell = (value, x, width) => {
        const text = pdfNumber(value);
        doc.setFontSize(8);
        let textWidth = doc.getTextWidth(text);
        
        // Si le texte est trop large, réduire la police
        if (textWidth > width - 3) {
          doc.setFontSize(7);
          textWidth = doc.getTextWidth(text);
          if (textWidth > width - 2) {
            doc.setFontSize(6);
            textWidth = doc.getTextWidth(text);
            if (textWidth > width - 1) {
              doc.setFontSize(5);
            }
          }
        }
        
        doc.text(text, x + width - 1, y + rowHeight/2 + 1, { align: 'right' });
      };
      
      // Données par dépôt
      uniqueDepots.forEach(depot => {
        const kgComm = item.depots[depot]?.commercialisable || 0;
        const kgDisp = item.depots[depot]?.disponible || 0;
        
        drawNumberInCell(kgComm, currentX, depotColumnWidth);
        doc.line(currentX + depotColumnWidth, y, currentX + depotColumnWidth, y + rowHeight);
        
        drawNumberInCell(kgDisp, currentX + depotColumnWidth, depotColumnWidth);
        doc.line(currentX + depotPairWidth, y, currentX + depotPairWidth, y + rowHeight);
        
        currentX += depotPairWidth;
      });
      
      // Totaux avec gestion automatique de la taille (adaptés aux nouvelles largeurs)
      const drawTotalNumber = (value, width) => {
        const text = pdfNumber(value);
        doc.setFontSize(7); // Commencer avec une taille plus petite
        let textWidth = doc.getTextWidth(text);
        
        if (textWidth > width - 2) {
          doc.setFontSize(6);
          textWidth = doc.getTextWidth(text);
          if (textWidth > width - 1) {
            doc.setFontSize(5);
          }
        }
        
        doc.text(text, currentX + width - 1, y + rowHeight/2 + 1, { align: 'right' });
      };
      
      drawTotalNumber(item.totalKgCommercialisable, totalCommWidth);
      doc.line(currentX + totalCommWidth, y, currentX + totalCommWidth, y + rowHeight);
      currentX += totalCommWidth;
      
      drawTotalNumber(item.totalKgDisponible, totalDispWidth);
      doc.line(currentX + totalDispWidth, y, currentX + totalDispWidth, y + rowHeight);
      currentX += totalDispWidth;
      
      drawTotalNumber(item.cartonsCommercialisable, cartonsWidth);
      doc.line(currentX + cartonsWidth, y, currentX + cartonsWidth, y + rowHeight);
      currentX += cartonsWidth;
      
      drawTotalNumber(item.totalValue, valueWidth);
      
      return y + rowHeight;
    };

    // Fonction pour dessiner la ligne de totaux
    const drawTotalsRow = (y) => {
      const rowHeight = 10;
      let currentX = margin;
      
      // Fonction helper pour dessiner un nombre avec taille adaptative
      const drawAdaptiveNumber = (text, x, width, minFontSize = 5) => {
        doc.setFontSize(8); // Commencer avec une taille plus petite
        let textWidth = doc.getTextWidth(text);
        let fontSize = 8;
        
        // Réduire progressivement la taille jusqu'à ce que ça rentre
        while (textWidth > width - 2 && fontSize > minFontSize) {
          fontSize--;
          doc.setFontSize(fontSize);
          textWidth = doc.getTextWidth(text);
        }
        
        doc.text(text, x + width - 1, y + rowHeight/2 + 1, { align: 'right' });
      };
      
      // Calcul des totaux
      let grandTotalCommercialisable = 0;
      let grandTotalDisponible = 0;
      let grandTotalCartons = 0;
      let grandTotalValue = 0;
      let totalValueForGlobalCump = 0;
      let totalQuantityForGlobalCump = 0;
      const depotTotals = {};
      
      uniqueDepots.forEach(depot => {
        depotTotals[depot] = { commercialisable: 0, disponible: 0 };
      });
      
      filtered.forEach(stock => {
        const qtyDisponible = stock.quantiteKg || 0;
        const qtyCommercialisable = stock.quantiteCommercialisableKg || 0;
        grandTotalDisponible += qtyDisponible;
        grandTotalCommercialisable += qtyCommercialisable;
        
        const article = getArticleForStock(stock, articles);
        grandTotalCartons += getCartonQuantityFromKg(qtyCommercialisable, article);
        
        if (stock.valeur != null) {
          const factor = conversionRates[displayCurrency] / conversionRates[stock.monnaie || 'USD'];
          if (qtyDisponible > 0) {
            totalValueForGlobalCump += stock.valeur * qtyDisponible * factor;
            totalQuantityForGlobalCump += qtyDisponible;
            grandTotalValue += stock.valeur * qtyDisponible * factor;
          }
        }
        
        const depotName = stock.depot?.intitule || '';
        if (depotName && depotTotals[depotName]) {
          depotTotals[depotName].commercialisable += qtyCommercialisable;
          depotTotals[depotName].disponible += qtyDisponible;
        }
      });
      
      const globalCumpTotal = totalQuantityForGlobalCump > 0 ? (totalValueForGlobalCump / totalQuantityForGlobalCump) : 0;
      
      // Fond vert pour la ligne de totaux
      doc.setFillColor(146, 208, 80);
      doc.rect(margin, y, tableWidth, rowHeight, 'F');
      
      // Bordure épaisse en haut
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + tableWidth, y);
      
      // Bordures de la ligne
      doc.setLineWidth(0.3);
      doc.rect(margin, y, tableWidth, rowHeight);
      
      // Texte "TOTAUX"
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('TOTAUX', currentX + 2, y + rowHeight/2 + 1, { align: 'left' });
      doc.line(currentX + articleWidth, y, currentX + articleWidth, y + rowHeight);
      currentX += articleWidth;
      
      // CUMP total
      doc.setFont('helvetica', 'bold');
      drawAdaptiveNumber(pdfNumberDecimal(globalCumpTotal), currentX, cumpWidth, 6);
      doc.line(currentX + cumpWidth, y, currentX + cumpWidth, y + rowHeight);
      currentX += cumpWidth;
      
      // Totaux par dépôt
      uniqueDepots.forEach(depot => {
        const commValue = depotTotals[depot].commercialisable;
        const dispValue = depotTotals[depot].disponible;
        
        drawAdaptiveNumber(pdfNumber(commValue), currentX, depotColumnWidth, 5);
        doc.line(currentX + depotColumnWidth, y, currentX + depotColumnWidth, y + rowHeight);
        
        drawAdaptiveNumber(pdfNumber(dispValue), currentX + depotColumnWidth, depotColumnWidth, 5);
        doc.line(currentX + depotPairWidth, y, currentX + depotPairWidth, y + rowHeight);
        
        currentX += depotPairWidth;
      });
      
      // Grands totaux
      drawAdaptiveNumber(pdfNumber(grandTotalCommercialisable), currentX, totalCommWidth, 5);
      doc.line(currentX + totalCommWidth, y, currentX + totalCommWidth, y + rowHeight);
      currentX += totalCommWidth;
      
      drawAdaptiveNumber(pdfNumber(grandTotalDisponible), currentX, totalDispWidth, 5);
      doc.line(currentX + totalDispWidth, y, currentX + totalDispWidth, y + rowHeight);
      currentX += totalDispWidth;
      
      drawAdaptiveNumber(pdfNumber(grandTotalCartons), currentX, cartonsWidth, 5);
      doc.line(currentX + cartonsWidth, y, currentX + cartonsWidth, y + rowHeight);
      currentX += cartonsWidth;
      
      drawAdaptiveNumber(pdfNumber(grandTotalValue), currentX, valueWidth, 5);
      
      return y + rowHeight;
    };

    // Commencer le rendu
    let currentY = 20;
    let currentPage = 1;
    let dataRowIndex = 0;
    const pageBottom = pageHeight - 20;
    
    // Première page avec titre
    currentY = drawMainTitle(currentY);
    currentY = drawTableHeader(currentY);
    
    // Dessiner les lignes de données
    while (dataRowIndex < groupedData.length) {
      if (currentY + 8 > pageBottom) {
        // Nouvelle page
        doc.addPage();
        currentPage++;
        currentY = 20;
        currentY = drawTableHeader(currentY);
      }
      
      currentY = drawDataRow(currentY, groupedData[dataRowIndex], dataRowIndex % 2 === 0);
      dataRowIndex++;
    }
    
    // Ligne de totaux
    if (currentY + 10 > pageBottom) {
      doc.addPage();
      currentPage++;
      currentY = 20;
      currentY = drawTableHeader(currentY);
    }
    
    drawTotalsRow(currentY);
    
    // Numéros de page
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Page ${i} / ${totalPages}`, pageWidth - 25, pageHeight - 10);
    }
    
    // Sauvegarder le PDF
    doc.save(`stock_report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

const exportCommercialisableToPDF = () => {
  const doc = new jsPDF('landscape', 'mm', 'a4');

  const styles = {
    headerFontSize: 14,
    subheaderFontSize: 9,
    tableFontSize: 8,
    tableHeaderFontSize: 9,
    numericCell: {
      halign: 'right',
      cellPadding: { top: 2, right: 4, bottom: 2, left: 2 }
    },
  };

  // --- HEADER ---
  const w = doc.internal.pageSize.getWidth();
  const m = 10;
  let y = 10;
  doc.addImage(logoBase64, 'PNG', m, y + 2, 30, 30);
  const startX = m + 35;
  const lh = 4;
  doc.setFont('helvetica', 'bold').setFontSize(11).text('3M SEAFOOD SARL', startX, y + 5);
  doc.setFont('helvetica','normal').setFontSize(8);
  ['Zone industrielle','Dakhlet Nouâdhibou','Mauritanie','3mseafoodsarl@test.com','Tél. : + 222 XX XX XX XX']
    .forEach(line => { y += lh; doc.text(line, startX, y + 5); });
  const rightX = w - 80;
  doc.setFontSize(8).text(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, rightX, 15);

  // --- STATISTIQUES ---
  const totalKg = filtered.reduce((sum, s) => sum + (s.quantiteCommercialisableKg||0), 0);
  const totalT = totalKg/1000;
  const totalCt = filtered.reduce((sum, s) => {
    const art = getArticleForStock(s, articles);
    return sum + getCartonQuantityFromKg(s.quantiteCommercialisableKg||0, art);
  }, 0);
  let sy = 20;
  doc.setFont('helvetica','normal').setFontSize(8).setTextColor(60);
  doc.text(`Commercialisable (Tonnes) : ${totalT.toFixed(2)} T`, rightX, sy);
  sy += 5;
  doc.text(`Commercialisable (Cartons) : ${pdfNumberDecimal(totalCt)}`, rightX, sy);

  // --- TITRE ---
  const titleY = 50;
  doc.setFont('helvetica','bold').setFontSize(styles.headerFontSize)
     .setTextColor(0)
     .text("STOCK COMMERCIALISABLE", w/2, titleY, { align:'center' })
     .setDrawColor(0,102,204).setLineWidth(0.5)
     .line(m, titleY+3, w-m, titleY+3);

  const startY = titleY + 12;

  // --- AGRÉGATION PAR ARTICLE ---
  const agg = filtered.reduce((acc, stock) => {
    const art = getArticleForStock(stock, articles);
    const key = formatArticle(art); 
    if (!acc[key]) acc[key] = { article: art, quantiteKg: 0 };
    acc[key].quantiteKg += stock.quantiteCommercialisableKg || 0;
    return acc;
  }, {});

  // Filtrer pour ne garder que les articles avec quantité > 0
  const tableData = Object.values(agg)
    .filter(({ quantiteKg }) => quantiteKg > 0)
    .map(({ article, quantiteKg }) => ({
      article: formatArticle(article),
      commercialisableKg: pdfNumber(quantiteKg),
      commercialisableCartons: pdfNumberDecimal(getCartonQuantityFromKg(quantiteKg, article))
    }));

  const columns = [
    { header: 'Article', dataKey: 'article', width: 120 },
    { header: 'Quantité (Kg)', dataKey: 'commercialisableKg', width: 40, ...styles.numericCell },
    { header: 'Quantité (Cartons)', dataKey: 'commercialisableCartons', width: 40, ...styles.numericCell }
  ];

  doc.autoTable({
    columns,
    body: tableData,
    startY,
    styles: {
      fontSize: styles.tableFontSize,
      cellPadding: { top:2, right:3, bottom:2, left:3 },
      lineColor:[169,169,169], lineWidth:0.1
    },
    headStyles: {
      fillColor:[0,0,0], textColor:[255,255,255],
      fontSize:styles.tableHeaderFontSize, fontStyle:'bold',
      halign:'center', cellPadding:{top:3,right:3,bottom:3,left:3}
    },
    columnStyles: {
      commercialisableKg:{halign:'right'},
      commercialisableCartons:{halign:'right'}
    },
    didParseCell: data => {
      if (['commercialisableKg','commercialisableCartons'].includes(data.column.dataKey)) {
        data.cell.styles.halign = 'right';
      }
    }
  });

  doc.save(`stock_disponible_${new Date().toISOString().slice(0,10)}.pdf`);
};


  // Export Excel dynamique (avec dépôts détectés automatiquement)
const exportToExcel = async () => {
  // 1. Collecte des dépôts uniques
  const depotsSet = new Set();
  filtered.forEach(s => {
    if (s.depot?.intitule) depotsSet.add(s.depot.intitule);
  });
  const uniqueDepots = Array.from(depotsSet).sort();

  // 2. Groupement & agrégation (modifié pour séparer commercialisable et disponible)
  const speciesMap = new Map();
  for (const stock of filtered) {
    const name = formatArticle(stock.article);
    if (!speciesMap.has(name)) {
      const depotsObj = {};
      uniqueDepots.forEach(d => (depotsObj[d] = { commercialisable: 0, disponible: 0 }));
      speciesMap.set(name, {
        name,
        depots: depotsObj,
        totalValue: 0,
        totalValueForCump: 0,
        totalQuantityForCump: 0
      });
    }
    const grp = speciesMap.get(name);
    const qtyCommercialisable = stock.quantiteCommercialisableKg || 0;
    const qtyDisponible = stock.quantiteKg || 0;
    const depotName = stock.depot?.intitule || '';
    // Somme des quantités par dépôt
    if (depotName && grp.depots.hasOwnProperty(depotName)) {
      grp.depots[depotName].commercialisable += qtyCommercialisable;
      grp.depots[depotName].disponible += qtyDisponible;
    }
    // Calcul de la valeur totale issue de la BDD (basé sur commercialisable)
    if (stock.valeur != null) {
      const factor = conversionRates[displayCurrency] 
                   / conversionRates[stock.monnaie || 'USD'];
      grp.totalValue += stock.valeur * qtyDisponible * factor;
      // Pour le calcul du CUMP, on utilise la quantité disponible
      grp.totalValueForCump += stock.valeur * qtyDisponible * factor;
      grp.totalQuantityForCump += qtyDisponible;
    }
  }

  // Préparer le tableau final
  const groupedData = [];
  speciesMap.forEach(grp => {
    const totalKgCommercialisable = Object.values(grp.depots).reduce((a, b) => a + b.commercialisable, 0);
    const totalKgDisponible = Object.values(grp.depots).reduce((a, b) => a + b.disponible, 0);
    // Calcul du CUMP par kg
    const cumpPerKg = grp.totalQuantityForCump > 0 ? (grp.totalValueForCump / grp.totalQuantityForCump) : 0;
    // Trouver l'article réel à partir du nom formaté
    const realArticle = articles.find(art => formatArticle(art) === grp.name) || null;
    groupedData.push({
      name: grp.name,
      depots: grp.depots,
      totalKgCommercialisable,
      totalKgDisponible,
      cartonsCommercialisable: getCartonQuantityFromKg(totalKgCommercialisable, realArticle),
      cartonsDisponible: getCartonQuantityFromKg(totalKgDisponible, realArticle),
      totalValue: grp.totalValue,
      cumpPerKg: cumpPerKg,
      article: realArticle // Stocker l'article réel pour les calculs de cartons
    });
  });

  // 3. Création du Workbook & Worksheet
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Stock');

  // 4. Titre principal (fusionné & rouge)
  const totalCols = 2 + uniqueDepots.length * 2 + 4; // +2 pour Article et CUMP, +4 pour les colonnes de totaux
  ws.mergeCells(1, 1, 1, totalCols);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = 'ETAT DE STOCK';
  titleCell.font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
  ws.getRow(1).height = 30;

  // 5. En-têtes avec structure divisée (2 lignes)
  
  // Première ligne d'en-têtes (noms des dépôts et totaux)
  let col = 1;
  
  // Cellule Article (fusionnée verticalement)
  ws.mergeCells(2, col, 3, col);
  const articleCell = ws.getCell(2, col);
  articleCell.value = 'Article';
  articleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
  articleCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  articleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  articleCell.border = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } }
  };
  col++;

  // Cellule CUMP(kg) (fusionnée verticalement)
  ws.mergeCells(2, col, 3, col);
  const cumpCell = ws.getCell(2, col);
  cumpCell.value = `CUMP(kg)\n(${getCurrencyLabel()})`;
  cumpCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
  cumpCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cumpCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cumpCell.border = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } }
  };
  col++;

  // En-têtes des dépôts (fusionnées horizontalement)
  uniqueDepots.forEach(depot => {
    ws.mergeCells(2, col, 2, col + 1);
    const depotCell = ws.getCell(2, col);
    depotCell.value = depot;
    depotCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    depotCell.font = { bold: true, color: { argb: 'FF000000' } };
    depotCell.alignment = { horizontal: 'center', vertical: 'middle' };
    depotCell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    
    // Sous-en-têtes : Commercialisable et Disponible
    const commCell = ws.getCell(3, col);
    commCell.value = 'Commerc.';
    commCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    commCell.font = { bold: true, color: { argb: 'FF000000' } };
    commCell.alignment = { horizontal: 'center', vertical: 'middle' };
    commCell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    
    const dispCell = ws.getCell(3, col + 1);
    dispCell.value = 'Disponible';
    dispCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    dispCell.font = { bold: true, color: { argb: 'FF000000' } };
    dispCell.alignment = { horizontal: 'center', vertical: 'middle' };
    dispCell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    
    col += 2;
  });

  // En-têtes des totaux (fusionnées verticalement)
  const totalHeaders = ['Total Comm.', 'Total Disp.', 'Cartons Comm.', `Valeur stock disponible (${displayCurrency})`];
  totalHeaders.forEach(header => {
    ws.mergeCells(2, col, 3, col);
    const totalCell = ws.getCell(2, col);
    totalCell.value = header;
    totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
    totalCell.font = { bold: true, color: { argb: 'FF000000' } };
    totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalCell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    col++;
  });

  // Ajuster la hauteur des lignes d'en-têtes
  ws.getRow(2).height = 20;
  ws.getRow(3).height = 20;

  // 6. Largeurs de colonnes adaptées à la nouvelle structure
  col = 1;
  ws.getColumn(col).width = 30; // Article
  col++;
  ws.getColumn(col).width = 15; // CUMP(kg)
  col++;
  
  uniqueDepots.forEach(() => {
    ws.getColumn(col).width = 12; // Commercialisable
    ws.getColumn(col + 1).width = 12; // Disponible
    col += 2;
  });
  
  // Colonnes de totaux
  ws.getColumn(col).width = 15; // Total Comm.
  ws.getColumn(col + 1).width = 15; // Total Disp.
  ws.getColumn(col + 2).width = 15; // Cartons Comm.
  ws.getColumn(col + 3).width = 18; // Valeur

  // 7. Ajouter les lignes de données (ligne 4 en avant)
  let currentRow = 4;
  groupedData.forEach(sp => {
    col = 1;
    
    // Nom de l'article
    const nameCell = ws.getCell(currentRow, col);
    nameCell.value = sp.name;
    nameCell.font = { bold: true };
    nameCell.alignment = { vertical: 'middle' };
    col++;
    
    // CUMP(kg)
    const cumpDataCell = ws.getCell(currentRow, col);
    cumpDataCell.value = sp.cumpPerKg;
    cumpDataCell.numFmt = '0.00';
    cumpDataCell.alignment = { horizontal: 'right', vertical: 'middle' };
    col++;
    
    // Données par dépôt
    uniqueDepots.forEach(depot => {
      const kgCommercialisable = sp.depots[depot]?.commercialisable || 0;
      const kgDisponible = sp.depots[depot]?.disponible || 0;
      
      // Commercialisable
      const commCell = ws.getCell(currentRow, col);
      commCell.value = kgCommercialisable;
      commCell.numFmt = '0.00';
      commCell.alignment = { horizontal: 'right', vertical: 'middle' };
      
      // Disponible
      const dispCell = ws.getCell(currentRow, col + 1);
      dispCell.value = kgDisponible;
      dispCell.numFmt = '0.00';
      dispCell.alignment = { horizontal: 'right', vertical: 'middle' };
      
      col += 2;
    });
    
    // Totaux
    const totalCommCell = ws.getCell(currentRow, col);
    totalCommCell.value = sp.totalKgCommercialisable;
    totalCommCell.numFmt = '0.00';
    totalCommCell.alignment = { horizontal: 'right', vertical: 'middle' };
    
    const totalDispCell = ws.getCell(currentRow, col + 1);
    totalDispCell.value = sp.totalKgDisponible;
    totalDispCell.numFmt = '0.00';
    totalDispCell.alignment = { horizontal: 'right', vertical: 'middle' };
    
    const cartonsCell = ws.getCell(currentRow, col + 2);
    cartonsCell.value = sp.cartonsCommercialisable;
    cartonsCell.numFmt = '0.00';
    cartonsCell.alignment = { horizontal: 'right', vertical: 'middle' };
    
    const valueCell = ws.getCell(currentRow, col + 3);
    valueCell.value = sp.totalValue;
    valueCell.numFmt = '0.00';
    valueCell.alignment = { horizontal: 'right', vertical: 'middle' };
    
    currentRow++;
  });

  // 8. Ligne de TOTAUX
  col = 1;
  const totalRowCell = ws.getCell(currentRow, col);
  totalRowCell.value = 'TOTAUX';
  totalRowCell.font = { size: 14, bold: true };
  totalRowCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
  totalRowCell.border = { top: { style: 'medium', color: { argb: 'FF000000' } } };
  col++;

  // Calculer les totaux globaux
  let grandTotalCommercialisable = 0;
  let grandTotalDisponible = 0;
  let grandTotalCartons = 0;
  let grandTotalValue = 0;
  let totalValueForGlobalCump = 0;
  let totalQuantityForGlobalCump = 0;
  const depotTotals = {};

  // Initialiser tous les dépôts
  uniqueDepots.forEach(depot => {
    depotTotals[depot] = { commercialisable: 0, disponible: 0 };
  });

  // Calculer les totaux directement à partir des stocks filtrés pour un CUMP plus précis
  // Calculer les totaux directement à partir des stocks filtrés pour un CUMP plus précis
  filtered.forEach(stock => {
    const qtyDisponible = stock.quantiteKg || 0;
    const qtyCommercialisable = stock.quantiteCommercialisableKg || 0;
    grandTotalDisponible += qtyDisponible;
    grandTotalCommercialisable += qtyCommercialisable;
    
    // Calcul des cartons commercialisables
    const article = getArticleForStock(stock, articles);
    grandTotalCartons += getCartonQuantityFromKg(qtyCommercialisable, article);
    
    if (stock.valeur != null) {
      const factor = conversionRates[displayCurrency] / conversionRates[stock.monnaie || 'USD'];
      if (qtyDisponible > 0) {
        totalValueForGlobalCump += stock.valeur * qtyDisponible * factor;
        totalQuantityForGlobalCump += qtyDisponible;
        grandTotalValue += stock.valeur * qtyDisponible * factor;
      }
    }
    
    const depotName = stock.depot?.intitule || '';
    if (depotName && depotTotals[depotName]) {
      depotTotals[depotName].commercialisable += qtyCommercialisable;
      depotTotals[depotName].disponible += qtyDisponible;
    }
  });


  // CUMP global total
  const globalCumpTotal = totalQuantityForGlobalCump > 0 ? (totalValueForGlobalCump / totalQuantityForGlobalCump) : 0;
  
  // Cellule CUMP Total
  const cumpTotalCell = ws.getCell(currentRow, col);
  cumpTotalCell.value = globalCumpTotal;
  cumpTotalCell.numFmt = '0.00';
  cumpTotalCell.font = { size: 14, bold: true };
  cumpTotalCell.alignment = { horizontal: 'right', vertical: 'middle' };
  cumpTotalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
  cumpTotalCell.border = { top: { style: 'medium', color: { argb: 'FF000000' } } };
  col++;

  // Totaux par dépôt
  uniqueDepots.forEach(depot => {
    const commTotalCell = ws.getCell(currentRow, col);
    commTotalCell.value = depotTotals[depot].commercialisable;
    commTotalCell.numFmt = '0.00';
    commTotalCell.font = { size: 14, bold: true };
    commTotalCell.alignment = { horizontal: 'right', vertical: 'middle' };
    commTotalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
    commTotalCell.border = { top: { style: 'medium', color: { argb: 'FF000000' } } };
    
    const dispTotalCell = ws.getCell(currentRow, col + 1);
    dispTotalCell.value = depotTotals[depot].disponible;
    dispTotalCell.numFmt = '0.00';
    dispTotalCell.font = { size: 14, bold: true };
    dispTotalCell.alignment = { horizontal: 'right', vertical: 'middle' };
    dispTotalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
    dispTotalCell.border = { top: { style: 'medium', color: { argb: 'FF000000' } } };
    
    col += 2;
  });

  // Totaux globaux
  const finalTotals = [grandTotalCommercialisable, grandTotalDisponible, grandTotalCartons, grandTotalValue];
  finalTotals.forEach(total => {
    const cell = ws.getCell(currentRow, col);
    cell.value = total;
    cell.numFmt = '0.00';
    cell.font = { size: 14, bold: true };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
    cell.border = { top: { style: 'medium', color: { argb: 'FF000000' } } };
    col++;
  });

  ws.getRow(currentRow).height = 20;

  // 10. Générer & télécharger
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stock_report_${new Date().toISOString().slice(0,10)}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
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
                {formatCartons(filtered.reduce((acc, s) => {
                  const article = getArticleForStock(s, articles);
                  return acc + getCartonQuantityFromKg(s.quantiteKg || 0, article);
                }, 0))}
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
                {formatCartons(filtered.reduce((acc, s) => {
                  const article = getArticleForStock(s, articles);
                  return acc + getCartonQuantityFromKg(s.quantiteCommercialisableKg || 0, article);
                }, 0))}
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
                onClick={exportToExcelStylePDF}
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
                              {formatCartons(getCartonQuantityFromKg(s.quantiteKg, getArticleForStock(s, articles)))}
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
                          {formatCartons(getCartonQuantityFromKg(s.quantiteCommercialisableKg, getArticleForStock(s, articles)))}
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
              {/* Ajout du pied de tableau pour afficher la "Valeur du stock disponible" */}
              <tfoot>
                <tr>
                  <td colSpan={numColumns - 2} className="text-right font-bold bg-white px-4 py-3 border border-gray-400">
                    Valeur du stock disponible :
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
