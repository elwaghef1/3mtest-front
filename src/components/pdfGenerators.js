// frontend/src/components/pdfGenerators.js
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import logoBase64 from './logoBase64';
import stampBase64 from './stampBase64';
import sortieStamp64 from './sortieStamp64';

// Fonction utilitaire pour formater la monnaie dans les PDF
const formatCurrencyForPDF = (value, currency = 'EUR') => {
  const numValue = parseFloat(value) || 0;
  if (currency === 'MRU') {
    return `${numValue.toFixed(0)} MRU`;
  } else if (currency === 'USD') {
    return `$${numValue.toFixed(2)}`;
  } else {
    return `€${numValue.toFixed(2)}`;
  }
};

// Fonction pour générer le Packing List
export const generatePackingListPDF = (commande) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 10;
  const marginRight = 10;

  // =============================
  // 1. En-tête avec logo
  // =============================
  doc.addImage(logoBase64, 'PNG', marginLeft, 10, 20, 20);

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  let currentY = 15;
  const infoX = marginLeft + 25;
  doc.text("MSM Seafood", infoX, currentY);
  currentY += 5;
  doc.text("License: ABCD-1234", infoX, currentY);
  currentY += 5;
  doc.text("msmseafoodsarl@gmail.com", infoX, currentY);

  // =============================
  // 2. Date et client
  // =============================
  const today = new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date()).replace(/(\d+)/, (match) => {
    const day = parseInt(match);
    return day === 1 ? '1er' : match;
  }).toUpperCase();
  doc.text(`Nouadhibou, ${today}`, pageWidth - marginRight, 20, { align: 'right' });

  const clientName = commande.client?.raisonSociale || "Client Inconnu";
  const clientAddress = commande.client?.adresse || "Adresse non renseignée";

  doc.setFont(undefined, 'bold');
  doc.text(clientName, pageWidth - marginRight, 32, { align: 'right' });
  doc.setFont(undefined, 'normal');
  doc.text(clientAddress, pageWidth - marginRight, 38, { align: 'right' });

  // =============================
  // 3. Titre & Références
  // =============================
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text("PACKING LIST", pageWidth / 2, 55, { align: 'center' });

  doc.setFontSize(9);
  const refY = 70;
  doc.text(`Réf: ${commande.reference || 'N/A'}`, marginLeft, refY);
  doc.text(`Booking: ${commande.numeroBooking || 'N/A'}`, 169, refY);

  // =============================
  // 4. Tableau des Articles (sans batch number)
  // =============================
  const tableColumnHeaders = [
    "Container N°",
    "Seal Number",
    "Marks",
    "Prod. Date",
    "Expiry. Date",
    "Num of Box",
    "Net Weight",
    "Gross Weight"
  ];

  let totalBoxes = 0;
  let totalNetWeight = 0;
  let totalGrossWeight = 0;
  const poidsCarton = parseFloat(commande.poidsCarton) || 0;

  const tableRows = commande.items.map(item => {
    const containerNumber = item.containerNumber || "N/A";
    const sealNumber = item.sealNumber || "N/A";

    const markLine1 = item.article?.reference || "N/A";
    const markLine2 = item.article?.specification || "";
    const markLine3 = item.article?.taille ? `(SIZE ${item.article.taille})` : "";
    const marks = [markLine1, markLine2, markLine3].filter(Boolean).join("\n");

    const prodDate = item.prodDate || "N/A";
    const expiryDate = item.expiryDate 
      ? item.expiryDate.split(" ")
      : ["24 MONTHS", "FROM DATE OF", "PRODUCTION"];
    const expiryText = Array.isArray(expiryDate) ? expiryDate.join("\n") : expiryDate;

    const quantiteKg = parseFloat(item.quantiteKg) || 0;
    const cartons = item.quantiteCarton || Math.ceil(quantiteKg / 20);
    const netWeight = `${quantiteKg} KG`;
    const grossWeight = `${(quantiteKg + cartons * poidsCarton).toFixed(2)} KG`;

    totalBoxes += cartons;
    totalNetWeight += quantiteKg;
    totalGrossWeight += quantiteKg + cartons * poidsCarton;

    return [
      containerNumber,
      sealNumber,
      marks,
      prodDate,
      expiryText,
      cartons,
      netWeight,
      grossWeight
    ];
  });

  // Ligne de total
  tableRows.push([
    { content: "TOTAL", colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
    { content: totalBoxes, styles: { halign: 'center', fontStyle: 'bold' } },
    { content: `${totalNetWeight.toFixed(2)} KG`, styles: { halign: 'center', fontStyle: 'bold' } },
    { content: `${totalGrossWeight.toFixed(2)} KG`, styles: { halign: 'center', fontStyle: 'bold' } }
  ]);

  doc.autoTable({
    startY: 85,
    head: [tableColumnHeaders],
    body: tableRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: 'gray',
      textColor: 255,
      fontStyle: 'bold'
    },
    margin: { left: marginLeft, right: marginRight },
    tableWidth: 'auto'
  });

  // =============================
  // 5. AJOUT DES VISAS SUR UNE SEULE LIGNE
  // =============================
  const signatureLineY = doc.lastAutoTable.finalY + 30;
  doc.setFontSize(9);
  doc.text("Visa pointeur Smcp", marginLeft, signatureLineY, { align: 'left' });
  doc.text("Visa du client", pageWidth / 2, signatureLineY, { align: 'center' });
  doc.text("Visa Responsable usine", pageWidth - marginRight, signatureLineY, { align: 'right' });

  // Ajout de l'image de signature sous "Visa Responsable usine"
  try {
    const signatureWidth = 35;
    const signatureHeight = 20;
    const signatureX = pageWidth - marginRight - signatureWidth - 10;
    const signatureY = signatureLineY + 5;
    
    doc.addImage(stampBase64, 'PNG', signatureX, signatureY, signatureWidth, signatureHeight);
  } catch (error) {
    console.warn('Erreur lors de l\'ajout de la signature:', error);
  }

  // =============================
  // 6. PIED DE PAGE
  // =============================
  const footerY = 280;
  doc.setFontSize(8);
  doc.text("+222 46 00 89 08", marginLeft, footerY);
  doc.text("msmseafoodsarl@gmail.com", pageWidth / 2, footerY, { align: 'center' });
  doc.text("Zone idustrielle, Dakhlet Nouâdhibou", pageWidth - marginRight, footerY, { align: 'right' });

  // Sauvegarde du PDF
  doc.save(`packing_list_${commande.reference}.pdf`);
};

// Fonction pour générer le Bon de Sortie
export const generateBonDeCommandePDF = (commande) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 10;
  const marginRight = 10;

  doc.setLineHeightFactor(1.0);
  doc.addImage(logoBase64, 'PNG', marginLeft, 10, 20, 20);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  let currentY = 15;
  const infoX = marginLeft + 25;
  doc.text("MSM Seafood", infoX, currentY);
  currentY += 5;
  doc.text("License: ABCD-1234", infoX, currentY);
  currentY += 5;
  doc.text("msmseafoodsarl@gmail.com", infoX, currentY);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text("BON DE SORTIE", pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  let infoBlockY = 35;
  doc.text(`Reference: ${commande.reference}`, marginLeft, infoBlockY);
  const today = new Date().toLocaleDateString('fr-FR');
  doc.text(`Date: ${today}`, pageWidth - marginRight, infoBlockY, { align: 'right' });
  infoBlockY += 5;
  doc.text(`Client: ${commande.client?.raisonSociale || '-'}`, marginLeft, infoBlockY);
  infoBlockY += 5;
  doc.text(`Destination: ${commande.destination || '-'}`, marginLeft, infoBlockY);
  infoBlockY += 10;
  const tableColumnHeaders = [
    "ARTICLE",
    "TAILLE",
    "QUANTITÉ (KG)",
    "DÉPÔT",
    "OBSERVATIONS"
  ];
  const tableRows = [];
  let totalQuantity = 0;
  commande.items.forEach(item => {
    const article = item.article
      ? [item.article.reference, item.article.specification].filter(Boolean).join(" ")
      : "-";
    const taille = item.article?.taille || "-";
    const quantiteKg = parseFloat(item.quantiteKg) || 0;
    totalQuantity += quantiteKg;
    const depot = item.depot?.intitule || "-";
    const observations = item.observations || "-";
    tableRows.push([article, taille, quantiteKg.toFixed(2), depot, observations]);
  });
  tableRows.push([
    { content: "TOTAL", colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
    { content: totalQuantity.toFixed(2), styles: { halign: 'center', fontStyle: 'bold' } },
    "",
    ""
  ]);
  doc.autoTable({
    startY: infoBlockY,
    head: [tableColumnHeaders],
    body: tableRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
    headStyles: { fillColor: 'gray', textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: marginLeft, right: marginRight },
    tableWidth: 'auto',
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'left' }
    }
  });

  const signatureLineY = doc.lastAutoTable.finalY + 30;
  doc.setFontSize(9);
  doc.text("Visa pointeur Smcp", marginLeft, signatureLineY, { align: 'left' });
  doc.text("Visa du client", pageWidth / 2, signatureLineY, { align: 'center' });
  doc.text("Visa Responsable usine", pageWidth - marginRight, signatureLineY, { align: 'right' });

  // Ajout de l'image de signature sous "Visa Responsable usine"
  try {
    const signatureWidth = 35;
    const signatureHeight = 20;
    const signatureX = pageWidth - marginRight - signatureWidth - 10;
    const signatureY = signatureLineY + 5;
    
    doc.addImage(stampBase64, 'PNG', signatureX, signatureY, signatureWidth, signatureHeight);
  } catch (error) {
    console.warn('Erreur lors de l\'ajout de la signature:', error);
  }

  const footerY = 280;
  doc.setFontSize(8);
  doc.text("+222 46 00 89 08", marginLeft, footerY);
  doc.text("msmseafoodsarl@gmail.com", pageWidth / 2, footerY, { align: 'center' });
  doc.text("Zone idustrielle, Dakhlet Nouâdhibou", pageWidth - marginRight, footerY, { align: 'right' });

  doc.save(`bon_de_sortie_${commande.reference}.pdf`);
};

// Fonction pour générer la Facture (MODIFIÉE SELON VOS EXIGENCES)
export const generateInvoicePDF = (commande) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 10;
  const marginRight = 10;

  doc.setLineHeightFactor(1.0);
  doc.addImage(logoBase64, 'PNG', marginLeft, 10, 20, 20);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  let currentY = 15;
  const infoX = marginLeft + 25;
  doc.text("MSM Seafood", infoX, currentY);
  currentY += 5;
  doc.text("Zone idustrielle,", infoX, currentY);
  currentY += 5;
  doc.text("Dakhlet Nouâdhibou", infoX, currentY);
  currentY += 5;
  doc.text("msmseafoodsarl@gmail.com", infoX, currentY);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text("COMMERCIAL INVOICE", pageWidth / 2, 20, { align: 'center' });
  
  // Ajouter le numéro de facture juste en dessous du titre
  if (commande.numeroFacture) {
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`#${commande.numeroFacture}`, pageWidth / 2, 27, { align: 'center' });
  }
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  let infoBlockY = 40;
  doc.text(`Reference: ${commande.reference}`, marginLeft, infoBlockY);
  const invoiceDate = commande.dateCommande
    ? new Date(commande.dateCommande).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');
  doc.text(`Date: ${invoiceDate}`, pageWidth - marginRight, infoBlockY, { align: 'right' });
  infoBlockY += 5;
  doc.text(`Booking: ${commande.numeroBooking || '-'}`, pageWidth - marginRight, infoBlockY, { align: 'right' });
  infoBlockY += 10;
  const clientName = commande.client?.raisonSociale || '-';
  const clientAddress = commande.client?.adresse || '-';
  doc.setFont(undefined, 'bold');
  doc.text(`CUSTOMER: ${clientName}`, marginLeft, infoBlockY);
  doc.setFont(undefined, 'normal');
  infoBlockY += 5;
  doc.text(clientAddress, marginLeft, infoBlockY);
  infoBlockY += 10;
  
  // Tableau sans BATCH NUMBER et sans carton - AVEC REGROUPEMENT DES ARTICLES IDENTIQUES
  const tableColumnHeaders = [
    "PRODUCT",
    "SIZE",
    "UNIT",
    "QUANTITY",
    `UNIT PRICE (${commande.currency || 'EUR'})`,
    `TOTAL PRICE (${commande.currency || 'EUR'})`
  ];

  // Fonction pour formater un article
  const formatArticle = (article) => {
    if (!article) return '-';
    return [article.reference, article.specification].filter(Boolean).join(" ");
  };

  // Regrouper les articles identiques
  const groupedItems = {};
  commande.items.forEach(item => {
    const productKey = formatArticle(item.article);
    const size = item.article?.taille || "-";
    const unitPrice = item.prixUnitaire ? parseFloat(item.prixUnitaire) : 0;
    
    // Créer une clé unique basée sur le produit, la taille et le prix unitaire
    const groupKey = `${productKey}-${size}-${unitPrice}`;
    
    if (!groupedItems[groupKey]) {
      groupedItems[groupKey] = {
        product: productKey,
        size: size,
        totalQuantity: 0,
        unitPrice: unitPrice,
        totalPrice: 0
      };
    }
    
    // Additionner les quantités et prix
    const quantityKg = parseFloat(item.quantiteKg) || 0;
    groupedItems[groupKey].totalQuantity += quantityKg;
    groupedItems[groupKey].totalPrice += quantityKg * unitPrice;
  });

  // Convertir en tableau pour le PDF
  const tableRows = [];
  let totalQuantityKg = 0;
  let totalPrice = 0;

  Object.values(groupedItems).forEach(groupedItem => {
    totalQuantityKg += groupedItem.totalQuantity;
    totalPrice += groupedItem.totalPrice;
    
    tableRows.push([
      groupedItem.product,
      groupedItem.size,
      "Kg",
      groupedItem.totalQuantity.toFixed(0),
      groupedItem.unitPrice.toFixed(2),
      groupedItem.totalPrice.toFixed(2)
    ]);
  });
  
  tableRows.push([
    { content: "TOTAL", colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
    { content: totalQuantityKg.toFixed(0), styles: { halign: 'center', fontStyle: 'bold' } },
    "",
    { content: totalPrice.toFixed(3), styles: { halign: 'center', fontStyle: 'bold' } }
  ]);
  
  doc.autoTable({
    startY: infoBlockY,
    head: [tableColumnHeaders],
    body: tableRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
    headStyles: { fillColor: 'gray', textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: marginLeft, right: marginRight },
    tableWidth: 'auto',
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' }
    }
  });
  
  const afterTableY = doc.lastAutoTable.finalY + 8;

  // Utilisation des conditions de vente depuis la commande
  const conditions = commande.conditionsDeVente || "Packing: 20 kg per carton\nOrigin: Mauritania\nPayment Terms: 100% CAD TT\nIncoterms: FOB Nouadhibou – Mauritania";
  const conditionsLines = conditions.split('\n');
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text("CONDITION OF SALES", marginLeft, afterTableY);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  conditionsLines.forEach((line, index) => {
    doc.text(line, marginLeft, afterTableY + 5 + index * 4);
  });

  let bankY = afterTableY + 5 + conditionsLines.length * 4 + 8;
  
  // Section Notes
  // doc.setFontSize(9);
  // doc.setFont(undefined, 'bold');
  // doc.text("Notes", marginLeft, bankY);
  // doc.setFont(undefined, 'normal');
  // doc.setFontSize(8);
  // doc.text("Thanks for your business.", marginLeft, bankY + 6);
  
  // Section Terms & Conditions avec informations bancaires
  let termsY = bankY + 5;
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text("Payment informations", marginLeft, termsY);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  
  if (commande.bank) {
    const bankDetails = [
      `Intermediary Bank: ${commande.bank.banqueIntermediaire || 'N/A'}`,
      `SWIFT of intermediary: ${commande.bank.swiftIntermediaire || 'N/A'}`,
      `Beneficiary Bank: ${commande.bank.banque}`,
      `SWIFT of beneficiary bank: ${commande.bank.codeSwift}`,
      `Beneficiary name: MSM SEAFOOD-SARL`,
      `Code IBAN: ${commande.bank.iban}`
    ];
    bankDetails.forEach((line, index) => {
      doc.text(line, marginLeft, termsY + 6 + index * 4);
    });
  } else {
    const bankDetails = [
      "Intermediary Bank: N/A",
      "SWIFT of intermediary: N/A", 
      "Beneficiary Bank: Banque Populaire de Mauritanie",
      "SWIFT of beneficiary bank: BPMAMRMR",
      "Beneficiary name: MSM SEAFOOD-SARL",
      "Code IBAN: MR13...00270"
    ];
    bankDetails.forEach((line, index) => {
      doc.text(line, marginLeft, termsY + 6 + index * 4);
    });
  }
  
  let signatureY = termsY + 6 + 6 * 4 + 10;
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text("FINANCE DEPARTMENT", pageWidth - marginRight, signatureY, { align: 'right' });
  doc.text("STAMP & SIGNATURE", pageWidth - marginRight, signatureY + 5, { align: 'right' });
  doc.line(pageWidth - 60, signatureY + 8, pageWidth - marginRight, signatureY + 8);
  const footerY = 280;
  doc.setLineWidth(0.2);
  doc.line(marginLeft, footerY - 5, pageWidth - marginRight, footerY - 5);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text("+222 46 00 89 08", marginLeft, footerY);
  doc.text("msmseafoodsarl@gmail.com", pageWidth / 2, footerY, { align: 'center' });
  doc.text("Zone idustrielle, Dakhlet Nouâdhibou", pageWidth - marginRight, footerY, { align: 'right' });
  doc.save(`invoice_${commande.reference}.pdf`);
};

