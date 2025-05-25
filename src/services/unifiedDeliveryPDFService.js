// Service unifié pour la génération de PDF de livraison
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Service unifié pour générer tous les documents PDF de livraison en un seul fichier robuste
 */
export class UnifiedDeliveryPDFService {
  
  constructor() {
    this.defaultOptions = {
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    };
  }

  /**
   * Génère un PDF unifié contenant tous les documents de livraison
   */
  generateUnifiedDeliveryPDF(commande, itemsLivres, infoLivraison, options = {}) {
    try {
      const doc = new jsPDF(this.defaultOptions);
      
      // Page 1: Bon de Sortie
      this.addBonDeSortiePage(doc, commande, itemsLivres, infoLivraison);
      
      // Page 2: Facture
      doc.addPage();
      this.addFacturePage(doc, commande, itemsLivres, infoLivraison);
      
      // Page 3: Packing List
      doc.addPage();
      this.addPackingListPage(doc, commande, itemsLivres, infoLivraison);
      
      // Page 4: Résumé de livraison
      doc.addPage();
      this.addResumePage(doc, commande, itemsLivres, infoLivraison);
      
      return doc;
    } catch (error) {
      console.error('Erreur lors de la génération du PDF unifié:', error);
      throw new Error(`Génération PDF échouée: ${error.message}`);
    }
  }

  /**
   * Page 1: Bon de Sortie
   */
  addBonDeSortiePage(doc, commande, itemsLivres, infoLivraison) {
    // En-tête
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('BON DE SORTIE', 105, 20, { align: 'center' });
    
    // Informations générales
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Référence: ${infoLivraison.referenceLivraison}`, 20, 40);
    doc.text(`Date: ${new Date(infoLivraison.dateLivraison).toLocaleDateString('fr-FR')}`, 20, 50);
    doc.text(`Commande: ${commande.reference}`, 20, 60);
    doc.text(`Client: ${commande.client?.raisonSociale || 'N/A'}`, 20, 70);
    
    // Tableau des articles
    const headers = ['Article', 'Dépôt', 'Quantité (kg)', 'Lot', 'Qualité'];
    const rows = itemsLivres.map(item => [
      item.article?.intitule || 'N/A',
      item.depot?.intitule || 'N/A',
      (item.quantiteLivree || 0).toFixed(2),
      item.lot?.batchNumber || 'N/A',
      item.qualite || 'Standard'
    ]);

    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 85,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    // Signatures
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.text('Responsable magasin:', 20, finalY);
    doc.text('Chauffeur:', 120, finalY);
    doc.line(20, finalY + 15, 80, finalY + 15);
    doc.line(120, finalY + 15, 180, finalY + 15);
  }

  /**
   * Page 2: Facture
   */
  addFacturePage(doc, commande, itemsLivres, infoLivraison) {
    // En-tête
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('FACTURE DE LIVRAISON', 105, 20, { align: 'center' });
    
    // Informations facture
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`N° Facture: ${infoLivraison.referenceLivraison}`, 20, 40);
    doc.text(`Date: ${new Date(infoLivraison.dateLivraison).toLocaleDateString('fr-FR')}`, 20, 50);
    
    // Informations client
    doc.text('FACTURER À:', 20, 70);
    doc.setFont(undefined, 'bold');
    doc.text(commande.client?.raisonSociale || 'Client N/A', 20, 80);
    doc.setFont(undefined, 'normal');
    doc.text(commande.client?.adresse || '', 20, 90);
    
    // Tableau détaillé avec prix
    const headers = ['Article', 'Quantité (kg)', 'Prix unitaire', 'Total'];
    const rows = itemsLivres.map(item => {
      const prixUnitaire = item.prixUnitaire || 0;
      const total = (item.quantiteLivree || 0) * prixUnitaire;
      return [
        item.article?.intitule || 'N/A',
        (item.quantiteLivree || 0).toFixed(2),
        this.formatCurrency(prixUnitaire),
        this.formatCurrency(total)
      ];
    });

    // Ajouter ligne de total
    const totalGeneral = itemsLivres.reduce((sum, item) => 
      sum + ((item.quantiteLivree || 0) * (item.prixUnitaire || 0)), 0);
    
    rows.push(['', '', 'TOTAL', this.formatCurrency(totalGeneral)]);

    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 105,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 139, 202] },
      footStyles: { fillColor: [220, 220, 220], fontStyle: 'bold' }
    });
  }

  /**
   * Page 3: Packing List
   */
  addPackingListPage(doc, commande, itemsLivres, infoLivraison) {
    // En-tête
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('PACKING LIST', 105, 20, { align: 'center' });
    
    // Informations générales
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Référence: ${infoLivraison.referenceLivraison}`, 20, 40);
    doc.text(`Date: ${new Date(infoLivraison.dateLivraison).toLocaleDateString('fr-FR')}`, 20, 50);
    doc.text(`Destinataire: ${commande.client?.raisonSociale || 'N/A'}`, 20, 60);
    
