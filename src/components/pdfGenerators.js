// src/utils/pdfGenerators.js
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import logoBase64 from '../components/logoBase64'; // adapter le chemin selon votre projet

/**
 * 1. GENERATE PACKING LIST PDF
 */
export const generatePackingListPDF = (commande) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 10;
  const marginRight = 10;

  // Réduit l'espacement vertical entre les lignes
  doc.setLineHeightFactor(1.0);

  // =============================
  // 1. En-tête & Logo
  // =============================
  const logoWidth = 20;
  const logoHeight = 20;
  doc.addImage(logoBase64, 'PNG', marginLeft, 8, logoWidth, logoHeight);

  // Informations à côté du logo
  const infoStartX = marginLeft + logoWidth + 5;
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text("PC: ANZFA/0246", infoStartX, 15);
  doc.text("Agrément ZFN 19AB0102070", infoStartX, 22);
  doc.text("Agrément Sanitaire n° 02133", infoStartX, 29);

  // =============================
  // 2. Coordonnées & Date
  // =============================
  const today = new Date().toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
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
  // doc.text(`Commercial Invoice: ${commande.invoiceNumber || '01/CI/2025'}`, 135, refY);

  // =============================
  // 4. Tableau des Articles
  // =============================
  // 9 colonnes
  const tableColumnHeaders = [
    "Container N°",
    "Seal Number",
    "BATCH NUMBER",
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
    const batchNumber = item.lot?.batchNumber || "N/A";

    const markLine1 = item.article?.reference || "N/A";
    const markLine2 = item.article?.specification || "";
    const markLine3 = item.article?.taille ? `(SIZE ${item.article.taille})` : "";
    const marks = [markLine1, markLine2, markLine3].filter(Boolean).join("\n");

    const prodDate = item.prodDate || "N/A";
    // Affichage multi-ligne possible pour la date d'expiration
    const expiryDate = item.expiryDate 
      ? item.expiryDate.split(" ")
      : ["24 MONTHS", "FROM DATE OF", "PRODUCTION"];
    const expiryText = Array.isArray(expiryDate) ? expiryDate.join("\n") : expiryDate;

    const quantiteKg = parseFloat(item.quantiteKg) || 0;
    const numBox = quantiteKg / 20;  // Ex. 20 kg par carton
    totalBoxes += numBox;
    totalNetWeight += quantiteKg;

    const grossWeightItem = quantiteKg + (poidsCarton * numBox);
    totalGrossWeight += grossWeightItem;

    return [
      containerNumber,
      sealNumber,
      batchNumber,
      marks,
      prodDate,
      expiryText,
      numBox.toFixed(2),
      quantiteKg.toFixed(2),
      grossWeightItem.toFixed(2)
    ];
  });

  // Ligne TOTAL (fusion des premières colonnes)
  // Avec 9 colonnes : colSpan=6 => "TOTAL" sur colonnes 0..5, puis 3 valeurs (col. 6..8)
  tableRows.push([
    { content: "TOTAL", colSpan: 6, styles: { halign: 'center', fontStyle: 'bold' } },
    totalBoxes.toFixed(2),
    totalNetWeight.toFixed(2),
    totalGrossWeight.toFixed(2)
  ]);

  doc.autoTable({
    startY: 85,
    head: [tableColumnHeaders],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 2,
      valign: 'middle'
    },
    headStyles: {
      fillColor: 'gray',
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    margin: { left: marginLeft, right: marginRight },
    tableWidth: 'auto', // Pour occuper toute la largeur disponible
    columnStyles: {
      0: { halign: 'center' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center' },
      7: { halign: 'center' },
      8: { halign: 'center' }
    }
  });

  // =============================
  // 5. Observations & Signature
  // =============================
  const finalY = doc.lastAutoTable.finalY + 30;
  doc.setFont(undefined, 'normal');
  doc.text("Remarks: " + (commande.remarks || "N/A"), marginLeft, finalY);

  doc.setFont(undefined, 'bold');
  doc.text("Issuer Signature:", pageWidth - 60, finalY + 10, { align: 'center' });
  doc.line(pageWidth - 60, finalY + 12, pageWidth - marginRight, finalY + 12);
  doc.setFontSize(8);
  doc.text("MSM SEAFOOD S.A - Service Administratif et Financier", pageWidth - marginRight, finalY + 18, { align: 'center' });

  // =============================
  // 6. Pied de page
  // =============================
  const footerY = 280;
  doc.setFontSize(8);
  doc.text("+222 38 53 64 89", marginLeft, footerY);
  doc.text("dg@afcomauritania.com", pageWidth / 2, footerY, { align: 'center' });
  doc.text("Port Autonome Nouadhibou, Nouadhibou Mauritanie", pageWidth - marginRight, footerY, { align: 'right' });

  doc.save(`packing_list_${commande.reference}.pdf`);
};

/**
 * 2. GENERATE BON DE COMMANDE PDF
 */