// Fonction pour générer la Facture Proforma (reste inchangée)
export const generateProformaInvoicePDF = (commande) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 10;
  const marginRight = 10;

  doc.setLineHeightFactor(1.0);
  doc.addImage(logoBase64, 'PNG', marginLeft, 10, 20, 20);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  let currentY = 15;
  const infoX = marginLeft + 25;
  doc.text("MSM Seafood", infoX, currentY);
  currentY += 5;
  doc.text("License: ABCD-1234", infoX, currentY);
  currentY += 5;
  doc.text("msmseafoodsarl@gmail.com", infoX, currentY);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text("PROFORMA INVOICE", pageWidth / 2, 20, { align: 'center' });
  
  // Ajouter le numéro de facture proforma juste en dessous du titre
  if (commande.numeroFactureProforma) {
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`#${commande.numeroFactureProforma}`, pageWidth / 2, 27, { align: 'center' });
  }
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  let infoBlockY = 35;
  doc.text(`Reference: ${commande.reference}`, marginLeft, infoBlockY);
  const invoiceDate = commande.dateCommande
    ? new Date(commande.dateCommande).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');
  doc.text(`Date: ${invoiceDate}`, pageWidth - marginRight, infoBlockY, { align: 'right' });
  infoBlockY += 5;
  doc.text(`Booking: ${commande.numeroBooking || '-'}`, pageWidth - marginRight, infoBlockY, { align: 'right' });
  infoBlockY += 10;
  const clientName = commande.client?.raisonSociale || '-';
  const clientAddress = commande.client?.adresse || '-';
  doc.setFont(undefined, 'bold');
  doc.text(`CUSTOMER: ${clientName}`, marginLeft, infoBlockY);
  doc.setFont(undefined, 'normal');
  infoBlockY += 5;
  doc.text(clientAddress, marginLeft, infoBlockY);
  infoBlockY += 10;
  const tableColumnHeaders = [
    "PRODUCT",
    "BATCH NUMBER",
    "SIZE",
    "UNIT",
    "QUANTITY",
    `UNIT PRICE (${commande.currency || 'EUR'})`,
    `TOTAL PRICE (${commande.currency || 'EUR'})`
  ];

  // Fonction pour formater un article
  const formatArticle = (article) => {
    if (!article) return '-';
    return [article.reference, article.specification].filter(Boolean).join(" ");
  };

  // Regrouper les articles identiques (avec batch number)
  const groupedItems = {};
  commande.items.forEach(item => {
    const productKey = formatArticle(item.article);
    const batchNumber = (item.lot && item.lot.batchNumber) ? item.lot.batchNumber : "-";
    const size = item.article?.taille || "-";
    const unitPrice = item.prixUnitaire ? parseFloat(item.prixUnitaire) : 0;
    
    // Créer une clé unique basée sur le produit, batch number, taille et prix unitaire
    const groupKey = `${productKey}-${batchNumber}-${size}-${unitPrice}`;
    
    if (!groupedItems[groupKey]) {
      groupedItems[groupKey] = {
        product: productKey,
        batchNumber: batchNumber,
        size: size,
        totalQuantity: 0,
        unitPrice: unitPrice,
        totalPrice: 0
      };
    }
    
    // Additionner les quantités et prix
    const quantityKg = parseFloat(item.quantiteKg) || 0;
    groupedItems[groupKey].totalQuantity += quantityKg;
    groupedItems[groupKey].totalPrice += quantityKg * unitPrice;
  });

  // Convertir en tableau pour le PDF
  const tableRows = [];
  let totalQuantityKg = 0;
  let totalPrice = 0;

  Object.values(groupedItems).forEach(groupedItem => {
    totalQuantityKg += groupedItem.totalQuantity;
    totalPrice += groupedItem.totalPrice;
    
    tableRows.push([
      groupedItem.product,
      groupedItem.batchNumber,
      groupedItem.size,
      "Kg",
      groupedItem.totalQuantity.toFixed(0),
      groupedItem.unitPrice.toFixed(2),
      groupedItem.totalPrice.toFixed(2)
    ]);
  });
  
  tableRows.push([
    { content: "TOTAL", colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
    { content: totalQuantityKg.toFixed(0), styles: { halign: 'center', fontStyle: 'bold' } },
    "",
    { content: totalPrice.toFixed(3), styles: { halign: 'center', fontStyle: 'bold' } }
  ]);
  
  doc.autoTable({
    startY: infoBlockY,
    head: [tableColumnHeaders],
    body: tableRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
    headStyles: { fillColor: 'gray', textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: marginLeft, right: marginRight },
    tableWidth: 'auto',
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' }
    }
  });
  
  const afterTableY = doc.lastAutoTable.finalY + 8;

  // Utilisation des conditions de vente depuis la commande
  const conditions = commande.conditionsDeVente || "Packing: 20 kg per carton\nOrigin: Mauritania\nPayment Terms: 100% CAD TT\nIncoterms: FOB Nouadhibou – Mauritania";
  const conditionsLines = conditions.split('\n');
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text("CONDITION OF SALES", marginLeft, afterTableY);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  conditionsLines.forEach((line, index) => {
    doc.text(line, marginLeft, afterTableY + 5 + index * 4);
  });

  let bankY = afterTableY + 5 + conditionsLines.length * 4 + 8;
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text("BANK DETAILS", marginLeft, bankY);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  if (commande.bank) {
    const bankDetails = [
      `Intermediary Bank: ${commande.bank.banqueIntermediaire || 'N/A'}`,
      `SWIFT of intermediary: ${commande.bank.swiftIntermediaire || 'N/A'}`,
      `Beneficiary Bank: ${commande.bank.banque}`,
      `SWIFT of beneficiary bank: ${commande.bank.codeSwift}`,
      `Beneficiary name: MSM SEAFOOD-SARL`,
      `Code IBAN: ${commande.bank.iban}`
    ];
    bankDetails.forEach((line, index) => {
      doc.text(line, marginLeft, bankY + 6 + index * 4);
    });
  } else {
    const bankDetails = [
      "Intermediary Bank: N/A",
      "SWIFT of intermediary: N/A", 
      "Beneficiary Bank: Banque Populaire de Mauritanie",
      "SWIFT of beneficiary bank: BPMAMRMR",
      "Beneficiary name: MSM SEAFOOD-SARL",
      "Code IBAN: MR13...00270"
    ];
    bankDetails.forEach((line, index) => {
      doc.text(line, marginLeft, bankY + 6 + index * 4);
    });
  }
  
  let signatureY = bankY + 6 + 6 * 4 + 10;
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text("FINANCE DEPARTMENT", pageWidth - marginRight, signatureY, { align: 'right' });
  doc.text("STAMP & SIGNATURE", pageWidth - marginRight, signatureY + 5, { align: 'right' });
  doc.line(pageWidth - 60, signatureY + 8, pageWidth - marginRight, signatureY + 8);
  const footerY = 280;
  doc.setLineWidth(0.2);
  doc.line(marginLeft, footerY - 5, pageWidth - marginRight, footerY - 5);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text("+222 46 00 89 08", marginLeft, footerY);
  doc.text("msmseafoodsarl@gmail.com", pageWidth / 2, footerY, { align: 'center' });
  doc.text("Zone idustrielle, Dakhlet Nouâdhibou", pageWidth - marginRight, footerY, { align: 'right' });
  doc.save(`invoice_${commande.reference}.pdf`);
};

