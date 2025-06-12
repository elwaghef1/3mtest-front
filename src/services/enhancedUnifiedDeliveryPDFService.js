// Service PDF unifié et amélioré pour la génération de dossiers de sortie complets
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import logoBase64 from '../components/logoBase64';

/**
 * Service amélioré pour générer un PDF unifié contenant tous les documents d'une sortie
 * Récupère automatiquement toutes les données des commandes et intègre le packing list
 */

// Fonction principale pour générer le PDF unifié amélioré
const generateEnhancedUnifiedSortiePDF = (sortie, options = {}) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const commande = sortie.commande;
  
  // Validation des données
  if (!sortie || !commande) {
    console.error('❌ Données manquantes pour générer le PDF');
    throw new Error('Sortie ou commande manquante');
  }

  console.log('📄 Génération du PDF unifié amélioré pour sortie:', sortie.reference);
  console.log('📋 Commande associée:', commande.reference);
  console.log('🚢 Cargos disponibles:', commande.cargo?.length || 0);

  // 1. Page de garde avec informations complètes
  generateEnhancedCoverPage(doc, sortie, commande);
  
  // 2. Facture commerciale détaillée
  doc.addPage();
  generateDetailedInvoicePage(doc, sortie, commande);
  
  // 3. Packing List avec données cargo si disponibles
  doc.addPage();
  generateEnhancedPackingListPage(doc, sortie, commande);
  
  // 4. Bon de Sortie avec traçabilité
  doc.addPage();
  generateDetailedBonDeSortiePage(doc, sortie, commande);
  
  // 5. Page récapitulative (optionnelle)
  if (options.includeSummary) {
    doc.addPage();
    generateSummaryPage(doc, sortie, commande);
  }
  
  // Sauvegarder le PDF
  const filename = `Dossier_Sortie_Complet_${sortie.reference}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  
  console.log('✅ PDF unifié généré avec succès:', filename);
  return doc;
};

// ==========================================
// PAGE DE GARDE AMÉLIORÉE
// ==========================================
const generateEnhancedCoverPage = (doc, sortie, commande) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Logo centré
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', pageWidth/2 - 30, 20, 60, 40);
  }
  
  // Titre principal avec style
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(41, 128, 185);
  doc.text('DOSSIER DE SORTIE COMPLET', pageWidth / 2, 80, { align: 'center' });
  
  // Sous-titre
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(52, 73, 94);
  doc.text('Document Unifié - Toutes Données Incluses', pageWidth / 2, 95, { align: 'center' });
  
  // Ligne décorative
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(3);
  doc.line(30, 105, pageWidth - 30, 105);
  
  // Informations principales dans des encadrés
  const startY = 120;
  
  // Bloc 1: Informations Sortie
  drawInfoBlock(doc, 'INFORMATIONS SORTIE', [
    ['Référence:', sortie.reference || 'N/A'],
    ['Date de sortie:', new Date(sortie.dateSortie).toLocaleDateString('fr-FR')],
    ['Type livraison:', sortie.typeLivraison === 'PARTIELLE' ? 'LIVRAISON PARTIELLE' : 'LIVRAISON COMPLÈTE'],
    ['Transporteur:', sortie.transporteur || 'N/A'],
    ['N° Camion:', sortie.numeroCamion || 'N/A'],
    ['Chauffeur:', sortie.nomChauffeur || 'N/A']
  ], 20, startY, 80);
  
  // Bloc 2: Informations Commande
  drawInfoBlock(doc, 'INFORMATIONS COMMANDE', [
    ['Référence:', commande.reference || 'N/A'],
    ['Client:', commande.client?.raisonSociale || 'N/A'],
    ['Type:', commande.typeCommande === 'LOCALE' ? 'Commande Locale' : 'Commande Export'],
    ['Destination:', commande.destination || (commande.typeCommande === 'LOCALE' ? 'Local' : 'N/A')],
    ['Booking:', commande.numeroBooking || 'N/A'],
    ['Statut:', commande.statutBonDeCommande || 'N/A']
  ], 110, startY, 80);
  
  // Bloc 3: Données Cargo (si disponibles)
  const cargoCount = commande.cargo?.length || 0;
  const hasCargoAllocations = commande.cargo?.some(cargo => 
    cargo.itemsAlloues && cargo.itemsAlloues.length > 0
  );
  
  drawInfoBlock(doc, 'INFORMATIONS CARGO', [
    ['Nombre de cargos:', cargoCount.toString()],
    ['Allocations actives:', hasCargoAllocations ? 'Oui' : 'Non'],
    ['Conteneurs:', commande.cargo?.map(c => c.noDeConteneur).filter(Boolean).join(', ') || 'N/A'],
    ['Plombs:', commande.cargo?.map(c => c.noPlomb).filter(Boolean).join(', ') || 'N/A'],
    ['Packing lists:', hasCargoAllocations ? 'Inclus' : 'Standard'],
    ['Mode cargo:', hasCargoAllocations ? 'Allocations détaillées' : 'Données par défaut']
  ], 20, startY + 80, 170);
  
  // Type de commande avec style
  const typeCommande = commande.typeCommande === 'LOCALE' ? ' (COMMANDE LOCALE)' : ' (COMMANDE EXPORT)';
  doc.setFontSize(14);
  doc.setTextColor(220, 53, 69);
  doc.text(sortie.typeLivraison + typeCommande, pageWidth / 2, 240, { align: 'center' });
  
  // Documents inclus
  doc.setFontSize(12);
  doc.setTextColor(52, 73, 94);
  doc.text('📋 Documents inclus dans ce dossier:', pageWidth / 2, 260, { align: 'center' });
  
  doc.setFontSize(11);
  const documents = [
    '• Facture commerciale détaillée',
    '• Packing List ' + (hasCargoAllocations ? '(avec allocations cargo)' : '(standard)'),
    '• Bon de sortie avec traçabilité',
    options?.includeSummary ? '• Page récapitulative' : null
  ].filter(Boolean);
  
  documents.forEach((doc_item, index) => {
    doc.text(doc_item, pageWidth / 2, 270 + (index * 6), { align: 'center' });
  });
};

// ==========================================
// FACTURE COMMERCIALE DÉTAILLÉE
// ==========================================
const generateDetailedInvoicePage = (doc, sortie, commande) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // En-tête
  addHeaderWithLogo(doc, 'FACTURE COMMERCIALE DÉTAILLÉE');
  
  // Informations facture
  doc.setFontSize(10);
  doc.setTextColor(52, 73, 94);
  doc.text(`Invoice No: ${sortie.reference}`, 15, 50);
  doc.text(`Date: ${new Date(sortie.dateSortie).toLocaleDateString('fr-FR')}`, 15, 55);
  doc.text(`Order Ref: ${commande?.reference || 'N/A'}`, 15, 60);
  
  // Informations client détaillées
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 15, 75);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const clientInfo = [
    commande?.client?.raisonSociale || 'N/A',
    commande?.client?.adresse || 'N/A',
    commande?.client?.email || 'N/A',
    commande?.client?.telephone || 'N/A'
  ];
  
  clientInfo.forEach((info, index) => {
    doc.text(info, 15, 82 + (index * 5));
  });
  
  // Informations expédition (si export)
  if (commande?.typeCommande !== 'LOCALE') {
    doc.setFont('helvetica', 'bold');
    doc.text('Ship To:', pageWidth - 90, 75);
    doc.setFont('helvetica', 'normal');
    doc.text(commande?.destination || 'N/A', pageWidth - 90, 82);
    doc.text(`Booking: ${commande?.numeroBooking || 'N/A'}`, pageWidth - 90, 87);
  }
  
  // Tableau des articles avec toutes les données
  const tableData = sortie.items.map((item, index) => {
    const article = item.article;
    const prixUnitaire = item.prixUnitaire || commande?.prixUnitaire || 0;
    const total = (item.quantiteKg || 0) * prixUnitaire;
    
    return [
      index + 1,
      formatArticle(article),
      item.lot?.batchNumber || item.batchNumber || 'N/A',
      `${item.quantiteKg || 0} Kg`,
      `${item.quantiteCarton || 0}`,
      formatCurrency(prixUnitaire, commande?.currency),
      formatCurrency(total, commande?.currency)
    ];
  });
  
  const totalAmount = sortie.items.reduce((sum, item) => 
    sum + ((item.quantiteKg || 0) * (item.prixUnitaire || commande?.prixUnitaire || 0)), 0
  );
  
  doc.autoTable({
    startY: 105,
    head: [['#', 'Article', 'Batch', 'Quantity', 'Cartons', 'Unit Price', 'Total']],
    body: tableData,
    foot: [[
      { content: 'TOTAL', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatCurrency(totalAmount, commande?.currency), styles: { fontStyle: 'bold' } }
    ]],
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    styles: { fontSize: 9 }
  });
  
  // Conditions de vente
  const finalY = doc.lastAutoTable.finalY + 10;
  if (commande?.conditionsDeVente) {
    doc.setFontSize(9);
    doc.text('Terms & Conditions:', 15, finalY);
    const lines = doc.splitTextToSize(commande.conditionsDeVente, pageWidth - 30);
    doc.text(lines, 15, finalY + 5);
  }
};

// ==========================================
// PACKING LIST AMÉLIORÉ AVEC CARGO
// ==========================================
const generateEnhancedPackingListPage = (doc, sortie, commande) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // En-tête
  addHeaderWithLogo(doc, 'PACKING LIST DÉTAILLÉ');
  
  // Informations générales
  doc.setFontSize(10);
  doc.setTextColor(52, 73, 94);
  doc.text(`Packing List No: ${sortie.reference}`, 15, 50);
  doc.text(`Date: ${new Date(sortie.dateSortie).toLocaleDateString('fr-FR')}`, 15, 55);
  
  // Informations conditionnelles selon le type de commande
  if (commande?.typeCommande !== 'LOCALE') {
    doc.text(`Booking: ${commande?.numeroBooking || 'N/A'}`, 15, 60);
    doc.text(`Destination: ${commande?.destination || 'N/A'}`, 15, 65);
  } else {
    doc.text(`Type: Commande Locale`, 15, 60);
  }
  
  // Détecter si on a des allocations cargo
  const hasCargoAllocations = commande?.cargo?.some(cargo => 
    cargo.itemsAlloues && cargo.itemsAlloues.length > 0
  );
  
  let tableData = [];
  let tableHeaders = [];
  
  if (hasCargoAllocations) {
    // ===== MODE CARGO AVEC ALLOCATIONS =====
    doc.setFontSize(9);
    doc.setTextColor(34, 139, 34);
    doc.text('✓ Packing List généré à partir des allocations cargo détaillées', 15, 70);
    
    tableHeaders = ['#', 'Container N°', 'Seal Number', 'Marks', 'SIZE', 'Prod. Date', 'Expiry Date', 'Num of Box', 'Net Weight', 'Gross Weight'];
    
    let itemIndex = 1;
    commande.cargo.forEach((cargo) => {
      if (cargo.itemsAlloues && cargo.itemsAlloues.length > 0) {
        cargo.itemsAlloues.forEach((item) => {
          const article = item.article;
          const quantiteKg = parseFloat(item.quantiteAllouee) || 0;
          const numBox = Math.ceil(quantiteKg / 20);
          const poidsCarton = parseFloat(cargo.poidsCarton) || 1.12;
          const grossWeight = quantiteKg + (poidsCarton * numBox);
          
          // Construction du marks détaillé
          const marks = [
            article?.reference || 'N/A',
            article?.specification || '',
            article?.taille ? `(SIZE ${article.taille})` : ''
          ].filter(Boolean).join('\n');
          
          tableData.push([
            itemIndex++,
            cargo.noDeConteneur || 'N/A',
            cargo.noPlomb || 'N/A',
            marks,
            article?.taille || 'G',
            item.dateProduction || 'MAY 2025',
            item.dateExpiration || 'NOVEMBER 2026',
            numBox.toString(),
            quantiteKg.toLocaleString(),
            grossWeight.toLocaleString()
          ]);
        });
      }
    });
  } else {
    // ===== MODE STANDARD SANS ALLOCATIONS CARGO =====
    doc.setFontSize(9);
    doc.setTextColor(255, 140, 0);
    doc.text('⚠ Packing List généré à partir des données de sortie (pas d\'allocations cargo)', 15, 70);
    
    tableHeaders = ['#', 'Reference', 'Specification', 'Size', 'Batch', 'Weight (Kg)', 'Cartons', 'Carton Type', 'Lot No', 'Block'];
    
    tableData = sortie.items.map((item, index) => {
      const article = item.article;
      return [
        index + 1,
        article?.reference || 'N/A',
        article?.specification || 'N/A',
        article?.taille || 'N/A',
        item.lot?.batchNumber || 'N/A',
        `${item.quantiteKg || 0}`,
        `${item.quantiteCarton || 0}`,
        article?.typeCarton || 'N/A',
        item.noLot || 'N/A',
        item.block || 'N/A'
      ];
    });
  }
  
  // Configuration du tableau selon le type de données
  const tableConfig = hasCargoAllocations ? {
    startY: 80,
    head: [tableHeaders],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 8 },   // #
      1: { cellWidth: 20 },  // Container N°
      2: { cellWidth: 18 },  // Seal Number
      3: { cellWidth: 30 },  // Marks
      4: { cellWidth: 12 },  // SIZE
      5: { cellWidth: 18 },  // Prod. Date
      6: { cellWidth: 18 },  // Expiry Date
      7: { cellWidth: 15 },  // Num of Box
      8: { cellWidth: 18 },  // Net Weight
      9: { cellWidth: 18 }   // Gross Weight
    }
  } : {
    startY: 80,
    head: [tableHeaders],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 25 },
      2: { cellWidth: 30 },
      3: { cellWidth: 15 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
      6: { cellWidth: 15 },
      7: { cellWidth: 20 },
      8: { cellWidth: 15 },
      9: { cellWidth: 15 }
    }
  };
  
  doc.autoTable(tableConfig);
  
  // Totaux calculés selon la source des données
  const finalY = doc.lastAutoTable.finalY + 10;
  let totalKg = 0;
  let totalCartons = 0;
  let totalGrossWeight = 0;
  
  if (hasCargoAllocations) {
    // Calculer les totaux à partir des allocations cargo
    commande.cargo.forEach((cargo) => {
      if (cargo.itemsAlloues && cargo.itemsAlloues.length > 0) {
        cargo.itemsAlloues.forEach((item) => {
          const quantiteKg = parseFloat(item.quantiteAllouee) || 0;
          const numBox = Math.ceil(quantiteKg / 20);
          const poidsCarton = parseFloat(cargo.poidsCarton) || 1.12;
          const grossWeight = quantiteKg + (poidsCarton * numBox);
          
          totalKg += quantiteKg;
          totalCartons += numBox;
          totalGrossWeight += grossWeight;
        });
      }
    });
  } else {
    // Calculer les totaux à partir des items de sortie
    totalKg = sortie.items.reduce((sum, item) => sum + (item.quantiteKg || 0), 0);
    totalCartons = sortie.items.reduce((sum, item) => sum + (item.quantiteCarton || 0), 0);
  }
  
  // Affichage des totaux
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Net Weight: ${totalKg.toLocaleString()} Kg`, 15, finalY);
  doc.text(`Total Cartons: ${totalCartons.toLocaleString()}`, 15, finalY + 6);
  
  if (hasCargoAllocations && totalGrossWeight > 0) {
    doc.text(`Total Gross Weight: ${totalGrossWeight.toLocaleString()} Kg`, 15, finalY + 12);
  }
  
  // Informations conteneur si disponibles
  if (commande?.noDeConteneur) {
    doc.text(`Container No: ${commande.noDeConteneur}`, 15, finalY + (hasCargoAllocations ? 18 : 12));
  }
  if (commande?.noPlomb) {
    doc.text(`Seal No: ${commande.noPlomb}`, 15, finalY + (hasCargoAllocations ? 24 : 18));
  }
};

