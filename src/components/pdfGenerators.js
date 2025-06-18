// frontend/src/components/pdfGenerators.js
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import logoBase64 from './logoBase64';

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
      groupedItem.unitPrice.toFixed(0),
      groupedItem.totalPrice.toFixed(0)
    ]);
  });
  
  tableRows.push([
    { content: "TOTAL", colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
    { content: totalQuantityKg.toFixed(0), styles: { halign: 'center', fontStyle: 'bold' } },
    "",
    { content: totalPrice.toFixed(0), styles: { halign: 'center', fontStyle: 'bold' } }
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
      groupedItem.unitPrice.toFixed(0),
      groupedItem.totalPrice.toFixed(0)
    ]);
  });

  tableRows.push([
    { content: "TOTAL", colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
    { content: totalQuantityKg.toFixed(0), styles: { halign: 'center', fontStyle: 'bold' } },
    "",
    { content: totalPrice.toFixed(0), styles: { halign: 'center', fontStyle: 'bold' } }
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
      `Bank: ${commande.bank.banque}`,
      `Account Holder: ${commande.bank.titulaire}`,
      `IBAN: ${commande.bank.iban}`,
      `Swift Code: ${commande.bank.codeSwift}`
    ];
    bankDetails.forEach((line, index) => {
      doc.text(line, marginLeft, bankY + 5 + index * 4);
    });
  } else {
    const bankDetails = [
      "Bank: Banque Populaire de Mauritanie",
      "Account Holder: MSM SEAFOOD",
      "IBAN: MR13...00270",
      "Swift Code: BPMAMRMR"
    ];
    bankDetails.forEach((line, index) => {
      doc.text(line, marginLeft, bankY + 5 + index * 4);
    });
  }
  let signatureY = bankY + 5 + 4 * 4 + 15;
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

// Fonction pour générer le Packing List à partir des données du formulaire
export const generatePackingListFromFormPDF = (commande, packingData) => {
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
  // 4. Tableau des données du formulaire
  // =============================
  const tableColumnHeaders = [
    "Container N°",
    "Seal N°",
    "Size", 
    "Marks",
    "Prod",
    "Date",
    "Box",
    "Num of Box",
    "Net Weight",
    "Gross Weight"
  ];

  // Calculer les totaux
  const totals = {
    totalBoxes: packingData.reduce((sum, row) => sum + (parseFloat(row.numOfBox) || 0), 0),
    totalNetWeight: packingData.reduce((sum, row) => sum + (parseFloat(row.netWeight) || 0), 0),
    totalGrossWeight: packingData.reduce((sum, row) => sum + (parseFloat(row.grossWeight) || 0), 0)
  };

  // Construire les lignes du tableau
  const tableRows = packingData.map((row, index) => [
    row.containerNo || 'N/A',
    row.sealNo || 'N/A',
    row.size || 'N/A',
    row.marks || 'N/A',
    row.prod || 'N/A',
    row.date || 'N/A',
    row.box || 'N/A',
    row.numOfBox || '0',
    `${row.netWeight || '0'} KG`,
    `${row.grossWeight || '0'} KG`
  ]);

  // Ligne de total
  tableRows.push([
    { content: "TOTAL", colSpan: 7, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } },
    { content: totals.totalBoxes.toString(), styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240] } },
    { content: `${totals.totalNetWeight.toFixed(2)} KG`, styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240] } },
    { content: `${totals.totalGrossWeight.toFixed(2)} KG`, styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240] } }
  ]);

  doc.autoTable({
    startY: 85,
    head: [tableColumnHeaders],
    body: tableRows,
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
    margin: { left: marginLeft, right: marginRight },
    tableWidth: 'auto',
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' }, // Container N°
      1: { cellWidth: 18, halign: 'center' }, // Seal N°
      2: { cellWidth: 12, halign: 'center' }, // Size
      3: { cellWidth: 25, halign: 'left' },   // Marks
      4: { cellWidth: 15, halign: 'center' }, // Prod
      5: { cellWidth: 20, halign: 'center' }, // Date
      6: { cellWidth: 15, halign: 'center' }, // Box
      7: { cellWidth: 18, halign: 'center' }, // Num of Box
      8: { cellWidth: 22, halign: 'center' }, // Net Weight
      9: { cellWidth: 22, halign: 'center' }  // Gross Weight
    }
  });

  // =============================
  // 5. Informations additionnelles (si nécessaire)
  // =============================
  const afterTableY = doc.lastAutoTable.finalY + 10;
  
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text(`Destination: ${commande.destination || 'N/A'}`, marginLeft, afterTableY);
  doc.text(`Type de commande: ${commande.typeCommande === 'LOCALE' ? 'Locale' : 'Export'}`, marginLeft, afterTableY + 5);

  // =============================
  // 6. VISAS SUR UNE SEULE LIGNE
  // =============================
  const signatureLineY = afterTableY + 25;
  doc.setFontSize(9);
  doc.text("Visa pointeur Smcp", marginLeft, signatureLineY, { align: 'left' });
  doc.text("Visa du client", pageWidth / 2, signatureLineY, { align: 'center' });
  doc.text("Visa Responsable usine", pageWidth - marginRight, signatureLineY, { align: 'right' });

  // Lignes de signature
  const lineY = signatureLineY + 15;
  doc.setLineWidth(0.3);
  doc.line(marginLeft, lineY, marginLeft + 50, lineY);
  doc.line(pageWidth / 2 - 25, lineY, pageWidth / 2 + 25, lineY);
  doc.line(pageWidth - marginRight - 50, lineY, pageWidth - marginRight, lineY);

  // =============================
  // 7. PIED DE PAGE
  // =============================
  const footerY = 280;
  doc.setLineWidth(0.2);
  doc.line(marginLeft, footerY - 5, pageWidth - marginRight, footerY - 5);
  doc.setFontSize(8);
  doc.text("+222 46 00 89 08", marginLeft, footerY);
  doc.text("msmseafoodsarl@gmail.com", pageWidth / 2, footerY, { align: 'center' });
  doc.text("Zone idustrielle, Dakhlet Nouâdhibou", pageWidth - marginRight, footerY, { align: 'right' });

  // Sauvegarde du PDF
  doc.save(`packing_list_${commande.reference}.pdf`);
};