// Fonction pour générer le certificat CH
export const generateCertificatePDF = (certificateData, commande, containerIndex = 0) => {
  // Vérifications de sécurité
  if (!certificateData) {
    throw new Error('Données du certificat manquantes');
  }

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 15;
  const marginRight = 15;
  const marginTop = 15;

  // Déstructurer les données avec valeurs par défaut
  const { 
    cargo = {}, 
    articles = [], 
    totals = { totalColis: 1400, poidsNet: 28000, poidsBrut: 29120 } 
  } = certificateData;
  
  // Valeurs par défaut pour le cargo
  const cargoData = {
    nom: cargo.nom || '-',
    noDeConteneur: cargo.noDeConteneur || '-',
    areDeConteneur: cargo.areDeConteneur || '-',
    refNemb: cargo.refNemb && cargo.refNemb.trim() !== '' ? cargo.refNemb : 'XXX XXX XXX',
    refEmb: cargo.refEmb && cargo.refEmb.trim() !== '' ? cargo.refEmb : 'XXX XXX XXX',
    dateCertification: cargo.dateCertification,
    poidsCarton: cargo.poidsCarton || 29120
  };
  
  const hasMultipleArticles = articles && articles.length > 1;

  console.log('Génération PDF avec cargo:', cargoData); // Debug

  // =============================
  // 1. En-tête du document
  // =============================
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('DEMANDE DE CERTIFICATION', pageWidth / 2, marginTop + 10, { align: 'center' });

  // Références en haut
  let currentY = marginTop + 25;
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('REF : ' + commande.reference, marginLeft, currentY);
  
  // Date et REF/NEMB en haut à droite
  const today = new Date().toLocaleDateString('fr-FR');
  doc.text(`Date : ${today}`, pageWidth - marginRight, currentY, { align: 'right' });
  currentY += 5;
  doc.text(`REF/NEMB : ${cargoData.refNemb}`, pageWidth - marginRight, currentY, { align: 'right' });
  
  currentY += 10;
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text('N°', marginLeft + 90, currentY);
  doc.text('(Pour le poisson congelé)', marginLeft + 90, currentY + 5);

  // =============================
  // 2. Tableau Expéditeur/Destinataire
  // =============================
  currentY += 20;
  
  const expediteurDestinataire = [
    [
      'Nom & Adresse de l\'expéditeur :\n\nNom : SMCP P/CT MSM SEAFOOD.\nAdresse : Zone industrielle\nNouadhibou – Mauritanie.\n',
      'Nom & Adresse du destinataire :\n\nNom : ' + (commande.consigne || '---- ') + '\nAdresse : ' + (commande.adresseConsigne || '--- \nPays : ' + commande.destination)
    ]
  ];

  doc.autoTable({
    startY: currentY,
    body: expediteurDestinataire,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 8,
      valign: 'top',
      lineWidth: 0.3
    },
    columnStyles: {
      0: { cellWidth: (pageWidth - marginLeft - marginRight) / 2 },
      1: { cellWidth: (pageWidth - marginLeft - marginRight) / 2 }
    },
    margin: { left: marginLeft, right: marginRight }
  });

  // =============================
  // 3. Tableau Origine/Transport
  // =============================
  currentY = doc.lastAutoTable.finalY + 5;
  
  const origineTransport = [
    [
      'Origine du produit :\n\nNom de l\'EIS ou du navire : MSM SEAFOOD\nAgrément ou immatriculation : 02-133\nLieu d\'Embarquement : MSM SEAFOOD\n(Entrepôt/EIS/quai)\nNom de l\'entrepôt : ---------------',
      'Moyen de transport : ' + cargoData.nom + '\n\nN° Conteneur : ' + cargoData.noDeConteneur + '\nPL : ' + '---' + '\nPIF : ' + (commande.pif || '-----') + '\nDate de certification : ' + (cargoData.dateCertification ? new Date(cargoData.dateCertification).toLocaleDateString('fr-FR') : today) + '\nRéférence documentaire : B/L : ---'
    ]
  ];

  doc.autoTable({
    startY: currentY,
    body: origineTransport,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 8,
      valign: 'top',
      lineWidth: 0.3
    },
    columnStyles: {
      0: { cellWidth: (pageWidth - marginLeft - marginRight) / 2 },
      1: { cellWidth: (pageWidth - marginLeft - marginRight) / 2 }
    },
    margin: { left: marginLeft, right: marginRight }
  });

  doc.autoTable({
    startY: currentY,
    body: origineTransport,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 8,
      valign: 'top',
      lineWidth: 0.3
    },
    columnStyles: {
      0: { cellWidth: (pageWidth - marginLeft - marginRight) / 2 },
      1: { cellWidth: (pageWidth - marginLeft - marginRight) / 2 }
    },
    margin: { left: marginLeft, right: marginRight },
    didParseCell: function (data) {
      // Remplacer les marqueurs **text** par du texte en gras
      let text = data.cell.text[0];
      if (text && text.includes('**')) {
        const parts = text.split('**');
        data.cell.text = [];
        
        for (let i = 0; i < parts.length; i++) {
          if (i % 2 === 1) {
            // Partie en gras
            data.cell.text.push({
              content: parts[i],
              styles: { fontStyle: 'bold' }
            });
          } else {
            // Partie normale
            if (parts[i]) {
              data.cell.text.push({
                content: parts[i],
                styles: { fontStyle: 'normal' }
              });
            }
          }
        }
      }
    }
  });

  // =============================
  // 4. Tableau Description/Quantité
  // =============================
  currentY = doc.lastAutoTable.finalY + 5;
  
  // Description du produit dynamique
  let productDescription = 'SARDINELLA AURITA';
  if (articles && articles.length === 1) {
    const article = articles[0];
    productDescription = `${article.reference} ${article.specification}`;
  } else if (hasMultipleArticles) {
    productDescription = "VOIR ANNEXE";
  }
  
  const descriptionQuantite = [
    [
      'Description du produit :\n\nPoisson :\t\t\t\t' + productDescription + '\nNom scientifique :\t\t' + productDescription + '\nDate de production :\t\tFEBRUARY 2023\nDate expiration :\t\t\tAUGUST 2024',
      'Quantité exportée :\n\nType de conditionnement : Carton MASTER\nNombre de colis TOTAL : ' + totals.totalColis + ' Colis\nPoids Net : ' + totals.poidsNet + ' KG\nPoids Brut : ' + totals.poidsBrut + ' KG'
    ]
  ];

  doc.autoTable({
    startY: currentY,
    body: descriptionQuantite,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 8,
      valign: 'top',
      lineWidth: 0.3
    },
    columnStyles: {
      0: { cellWidth: (pageWidth - marginLeft - marginRight) / 2 },
      1: { cellWidth: (pageWidth - marginLeft - marginRight) / 2 }
    },
    margin: { left: marginLeft, right: marginRight }
  });

  // =============================
  // 5. Annexe (si plusieurs articles)
  // =============================
  if (hasMultipleArticles) {
    // Créer une nouvelle page pour l'annexe
    doc.addPage();
    let annexeY = marginTop;
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('ANNEXE DEMANDE DE CERTIFICATION', pageWidth / 2, annexeY + 10, { align: 'center' });
    
    annexeY += 25;
    
    // Tableau de l'annexe
   
    const tableData = articles.map(article => [
      `${article.reference} - ${article.specification} - ${article.taille}`,
      'Produit de la pêche',
      'Entier congelé',
      'MSM SEAFOOD – 02.133',
      article.quantite.toString(),
      article.poidsNet.toString()
    ]);
    
    // Ajouter la ligne TOTAL
    tableData.push([
      'TOTAL',
      '',
      '',
      '',
      totals.totalColis.toString(),
      totals.poidsNet.toString()
    ]);
    
    doc.autoTable({
      startY: annexeY,
      head: [['Espèces / (Nom Scientifique)', 'Nature du produit', 'Type de traitement', 'Nom et numéro d\'agrément des établissements', 'Quantité en Colis', 'Poids net / Kg']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineWidth: 0.3
      },
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 35 },
        4: { cellWidth: 20 },
        5: { cellWidth: 25 }
      },
      margin: { left: marginLeft, right: marginRight }
    });
    
    // Ajouter le poids brut après le tableau
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Poids brut : ${totals.poidsBrut} kg`, pageWidth - marginRight, finalY, { align: 'right' });
    
    // Retourner à la première page pour continuer
    doc.setPage(1);
  }

  // =============================
  // 6. Section ONISPA (en bas de page)
  // =============================
  // Calculer la position pour placer ONISPA en bas de page
  const onispaY = pageHeight - 70; // Position à 70mm du bas de la page
  
  // Note importante au-dessus de la section ONISPA
  doc.setFontSize(8); // Police plus petite
  doc.setFont(undefined, 'bold');
  doc.text('NB :', marginLeft, onispaY - 15);
  doc.setFont(undefined, 'normal');
  const noteText = 'En cas de plusieurs origines ou de plusieurs espèces veuillez établir une annexe en indiquant l\'espèce, l\'agrément, le nombre de colis et le poids correspondant.';
  doc.text(noteText, marginLeft + 8, onispaY - 15, { maxWidth: pageWidth - marginLeft - marginRight - 10 });
  
  // Titre de la section ONISPA
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Partie réservée à l\'ONISPA', marginLeft, onispaY);
  
  // Référence finale en haut à droite de la section ONISPA
  doc.setFontSize(12);
  doc.text(`REF/EMB : ${cargoData.refEmb}`, pageWidth - marginRight, onispaY, { align: 'right' });
  
  // Dessiner le cadre de la section ONISPA
  const onispaBoxHeight = 40;
  doc.rect(marginLeft, onispaY + 3, pageWidth - marginLeft - marginRight, onispaBoxHeight);
  
  // Écrire les champs ONISPA en ligne (comme dans l'image)
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  
  const fieldY = onispaY + 12;
  doc.text('L\'agent de saisie', marginLeft + 5, fieldY);
  doc.text('...................................................................', marginLeft + 40, fieldY);
  
  const dateY = onispaY + 22;
  doc.text('Date de saisie', marginLeft + 5, dateY);
  doc.text('...................................................................', marginLeft + 35, dateY);
  
  const numY = onispaY + 32;
  doc.text('Numéro du certificat', marginLeft + 5, numY);
  doc.text('................................................................', marginLeft + 50, numY);

  // =============================
  // 8. Sauvegarde
  // =============================
  const fileName = `certificat_CH_${cargoData.nom}_${cargoData.noDeConteneur || containerIndex + 1}.pdf`;
  doc.save(fileName);
};

export const generateBonDeSortiePDF = (commande, historiqueData) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 10;
  const marginRight = 10;

  // =============================
  // 1. En-tête avec logo
  // =============================
  doc.addImage(logoBase64, 'PNG', marginLeft, 10, 20, 20);

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  let currentY = 15;
  const infoX = marginLeft + 25;
  doc.text("MSM Seafood", infoX, currentY);
  currentY += 5;
  doc.text("Zone industrielle,", infoX, currentY);
  currentY += 5;
  doc.text("Dakhlet Nouâdhibou", infoX, currentY);
  currentY += 5;
  doc.text("msmseafoodsarl@gmail.com", infoX, currentY);

  // Date en haut à droite
  const today = new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date()).replace(/(\d+)/, (match) => {
    const day = parseInt(match);
    return day === 1 ? '1er' : match;
  }).toUpperCase();
  doc.text(`Nouadhibou, ${today}`, pageWidth - marginRight, 20, { align: 'right' });

  // =============================
  // 2. Titre principal
  // =============================
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text("BON DE SORTIE", pageWidth / 2, 45, { align: 'center' });

  // =============================
  // 3. Informations de la commande
  // =============================
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  let infoY = 60;

  const clientName = commande.client?.raisonSociale || "Client Inconnu";
  const clientAddress = commande.client?.adresse || "Adresse non renseignée";

  doc.text(`Référence Commande: ${commande.reference || 'N/A'}`, marginLeft, infoY);
  infoY += 5;
  doc.text(`Client: ${clientName}`, marginLeft, infoY);
  infoY += 5;
  doc.text(`Adresse: ${clientAddress}`, marginLeft, infoY);
  infoY += 5;
  if (commande.typeCommande !== 'LOCALE') {
    doc.text(`Destination: ${commande.destination || 'N/A'}`, marginLeft, infoY);
    infoY += 5;
    doc.text(`Booking: ${commande.numeroBooking || 'N/A'}`, marginLeft, infoY);
    infoY += 5;
  }

  // Statut de la commande
  doc.text(`Statut: ${commande.statutBonDeCommande || 'N/A'}`, marginLeft, infoY);
  infoY += 10;

  if (!historiqueData.livraisons || historiqueData.livraisons.length === 0) {
    doc.setFont(undefined, 'normal');
    doc.text("Aucune sortie enregistrée pour cette commande", marginLeft, infoY);
    infoY += 20;
  } else {
    // Parcourir toutes les livraisons
    historiqueData.livraisons.forEach((livraison, index) => {
      // Titre de la livraison
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      const dateLivraison = new Date(livraison.dateSortie).toLocaleDateString('fr-FR');
      const titleLivraison = livraison.typeLivraison === 'PARTIELLE' 
        ? ``
        : ``;
      
      doc.text(titleLivraison, marginLeft, infoY);
      doc.text(`Référence: ${livraison.reference}`, pageWidth - marginRight, infoY, { align: 'right' });
      infoY += 8;

      // Tableau des articles de cette livraison avec détails des batches
      const headers = [
        "Article",
        "Batch Number",
        "Quantité (Kg)",
        "Dépôt",
        "Prix Unitaire",
        "Total"
      ];

      const rows = [];
      let totalQuantiteLivraison = 0;
      let totalPrixLivraison = 0;

      if (livraison.items && livraison.items.length > 0) {
        // FILTRER seulement les articles avec quantité livrée > 0
        const itemsAvecQuantite = livraison.items.filter(item => {
          const quantiteKg = parseFloat(item.quantiteKg) || 0;
          return quantiteKg > 0;
        });

        console.log(`🔍 Articles total: ${livraison.items.length}, Articles avec quantité > 0: ${itemsAvecQuantite.length}`);

        itemsAvecQuantite.forEach(item => {
          const article = item.article || {};
          const quantiteKg = parseFloat(item.quantiteKg) || 0;
          const prixUnitaire = parseFloat(item.prixUnitaire) || 0;
          const totalItem = quantiteKg * prixUnitaire;

          totalQuantiteLivraison += quantiteKg;
          totalPrixLivraison += totalItem;

          // Détails des batches pour cet article
          if (item.detailsBatches && item.detailsBatches.length > 0) {
            // Filtrer seulement les batches avec quantité > 0
            const batchesValides = item.detailsBatches.filter(batch => {
              // Utiliser 'quantite' (comme dans LivraisonPartielleModal) ou 'quantiteEnlevee' en fallback
              const quantiteBatch = parseFloat(batch.quantite || batch.quantiteEnlevee) || 0;
              return quantiteBatch > 0;
            });
            
            if (batchesValides.length > 0) {
              // Si l'article a des détails de batches valides, les afficher avec rowSpan
              const nombreBatches = batchesValides.length;
              
              batchesValides.forEach((batch, batchIndex) => {
                // Utiliser 'quantite' (comme dans LivraisonPartielleModal) ou 'quantiteEnlevee' en fallback
                const quantiteBatch = parseFloat(batch.quantite || batch.quantiteEnlevee) || 0;
                const prixBatch = quantiteBatch * prixUnitaire;

                console.log(`🔍 Debug Batch ${batchIndex}:`, {
                  article: article.reference + ' - ' + article.specification + ' - ' + article.taille,
                  batchNumber: batch.batchNumber,
                  quantiteBatch: quantiteBatch,
                  rawBatch: batch, // Pour voir toute la structure
                  depot: item.depot?.intitule,
                  prixUnitaire: prixUnitaire,
                  prixBatch: prixBatch
                });

                if (batchIndex === 0) {
                  const row = [
                    { 
                      content: article.reference + ' - ' + article.specification + ' - ' + article.taille || 'N/A', 
                      rowSpan: nombreBatches,
                      styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' }
                    },
                    batch.batchNumber || 'N/A',
                    quantiteBatch.toFixed(2),
                    item.depot?.intitule || 'N/A',
                    { 
                      content: formatCurrencyForPDF(prixUnitaire, commande.currency), 
                      rowSpan: nombreBatches,
                      styles: { valign: 'middle', halign: 'center' }
                    },
                    formatCurrencyForPDF(prixBatch, commande.currency)
                  ];
                  console.log('📋 Première ligne ajoutée:', row);
                  rows.push(row);
                } else {
                  // Lignes suivantes : seulement les colonnes NON rowSpan
                  const row = [
                    batch.batchNumber || 'N/A',
                    quantiteBatch.toFixed(2),
                    item.depot?.intitule || 'N/A',
                    formatCurrencyForPDF(prixBatch, commande.currency)
                  ];
                  console.log('📋 Ligne suivante ajoutée:', row);
                  rows.push(row);
                }
              });
            }
            // Si aucun batch valide, on ne fait rien (pas de ligne ajoutée)
          } else {
            // Si pas de détails de batches, utiliser les infos de base
            let batchNumber = 'N/A';
            
            // Essayer de trouver le batch number dans différentes structures
            if (item.noLot) {
              batchNumber = item.noLot;
            } else if (item.block) {
              batchNumber = item.block;
            } else if (item.batchNumber) {
              batchNumber = item.batchNumber;
            }

            rows.push([
              { 
                content: article.reference || article.intitule || 'N/A',
                styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' }
              },
              batchNumber,
              quantiteKg.toFixed(2),
              item.depot?.intitule || 'N/A',
              { 
                content: formatCurrencyForPDF(prixUnitaire, commande.currency),
                styles: { valign: 'middle', halign: 'center' }
              },
              formatCurrencyForPDF(totalItem, commande.currency)
            ]);
          }
        });

        // Ligne de sous-total pour cette livraison
        rows.push([
          { content: `SOUS-TOTAL ${titleLivraison}`, colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } },
          { content: totalQuantiteLivraison.toFixed(2), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
          { content: '', styles: { fillColor: [240, 240, 240] } },
          { content: '', styles: { fillColor: [240, 240, 240] } },
          { content: formatCurrencyForPDF(totalPrixLivraison, commande.currency), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
        ]);
      }

      // Tableau pour cette livraison
      doc.autoTable({
        startY: infoY,
        head: [headers],
        body: rows,
        theme: 'grid',
        headStyles: { 
          fillColor: [41, 128, 185],
          textColor: 'white',
          fontStyle: 'bold'
        },
        styles: { 
          fontSize: 8,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 35 },
          2: { cellWidth: 25 },
          3: { cellWidth: 30 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 }
        }
      });

      infoY = doc.lastAutoTable.finalY + 10;
    });

    
  }

  // =============================
  // 6. Signatures
  // =============================
  infoY += 15;
  doc.setFont(undefined, 'bold');
  doc.text("Responsable Magasin:", marginLeft, infoY);
  doc.text("Responsable Transport:", pageWidth / 2 + 10, infoY);
  
  infoY += 15;
  
  // Lignes pour les signatures
  doc.setLineWidth(0.3);
  doc.line(marginLeft, infoY, marginLeft + 70, infoY);
  doc.line(pageWidth / 2 + 10, infoY, pageWidth / 2 + 80, infoY);

  infoY += 8;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  doc.text("Signature et cachet", marginLeft, infoY);
  doc.text("Signature et cachet", pageWidth / 2 + 10, infoY);

  // =============================
  // 7. Pied de page
  // =============================
  const footerY = 280;
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setLineWidth(0.2);
  doc.line(marginLeft, footerY - 5, pageWidth - marginRight, footerY - 5);
  doc.text("+222 46 00 89 08", marginLeft, footerY);
  doc.text("msmseafoodsarl@gmail.com", pageWidth / 2, footerY, { align: 'center' });
  doc.text("Zone industrielle, Dakhlet Nouâdhibou", pageWidth - marginRight, footerY, { align: 'right' });

  // Sauvegarde du PDF
  doc.save(`bon_de_sortie_${commande.reference}.pdf`);
};

// Fonction pour générer les Détails de la Commande (PDF)
export const generateCommandeDetailsPDF = (commande) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 10;
  const marginRight = 10;

  doc.setLineHeightFactor(1.0);
  doc.addImage(logoBase64, 'PNG', marginLeft, 10, 20, 20);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  let currentY = 15;
  const infoX = marginLeft + 25;
  doc.text("MSM Seafood", infoX, currentY);
  currentY += 5;
  doc.text("Zone idustrielle,", infoX, currentY);
  currentY += 5;
  doc.text("Dakhlet Nouâdhibou", infoX, currentY);
  currentY += 5;
  doc.text("msmseafoodsarl@gmail.com", infoX, currentY);

  // Titre principal
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text("DÉTAILS DE LA COMMANDE", pageWidth / 2, 20, { align: 'center' });

  // Informations client uniquement
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  let infoBlockY = 40;
  
  doc.setFont(undefined, 'bold');
  doc.text("INFORMATIONS CLIENT", marginLeft, infoBlockY);
  doc.setFont(undefined, 'normal');
  infoBlockY += 8;

  // Référence commande
  doc.text(`Référence: ${commande.reference || '-'}`, marginLeft, infoBlockY);
  infoBlockY += 5;

  // Date de commande
  const commandeDate = commande.dateCommande
    ? new Date(commande.dateCommande).toLocaleDateString('fr-FR')
    : new Date().toLocaleDateString('fr-FR');
  doc.text(`Date: ${commandeDate}`, marginLeft, infoBlockY);
  infoBlockY += 8;
  
  // Informations client
  const clientName = commande.client?.raisonSociale || '-';
  const clientAddress = commande.client?.adresse || '-';
  doc.setFont(undefined, 'bold');
  doc.text(`CLIENT: ${clientName}`, marginLeft, infoBlockY);
  doc.setFont(undefined, 'normal');
  infoBlockY += 5;
  doc.text(`Adresse: ${clientAddress}`, marginLeft, infoBlockY);
  infoBlockY += 15;

  // Tableau des articles simplifié
  const tableColumnHeaders = [
    "ARTICLE",
    "QUANTITÉ (KG)",
    "PRIX UNITAIRE",
    "TOTAL"
  ];

  // Fonction pour formater un article
  const formatArticle = (a) => {
    if (!a) return '—';
    const ref = a.reference || '';
    const spec = a.specification || '';
    const taille = a.taille || '';
    const typeCarton = a.typeCarton || '';
    return `${ref} - ${spec} - ${taille} - ${typeCarton}`;
  };

  // Regrouper les articles identiques (sans batch numbers)
  const groupedItems = {};
  commande.items?.forEach(item => {
    const articleKey = formatArticle(item.article);
    if (!groupedItems[articleKey]) {
      groupedItems[articleKey] = {
        article: item.article,
        totalQuantite: 0,
        prixUnitaire: item.prixUnitaire || 0,
        totalPrix: 0
      };
    }
    
    // Additionner les quantités et prix
    groupedItems[articleKey].totalQuantite += parseFloat(item.quantiteKg) || 0;
    groupedItems[articleKey].totalPrix += parseFloat(item.prixTotal) || 0;
  });

  // Convertir en tableau pour le PDF
  const tableData = Object.values(groupedItems).map(groupedItem => [
    formatArticle(groupedItem.article),
    groupedItem.totalQuantite.toString(),
    `${groupedItem.prixUnitaire} ${commande.currency || 'EUR'}`,
    `${groupedItem.totalPrix.toFixed(2)} ${commande.currency || 'EUR'}`
  ]);

  doc.autoTable({
    head: [tableColumnHeaders],
    body: tableData,
    startY: infoBlockY,
    margin: { left: marginLeft, right: marginRight },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [52, 73, 94],
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 80 }, // Article - élargi
      1: { cellWidth: 30, halign: 'center' }, // Quantité
      2: { cellWidth: 35, halign: 'right' }, // Prix unitaire
      3: { cellWidth: 35, halign: 'right' }, // Total
    },
  });

  // Prix total
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(12);
  const totalText = `TOTAL: ${commande.prixTotal.toFixed(2) || '0'} ${commande.currency || 'EUR'}`;
  doc.text(totalText, pageWidth - marginRight, finalY, { align: 'right' });

  // Pied de page
  const footerY = 280;
  doc.setLineWidth(0.2);
  doc.line(marginLeft, footerY - 5, pageWidth - marginRight, footerY - 5);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text("+222 46 00 89 08", marginLeft, footerY);
  doc.text("msmseafoodsarl@gmail.com", pageWidth / 2, footerY, { align: 'center' });
  doc.text("Zone idustrielle, Dakhlet Nouâdhibou", pageWidth - marginRight, footerY, { align: 'right' });

  doc.save(`details_commande_${commande.reference}.pdf`);
};


export const generateVGMPDF = (vgmData, commande) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 20;
  const marginRight = 20;
  
  let currentY = 20;
  
  // =============================
  // 1. En-tête avec informations alignées
  // =============================
  
  // Date et lieu (à gauche)
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text('Nouadhibou, 13/5/2025', marginLeft, currentY);
  
  // MARAL FOOD S.L (à droite, souligné)
  doc.setFont(undefined, 'bold');
  const maralText = 'MARAL FOOD S.L';
  const maralWidth = doc.getTextWidth(maralText);
  const maralX = pageWidth - marginRight - maralWidth;
  doc.text(maralText, maralX, currentY);
  doc.line(maralX, currentY + 1, maralX + maralWidth, currentY + 1);
  
  currentY += 8;
  
  // Adresse (à droite)
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text('Avda. El Mayorazgo 13', pageWidth - marginRight - doc.getTextWidth('Avda. El Mayorazgo 13'), currentY);
  currentY += 5;
  doc.text('29016 Malaga, España', pageWidth - marginRight - doc.getTextWidth('29016 Malaga, España'), currentY);
  
  currentY = 55;
  
  // =============================
  // 2. Titre principal dans un cadre
  // =============================
  const title = "VERIFIED GROSS MASTER CERTIFICATE";
  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  
  // Cadre pour le titre
  const boxHeight = 12;
  doc.rect(marginLeft, currentY - 8, pageWidth - marginLeft - marginRight, boxHeight);
  
  // Centrer le titre
  const titleWidth = doc.getTextWidth(title);
  const titleX = (pageWidth - titleWidth) / 2;
  doc.text(title, titleX, currentY);
  
  currentY += 20;
  
  // =============================
  // 3. Tableau d'en-tête complexe
  // =============================
  
  // Configuration du tableau avec structure complexe
  const headerTableData = [
    // Première ligne
    [
      { content: 'REFERENCE NUMBER /', rowSpan: 1 },
      { content: 'PO : 5450525', rowSpan: 1 },
      { content: 'BL N°', rowSpan: 1 },
      { content: '253861304', rowSpan: 1 },
      { content: 'MAERSK', rowSpan: 1 }
    ],
    // Deuxième ligne
    [
      { content: 'Company Name: TOP FISH TRADE SARL', colSpan: 3 },
      { content: 'Adresse : BP 545 Zone portuaire-Nouadhibou', colSpan: 2 }
    ],
    // Troisième ligne
    [
      { content: 'WEIGHTING METHOD', colSpan: 3 },
      { content: 'METHOD 1', colSpan: 2 }
    ]
  ];
  
  doc.autoTable({
    startY: currentY,
    body: headerTableData,
    styles: {
      fontSize: 10,
      cellPadding: 4,
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
      textColor: [0, 0, 0],
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 45, halign: 'center' },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 35, halign: 'center' },
      4: { cellWidth: 35, halign: 'center' }
    },
    theme: 'grid',
    margin: { left: marginLeft, right: marginRight }
  });
  
  currentY = doc.lastAutoTable.finalY + 5;
  
  // =============================
  // 4. Tableau des conteneurs
  // =============================
  
  // Données des conteneurs
  const containerData = [
    ['CONTAINER NUMBER', 'MNBU001917/0'],
    ['GROSS WEIGHT', '29 120'],
    ['CONTAINER TARE', '4 640'],
    ['VERIFIED GROSS WEIGHT MASS (VGM)', '33 760'],
    ['DATE OF VERIFICATION', '13/5/2025'],
    ['CONTAINER NUMBER', 'SUDU800471/6'],
    ['GROSS WEIGHT', '29 120'],
    ['CONTAINER TARE', '4 620'],
    ['VERIFIED GROSS WEIGHT MASS (VGM)', '33 740'],
    ['DATE OF VERIFICATION', '13/5/2025']
  ];
  
  // Créer le tableau avec les numéros sur le côté
  let tableStartY = currentY;
  
  doc.autoTable({
    startY: tableStartY,
    body: containerData,
    styles: {
      fontSize: 10,
      cellPadding: 3,
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
      textColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 100, halign: 'left' },
      1: { cellWidth: 70, halign: 'center', fontStyle: 'bold' }
    },
    theme: 'grid',
    margin: { left: marginLeft, right: marginRight },
    didDrawRow: function(data) {
      // Ajouter les numéros 1 et 2 sur le côté
      if (data.row.index === 0) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('1', marginLeft - 8, data.row.y + 15);
      } else if (data.row.index === 5) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('2', marginLeft - 8, data.row.y + 15);
      }
    }
  });
  
  // =============================
  // 5. Sauvegarde
  // =============================
  const fileName = `VGM_Certificate_${vgmData.containerNumber || commande.reference || 'REF'}_${Date.now()}.pdf`;
  doc.save(fileName);
};

// Fonction pour générer le Packing List à partir des données du formulaire
/**
 * Génère le Packing List en format PDF,
 * chaque article est sur une ligne distincte.
 *
 * @param {Object} commande – la commande avec ses meta-données
 * @param {Array} containerData – la structure complète des containers issue du formulaire
 */
export const generatePackingListFromFormPDF = (commande, containerData) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = { left: 10, right: 10 };

  // 1. Logo et en-tête
  doc.addImage(logoBase64, 'PNG', margin.left, 10, 20, 20);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  let y = 15;
  const infoX = margin.left + 25;
  doc.text("MSM Seafood", infoX, y); y += 5;
  doc.text("License: ABCD-1234", infoX, y); y += 5;
  doc.text("msmseafoodsarl@gmail.com", infoX, y);

  // 2. Date et infos client
  const todayFR = new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric'
  }).format(new Date()).toUpperCase();
  doc.text(`Nouadhibou, ${todayFR}`, pageWidth - margin.right, 20, { align: 'right' });

  doc.setFont(undefined, 'bold');
  doc.text(commande.client?.raisonSociale || "Client Inconnu", pageWidth - margin.right, 32, { align: 'right' });
  doc.setFont(undefined, 'normal');
  doc.text(commande.client?.adresse || "Adresse non renseignée", pageWidth - margin.right, 38, { align: 'right' });

  // 3. Titre & références
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text("PACKING LIST", pageWidth / 2, 55, { align: 'center' });

  doc.setFontSize(9);
  doc.text(`Réf: ${commande.reference || 'N/A'}`, margin.left, 70);
  doc.text(`Booking: ${commande.numeroBooking || 'N/A'}`, pageWidth - margin.right - 40, 70);

  // 4. Tableau détaillé (un article par ligne)
  const headers = [
    "Conteneur", "Seal N°", "Taille", "Marks",
    "Prod Date", "Expiry Date", "Box",
    "Nbr Box", "Net Weight", "Gross Weight"
  ];

  const rows = [];
  
  containerData.forEach(container => {
    // Gérer les deux formats de données possibles
    if (container.containerInfo && container.articles) {
      // Format original du formulaire avec containerInfo et articles
      const { containerInfo, prod, expiryDate, articles } = container;
      const cn = containerInfo.containerNo || 'N/A';
      const sn = containerInfo.sealNo || 'N/A';
      const boxType = containerInfo.areDeConteneur || 'N/A';
      const selectedArticles = articles.filter(a => a.selected);
      
      // Si aucun article sélectionné, créer une ligne vide pour le container
      if (selectedArticles.length === 0) {
        rows.push([
          cn,
          sn,
          'N/A',
          'Aucun article sélectionné',
          prod || 'N/A',
          expiryDate || 'N/A',
          boxType,
          '0',
          '0.00 KG',
          '0.00 KG'
        ]);
      } else {
        // Créer une ligne pour chaque article sélectionné avec VRAIS rowSpan
        selectedArticles.forEach((article, index) => {
          const qty = article.quantiteCarton || 0;
          const netWeight = qty * 20; // 20kg par carton
          const grossWeight = qty * (containerInfo.poidsCarton || 22);
          const isFirstArticle = index === 0;
          const rowSpanCount = selectedArticles.length;
          
          if (isFirstArticle) {
            // Première ligne avec rowSpan réel pour Container, Seal et Expiry Date
            rows.push([
              { content: cn, rowSpan: rowSpanCount, styles: { valign: 'middle', halign: 'center' } },
              { content: sn, rowSpan: rowSpanCount, styles: { valign: 'middle', halign: 'center' } },
              article.taille || 'N/A',
              `${article.reference || ''} ${article.specification || ''}`.trim() || 'N/A',
              article.prodDate || 'N/A',
              { content: expiryDate || 'N/A', rowSpan: rowSpanCount, styles: { valign: 'middle', halign: 'center' } },
              article.box || '2*10KG',
              qty.toString(),
              `${netWeight.toFixed(2)} KG`,
              `${grossWeight.toFixed(2)} KG`
            ]);
          } else {
            // Lignes suivantes - IMPORTANT: Ne pas inclure les colonnes avec rowSpan !
            // Colonnes 0 (Container), 1 (Seal), 5 (Expiry) sont fusionnées, donc on les exclut
            rows.push([
              article.taille || 'N/A',                                                    // Taille (colonne 2)
              `${article.reference || ''} ${article.specification || ''}`.trim() || 'N/A', // Marks (colonne 3)
              article.prodDate || 'N/A',                                                   // Prod Date (colonne 4)
              article.box || '2*10KG',                                                     // Box (colonne 6)
              qty.toString(),                                                              // Nbr Box (colonne 7)
              `${netWeight.toFixed(2)} KG`,                                               // Net Weight (colonne 8)
              `${grossWeight.toFixed(2)} KG`                                              // Gross Weight (colonne 9)
            ]);
          }
        });
      }
    } else {
      // Format simplifié du packingData
      const cn = container.containerNo || 'N/A';
      const sn = container.sealNo || 'N/A';
      const boxType = container.box || 'N/A';
      const prod = container.prod || 'N/A';
      const expiryDate = container.date || 'N/A';
      const numOfBox = container.numOfBox || 0;
      const netWeight = container.netWeight || 0;
      const grossWeight = container.grossWeight || 0;
      
      // Pour le format simplifié, on crée une seule ligne par conteneur
      rows.push([
        cn,
        sn,
        container.size || 'N/A',
        container.marks || 'N/A',
        prod,
        expiryDate,
        boxType,
        numOfBox.toString(),
        `${netWeight.toFixed(2)} KG`,
        `${grossWeight.toFixed(2)} KG`
      ]);
    }
  });

  // Calcul des totaux
  let totalBoxes = 0;
  let totalNetWeight = 0;
  let totalGrossWeight = 0;
  
  rows.forEach(row => {
    // Gérer les différents formats de lignes (première ligne avec 10 colonnes, suivantes avec 7)
    let boxesIndex, netWeightIndex, grossWeightIndex;
    
    if (row.length === 10) {
      // Première ligne d'un container (avec Container, Seal, Expiry Date)
      boxesIndex = 7;
      netWeightIndex = 8;
      grossWeightIndex = 9;
    } else if (row.length === 7) {
      // Lignes suivantes d'un container (sans les colonnes fusionnées)
      boxesIndex = 4; // Nbr Box
      netWeightIndex = 5; // Net Weight
      grossWeightIndex = 6; // Gross Weight
    } else {
      return; // Ligne de format inconnu, ignorer
    }
    
    if (typeof row[boxesIndex] === 'string') {
      totalBoxes += parseInt(row[boxesIndex]) || 0;
    }
    if (typeof row[netWeightIndex] === 'string') {
      totalNetWeight += parseFloat(row[netWeightIndex].replace(' KG', '')) || 0;
    }
    if (typeof row[grossWeightIndex] === 'string') {
      totalGrossWeight += parseFloat(row[grossWeightIndex].replace(' KG', '')) || 0;
    }
  });

  // Ligne TOTAL
  rows.push([
    { content: "TOTAL", colSpan: 7, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240,240,240] } },
    { content: totalBoxes.toString(), styles: { halign: 'center', fontStyle: 'bold', fillColor: [240,240,240] } },
    { content: `${totalNetWeight.toFixed(2)} KG`, styles: { halign: 'center', fontStyle: 'bold', fillColor: [240,240,240] } },
    { content: `${totalGrossWeight.toFixed(2)} KG`, styles: { halign: 'center', fontStyle: 'bold', fillColor: [240,240,240] } }
  ]);

  doc.autoTable({
    startY: 85,
    head: [headers],
    body: rows,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      valign: 'middle'
    },
    headStyles: {
      fillColor: [52, 73, 94],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7
    },
    margin: { left: margin.left, right: margin.right },
    tableWidth: 'auto',
    columnStyles: {
      0: { cellWidth: 18, halign: 'center', valign: 'middle' },  // Conteneur
      1: { cellWidth: 18, halign: 'center', valign: 'middle' },  // Seal N°
      2: { cellWidth: 12, halign: 'center' },  // Taille
      3: { cellWidth: 30, halign: 'left' },    // Marks
      4: { cellWidth: 18, halign: 'center' },  // Prod Date
      5: { cellWidth: 20, halign: 'center', valign: 'middle' },  // Expiry Date - centré verticalement
      6: { cellWidth: 15, halign: 'center' },  // Box
      7: { cellWidth: 18, halign: 'center' },  // Nbr Box
      8: { cellWidth: 22, halign: 'center' },  // Net Weight
      9: { cellWidth: 22, halign: 'center' }   // Gross Weight
    },
    didParseCell: function(data) {
      const rowIndex = data.row.index;
      
      // Style spécial pour la ligne de total
      if (rowIndex === data.table.body.length - 1) {
        data.cell.styles.fillColor = [240, 240, 240];
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  // 5. Infos additionnelles et visas
  const afterY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.text(`Destination: ${commande.destination || 'N/A'}`, margin.left, afterY);
  doc.text(`Type de commande: ${commande.typeCommande === 'LOCALE' ? 'Locale' : 'Export'}`, margin.left, afterY + 5);

  const visaY = afterY + 25;
  doc.setFontSize(9);
  doc.text("Visa pointeur Smcp", margin.left, visaY);
  doc.text("Visa du client", pageWidth / 2, visaY, { align: 'center' });
  doc.text("Visa Responsable usine", pageWidth - margin.right, visaY, { align: 'right' });

  // Ajout de l'image de signature sous "Visa Responsable usine"
  try {
    const signatureWidth = 35;
    const signatureHeight = 20;
    const signatureX = pageWidth - margin.right - signatureWidth;
    const signatureY = visaY + 5;
    
    doc.addImage(stampBase64, 'PNG', signatureX, signatureY, signatureWidth, signatureHeight);
  } catch (error) {
    console.warn('Erreur lors de l\'ajout de la signature:', error);
  }

  const lineY = visaY + 15;
  doc.setLineWidth(0.3);
  doc.line(margin.left, lineY, margin.left + 50, lineY);
  doc.line(pageWidth / 2 - 25, lineY, pageWidth / 2 + 25, lineY);
  doc.line(pageWidth - margin.right - 50, lineY, pageWidth - margin.right, lineY);

  // 6. Pied de page
  const footerY = 280;
  doc.setLineWidth(0.2);
  doc.line(margin.left, footerY - 5, pageWidth - margin.right, footerY - 5);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text("+222 46 00 89 08", margin.left, footerY);
  doc.text("msmseafoodsarl@gmail.com", pageWidth / 2, footerY, { align: 'center' });
  doc.text("Zone industrielle, Dakhlet Nouâdhibou", pageWidth - margin.right, footerY, { align: 'right' });

  // Enregistrement
  doc.save(`packing_list_${commande.reference}.pdf`);
};

// Fonction pour générer l'autorisation de sortie PDF
export const generateAutorisationSortiePDF = (autorisationData) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 10;
  const marginRight = 10;

  // =============================
  // 1. En-tête avec logo (même style que les autres PDF)
  // =============================
  doc.addImage(logoBase64, 'PNG', marginLeft, 10, 20, 20);

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  let currentY = 15;
  const infoX = marginLeft + 25;
  doc.text("MSM Seafood", infoX, currentY);
  currentY += 5;
  doc.text("Zone industrielle,", infoX, currentY);
  currentY += 5;
  doc.text("Dakhlet Nouâdhibou", infoX, currentY);
  currentY += 5;
  doc.text("msmseafoodsarl@gmail.com", infoX, currentY);

  // =============================
  // 2. Titre principal
  // =============================
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text("AUTORISATION DE SORTIE", pageWidth / 2, 45, { align: 'center' });

  // =============================
  // 3. Informations générales
  // =============================
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  let infoY = 60;

  // Date
  const today = new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(autorisationData.date).replace(/(\d+)/, (match) => {
    const day = parseInt(match);
    return day === 1 ? '1er' : match;
  });
  doc.text(`Date: ${today}`, marginLeft, infoY);

  // Dépôt
  infoY += 7;
  doc.setFont(undefined, 'bold');
  doc.text(`Dépôt: ${autorisationData.depot?.intitule || 'N/A'}`, marginLeft, infoY);
  doc.setFont(undefined, 'normal');
  if (autorisationData.depot?.location) {
    infoY += 5;
    doc.text(`Localisation: ${autorisationData.depot.location}`, marginLeft, infoY);
  }

  // Numéro unique pour l'autorisation
  const numeroAutorisation = `AS${Date.now().toString().slice(-8)}`;
  doc.text(`N° Autorisation: ${numeroAutorisation}`, pageWidth - marginRight, 60, { align: 'right' });

  // =============================
  // 4. Tableau des articles
  // =============================
  const tableStartY = infoY + 15;
  
  const tableColumnHeaders = [
    "Article",
    "Taille",
    "Quantité (Cartons)",
    "Quantité (Kg)"
  ];

  const tableRows = autorisationData.articles.map(item => {
    const articleName = [
      item.article?.reference,
      item.article?.specification,
      item.article?.taille
    ].filter(Boolean).join(' - ');

    return [
      articleName || 'Article inconnu',
      item.article?.taille || '-',
      item.quantiteCarton?.toString() || '0',
      item.quantiteKg?.toFixed(1) || '0.0'
    ];
  });

  // Calcul des totaux
  const totalCartons = autorisationData.articles.reduce((sum, item) => sum + (item.quantiteCarton || 0), 0);
  const totalKg = autorisationData.articles.reduce((sum, item) => sum + (item.quantiteKg || 0), 0);

  // Ajouter ligne de total
  tableRows.push([
    { content: "TOTAL", colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
    { content: totalCartons.toString(), styles: { halign: 'center', fontStyle: 'bold' } },
    { content: totalKg.toFixed(1), styles: { halign: 'center', fontStyle: 'bold' } }
  ]);

  doc.autoTable({
    head: [tableColumnHeaders],
    body: tableRows,
    startY: tableStartY,
    margin: { left: marginLeft, right: marginRight },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 70 }, // Article (élargie)
      1: { cellWidth: 30, halign: 'center' }, // Taille (élargie)
      2: { cellWidth: 40, halign: 'center' }, // Cartons (élargie)
      3: { cellWidth: 40, halign: 'center' }, // Kg (élargie)
    },
  });

  // =============================
  // 5. Ajouter le tampon/logo en bas à droite si disponible
  // =============================
  if (sortieStamp64) {
    try {
      const stampY = doc.lastAutoTable.finalY + 18; // 50px sous le tableau (18mm ≈ 50px)
      doc.addImage(sortieStamp64, 'PNG', pageWidth - marginRight - 40, stampY, 35, 25);
    } catch (error) {
      console.warn('Impossible d\'ajouter le tampon:', error);
    }
  }

  // =============================
  // 6. Sauvegarde
  // =============================
  const fileName = `autorisation_sortie_${numeroAutorisation}_${autorisationData.depot?.code || 'depot'}.pdf`;
  doc.save(fileName);
};

// Fonction pour générer la Demande de Certification (Certificat d'Origine)
export const generateCertificationRequestPDF = (commande) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 15;
  const marginRight = 15;

  // =============================
  // 1. En-tête du document
  // =============================
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text("DEMANDE DE CERTIFICATION", pageWidth / 2, 20, { align: 'center' });

  // Numéro du document
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`N°: ${commande.reference || 'N/A'}`, pageWidth - marginRight, 30, { align: 'right' });

  // =============================
  // 2. Informations de l'expéditeur
  // =============================
  let currentY = 45;
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text("Nom et adresse de l'expéditeur:", marginLeft, currentY);
  doc.setFont(undefined, 'normal');
  currentY += 5;
  doc.text("Nom: MSM SEAFOOD SARL", marginLeft + 5, currentY);
  currentY += 4;
  doc.text("Adresse: Zone industrielle, Dakhlet Nouâdhibou, Mauritanie", marginLeft + 5, currentY);
  currentY += 4;
  doc.text("P.O: MSM SEAFOOD SARL", marginLeft + 5, currentY);
  currentY += 4;
  doc.text("Tél: +222 46 00 89 08", marginLeft + 5, currentY);

  // =============================
  // 3. Informations du transporteur
  // =============================
  currentY += 10;
  doc.setFont(undefined, 'bold');
  doc.text("Moyen de transport:", marginLeft, currentY);
  doc.setFont(undefined, 'normal');
  currentY += 5;
  doc.text(`Navire: ${commande.numeroBooking || 'À définir'}`, marginLeft + 5, currentY);
  currentY += 4;
  doc.text(`N° de conteneur: ${commande.cargo?.[0]?.noDeConteneur || 'À définir'}`, marginLeft + 5, currentY);
  currentY += 4;
  doc.text(`Destination: ${commande.destination || 'À définir'}`, marginLeft + 5, currentY);

  // =============================
  // 4. Pays d'origine et destination
  // =============================
  currentY += 10;
  doc.setFont(undefined, 'bold');
  doc.text("Pays:", marginLeft, currentY);
  doc.setFont(undefined, 'normal');
  currentY += 5;
  doc.text("Origine du produit: MAURITANIE", marginLeft + 5, currentY);
  currentY += 4;
  doc.text(`Pays de destination: ${commande.destination || 'À définir'}`, marginLeft + 5, currentY);

  // =============================
  // 5. Tableau des marchandises
  // =============================
  currentY += 15;
  doc.setFont(undefined, 'bold');
  doc.text("Description des marchandises:", marginLeft, currentY);

  // Regrouper les articles identiques
  const groupedItems = {};
  commande.items?.forEach(item => {
    const productKey = item.article ? 
      [item.article.reference, item.article.specification].filter(Boolean).join(" ") : 
      "Produit non spécifié";
    const size = item.article?.taille || "-";
    const groupKey = `${productKey}-${size}`;
    
    if (!groupedItems[groupKey]) {
      groupedItems[groupKey] = {
        product: productKey,
        size: size,
        totalQuantity: 0,
        unit: "KG"
      };
    }
    
    groupedItems[groupKey].totalQuantity += parseFloat(item.quantiteKg) || 0;
  });

  // Tableau des produits
  const tableData = Object.values(groupedItems).map(item => [
    item.product,
    item.size,
    `${item.totalQuantity.toFixed(0)} ${item.unit}`,
    "Mauritanie" // Origine
  ]);

  doc.autoTable({
    startY: currentY + 5,
    head: [["DÉSIGNATION", "TAILLE", "QUANTITÉ", "ORIGINE"]],
    body: tableData,
    theme: 'grid',
    styles: { 
      fontSize: 8, 
      cellPadding: 3,
      valign: 'middle'
    },
    headStyles: {
      fillColor: [200, 200, 200],
      textColor: 0,
      fontStyle: 'bold'
    },
    margin: { left: marginLeft, right: marginRight },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 40, halign: 'center' },
      3: { cellWidth: 40, halign: 'center' }
    }
  });

  // =============================
  // 6. Informations de certification
  // =============================
  currentY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text("CERTIFICATION:", marginLeft, currentY);
  doc.setFont(undefined, 'normal');
  currentY += 8;

  const certificationText = [
    "Je certifie que les marchandises désignées ci-dessus sont originaires de",
    "Mauritanie et satisfont aux conditions prévues par les accords commerciaux",
    "en vigueur pour l'exportation vers le pays de destination."
  ];

  certificationText.forEach((line, index) => {
    doc.text(line, marginLeft, currentY + (index * 5));
  });

  // =============================
  // 7. Date et lieu
  // =============================
  currentY += 25;
  const today = new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date()).replace(/(\d+)/, (match) => {
    const day = parseInt(match);
    return day === 1 ? '1er' : match;
  });

  doc.text(`Fait à Nouadhibou, le ${today}`, marginLeft, currentY);

  // =============================
  // 8. Signatures et cachets
  // =============================
  currentY += 20;
  
  // Signature de l'exportateur
  doc.setFont(undefined, 'bold');
  doc.text("Signature de l'exportateur:", marginLeft, currentY);
  doc.setFont(undefined, 'normal');
  doc.text("MSM SEAFOOD SARL", marginLeft, currentY + 10);
  
  // Ligne de signature
  doc.setLineWidth(0.3);
  doc.line(marginLeft, currentY + 20, marginLeft + 60, currentY + 20);

  // Visa des autorités compétentes
  doc.setFont(undefined, 'bold');
  doc.text("Visa des autorités compétentes:", pageWidth - marginRight - 60, currentY);
  doc.setFont(undefined, 'normal');
  
  // Cadre pour le cachet
  doc.rect(pageWidth - marginRight - 50, currentY + 5, 45, 30);
  doc.setFontSize(8);
  doc.text("Cachet et signature", pageWidth - marginRight - 47, currentY + 20);
  doc.text("des autorités", pageWidth - marginRight - 40, currentY + 25);

  // =============================
  // 9. Notes et références
  // =============================
  currentY += 45;
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text(`Référence commande: ${commande.reference}`, marginLeft, currentY);
  currentY += 4;
  doc.text(`Date de commande: ${commande.dateCommande ? 
    new Date(commande.dateCommande).toLocaleDateString('fr-FR') : 
    'Non spécifiée'}`, marginLeft, currentY);
  currentY += 4;
  doc.text(`Client: ${commande.client?.raisonSociale || 'Non spécifié'}`, marginLeft, currentY);

  // =============================
  // 10. Pied de page
  // =============================
  const footerY = 280;
  doc.setLineWidth(0.2);
  doc.line(marginLeft, footerY - 5, pageWidth - marginRight, footerY - 5);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text("MSM SEAFOOD SARL", marginLeft, footerY);
  doc.text("Zone industrielle, Dakhlet Nouâdhibou, Mauritanie", pageWidth / 2, footerY, { align: 'center' });
  doc.text("+222 46 00 89 08", pageWidth - marginRight, footerY, { align: 'right' });

  // Sauvegarde du PDF
  doc.save(`demande_certification_${commande.reference}.pdf`);
};

// Fonction pour générer le Bon de Transfert PDF (simple ou multiple)
export const generateBonDeTransfertPDF = (transfer) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 15;
  const marginRight = 15;

  // =============================
  // 1. En-tête avec logo
  // =============================
  doc.addImage(logoBase64, 'PNG', marginLeft, 10, 25, 25);

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  let currentY = 15;
  const infoX = marginLeft + 30;
  doc.text("MSM SEAFOOD", infoX, currentY);
  currentY += 6;
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text("msmseafoodsarl@gmail.com", infoX, currentY);
  currentY += 4;
  doc.text("+222 46 00 89 08", infoX, currentY);
  currentY += 4;
  doc.text("Zone idustrielle, Dakhlet Nouâdhibou", infoX, currentY);

  // =============================
  // 2. Date et numéro de transfert
  // =============================
  const dateStr = transfer.dateTransfert 
    ? new Date(transfer.dateTransfert).toLocaleDateString('fr-FR')
    : new Date().toLocaleDateString('fr-FR');
  
  doc.setFontSize(10);
  doc.text(`Date: ${dateStr}`, pageWidth - marginRight, 20, { align: 'right' });
  doc.text(`N° Transfert: ${transfer._id}`, pageWidth - marginRight, 28, { align: 'right' });

  // =============================
  // 3. Titre
  // =============================
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  const title = transfer.isMultiple ? 'BON DE TRANSFERT' : 'BON DE TRANSFERT';
  doc.text(title, pageWidth / 2, 55, { align: 'center' });

  // =============================
  // 4. Informations générales
  // =============================
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  let infoY = 75;
  
  doc.setFont(undefined, 'bold');
  doc.text('Informations Générales:', marginLeft, infoY);
  doc.setFont(undefined, 'normal');
  infoY += 8;
  
  doc.text(`Dépôt de Départ: ${transfer.depotDepart?.intitule || 'N/A'}`, marginLeft, infoY);
  infoY += 6;
  doc.text(`Dépôt d'Arrivée: ${transfer.depotArrivee?.intitule || 'N/A'}`, marginLeft, infoY);
  infoY += 6;
  doc.text(`Pointeur: ${transfer.pointeur || 'N/A'}`, marginLeft, infoY);
  infoY += 6;
  doc.text(`Moyen de Transport: ${transfer.moyenDeTransfert || 'N/A'}`, marginLeft, infoY);
  if (transfer.immatricule) {
    infoY += 6;
    doc.text(`Immatricule: ${transfer.immatricule}`, marginLeft, infoY);
  }

  // =============================
  // 5. Tableau des articles
  // =============================
  let tableStartY = infoY + 15;
  
  if (transfer.isMultiple && transfer.items && transfer.items.length > 0) {
    // Transfert multiple
    doc.setFont(undefined, 'bold');
    doc.text('Détail des Articles Transférés:', marginLeft, tableStartY);
    tableStartY += 8;
    
    const headers = [
      'Article',
      'Référence',
      'Taille',
      'Quantité (Kg)',
      'Quantité (Cartons)',
      'Batch Number'
    ];

    const rows = transfer.items.map(item => {
      const article = item.article || {};
      const articleName = [
        article.reference || 'N/A',
        article.specification || '',
        article.intitule || ''
      ].filter(Boolean).join(' - ');
      
      const batchNumbers = item.detailsLots 
        ? item.detailsLots.map(lot => lot.batchNumber).filter(Boolean).join(', ')
        : 'N/A';
      
      return [
        articleName,
        article.reference || 'N/A',
        article.taille || 'N/A',
        item.quantiteKg?.toString() || '0',
        item.quantiteCarton?.toFixed(2) || '0',
        batchNumbers
      ];
    });

    // Ligne de total
    const totalKg = transfer.quantiteKg || 0;
    const totalCartons = transfer.quantiteCarton || 0;
    rows.push([
      { content: 'TOTAL', styles: { fontStyle: 'bold' } },
      '',
      '',
      { content: totalKg.toString(), styles: { fontStyle: 'bold' } },
      { content: totalCartons.toFixed(2), styles: { fontStyle: 'bold' } },
      ''
    ]);

    doc.autoTable({
      startY: tableStartY,
      head: [headers],
      body: rows,
      theme: 'grid',
      styles: { 
        fontSize: 8,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [64, 64, 64],
        textColor: 'white',
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 25 },
        2: { cellWidth: 20 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 35 }
      }
    });
  } else {
    // Transfert simple
    doc.setFont(undefined, 'bold');
    doc.text('Détail du Transfert:', marginLeft, tableStartY);
    tableStartY += 8;
    
    const headers = [
      'Article',
      'Référence',
      'Taille',
      'Quantité (Kg)',
      'Quantité (Cartons)',
      'Batch Number'
    ];

    const article = transfer.article || {};
    const articleName = [
      article.reference || 'N/A',
      article.specification || '',
      article.intitule || ''
    ].filter(Boolean).join(' - ');
    
    const batchNumbers = transfer.detailsLots 
      ? transfer.detailsLots.map(lot => lot.batchNumber).filter(Boolean).join(', ')
      : 'N/A';
    
    const rows = [[
      articleName,
      article.reference || 'N/A',
      article.taille || 'N/A',
      transfer.quantiteKg?.toString() || '0',
      transfer.quantiteCarton?.toFixed(2) || (transfer.quantiteKg ? (transfer.quantiteKg / 20).toFixed(2) : '0'),
      batchNumbers
    ]];

    doc.autoTable({
      startY: tableStartY,
      head: [headers],
      body: rows,
      theme: 'grid',
      styles: { 
        fontSize: 9,
        cellPadding: 4
      },
      headStyles: {
        fillColor: [64, 64, 64],
        textColor: 'white',
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 25 },
        2: { cellWidth: 20 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 35 }
      }
    });
  }

  // =============================
  // 6. Signatures
  // =============================
  const finalY = doc.lastAutoTable.finalY || tableStartY + 30;
  const signatureY = finalY + 20;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Signatures:', marginLeft, signatureY);
  
  doc.setFont(undefined, 'normal');
  const sig1Y = signatureY + 15;
  const sig2Y = signatureY + 15;
  
  doc.text('Pointeur:', marginLeft, sig1Y);
  doc.text('Signature Responsable:', pageWidth / 2, sig1Y);
  
  // Lignes de signature
  doc.line(marginLeft, sig1Y + 15, marginLeft + 60, sig1Y + 15);
  doc.line(pageWidth / 2, sig2Y + 15, pageWidth / 2 + 60, sig2Y + 15);
  
  const sig3Y = sig1Y + 25;
  // doc.text('Responsable Dépôt Arrivée:', marginLeft, sig3Y);
  // doc.line(marginLeft, sig3Y + 15, marginLeft + 60, sig3Y + 15);

  // =============================
  // 7. Notes/Observations
  // =============================
  // const notesY = sig3Y + 25;
  // doc.setFont(undefined, 'bold');
  // doc.text('Observations:', marginLeft, notesY);
  // doc.setFont(undefined, 'normal');
  
  // // Cadre pour les observations
  // doc.rect(marginLeft, notesY + 5, pageWidth - marginLeft - marginRight, 20);

  // Sauvegarde
  const fileName = transfer.isMultiple 
    ? `bon_transfert_multiple_${transfer._id}.pdf`
    : `bon_transfert_${transfer._id}.pdf`;
  
  doc.save(fileName);
};

