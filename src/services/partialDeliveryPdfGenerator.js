import jsPDF from 'jspdf';
import 'jspdf-autotable';
import logoBase64 from '../components/logoBase64';

export const generatePartialDeliveryInvoice = (commande, itemsLivres, infoLivraison) => {
  const doc = new jsPDF();
  
  // Configuration des couleurs
  const primaryColor = [41, 128, 185];
  const secondaryColor = [52, 73, 94];
  
  // En-tête avec logo
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 15, 10, 30, 20);
  }
  
  // Titre
  doc.setFontSize(20);
  doc.setTextColor(...primaryColor);
  doc.text('FACTURE DE LIVRAISON PARTIELLE', 105, 25, { align: 'center' });
  
  // Informations de la facture
  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);
  doc.text(`Référence livraison: ${infoLivraison.referenceLivraison}`, 15, 45);
  doc.text(`Date de livraison: ${new Date(infoLivraison.dateLivraison).toLocaleDateString('fr-FR')}`, 15, 50);
  doc.text(`Commande originale: ${commande.reference}`, 15, 55);
  
  // Informations client
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text('INFORMATIONS CLIENT', 15, 70);
  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);
  doc.text(`Raison sociale: ${commande.client?.raisonSociale || 'N/A'}`, 15, 80);
  doc.text(`Email: ${commande.client?.email || 'N/A'}`, 15, 85);
  doc.text(`Téléphone: ${commande.client?.telephone || 'N/A'}`, 15, 90);
  doc.text(`Adresse: ${commande.client?.adresse || 'N/A'}`, 15, 95);
  
  // Tableau des articles livrés
  const tableData = itemsLivres.map((item, index) => [
    index + 1,
    item.article?.intitule || 'N/A',
    item.lot?.batchNumber || 'N/A',
    `${item.quantiteLivree || 0} Kg`,
    `${item.prixUnitaire || 0} ${commande.currency || 'EUR'}`,
    `${(item.quantiteLivree * item.prixUnitaire) || 0} ${commande.currency || 'EUR'}`
  ]);
  
  doc.autoTable({
    startY: 105,
    head: [['#', 'Article', 'Lot', 'Quantité livrée', 'Prix unitaire', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { 
      fillColor: primaryColor,
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold'
    },
    bodyStyles: { fontSize: 8 },
    styles: {
      cellPadding: 3,
      lineColor: [220, 220, 220],
      lineWidth: 0.1
    }
  });
  
  // Totaux
  const finalY = doc.lastAutoTable.finalY + 10;
  const totalLivre = itemsLivres.reduce((sum, item) => sum + (item.quantiteLivree * item.prixUnitaire), 0);
  
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text(`Total livré: ${totalLivre.toFixed(2)} ${commande.currency || 'EUR'}`, 150, finalY);
  
  // Informations sur le reste de la commande
  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);
  doc.text(`Montant total commande: ${commande.prixTotal || 0} ${commande.currency || 'EUR'}`, 15, finalY + 15);
  doc.text(`Montant restant à livrer: ${((commande.prixTotal || 0) - totalLivre).toFixed(2)} ${commande.currency || 'EUR'}`, 15, finalY + 20);
  
  // Pied de page
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Cette facture concerne une livraison partielle de la commande mentionnée.', 105, 280, { align: 'center' });
  doc.text('Pour toute question, veuillez nous contacter.', 105, 285, { align: 'center' });
  
  return doc;
};