export const generateBonDeCommandePDF = (commande) => {
  // Vérification de sécurité pour s'assurer que commande existe et a des items
  if (!commande) {
    console.error('Aucune commande fournie pour générer le PDF');
    return;
  }

  // Si c'est une sortie, on utilise ses items directement
  const items = commande.items || [];
  if (items.length === 0) {
    console.error('Aucun item trouvé dans la commande/sortie');
    return;
  }

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 10;
  const marginRight = 10;

  // Réduit l'espacement vertical entre les lignes
  doc.setLineHeightFactor(1.0);

  // =============================
  // 1. HEADER & LOGO
  // =============================
  doc.addImage(logoBase64, 'PNG', marginLeft, 10, 20, 20);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');

  let currentY = 15;
  const infoX = marginLeft + 25;
  doc.text("RC: 123456789", infoX, currentY);
  currentY += 5;
  doc.text("License: ABCD-1234", infoX, currentY);
  currentY += 5;
  doc.text("Address: 123 Example St, City", infoX, currentY);

  // =============================
  // 2. TITRE & INFORMATIONS DE BASE
  // =============================
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text("BON DE SORTIE", pageWidth / 2, 25, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  const commandeDate = commande.dateCommande || commande.createdAt
    ? new Date(commande.dateCommande || commande.createdAt).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');

  // Positionnons un peu plus bas
  let infoBlockY2 = 35;
  doc.text(`Reference: ${commande.reference || commande.numeroLivraisonPartielle || 'N/A'}`, marginLeft, infoBlockY2);
  doc.text(`Date: ${commandeDate}`, pageWidth - marginRight, infoBlockY2, { align: 'right' });
  infoBlockY2 += 7;
  if (commande.typeCommande !== 'LOCALE') {
    doc.text(`Booking: ${commande.numeroBooking || '-'}`, pageWidth - marginRight, infoBlockY2, { align: 'right' });
  }

  // =============================
  // 3. TABLEAU DES INFORMATIONS DE COMMANDE
  // =============================
  const clientName = commande.client?.raisonSociale || '-';
  let totalQuantity = 0;
  items.forEach(item => {
    totalQuantity += parseFloat(item.quantiteKg) || 0;
  });
  const tare = parseFloat(commande.areDeConteneur) || 0;
  const grossWeight = (totalQuantity + tare).toFixed(2);

  const orderInfoData = [
    { label: "Client", value: clientName },
    { label: "Type", value: commande.typeCommande === 'LOCALE' ? 'Locale' : 'Export' }
  ];
  
  // Ajouter les champs conditionnels selon le type
  if (commande.typeCommande !== 'LOCALE') {
    orderInfoData.push(
      { label: "Destination", value: commande.destination || '-' },
      { label: "OP", value: commande.numeroOP || '-' }
    );
  }
  
  orderInfoData.push(
    { label: "Dépot", value: commande.depot?.intitule || '-' },
    { label: "Cargo", value: commande.cargo || '-' },
    { label: "Conteneur N°", value: commande.noDeConteneur || '-' },
    { label: "Plomb N°", value: commande.noPlomb || '-' },
    { label: "Tare Conteneur", value: commande.areDeConteneur || '-' },
    { label: "Gross Weight", value: grossWeight }
  );

  const orderInfoHeaders = orderInfoData.map(info => info.label);
  const orderInfoValues = orderInfoData.map(info => info.value);

  const tableStartY = infoBlockY2 + 10;
  doc.autoTable({
    startY: tableStartY,
    head: [orderInfoHeaders],
    body: [orderInfoValues],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      halign: 'center',
      valign: 'middle'
    },
    headStyles: {
      fillColor: 'gray',
      textColor: 255,
      fontStyle: 'bold'
    },
    margin: { left: marginLeft, right: marginRight },
    tableWidth: 'auto'
  });

  let afterOrderInfoY = doc.lastAutoTable.finalY + 10;

  // =============================
  // 4. TABLEAU DES ARTICLES
  // =============================
  const itemsColumns = ["Produit", "BATCH NUMBER", "Quantité (Kg)", "Prix Unitaire", "Prix Total"];
  const itemsRows = [];
  let sumQuantity = 0, sumPrice = 0;

  items.forEach(item => {
    const produit = item.article
      ? [item.article.reference, item.article.specification, item.article.taille]
          .filter(Boolean).join(" - ")
      : '-';
    const batchNumber = item.lot?.batchNumber || '-';
    const quantite = parseFloat(item.quantiteKg) || 0;
    sumQuantity += quantite;

    const prixUnit = parseFloat(item.prixUnitaire) || 0;
    const prixTotal = parseFloat(item.prixTotal) || (prixUnit * quantite);
    sumPrice += prixTotal;

    itemsRows.push([
      produit,
      batchNumber,
      quantite.toFixed(2),
      prixUnit.toFixed(2),
      prixTotal.toFixed(2)
    ]);
  });

  // Ligne Totale dans le même tableau (fusion des 2 premières colonnes)
  itemsRows.push([
    { content: "TOTAL", colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
    sumQuantity.toFixed(2),
    "",
    sumPrice.toFixed(2)
  ]);

  doc.autoTable({
    startY: afterOrderInfoY,
    head: [itemsColumns],
    body: itemsRows,
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
  const signatureLineY = doc.lastAutoTable.finalY + 30; // Ajuste l'espacement selon besoin
  doc.setFontSize(9);
  doc.text("Visa pointeur Smcp", marginLeft, signatureLineY, { align: 'left' });
  doc.text("Visa du client", pageWidth / 2, signatureLineY, { align: 'center' });
  doc.text("Visa Responsable usine", pageWidth - marginRight, signatureLineY, { align: 'right' });

  // =============================
  // 6. PIED DE PAGE
  // =============================
  const footerY = 280;
  doc.setFontSize(8);
  doc.text("+222 38 53 64 89", marginLeft, footerY);
  doc.text("dg@afcomauritania.com", pageWidth / 2, footerY, { align: 'center' });
  doc.text("Port Autonome Nouadhibou, Nouadhibou Mauritanie", pageWidth - marginRight, footerY, { align: 'right' });

  // Sauvegarde du PDF
  doc.save(`bon_de_sortie_${commande.reference}.pdf`);
};


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
  doc.text("RC: 123456789", infoX, currentY);
  currentY += 5;
  doc.text("License: ABCD-1234", infoX, currentY);
  currentY += 5;
  doc.text("Address: 123 Example St, City", infoX, currentY);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text("COMMERCIAL INVOICE", pageWidth / 2, 20, { align: 'center' });
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
  const tableRows = [];
  let totalQuantityT = 0;
  let totalPrice = 0;
  commande.items.forEach(item => {
    const product = item.article
      ? [item.article.reference, item.article.specification].filter(Boolean).join(" ")
      : "-";
    const batchNumber = (item.lot && item.lot.batchNumber) ? item.lot.batchNumber : "-";
    const size = item.article?.taille || "-";
    const quantityKg = parseFloat(item.quantiteKg) || 0;
    const quantityT = quantityKg / 1000;
    totalQuantityT += quantityT;
    const unit = "T";
    const unitPrice = item.prixUnitaire ? parseFloat(item.prixUnitaire) : 0;
    const lineTotal = unitPrice * quantityKg;
    totalPrice += lineTotal;
    tableRows.push([
      product,
      batchNumber,
      size,
      unit,
      quantityT.toFixed(3),
      unitPrice.toFixed(2),
      lineTotal.toFixed(2)
    ]);
  });
  tableRows.push([
    { content: "TOTAL", colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
    { content: totalQuantityT.toFixed(3), styles: { halign: 'center', fontStyle: 'bold' } },
    "",
    { content: totalPrice.toFixed(2), styles: { halign: 'center', fontStyle: 'bold' } }
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
      5: { halign: 'center' },
      6: { halign: 'center' }
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
  doc.text("+222 38 53 64 89", marginLeft, footerY);
  doc.text("dg@afcomauritania.com", pageWidth / 2, footerY, { align: 'center' });
  doc.text("Port Autonome Nouadhibou, Nouadhibou Mauritanie", pageWidth - marginRight, footerY, { align: 'right' });
  doc.save(`invoice_${commande.reference}.pdf`);
};

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
  doc.text("RC: 123456789", infoX, currentY);
  currentY += 5;
  doc.text("License: ABCD-1234", infoX, currentY);
  currentY += 5;
  doc.text("Address: 123 Example St, City", infoX, currentY);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text("PRO FORMA INVOICE", pageWidth / 2, 20, { align: 'center' });
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
  const tableRows = [];
  let totalQuantityT = 0;
  let totalPrice = 0;
  commande.items.forEach(item => {
    const product = item.article
      ? [item.article.reference, item.article.specification].filter(Boolean).join(" ")
      : "-";
    const batchNumber = (item.lot && item.lot.batchNumber) ? item.lot.batchNumber : "-";
    const size = item.article?.taille || "-";
    const quantityKg = parseFloat(item.quantiteKg) || 0;
    const quantityT = quantityKg / 1000;
    totalQuantityT += quantityT;
    const unit = "T";
    const unitPrice = item.prixUnitaire ? parseFloat(item.prixUnitaire) : 0;
    const lineTotal = unitPrice * quantityKg;
    totalPrice += lineTotal;
    tableRows.push([
      product,
      batchNumber,
      size,
      unit,
      quantityT.toFixed(3),
      unitPrice.toFixed(2),
      lineTotal.toFixed(2)
    ]);
  });
  tableRows.push([
    { content: "TOTAL", colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
    { content: totalQuantityT.toFixed(3), styles: { halign: 'center', fontStyle: 'bold' } },
    "",
    { content: totalPrice.toFixed(2), styles: { halign: 'center', fontStyle: 'bold' } }
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
      5: { halign: 'center' },
      6: { halign: 'center' }
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
  doc.text("+222 38 53 64 89", marginLeft, footerY);
  doc.text("dg@afcomauritania.com", pageWidth / 2, footerY, { align: 'center' });
  doc.text("Port Autonome Nouadhibou, Nouadhibou Mauritanie", pageWidth - marginRight, footerY, { align: 'right' });
  doc.save(`invoice_${commande.reference}.pdf`);
};
