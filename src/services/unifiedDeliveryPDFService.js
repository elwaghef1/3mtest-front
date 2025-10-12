// Service unifié pour la génération de PDF de livraison
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import logoBase64 from '../components/logoBase64';
import { getCartonQuantityFromKg } from '../utils/cartonsUtils';

/**
 * Service pour générer un PDF unifié contenant tous les documents d'une sortie
 */

// Fonction principale pour générer le PDF unifié
const generateUnifiedSortiePDF = (sortie) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const commande = sortie.commande;
  
  // 1. Page de garde
  generateCoverPage(doc, sortie, commande);
  
  // 2. Facture
  doc.addPage();
  generateInvoicePage(doc, sortie, commande);
  
  // 3. Packing List
  doc.addPage();
  generatePackingListPage(doc, sortie, commande);
  
  // 4. Bon de Sortie
  doc.addPage();
  generateBonDeSortiePage(doc, sortie, commande);
  
  // Sauvegarder le PDF
  doc.save(`Sortie_Complete_${sortie.reference}_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// Page de garde
const generateCoverPage = (doc, sortie, commande) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Logo
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 75, 30, 60, 40);
  }
  
  // Titre principal
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(41, 128, 185);
  doc.text('DOSSIER DE SORTIE', pageWidth / 2, 100, { align: 'center' });
  
  // Ligne décorative
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(2);
  doc.line(50, 110, pageWidth - 50, 110);
  
  // Informations principales
  doc.setFontSize(16);
  doc.setTextColor(52, 73, 94);
  doc.text(`Référence Sortie: ${sortie.reference}`, pageWidth / 2, 130, { align: 'center' });
  doc.text(`Date: ${new Date(sortie.dateSortie).toLocaleDateString('fr-FR')}`, pageWidth / 2, 140, { align: 'center' });
  
  // Client
  doc.setFontSize(14);
  doc.text(`Client: ${commande?.client?.raisonSociale || 'N/A'}`, pageWidth / 2, 160, { align: 'center' });
  doc.text(`Commande: ${commande?.reference || 'N/A'}`, pageWidth / 2, 170, { align: 'center' });
  
  // Type de livraison
  const typeLivraison = sortie.typeLivraison === 'PARTIELLE' ? 'LIVRAISON PARTIELLE' : 'LIVRAISON COMPLÈTE';
  const typeCommande = commande?.typeCommande === 'LOCALE' ? ' (COMMANDE LOCALE)' : '';
  doc.setFontSize(12);
  doc.setTextColor(220, 53, 69);
  doc.text(typeLivraison + typeCommande, pageWidth / 2, 190, { align: 'center' });
  
  // Documents inclus
  doc.setFontSize(12);
  doc.setTextColor(52, 73, 94);
  doc.text('Documents inclus:', 30, 220);
  doc.setFontSize(11);
  doc.text('• Facture commerciale', 40, 230);
  doc.text('• Packing List', 40, 238);
  doc.text('• Bon de sortie', 40, 246);
};

// Page Facture
const generateInvoicePage = (doc, sortie, commande) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // En-tête
  addHeaderWithLogo(doc, 'COMMERCIAL INVOICE');
  
  // Informations facture
  doc.setFontSize(10);
  doc.setTextColor(52, 73, 94);
  doc.text(`Invoice No: ${sortie.reference}`, 15, 50);
  doc.text(`Date: ${new Date(sortie.dateSortie).toLocaleDateString('fr-FR')}`, 15, 55);
  doc.text(`Order Ref: ${commande?.reference || 'N/A'}`, 15, 60);
  
  // Informations client
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 15, 75);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(commande?.client?.raisonSociale || 'N/A', 15, 82);
  doc.text(commande?.client?.adresse || 'N/A', 15, 87);
  doc.text(commande?.client?.email || 'N/A', 15, 92);
  
  // Tableau des articles
  const tableData = sortie.items.map((item, index) => [
    index + 1,
    formatArticle(item.article),
    item.lot?.batchNumber || item.batchNumber || 'N/A',
    `${item.quantiteKg || 0} Kg`,
    `${item.quantiteCarton || 0}`,
    `${formatCurrency(item.prixUnitaire || commande?.prixUnitaire || 0, commande?.currency)}`,
    `${formatCurrency((item.quantiteKg || 0) * (item.prixUnitaire || commande?.prixUnitaire || 0), commande?.currency)}`
  ]);
  
  const totalAmount = sortie.items.reduce((sum, item) => 
    sum + ((item.quantiteKg || 0) * (item.prixUnitaire || commande?.prixUnitaire || 0)), 0
  );
  
  doc.autoTable({
    startY: 100,
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
  
  // Conditions
  const finalY = doc.lastAutoTable.finalY + 10;
  if (commande?.conditionsDeVente) {
    doc.setFontSize(9);
    doc.text('Terms & Conditions:', 15, finalY);
    const lines = doc.splitTextToSize(commande.conditionsDeVente, pageWidth - 30);
    doc.text(lines, 15, finalY + 5);
  }
};

// Page Packing List
const generatePackingListPage = (doc, sortie, commande) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // En-tête
  addHeaderWithLogo(doc, 'PACKING LIST');
  
  // Informations
  doc.setFontSize(10);
  doc.setTextColor(52, 73, 94);
  doc.text(`Packing List No: ${sortie.reference}`, 15, 50);
  doc.text(`Date: ${new Date(sortie.dateSortie).toLocaleDateString('fr-FR')}`, 15, 55);
  
  // Afficher les informations conditionnellement selon le type de commande
  if (commande?.typeCommande !== 'LOCALE') {
    doc.text(`Booking: ${commande?.numeroBooking || 'N/A'}`, 15, 60);
    doc.text(`Destination: ${commande?.destination || 'N/A'}`, 15, 65);
  } else {
    doc.text(`Type: Commande Locale`, 15, 60);
  }
  
  // Vérifier si on a des allocations cargo et les utiliser à la place des données par défaut
  const hasCargoAllocations = commande?.cargo?.some(cargo => 
    cargo.itemsAlloues && cargo.itemsAlloues.length > 0
  );
  
  let tableData = [];
  let tableHeaders = [];
  
  if (hasCargoAllocations) {
    // Utiliser les données d'allocation cargo
    doc.setFontSize(9);
    doc.setTextColor(34, 139, 34);
    doc.text('✓ Packing List généré à partir des allocations cargo', 15, 70);
    
    tableHeaders = ['#', 'Container N°', 'Seal Number', 'Marks', 'SIZE', 'Prod. Date', 'Expiry Date', 'Num of Box', 'Net Weight', 'Gross Weight'];
    
    let itemIndex = 1;
    commande.cargo.forEach((cargo) => {
      if (cargo.itemsAlloues && cargo.itemsAlloues.length > 0) {
        cargo.itemsAlloues.forEach((item) => {
          const article = item.article;
          const quantiteKg = parseFloat(item.quantiteAllouee) || 0;
          const numBox = Math.ceil(getCartonQuantityFromKg(quantiteKg, article)); // Utilise le kg par carton de l'article
          const poidsCarton = parseFloat(cargo.poidsCarton) || 1.12; // poids d'un carton vide
          const grossWeight = quantiteKg + (poidsCarton * numBox);
          
          // Construction du marks (nom du produit)
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
    // Utiliser les données par défaut des items de sortie
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
    styles: { fontSize: 7, cellPadding: 1.5 },
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
      9: { cellWidth: 20 }   // Gross Weight
    }
  } : {
    startY: 75,
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
  
  // Totaux - calculer selon la source des données
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
          const numBox = Math.ceil(getCartonQuantityFromKg(quantiteKg, item.article));
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

// Page Bon de Sortie
const generateBonDeSortiePage = (doc, sortie, commande) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // En-tête
  addHeaderWithLogo(doc, 'BON DE SORTIE');
  
  // Informations
  doc.setFontSize(10);
  doc.setTextColor(52, 73, 94);
  doc.text(`N° Bon de sortie: ${sortie.reference}`, 15, 50);
  doc.text(`Date de sortie: ${new Date(sortie.dateSortie).toLocaleDateString('fr-FR')}`, 15, 55);
  doc.text(`N° Camion: ${sortie.numeroCamion || 'N/A'}`, 15, 60);
  doc.text(`Transporteur: ${sortie.transporteur || 'N/A'}`, 15, 65);
  doc.text(`Chauffeur: ${sortie.nomChauffeur || 'N/A'}`, 15, 70);
  
  // Tableau
  const tableData = sortie.items.map((item, index) => [
    index + 1,
    formatArticle(item.article),
    item.lot?.batchNumber || 'N/A',
    item.depot?.intitule || 'N/A',
    `${item.quantiteKg || 0} Kg`,
    `${item.quantiteCarton || 0}`,
    item.qualite || 'N/A',
    '____________'
  ]);
  
  doc.autoTable({
    startY: 80,
    head: [['#', 'Article', 'Batch', 'Dépôt', 'Quantité', 'Cartons', 'Qualité', 'Visa']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [220, 53, 69], textColor: 255 },
    styles: { fontSize: 9 }
  });
  
  // Zone de signatures
  const finalY = doc.lastAutoTable.finalY + 20;
  doc.setFontSize(10);
  doc.text('SIGNATURES:', 15, finalY);
  
  // Signature responsable
  doc.text('Responsable Entrepôt:', 15, finalY + 15);
  doc.line(15, finalY + 25, 80, finalY + 25);
  doc.text('Date:', 15, finalY + 30);
  doc.line(30, finalY + 35, 80, finalY + 35);
  
  // Signature transporteur
  doc.text('Transporteur:', 110, finalY + 15);
  doc.line(110, finalY + 25, 180, finalY + 25);
  doc.text('Date:', 110, finalY + 30);
  doc.line(125, finalY + 35, 180, finalY + 35);
  
  // Note de bas de page
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Document de contrôle interne - À conserver', pageWidth / 2, 280, { align: 'center' });
};

// Fonctions utilitaires
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
  
  // Ligne sous le titre
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.5);
  doc.line(15, 32, pageWidth - 15, 32);
};

const formatArticle = (article) => {
  if (!article) return 'N/A';
  return [
    article.reference,
    article.specification,
    article.taille,
    article.typeCarton
  ].filter(Boolean).join(' - ');
};

const formatCurrency = (value, currency = 'EUR') => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value || 0);
};

// Export nommé pour generateUnifiedSortiePDF
export { generateUnifiedSortiePDF };

// Export nommé pour downloadUnifiedDeliveryPDF (alias)
export const downloadUnifiedDeliveryPDF = generateUnifiedSortiePDF;

export default generateUnifiedSortiePDF;