// ==========================================
// BON DE SORTIE AVEC TRAÇABILITÉ
// ==========================================
const generateDetailedBonDeSortiePage = (doc, sortie, commande) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // En-tête
  addHeaderWithLogo(doc, 'BON DE SORTIE DÉTAILLÉ');
  
  // Informations détaillées
  doc.setFontSize(10);
  doc.setTextColor(52, 73, 94);
  doc.text(`N° Bon de sortie: ${sortie.reference}`, 15, 50);
  doc.text(`Date de sortie: ${new Date(sortie.dateSortie).toLocaleDateString('fr-FR')}`, 15, 55);
  doc.text(`N° Camion: ${sortie.numeroCamion || 'N/A'}`, 15, 60);
  doc.text(`Transporteur: ${sortie.transporteur || 'N/A'}`, 15, 65);
  doc.text(`Chauffeur: ${sortie.nomChauffeur || 'N/A'}`, 15, 70);
  doc.text(`Commande: ${commande?.reference || 'N/A'}`, 15, 75);
  
  // Tableau avec traçabilité complète
  const tableData = sortie.items.map((item, index) => [
    index + 1,
    formatArticle(item.article),
    item.lot?.batchNumber || 'N/A',
    item.depot?.intitule || 'N/A',
    `${item.quantiteKg || 0} Kg`,
    `${item.quantiteCarton || 0}`,
    item.qualite || 'Standard',
    '____________'
  ]);
  
  doc.autoTable({
    startY: 85,
    head: [['#', 'Article', 'Batch', 'Dépôt', 'Quantité', 'Cartons', 'Qualité', 'Visa Responsable']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [220, 53, 69], textColor: 255 },
    styles: { fontSize: 9 }
  });
  
  // Zone de signatures
  const finalY = doc.lastAutoTable.finalY + 20;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  
  // Signatures en colonnes
  doc.text('Responsable Dépôt:', 20, finalY);
  doc.text('Transporteur:', 70, finalY);
  doc.text('Responsable Sortie:', 130, finalY);
  
  // Lignes pour signatures
  doc.setFont('helvetica', 'normal');
  doc.line(20, finalY + 15, 60, finalY + 15);
  doc.line(70, finalY + 15, 110, finalY + 15);
  doc.line(130, finalY + 15, 170, finalY + 15);
  
  // Date et heure
  doc.text(`Date et heure: ${new Date().toLocaleString('fr-FR')}`, 20, finalY + 25);
};

