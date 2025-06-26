// frontend/src/services/cargoPackingListGenerator.js
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getCartonQuantityFromKg } from '../utils/cartonsUtils';

// Logo base64 (vous pouvez remplacer par votre vrai logo)
const logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

export const generateCargoPackingListPDF = (commande, cargo) => {
  const doc = new jsPDF();
  
  // Configuration des couleurs
  const primaryColor = [41, 128, 185];
  const secondaryColor = [52, 73, 94];
  
  // En-tête avec logo
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 15, 10, 30, 20);
  }
  
  // Titre
  doc.setFontSize(18);
  doc.setTextColor(...primaryColor);
  doc.text('PACKING LIST', 105, 25, { align: 'center' });
  
  // Informations générales
  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);
  doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 15, 45);
  doc.text(`Commande: ${commande.reference}`, 15, 50);
  doc.text(`Client: ${commande.client?.raisonSociale || 'N/A'}`, 15, 55);
  
  if (commande.typeCommande !== 'LOCALE') {
    doc.text(`Destination: ${commande.destination || 'N/A'}`, 15, 60);
    doc.text(`Booking: ${commande.numeroBooking || 'N/A'}`, 15, 65);
  }
  
  // Informations conteneur
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text('CONTAINER INFORMATION', 15, 80);
  
  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);
  doc.text(`Container N°: ${cargo.noDeConteneur || 'N/A'}`, 15, 90);
  doc.text(`Seal Number: ${cargo.noPlomb || 'N/A'}`, 15, 95);
  doc.text(`Tare Weight: ${cargo.areDeConteneur || 'N/A'}`, 15, 100);
  
  // Tableau principal - selon le format demandé
  const tableHeaders = [
    'Container N°',
    'Seal Number', 
    'Marks',
    'SIZE',
    'Prod. Date',
    'Expiry Date',
    'Num of Box',
    'Net Weight',
    'Gross Weight'
  ];
  
  let totalBoxes = 0;
  let totalNetWeight = 0;
  let totalGrossWeight = 0;
  
  const tableData = [];
  
  if (cargo.itemsAlloues && cargo.itemsAlloues.length > 0) {
    cargo.itemsAlloues.forEach((item) => {
      const article = item.article;
      const quantiteKg = parseFloat(item.quantiteAllouee) || 0;
      const numBox = Math.ceil(getCartonQuantityFromKg(quantiteKg, article)); // Utilise le kg par carton de l'article
      const poidsCarton = parseFloat(cargo.poidsCarton) || 1.12; // poids d'un carton vide
      const grossWeight = quantiteKg + (poidsCarton * numBox);
      
      // Accumulation des totaux
      totalBoxes += numBox;
      totalNetWeight += quantiteKg;
      totalGrossWeight += grossWeight;
      
      // Construction du marks (nom du produit)
      const marks = [
        article?.reference || 'N/A',
        article?.specification || '',
        article?.taille ? `(SIZE ${article.taille})` : ''
      ].filter(Boolean).join('\n');
      
      tableData.push([
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
  
  // Ligne Total
  if (tableData.length > 0) {
    tableData.push([
      { content: 'Total', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: totalBoxes.toString(), styles: { fontStyle: 'bold' } },
      { content: totalNetWeight.toLocaleString(), styles: { fontStyle: 'bold' } },
      { content: totalGrossWeight.toLocaleString(), styles: { fontStyle: 'bold' } }
    ]);
  }
  
  // Génération du tableau
  doc.autoTable({
    startY: 110,
    head: [tableHeaders],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: primaryColor,
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: { 
      fontSize: 8,
      cellPadding: 2
    },
    styles: {
      lineColor: [100, 100, 100],
      lineWidth: 0.1
    },
    columnStyles: {
      0: { cellWidth: 25 }, // Container N°
      1: { cellWidth: 20 }, // Seal Number
      2: { cellWidth: 30 }, // Marks
      3: { cellWidth: 15 }, // SIZE
      4: { cellWidth: 20 }, // Prod. Date
      5: { cellWidth: 20 }, // Expiry Date
      6: { cellWidth: 18 }, // Num of Box
      7: { cellWidth: 20 }, // Net Weight
      8: { cellWidth: 22 }  // Gross Weight
    }
  });
  
  // Informations supplémentaires en bas
  const finalY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);
  
  if (commande.conditionsDeVente) {
    doc.text('Conditions:', 15, finalY);
    const lines = doc.splitTextToSize(commande.conditionsDeVente, 180);
    doc.text(lines, 15, finalY + 5);
  }
  
  // Pied de page
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Packing List - ${cargo.nom} - ${new Date().toLocaleDateString('fr-FR')}`, 105, 280, { align: 'center' });
  
  return doc;
};

// Fonction pour générer toutes les packing lists d'une commande
export const generateAllCargoPackingLists = (commande) => {
  const docs = [];
  
  if (commande.cargo && commande.cargo.length > 0) {
    commande.cargo.forEach((cargo, index) => {
      if (cargo.itemsAlloues && cargo.itemsAlloues.length > 0) {
        const doc = generateCargoPackingListPDF(commande, cargo);
        docs.push({
          doc,
          filename: `PackingList_${commande.reference}_${cargo.nom || `Cargo${index + 1}`}.pdf`,
          cargoName: cargo.nom || `Cargo ${index + 1}`
        });
      }
    });
  }
  
  return docs;
};

// Fonction pour télécharger une packing list de cargo spécifique
export const downloadCargoPackingList = (commande, cargoIndex) => {
  if (!commande.cargo || !commande.cargo[cargoIndex]) {
    alert('Cargo non trouvé');
    return;
  }
  
  const cargo = commande.cargo[cargoIndex];
  const doc = generateCargoPackingListPDF(commande, cargo);
  const filename = `PackingList_${commande.reference}_${cargo.nom || `Cargo${cargoIndex + 1}`}.pdf`;
  
  doc.save(filename);
};

// Fonction pour télécharger toutes les packing lists
export const downloadAllCargoPackingLists = (commande) => {
  const docs = generateAllCargoPackingLists(commande);
  
  if (docs.length === 0) {
    alert('Aucun cargo avec articles alloués trouvé');
    return;
  }
  
  // Télécharger chaque document séparément
  docs.forEach(({ doc, filename }) => {
    doc.save(filename);
  });
  
  alert(`${docs.length} packing list(s) téléchargée(s)`);
};
