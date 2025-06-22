// frontend/src/components/pdfGenerators.js
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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

  // Calculer les totaux
  const totalQuantite = Object.values(groupedItems).reduce((sum, item) => sum + item.totalQuantite, 0);
  const totalPrix = Object.values(groupedItems).reduce((sum, item) => sum + item.totalPrix, 0);
  
  // Ligne de total
  tableData.push([
    { content: "TOTAL", colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
    { content: totalQuantite.toFixed(0), styles: { halign: 'center', fontStyle: 'bold' } },
    { content: `${totalPrix.toFixed(2)} ${commande.currency || 'EUR'}`, styles: { halign: 'center', fontStyle: 'bold' } }
  ]);
  
  // Définir la position de départ du tableau
  const tableStartY = 100; // Position Y pour le tableau
  
  doc.autoTable({
    head: [tableColumnHeaders],
    body: tableData,
    startY: tableStartY,
    margin: { left: marginLeft, right: marginRight },
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Sauvegarde
  const fileName = `bon_commande_${commande.reference || 'commande'}.pdf`;
  doc.save(fileName);
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

// Fonction pour générer un certificat de demande PDF
export const generateCertificationRequestPDF = (data) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 10;
  const marginRight = 10;

  // En-tête
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

  // Titre
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text("DEMANDE DE CERTIFICATION", pageWidth / 2, 45, { align: 'center' });

  // Contenu basique
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text("Document de demande de certification généré", marginLeft, 70);

  // Sauvegarde
  doc.save('demande_certification.pdf');
};

// Fonction pour générer un packing list depuis un formulaire
export const generatePackingListFromFormPDF = (formData) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 10;
  const marginRight = 10;

  // En-tête
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

  // Titre
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text("PACKING LIST", pageWidth / 2, 45, { align: 'center' });

  // Contenu basique avec les données du formulaire
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  let yPos = 70;
  
  if (formData.reference) {
    doc.text(`Référence: ${formData.reference}`, marginLeft, yPos);
    yPos += 10;
  }
  
  if (formData.items && formData.items.length > 0) {
    doc.text("Articles:", marginLeft, yPos);
    yPos += 10;
    formData.items.forEach((item, index) => {
      doc.text(`${index + 1}. ${item.description || 'Article'} - ${item.quantity || 0} kg`, marginLeft + 10, yPos);
      yPos += 8;
    });
  }

  // Sauvegarde
  doc.save(`packing_list_${formData.reference || 'form'}.pdf`);
};

// Fonction pour générer un bon de transfert PDF
export const generateBonDeTransfertPDF = (transfert) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 10;
  const marginRight = 10;

  // En-tête
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

  // Titre
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  const titre = transfert.isMultiple ? "BON DE TRANSFERT MULTIPLE" : "BON DE TRANSFERT";
  doc.text(titre, pageWidth / 2, 45, { align: 'center' });

  // Informations du transfert
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  let infoY = 65;

  // Date
  const dateTransfert = transfert.dateTransfert 
    ? new Date(transfert.dateTransfert).toLocaleDateString('fr-FR')
    : new Date().toLocaleDateString('fr-FR');
  doc.text(`Date: ${dateTransfert}`, marginLeft, infoY);

  // Dépôts
  infoY += 8;
  doc.text(`Dépôt de départ: ${transfert.depotDepart?.intitule || 'N/A'}`, marginLeft, infoY);
  infoY += 6;
  doc.text(`Dépôt d'arrivée: ${transfert.depotArrivee?.intitule || 'N/A'}`, marginLeft, infoY);

  // Transport
  if (transfert.moyenDeTransfert || transfert.immatricule) {
    infoY += 8;
    if (transfert.moyenDeTransfert) {
      doc.text(`Moyen de transport: ${transfert.moyenDeTransfert}`, marginLeft, infoY);
      infoY += 6;
    }
    if (transfert.immatricule) {
      doc.text(`Immatriculation: ${transfert.immatricule}`, marginLeft, infoY);
      infoY += 6;
    }
  }

  // Pointeur
  if (transfert.pointeur) {
    infoY += 6;
    doc.text(`Pointeur: ${transfert.pointeur}`, marginLeft, infoY);
  }

  // Tableau des articles
  const tableStartY = infoY + 20;
  const tableColumnHeaders = transfert.isMultiple 
    ? ["Article", "Dépôt Départ", "Dépôt Arrivée", "Quantité (Kg)", "Quantité (Cartons)"]
    : ["Article", "Quantité (Kg)", "Quantité (Cartons)", "Lot"];

  let tableRows = [];
  
  if (transfert.isMultiple && transfert.items) {
    tableRows = transfert.items.map(item => [
      item.article?.reference || 'N/A',
      transfert.depotDepart?.intitule || 'N/A',
      transfert.depotArrivee?.intitule || 'N/A',
      (item.quantiteKg || 0).toString(),
      (item.quantiteCarton || 0).toString()
    ]);
  } else {
    tableRows = [[
      transfert.article?.reference || 'N/A',
      (transfert.quantiteKg || 0).toString(),
      (transfert.quantiteCarton || 0).toString(),
      transfert.detailsLots?.[0]?.batchNumber || 'N/A'
    ]];
  }

  doc.autoTable({
    head: [tableColumnHeaders],
    body: tableRows,
    startY: tableStartY,
    margin: { left: marginLeft, right: marginRight },
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Signatures
  const signaturesY = doc.lastAutoTable.finalY + 30;
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text("SIGNATURES", pageWidth / 2, signaturesY, { align: 'center' });
  
  const colWidth = (pageWidth - marginLeft - marginRight) / 2;
  doc.setFont(undefined, 'normal');
  
  // Expéditeur
  doc.text("Expéditeur", marginLeft + colWidth * 0.5, signaturesY + 15, { align: 'center' });
  doc.text("Nom: ________________________", marginLeft + colWidth * 0.5, signaturesY + 25, { align: 'center' });
  doc.text("Signature: ___________________", marginLeft + colWidth * 0.5, signaturesY + 40, { align: 'center' });
  
  // Destinataire
  doc.text("Destinataire", marginLeft + colWidth * 1.5, signaturesY + 15, { align: 'center' });
  doc.text("Nom: ________________________", marginLeft + colWidth * 1.5, signaturesY + 25, { align: 'center' });
  doc.text("Signature: ___________________", marginLeft + colWidth * 1.5, signaturesY + 40, { align: 'center' });

  // Sauvegarde
  const fileName = transfert.isMultiple 
    ? `bon_transfert_multiple_${transfert._id || Date.now()}.pdf`
    : `bon_transfert_${transfert._id || Date.now()}.pdf`;
  
  doc.save(fileName);
};