// ==========================================
// PAGE RÉCAPITULATIVE (OPTIONNELLE)
// ==========================================
const generateSummaryPage = (doc, sortie, commande) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // En-tête
  addHeaderWithLogo(doc, 'RÉCAPITULATIF DE LIVRAISON');
  
  // Résumé des données clés
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(41, 128, 185);
  doc.text('RÉSUMÉ DE LA LIVRAISON', 15, 60);
  
  // Calculs des totaux
  const totalKg = sortie.items.reduce((sum, item) => sum + (item.quantiteKg || 0), 0);
  const totalCartons = sortie.items.reduce((sum, item) => sum + (item.quantiteCarton || 0), 0);
  const totalArticles = sortie.items.length;
  const hasCargoAllocations = commande?.cargo?.some(cargo => 
    cargo.itemsAlloues && cargo.itemsAlloues.length > 0
  );
  
  // Informations récapitulatives
  const summaryData = [
    ['Référence sortie:', sortie.reference],
    ['Référence commande:', commande.reference],
    ['Type de livraison:', sortie.typeLivraison === 'PARTIELLE' ? 'Partielle' : 'Complète'],
    ['Nombre d\'articles:', totalArticles.toString()],
    ['Poids total:', `${totalKg.toLocaleString()} Kg`],
    ['Total cartons:', totalCartons.toString()],
    ['Mode cargo:', hasCargoAllocations ? 'Allocations détaillées' : 'Standard'],
    ['Client:', commande.client?.raisonSociale || 'N/A'],
    ['Destination:', commande.destination || (commande.typeCommande === 'LOCALE' ? 'Local' : 'N/A')],
    ['Statut:', 'Livrée']
  ];
  
  doc.autoTable({
    startY: 70,
    body: summaryData,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 100 }
    }
  });
  
  // Note de fin
  const finalY = doc.lastAutoTable.finalY + 20;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Ce document a été généré automatiquement par le système de gestion des sorties.', pageWidth / 2, finalY, { align: 'center' });
  doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, pageWidth / 2, finalY + 8, { align: 'center' });
};

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================