export const generateCertificatOrigineExcel = (certificateData, commande) => {
  // 1. Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('C.O');

  // 2. Define column widths (A through L)
  const columnWidths = {
    A: 3.86,  B: 2.86,  C: 8.57,  D: 14.0,  E: 2.43, 
    F: 4.43,  G: 3.57,  H: 12.71, I: 12.57, J: 5.43, 
    K: 16.57, L: 16.43
  };
  Object.keys(columnWidths).forEach(col => {
    sheet.getColumn(col).width = columnWidths[col];
  });

  // 3. Set default row height and specific row heights
  sheet.properties.defaultRowHeight = 13.5;
  // Adjust notable rows as in template
  sheet.getRow(5).height = 14.25;
  sheet.getRow(6).height = 19.5;
  sheet.getRow(7).height = 16.5;
  sheet.getRow(8).height = 16.5;
  sheet.getRow(9).height = 27.75;
  sheet.getRow(13).height = 16.5;
  sheet.getRow(17).height = 6.75;   // small gap
  sheet.getRow(45).height = 15.0;
  sheet.getRow(52).height = 20.25;
  // (Most other rows remain at default 13.5 as set)

  // 4. Fill background color for form area (B4:L60)
  for (let r = 2; r <= 63; r++) {
    for (let c = 2; c <= 12; c++) {  // columns B (2) through L (12)
      const cell = sheet.getCell(r, c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }
      };
    }
  }

  // 5. Merge cells according to the template
  sheet.mergeCells('C5:H6');   // Exporter info block (2 rows)
  sheet.mergeCells('C7:I7');   // Intermediate party line
  sheet.mergeCells('C9:I9');   // Consignee name
  sheet.mergeCells('C10:F13'); // Consignee address block (multi-row)
  // Transport/port lines don't require merges except for using separate columns for city/country and hyphen
  // Container lines:
  // (No horizontal merges for container number, but merge seal number cells)
  sheet.mergeCells('G18:H18');
  sheet.mergeCells('G19:H19');
  sheet.mergeCells('G20:H20');
  // Products header and data:
  sheet.mergeCells('F26:I26'); // "POISSON CONGELE" heading
  sheet.mergeCells('F27:G27'); // "ESPECES" header
  // (H27, I27, K27 are single, J27 is not used for header)
  // First species entry (spanning 4 rows 29-32):
  sheet.mergeCells('C29:C32'); // line number
  sheet.mergeCells('D29:F32'); // species name block
  sheet.mergeCells('H29:H32'); // total cartons
  sheet.mergeCells('I29:I32'); // total net weight
  sheet.mergeCells('J29:J32'); // gross per box (if any)
  sheet.mergeCells('K29:K32'); // total gross weight
  // Second species entry (spanning 2 rows 33-34, as per template):
  sheet.mergeCells('C33:C34'); // second line number (merge added for vertical centering)
  sheet.mergeCells('D33:G34'); // second species name
  sheet.mergeCells('H33:H34'); // cartons
  sheet.mergeCells('I33:I34'); // net weight
  // (J33/J34 left separate/blank, no gross per box displayed for second line)
  sheet.mergeCells('K33:K34'); // gross weight
  // Totals row:
  sheet.mergeCells('F38:G38'); // "TOTAL" label spanning species columns
  // (H38, I38, J38, K38 remain separate for totals)
  // OP line:
  sheet.mergeCells('F41:G41'); // "OP :" and underline spaces
  // (H41 and I41 not merged to allow number and year separately)
  // Customs office line:
  sheet.mergeCells('D43:K43'); // First "BUREAU DOUANE PECHE..." centered
  sheet.mergeCells('C56:K56'); // Second "BUREAU DOUANE..." (merge for centering second copy)
  // BL line:
  sheet.mergeCells('F45:G45'); // "BL:" label and underline spaces
  sheet.mergeCells('H45:I45'); // BL number cell
  // Second copy origin country:
  sheet.mergeCells('J54:K54'); // "MAURITANIE" on second copy
  // Second copy destination country:
  sheet.mergeCells('I58:L59'); // "COTE D'IVOIRE" on second copy (2 rows high if needed for stamp area)
  // Bottom date/place line:
  sheet.mergeCells('C60:E60'); // "NOUADHIBOU," for first copy
  sheet.mergeCells('F60:H60'); // date for first copy
  sheet.mergeCells('I60:J60'); // "NOUADHIBOU," for second copy
  // (K60 and L60 not merged; date for second copy will be in K60, L60 left blank)

  // 6. Define a helper for styling a cell easily
  const setCellStyle = (cellRef, {fontSize=10, bold=true, italic=false, underline=false, hAlign='left', vAlign='center', wrap=false} = {}) => {
    const cell = sheet.getCell(cellRef);
    cell.font = { name: 'Tahoma', size: fontSize, bold: bold, italic: italic, underline: underline ? 'single' : false };
    cell.alignment = { horizontal: hAlign, vertical: vAlign, wrapText: wrap };
    return cell;
  };

  // 7. Fill in static labels and dynamic data with proper style:
  // Ref and PO - utiliser les données réelles de la commande
  setCellStyle('C4', {fontSize: 10, bold: true, underline: false, hAlign: 'left'}).value = 'Ref:';
  
  // Utiliser la référence de la commande
  const refText = commande.reference || 'N/A';
  setCellStyle('D4', {fontSize: 10, bold: true, underline: false, hAlign: 'left'}).value = refText;
  
  // Utiliser le numéro OP de la commande pour PO
  const poText = commande.numeroOP || commande.numeroBooking || 'N/A';
  setCellStyle('E4', {fontSize: 10, bold: true, underline: false, hAlign: 'left'}).value = `PO : ${poText}`;

  // Exporter (Expéditeur) info (merged C5:H6)
  const exporterText = "SMCP  BP: 259, Nouadhibou, Mauritanie, P/C MSM SEAFOOD SARL.";
  setCellStyle('C5', {fontSize: 10, bold: true, underline: false, hAlign: 'left', vAlign: 'top', wrap: true}).value = exporterText;

  // Intermediate party (if any) on merged C7:I7 - e.g., Maral Food S.L.
  const intermediateName = commande.client?.raisonSociale || '';  // using client name as intermediate if applicable
  setCellStyle('C7', {fontSize: 10, bold: true, underline: true, hAlign: 'left', vAlign: 'center'}).value = intermediateName;

  // Consignee (Destinataire) name on merged C9:I9
  const consigneeName = commande.consigne || '';
  setCellStyle('C9', {fontSize: 11, bold: true, underline: true, hAlign: 'left', vAlign: 'center', wrap: true}).value = consigneeName;

  // Consignee address on merged C10:F13 (may include multiple lines)
  const consigneeAddress = commande.adresseConsigne || '';
  setCellStyle('C10', {fontSize: 9, bold: true, underline: false, hAlign: 'left', vAlign: 'top', wrap: true}).value = consigneeAddress;

  // Origin country (in K9)
  setCellStyle('K9', {fontSize: 10, bold: true, underline: false, hAlign: 'center'}).value = 'MAURITANIE';

  // Transport details:
  setCellStyle('C14', {fontSize: 9, bold: true}).value = 'M/V :';  // Vessel label
  // Vessel name in D14
  const vesselName = certificateData.cargo?.nom || 'N/A';
  setCellStyle('D14', {fontSize: 9, bold: true}).value = vesselName;
  // Origin port and country on row 15 (D15, E15, F15)
  const originCity = commande.portDepart || 'NOUADHIBOU';
  setCellStyle('D15', {fontSize: 9, bold: true}).value = originCity.toUpperCase();
  setCellStyle('E15', {fontSize: 9, bold: true, hAlign: 'center'}).value = '-';
  setCellStyle('F15', {fontSize: 9, bold: true}).value = 'MAURITANIE';
  // Destination port and country on row 16 (D16, E16, F16)
  let destCity = commande.pif || ''; 
  // if (!destCity && commande.adresseConsigne) {
  //   // Try to extract city from address (e.g., last line if available)
  //   const addrLines = commande.adresseConsigne.split('\n');
  //   const lastLine = addrLines[addrLines.length - 1];
  //   // If last line contains a city name (e.g., ends with a city or city code), use that
  //   destCity = lastLine.replace(/[0-9]/g, '').trim();  // remove any postal codes/numbers
  //   if (destCity.toUpperCase() === commande.destination?.toUpperCase()) {
  //     destCity = ''; // if we only got country name, ignore (to avoid duplicate country as city)
  //   }
  // }
  if (destCity) {
    setCellStyle('D16', {fontSize: 9, bold: true}).value = destCity.toUpperCase();
    setCellStyle('E16', {fontSize: 9, bold: true, hAlign: 'center'}).value = '-';
  } else {
    // No specific city -> leave D16 and E16 blank (no hyphen if city missing)
    sheet.getCell('D16').value = '';  // already grey-filled
    sheet.getCell('E16').value = '';
  }
  const destCountry = (commande.destination || '').toUpperCase();
  setCellStyle('F16', {fontSize: 9, bold: true}).value = destCountry || 'N/A';

  // Container(s) and Seal(s) lines (up to 3):
  // Static labels "N° CONT :" and "PL :" on each line 18-20
  ['C18','C19','C20'].forEach(ref => {
    setCellStyle(ref, {fontSize: 9, bold: true}).value = 'N° CONT :';
  });
  ['F18','F19','F20'].forEach(ref => {
    setCellStyle(ref, {fontSize: 9, bold: true}).value = 'PL :';
  });
  // Fill container number and seal if present
  // Améliorer l'extraction des conteneurs depuis la commande avec fallback intelligent
  const containers = [];
  
  // Méthode 1 : Extraire depuis commande.cargo (source principale)
  if (commande.cargo && Array.isArray(commande.cargo) && commande.cargo.length > 0) {
    commande.cargo.forEach(cargo => {
      if (cargo.noDeConteneur || cargo.containerNumber) {
        containers.push({
          containerNumber: cargo.noDeConteneur || cargo.containerNumber,
          sealNumber: cargo.noPlomb || cargo.sealNumber || cargo.plombNumber || ''
        });
      }
    });
  }
  
  // Méthode 2 : Extraire depuis les items si pas de cargo
  if (containers.length === 0 && commande.items && Array.isArray(commande.items) && commande.items.length > 0) {
    const uniqueContainers = new Map();
    commande.items.forEach(item => {
      const containerNum = item.containerNumber || item.noConteneur || item.conteneur;
      if (containerNum && !uniqueContainers.has(containerNum)) {
        uniqueContainers.set(containerNum, {
          containerNumber: containerNum,
          sealNumber: item.sealNumber || item.noPlomb || item.plomb || ''
        });
      }
    });
    containers.push(...uniqueContainers.values());
  }
  
  // Méthode 3 : Utiliser les valeurs globales de la commande (fallback)
  if (containers.length === 0) {
    const globalContainer = commande.noDeConteneur || commande.containerNumber || commande.conteneur;
    const globalSeal = commande.noPlomb || commande.sealNumber || commande.plomb;
    
    if (globalContainer) {
      containers.push({
        containerNumber: globalContainer,
        sealNumber: globalSeal || ''
      });
    }
  }
  
  // Méthode 4 : Si toujours aucun conteneur, essayer depuis certificateData
  if (containers.length === 0 && certificateData.containers && Array.isArray(certificateData.containers)) {
    containers.push(...certificateData.containers);
  }
  // Populate up to 3 entries
  for (let i = 0; i < 3; i++) {
    const cont = containers[i];
    if (cont) {
      setCellStyle(`D${18 + i}`, {fontSize: 9, bold: true}).value = cont.containerNumber;
      setCellStyle(`G${18 + i}`, {fontSize: 9, bold: true}).value = cont.sealNumber || '';
      // Align container numbers and seals to left for clarity
      sheet.getCell(`D${18 + i}`).alignment = { horizontal: 'left', vertical: 'center' };
      sheet.getCell(`G${18 + i}`).alignment = { horizontal: 'left', vertical: 'center' };
    } else {
      // No container for this line: leave blank (labels already set)
      sheet.getCell(`D${18 + i}`).value = '';
      sheet.getCell(`G${18 + i}`).value = '';
    }
  }

  // Product details (species entries):
  // Améliorer l'extraction et le regroupement des articles depuis la commande - EXTRACTION COMPLÈTE
  let articles = [];
  
  // Méthode 1 : Utiliser les articles fournis dans certificateData (si disponibles)
  if (certificateData.articles && Array.isArray(certificateData.articles) && certificateData.articles.length > 0) {
    articles = certificateData.articles.map(article => ({
      reference: article.reference || article.intitule || 'Article inconnu',
      totalColis: article.totalColis || article.quantiteCarton || 0,
      poidsNet: article.poidsNet || article.quantiteKg || 0,
      poidsBrut: article.poidsBrut || 0,
      article: article
    }));
  } 
  // Méthode 2 : Extraction complète depuis commande.cargo (priorité aux allocations cargo)
  else if (commande.cargo && Array.isArray(commande.cargo) && commande.cargo.length > 0) {
    const cargoArticles = new Map();
    
    commande.cargo.forEach(cargo => {
      if (cargo.itemsAlloues && Array.isArray(cargo.itemsAlloues) && cargo.itemsAlloues.length > 0) {
        cargo.itemsAlloues.forEach(item => {
          const articleRef = item.article?.reference || item.article?.intitule || 'Article inconnu';
          const articleKey = articleRef.toLowerCase().trim();
          
          if (!cargoArticles.has(articleKey)) {
            cargoArticles.set(articleKey, {
              reference: articleRef,
              quantiteKg: 0,
              quantiteCarton: 0,
              article: item.article,
              allocations: []
            });
          }
          
          const group = cargoArticles.get(articleKey);
          const quantiteAllouee = parseFloat(item.quantiteAllouee) || 0;
          const quantiteCarton = parseFloat(item.quantiteCarton) || Math.ceil(quantiteAllouee / 20);
          
          group.quantiteKg += quantiteAllouee;
          group.quantiteCarton += quantiteCarton;
          group.allocations.push({
            cargo: cargo.nom || 'Cargo',
            quantite: quantiteAllouee,
            cartons: quantiteCarton
          });
        });
      }
    });
    
    if (cargoArticles.size > 0) {
      articles = Array.from(cargoArticles.values()).map(group => {
        const packagingWeight = parseFloat(commande.poidsCarton) || 0.8;
        const totalColis = Math.round(group.quantiteCarton);
        const poidsNet = group.quantiteKg;
        const poidsBrut = poidsNet + (totalColis * packagingWeight);
        
        return {
          reference: group.reference,
          totalColis: totalColis,
          poidsNet: poidsNet,
          poidsBrut: poidsBrut,
          article: group.article,
          allocations: group.allocations
        };
      });
    }
  }
  
  // Méthode 3 : Extraire depuis commande.items si pas de cargo
  if (articles.length === 0 && commande.items && Array.isArray(commande.items) && commande.items.length > 0) {
    const articleGroups = new Map();
    
    commande.items.forEach(item => {
      const articleRef = item.article?.reference || item.article?.intitule || item.reference || item.intitule || 'Article inconnu';
      const articleKey = articleRef.toLowerCase().trim();
      
      if (!articleGroups.has(articleKey)) {
        articleGroups.set(articleKey, {
          reference: articleRef,
          quantiteKg: 0,
          quantiteCarton: 0,
          article: item.article || item,
          items: []
        });
      }
      
      const group = articleGroups.get(articleKey);
      group.quantiteKg += parseFloat(item.quantiteKg) || 0;
      group.quantiteCarton += parseFloat(item.quantiteCarton) || 0;
      group.items.push(item);
      
      // Si pas de quantité carton mais qu'on a du poids, estimer les cartons
      if (!group.quantiteCarton && group.quantiteKg > 0) {
        const poidsParCarton = parseFloat(commande.poidsParCarton) || 20;
        group.quantiteCarton = Math.ceil(group.quantiteKg / poidsParCarton);
      }
    });
    
    articles = Array.from(articleGroups.values()).map(group => {
      const packagingWeight = parseFloat(commande.poidsCarton) || 0.8;
      const totalColis = Math.round(group.quantiteCarton);
      const poidsNet = group.quantiteKg;
      const poidsBrut = poidsNet + (totalColis * packagingWeight);
      
      return {
        reference: group.reference,
        totalColis: totalColis,
        poidsNet: poidsNet,
        poidsBrut: poidsBrut,
        article: group.article
      };
    });
  }
  
  // Méthode 4 : Fallback - créer un article générique si aucune donnée disponible
  if (articles.length === 0) {
    const totalNet = parseFloat(commande.poidsTotal) || parseFloat(commande.totalPoidsNet) || 0;
    const totalCartons = parseFloat(commande.totalCartons) || parseFloat(commande.nombreCartons) || 0;
    
    if (totalNet > 0 || totalCartons > 0) {
      const packagingWeight = parseFloat(commande.poidsCarton) || 0.8;
      const estimatedCartons = totalCartons || Math.ceil(totalNet / 20);
      const poidsBrut = totalNet + (estimatedCartons * packagingWeight);
      
      articles.push({
        reference: 'POISSON CONGELE',
        totalColis: estimatedCartons,
        poidsNet: totalNet,
        poidsBrut: poidsBrut,
        article: { reference: 'POISSON CONGELE' }
      });
    }
  }
  
  // Affichage dynamique de TOUS les articles avec leurs vraies quantités
  console.log(`📊 Affichage de ${articles.length} article(s) dans le certificat d'origine`);
  
  articles.forEach((article, index) => {
    const lineNumber = index + 1;
    const startRow = 29 + (index * 2); // Chaque article prend 2 lignes
    
    // Afficher seulement les 3 premiers articles dans le certificat principal
    if (index < 3) {
      // Numéro de ligne
      setCellStyle(`C${startRow}`, {fontSize: 9, bold: true, hAlign: 'center', vAlign: 'center'}).value = `${lineNumber}.0`;
      
      // Nom de l'espèce
      const speciesName = (article.reference || article.article?.reference || '').toUpperCase();
      setCellStyle(`D${startRow}`, {fontSize: 9, bold: true, hAlign: 'center', vAlign: 'center', wrap: true}).value = speciesName;
      
      // Calculs précis des quantités
      const qtyBoxes = Math.round(article.totalColis || 0);
      const netWeight = Math.round(article.poidsNet || 0);
      const grossWeight = Math.round(article.poidsBrut || 0);
      
      // Populate les données
      setCellStyle(`H${startRow}`, {fontSize: 10, bold: true, hAlign: 'center', vAlign: 'center'}).value = qtyBoxes;
      setCellStyle(`I${startRow}`, {fontSize: 10, bold: true, hAlign: 'center', vAlign: 'center'}).value = netWeight;
      
      // Poids brut par carton (seulement pour le premier article)
      if (index === 0 && qtyBoxes > 0) {
        const grossPerBox = grossWeight / qtyBoxes;
        setCellStyle(`J${startRow}`, {fontSize: 9, bold: true, hAlign: 'center', vAlign: 'center'}).value = grossPerBox ? `${grossPerBox.toFixed(1)}` : '';
      } else {
        sheet.getCell(`J${startRow}`).value = '';
      }
      
      setCellStyle(`K${startRow}`, {fontSize: 10, bold: true, hAlign: 'center', vAlign: 'center'}).value = grossWeight;
      
      // Merger les cellules pour cet article (si nécessaire)
      if (startRow + 1 <= 35) { // Limite pour éviter de déborder
        try {
          sheet.mergeCells(`C${startRow}:C${startRow + 1}`);
          sheet.mergeCells(`D${startRow}:G${startRow + 1}`);
          sheet.mergeCells(`H${startRow}:H${startRow + 1}`);
          sheet.mergeCells(`I${startRow}:I${startRow + 1}`);
          if (index === 0) {
            sheet.mergeCells(`J${startRow}:J${startRow + 1}`);
          }
          sheet.mergeCells(`K${startRow}:K${startRow + 1}`);
        } catch (e) {
          console.warn(`Impossible de merger les cellules pour l'article ${index + 1}:`, e.message);
        }
      }
      
      console.log(`   ✅ Article ${lineNumber}: ${speciesName} - ${qtyBoxes} cartons, ${netWeight}kg net, ${grossWeight}kg brut`);
    } else {
      console.log(`   ⚠️ Article ${lineNumber}: ${article.reference} - ${article.totalColis} cartons, ${article.poidsNet}kg (non affiché - limite de 3 articles)`);
    }
  });
  
  // Si plus de 3 articles, ajouter une note
  if (articles.length > 3) {
    setCellStyle('D37', {fontSize: 8, bold: false, italic: true, hAlign: 'left'}).value = `Note: ${articles.length - 3} autre(s) article(s) non affiché(s)`;
  }

  // Headers for products section (row 26-27)
  setCellStyle('F26', {fontSize: 10, bold: true, underline: true, hAlign: 'center'}).value = 'POISSON CONGELE';
  setCellStyle('F27', {fontSize: 9, bold: true, italic: true, underline: true, hAlign: 'center'}).value = 'ESPECES';
  setCellStyle('H27', {fontSize: 9, bold: true, italic: true, underline: true, hAlign: 'center'}).value = 'CARTON';
  setCellStyle('I27', {fontSize: 9, bold: true, italic: true, underline: true, hAlign: 'center'}).value = 'POIDS NET';
  setCellStyle('K27', {fontSize: 9, bold: true, italic: true, underline: true, hAlign: 'center'}).value = 'POIDS  BRUT';

  // Totals row (row 38) - calculer les totaux dynamiquement
  let totalColis = 0;
  let totalNet = 0;
  let totalBrut = 0;
  
  // Calculer les totaux à partir des articles extraits
  articles.forEach(article => {
    totalColis += article.totalColis || article.quantiteCarton || 0;
    totalNet += article.poidsNet || article.quantiteKg || 0;
    totalBrut += article.poidsBrut || 0;
  });
  
  // Si pas de poids brut calculé, l'estimer
  if (totalBrut === 0) {
    const packagingWeight = parseFloat(commande.poidsCarton) || 0.8;
    totalBrut = totalNet + (totalColis * packagingWeight);
  }
  
  // Utiliser les totaux fournis en priorité, sinon les calculés
  const finalTotalColis = certificateData.totals?.totalColis || totalColis;
  const finalTotalNet = certificateData.totals?.poidsNet || totalNet;
  const finalTotalBrut = certificateData.totals?.poidsBrut || totalBrut;
  
  setCellStyle('F38', {fontSize: 11, bold: true, hAlign: 'right'}).value = 'TOTAL';
  setCellStyle('H38', {fontSize: 11, bold: true, hAlign: 'center'}).value = finalTotalColis;
  setCellStyle('I38', {fontSize: 11, bold: true, hAlign: 'center'}).value = finalTotalNet.toFixed(0);
  setCellStyle('J38', {fontSize: 11, bold: true, hAlign: 'left'}).value = `P'':`;
  setCellStyle('K38', {fontSize: 11, bold: true, hAlign: 'center'}).value = finalTotalBrut.toFixed(0);
  
  // Ajouter un trait continu au-dessus de la ligne des totaux (D38 à K38)
  ['D38', 'E38', 'F38', 'G38', 'H38', 'I38', 'J38', 'K38'].forEach(cellRef => {
    const cell = sheet.getCell(cellRef);
    cell.border = {
      ...cell.border,
      top: { style: 'thin' }
    };
  });
  
  // (If needed, packaging weight total = totalBrut - totalNet could be shown, but original left it implicit)

  // OP number line (row 41) - utiliser le numéro OP de la commande
  setCellStyle('F41', {fontSize: 10, bold: true, underline: true, hAlign: 'right'}).value = 'OP :';
  
  // Utiliser le numéro OP de la commande
  const opNumber = commande.numeroOP || certificateData.opNumber || '';
  
  // Add a small space after "OP :" in the merged cell to simulate underline for blank
  sheet.getCell('F41').value = sheet.getCell('F41').value + ' '; 
  // Fill OP number and year
  setCellStyle('H41', {fontSize: 10, bold: true, underline: false, hAlign: 'right'}).value = opNumber;
  const year = new Date().getFullYear();
  setCellStyle('I41', {fontSize: 10, bold: true, underline: false, hAlign: 'left'}).value = opNumber ? `/${year}` : `/${year}`;
  // (If opNumber is blank, this will show "/2025" with no number in front, which matches leaving a blank to fill)

  // Customs office (Bureau Douane) lines
  setCellStyle('D43', {fontSize: 9, bold: true, hAlign: 'center'}).value = 'BUREAU DOUANE PECHE NOUADHIBOU';
  setCellStyle('C56', {fontSize: 10, bold: true, hAlign: 'center'}).value = 'BUREAU DOUANE PECHE NOUADHIBOU';

  // BL (Bill of Lading) line (row 45) - améliorer l'extraction du BL avec fallback intelligent
  // "BL:" label with underline (merged F45:G45)
  const blLabelCell = setCellStyle('F45', {fontSize: 10, bold: true, underline: true, hAlign: 'left'});
  blLabelCell.value = 'BL:';  // "BL:" plus padding spaces underlined
  
  // BL number (merged H45:I45) - extraire depuis plusieurs sources possibles avec priorité
  let blNumber = '';
  
  // Priorité 1 : certificateData.blNumber (si fourni explicitement)
  if (certificateData.blNumber) {
    blNumber = certificateData.blNumber;
  }
  // Priorité 2 : commande.blNumber ou commande.numeroBL
  else if (commande.blNumber || commande.numeroBL) {
    blNumber = commande.blNumber || commande.numeroBL;
  }
  // Priorité 3 : commande.numeroBooking (souvent utilisé comme BL)
  else if (commande.numeroBooking) {
    blNumber = commande.numeroBooking;
  }
  // Priorité 4 : Extraire depuis cargo
  else if (commande.cargo && Array.isArray(commande.cargo) && commande.cargo.length > 0) {
    const cargoWithBL = commande.cargo.find(cargo => cargo.blNumber || cargo.numeroBL || cargo.numeroBooking);
    if (cargoWithBL) {
      blNumber = cargoWithBL.blNumber || cargoWithBL.numeroBL || cargoWithBL.numeroBooking;
    }
  }
  // Priorité 5 : Utiliser la référence comme fallback
  else if (commande.reference) {
    blNumber = commande.reference;
  }
  
  setCellStyle('H45', {fontSize: 10, bold: true, underline: false, hAlign: 'left'}).value = blNumber;

  // Second copy origin country (row 54)
  setCellStyle('J54', {fontSize: 10, bold: true, hAlign: 'center'}).value = 'MAURITANIE';
  // Second copy destination country (merged I58:L59)
  setCellStyle('I58', {fontSize: 10, bold: true, hAlign: 'center', vAlign: 'center'}).value = destCountry || 'N/A';

  // Bottom place and date (row 60)
  const issueDate = certificateData.cargo?.dateCertification 
                    ? new Date(certificateData.cargo.dateCertification) 
                    : new Date();
  // Format date to avoid time portion (Excel will default format if none provided)
  // Here we set a custom format for clarity (e.g., "DD/MM/YYYY")
  sheet.getCell('F60').value = issueDate;
  sheet.getCell('F60').numFmt = 'dd/mm/yyyy';
  sheet.getCell('K60').value = issueDate;
  sheet.getCell('K60').numFmt = 'dd/mm/yyyy';
  setCellStyle('C60', {fontSize: 9, bold: true, hAlign: 'left'}).value = 'NOUADHIBOU,';
  setCellStyle('F60', {fontSize: 9, bold: true, hAlign: 'center'});  // date will be center of F60-H60 merged
  setCellStyle('I60', {fontSize: 9, bold: true, hAlign: 'right'}).value = 'NOUADHIBOU,';
  setCellStyle('K60', {fontSize: 9, bold: true, hAlign: 'left'});    // date (K60) left-aligned within its cell

  // 8. Generate Excel file and trigger download
  workbook.xlsx.writeBuffer().then(buffer => {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `certificat_origine_${commande.reference || 'export'}.xlsx`);
  }).catch(err => {
    console.error('Error generating Excel file:', err);
  });
};