    // Tableau détaillé pour transport
    const headers = ['N°', 'Description', 'Quantité (kg)', 'Cartons', 'Observations'];
    const rows = itemsLivres.map((item, index) => [
      (index + 1).toString(),
      `${item.article?.intitule || 'N/A'} - ${item.article?.specification || ''}`,
      (item.quantiteLivree || 0).toFixed(2),
      Math.ceil((item.quantiteLivree || 0) / 25).toString(), // Estimation cartons
      item.qualite || 'Standard'
    ]);

    // Totaux
    const totalKg = itemsLivres.reduce((sum, item) => sum + (item.quantiteLivree || 0), 0);
    const totalCartons = itemsLivres.reduce((sum, item) => 
      sum + Math.ceil((item.quantiteLivree || 0) / 25), 0);
    
    rows.push(['', 'TOTAL', totalKg.toFixed(2), totalCartons.toString(), '']);

    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 75,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 139, 202] },
      footStyles: { fillColor: [220, 220, 220], fontStyle: 'bold' }
    });

    // Instructions de transport
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFont(undefined, 'bold');
    doc.text('INSTRUCTIONS DE TRANSPORT:', 20, finalY);
    doc.setFont(undefined, 'normal');
    doc.text('- Maintenir la chaîne du froid', 20, finalY + 10);
    doc.text('- Livraison en priorité', 20, finalY + 20);
    doc.text('- Vérifier l\'état des cartons', 20, finalY + 30);
  }

  /**
   * Page 4: Résumé de livraison
   */
  addResumePage(doc, commande, itemsLivres, infoLivraison) {
    // En-tête
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('RÉSUMÉ DE LIVRAISON', 105, 20, { align: 'center' });
    
    // Informations de la commande originale
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('COMMANDE ORIGINALE', 20, 45);
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Référence: ${commande.reference}`, 20, 60);
    doc.text(`Client: ${commande.client?.raisonSociale || 'N/A'}`, 20, 70);
    doc.text(`Date commande: ${new Date(commande.createdAt).toLocaleDateString('fr-FR')}`, 20, 80);

    // Statistiques de livraison
    doc.setFont(undefined, 'bold');
    doc.text('STATISTIQUES DE LIVRAISON', 20, 105);
    
    doc.setFont(undefined, 'normal');
    const totalCommandeKg = commande.items?.reduce((sum, item) => sum + (item.quantiteKg || 0), 0) || 0;
    const totalLivreKg = itemsLivres.reduce((sum, item) => sum + (item.quantiteLivree || 0), 0);
    const pourcentageLivre = totalCommandeKg > 0 ? ((totalLivreKg / totalCommandeKg) * 100).toFixed(1) : 0;
    
    doc.text(`Quantité totale commandée: ${totalCommandeKg.toFixed(2)} kg`, 20, 120);
    doc.text(`Quantité livrée: ${totalLivreKg.toFixed(2)} kg`, 20, 130);
    doc.text(`Pourcentage livré: ${pourcentageLivre}%`, 20, 140);
    doc.text(`Articles dans cette livraison: ${itemsLivres.length}`, 20, 150);

    // État de la commande
    doc.setFont(undefined, 'bold');
    doc.text('ÉTAT DE LA COMMANDE', 20, 175);
    
    doc.setFont(undefined, 'normal');
    const statutTexte = totalLivreKg >= totalCommandeKg ? 'ENTIÈREMENT LIVRÉE' : 'PARTIELLEMENT LIVRÉE';
    doc.text(`Statut: ${statutTexte}`, 20, 190);
    
    if (totalLivreKg < totalCommandeKg) {
      const restantKg = totalCommandeKg - totalLivreKg;
      doc.text(`Quantité restante: ${restantKg.toFixed(2)} kg`, 20, 200);
    }

    // Note de bas de page
    doc.setFontSize(8);
    doc.text(`Document généré le ${new Date().toLocaleString('fr-FR')}`, 20, 280);
  }

  /**
   * Utilitaire pour formater les devises
   */
  formatCurrency(amount, currency = 'MRU') {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount || 0);
  }

  /**
   * Génère et télécharge le PDF unifié
   */
  downloadUnifiedPDF(commande, itemsLivres, infoLivraison, filename = null) {
    try {
      const doc = this.generateUnifiedDeliveryPDF(commande, itemsLivres, infoLivraison);
      const defaultFilename = `Livraison_Complete_${infoLivraison.referenceLivraison}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename || defaultFilename);
      
      console.log('✅ PDF unifié généré et téléchargé avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors du téléchargement du PDF:', error);
      return false;
    }
  }
}

// Instance singleton
export const unifiedPDFService = new UnifiedDeliveryPDFService();

// Export des fonctions pour rétro-compatibilité
export const generateUnifiedDeliveryPDF = (commande, itemsLivres, infoLivraison) => {
  return unifiedPDFService.generateUnifiedDeliveryPDF(commande, itemsLivres, infoLivraison);
};

export const downloadUnifiedDeliveryPDF = (commande, itemsLivres, infoLivraison, filename) => {
  return unifiedPDFService.downloadUnifiedPDF(commande, itemsLivres, infoLivraison, filename);
};