export const generatePartialDeliveryPackingList = (commande, itemsLivres, infoLivraison) => {
  const doc = new jsPDF();
  
  // Configuration des couleurs
  const primaryColor = [41, 128, 185];
  const secondaryColor = [52, 73, 94];
  
  // En-tête avec logo
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 15, 10, 30, 20);
  }
  
  // Titre
  doc.setFontSize(20);
  doc.setTextColor(...primaryColor);
  doc.text('PACKING LIST - LIVRAISON PARTIELLE', 105, 25, { align: 'center' });
  
  // Informations
  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);
  doc.text(`Référence livraison: ${infoLivraison.referenceLivraison}`, 15, 45);
  doc.text(`Date de livraison: ${new Date(infoLivraison.dateLivraison).toLocaleDateString('fr-FR')}`, 15, 50);
  doc.text(`Commande originale: ${commande.reference}`, 15, 55);
  doc.text(`Client: ${commande.client?.raisonSociale || 'N/A'}`, 15, 60);
  doc.text(`Destination: ${commande.destination || 'N/A'}`, 15, 65);
  
  // Tableau détaillé pour le packing
  const tableData = itemsLivres.map((item, index) => [
    index + 1,
    item.article?.intitule || 'N/A',
    item.article?.specification || 'N/A',
    item.lot?.batchNumber || 'N/A',
    `${item.quantiteLivree || 0} Kg`,
    `${(item.quantiteLivree / 20).toFixed(2)} Cartons`,
    item.article?.taille || 'N/A',
    item.article?.typeCarton || 'N/A'
  ]);
  
  doc.autoTable({
    startY: 80,
    head: [['#', 'Article', 'Spécification', 'Lot', 'Poids (Kg)', 'Cartons', 'Taille', 'Type Carton']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: primaryColor,
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: { fontSize: 7 },
    styles: {
      cellPadding: 2,
      lineColor: [100, 100, 100],
      lineWidth: 0.1
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
      6: { cellWidth: 15 },
      7: { cellWidth: 25 }
    }
  });
  
  // Totaux pour le packing
  const finalY = doc.lastAutoTable.finalY + 10;
  const totalPoids = itemsLivres.reduce((sum, item) => sum + (item.quantiteLivree || 0), 0);
  const totalCartons = itemsLivres.reduce((sum, item) => sum + (item.quantiteLivree / 20), 0);
  
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text(`Total poids: ${totalPoids.toFixed(2)} Kg`, 15, finalY);
  doc.text(`Total cartons: ${totalCartons.toFixed(2)}`, 15, finalY + 8);
  
  // Informations cargo si disponibles
  if (commande.cargo) {
    doc.text(`Cargo: ${commande.cargo}`, 15, finalY + 20);
  }
  if (commande.noDeConteneur) {
    doc.text(`Conteneur: ${commande.noDeConteneur}`, 15, finalY + 28);
  }
  
  // Pied de page
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Packing List pour livraison partielle - Vérifier les quantités lors de la réception', 105, 280, { align: 'center' });
  
  return doc;
};

export const generatePartialDeliveryBonDeSortie = (commande, itemsLivres, infoLivraison) => {
  const doc = new jsPDF();
  
  // Configuration des couleurs
  const primaryColor = [220, 53, 69]; // Rouge pour bon de sortie
  const secondaryColor = [52, 73, 94];
  
  // En-tête avec logo
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 15, 10, 30, 20);
  }
  
  // Titre
  doc.setFontSize(20);
  doc.setTextColor(...primaryColor);
  doc.text('BON DE SORTIE - LIVRAISON PARTIELLE', 105, 25, { align: 'center' });
  
  // Informations
  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);
  doc.text(`N° Bon de sortie: ${infoLivraison.referenceLivraison}`, 15, 45);
  doc.text(`Date de sortie: ${new Date(infoLivraison.dateLivraison).toLocaleDateString('fr-FR')}`, 15, 50);
  doc.text(`Commande: ${commande.reference}`, 15, 55);
  doc.text(`Client: ${commande.client?.raisonSociale || 'N/A'}`, 15, 60);
  doc.text(`Responsable: ${infoLivraison.responsable || 'N/A'}`, 15, 65);
  
  // Tableau des sorties
  const tableData = itemsLivres.map((item, index) => [
    index + 1,
    item.article?.intitule || 'N/A',
    item.lot?.batchNumber || 'N/A',
    item.depot?.intitule || 'N/A',
    `${item.quantiteLivree || 0} Kg`,
    `${(item.quantiteLivree / 20).toFixed(2)}`,
    '____________' // Signature responsable dépôt
  ]);
  
  doc.autoTable({
    startY: 80,
    head: [['#', 'Article', 'Lot', 'Dépôt', 'Quantité (Kg)', 'Cartons', 'Visa Responsable']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: primaryColor,
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold'
    },
    bodyStyles: { fontSize: 8 },
    styles: {
      cellPadding: 4,
      lineColor: [100, 100, 100],
      lineWidth: 0.2
    }
  });
  
  // Zone de signatures
  const finalY = doc.lastAutoTable.finalY + 20;
  
  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);
  doc.text('SIGNATURES:', 15, finalY);
  
  doc.text('Responsable Entrepôt:', 15, finalY + 15);
  doc.line(15, finalY + 25, 80, finalY + 25);
  doc.text('Date:', 15, finalY + 30);
  doc.line(30, finalY + 35, 80, finalY + 35);
  
  doc.text('Chauffeur/Transporteur:', 110, finalY + 15);
  doc.line(110, finalY + 25, 180, finalY + 25);
  doc.text('Date:', 110, finalY + 30);
  doc.line(125, finalY + 35, 180, finalY + 35);
  
  // Pied de page
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Bon de sortie pour livraison partielle - Document de contrôle interne', 105, 280, { align: 'center' });
  
  return doc;
};