// Fonction pour ajouter un en-tête avec logo
const addHeaderWithLogo = (doc, title) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Logo
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 15, 10, 30, 20);
  }
  
  // Titre
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(41, 128, 185);
  doc.text(title, pageWidth / 2, 25, { align: 'center' });
  
  // Ligne décorative
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(1);
  doc.line(15, 35, pageWidth - 15, 35);
};

// Fonction pour dessiner un bloc d'informations encadré
const drawInfoBlock = (doc, title, data, x, y, width) => {
  const height = data.length * 8 + 15;
  
  // Cadre
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(x, y, width, height);
  
  // Titre
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(41, 128, 185);
  doc.text(title, x + 5, y + 10);
  
  // Données
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(52, 73, 94);
  
  data.forEach((item, index) => {
    const [label, value] = item;
    doc.setFont('helvetica', 'bold');
    doc.text(label, x + 5, y + 20 + (index * 8));
    doc.setFont('helvetica', 'normal');
    doc.text(value, x + 35, y + 20 + (index * 8));
  });
};

// Fonction pour formater un article
const formatArticle = (article) => {
  if (!article) return 'N/A';
  
  return [
    article.reference,
    article.specification,
    article.taille,
    article.typeCarton
  ].filter(Boolean).join(' - ');
};

// Fonction pour formater une devise
const formatCurrency = (value, currency = 'EUR') => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value || 0);
};

// ==========================================
// EXPORTS
// ==========================================

// Export principal
export { generateEnhancedUnifiedSortiePDF };

// Export avec alias pour compatibilité
export const downloadEnhancedUnifiedDeliveryPDF = generateEnhancedUnifiedSortiePDF;

// Export par défaut
export default generateEnhancedUnifiedSortiePDF;