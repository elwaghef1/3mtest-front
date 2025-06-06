import api from '../api/axios';

class SortieService {
  // Rechercher une commande par référence
  async searchCommandeByRef(reference) {
    try {
      const response = await api.get(`/sorties/search-commande/${reference}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la recherche de commande:', error);
      throw error;
    }
  }

  // Créer une sortie avec livraison partielle ou complète
  async createSortie(sortieData) {
    try {
      const response = await api.post('/sorties', sortieData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création de la sortie:', error);
      throw error;
    }
  }

  // Obtenir toutes les sorties
  async getAllSorties() {
    try {
      const response = await api.get('/sorties');
      // Le backend retourne { success: true, data: [...], pagination: {...}, statistiques: {...} }
      // On extrait le tableau des sorties de la propriété 'data'
      return response.data.data || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des sorties:', error);
      throw error;
    }
  }

  // Obtenir une sortie par ID
  async getSortieById(id) {
    try {
      const response = await api.get(`/sorties/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération de la sortie:', error);
      throw error;
    }
  }

  // Obtenir les sorties d'une commande
  async getSortiesByCommande(commandeId) {
    try {
      const response = await api.get(`/sorties/commande/${commandeId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des sorties de la commande:', error);
      throw error;
    }
  }

  // Créer une livraison partielle (crée automatiquement une commande dérivée + sortie)
  async createLivraisonPartielle(commandeId, livraisonData) {
    try {
      const response = await api.post(`/commandes/${commandeId}/livraison-partielle`, livraisonData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création de la livraison partielle:', error);
      throw error;
    }
  }
}

export default new SortieService();
