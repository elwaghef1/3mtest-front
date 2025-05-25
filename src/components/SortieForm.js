import React, { useState } from 'react';
import { Search, Package, AlertCircle, CheckCircle, History } from 'lucide-react';
import Button from './Button';
import FlashNotification from './FlashNotification';
import LivraisonPartielleModal from './LivraisonPartielleModal';
import sortieService from '../services/sortieService';

const SortieForm = ({ onSortieCreated, onCancel }) => {
  const [searchRef, setSearchRef] = useState('');
  const [commande, setCommande] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [typeLivraison, setTypeLivraison] = useState('COMPLETE');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showLivraisonModal, setShowLivraisonModal] = useState(false);

  const handleSearchCommande = async () => {
    if (!searchRef.trim()) {
      setNotification({
        type: 'error',
        message: 'Veuillez saisir une référence de commande'
      });
      return;
    }

    setSearchLoading(true);
    try {
      const commandeData = await sortieService.searchCommandeByRef(searchRef);
      console.log('🔍 Commande trouvée:', commandeData);
      console.log('📦 Items de la commande:', commandeData?.items);
      
      setCommande(commandeData);
      
      // Vérifier que la commande existe
      if (!commandeData) {
        setNotification({
          type: 'error',
          message: 'Aucune donnée de commande reçue du serveur.'
        });
        setCommande(null);
        setSelectedItems([]);
        return;
      }
      
      // Gérer les avertissements du backend si présents
      if (commandeData.warnings && commandeData.warnings.length > 0) {
        console.warn('⚠️ Avertissements du backend:', commandeData.warnings);
        setNotification({
          type: 'warning',
          message: `Commande ${commandeData.reference || 'trouvée'} avec avertissements: ${commandeData.warnings.join(', ')}`
        });
      }
      
      // Vérifier que la commande a des items - plus permissif maintenant
      if (!commandeData.items || !Array.isArray(commandeData.items)) {
        console.warn('⚠️ Items manquants ou invalides:', commandeData.items);
        // Ne plus rejeter la commande, juste afficher un avertissement
        setNotification({
          type: 'warning', 
          message: `Commande ${commandeData.reference || 'trouvée'} mais structure d'articles invalide. Tentative de récupération...`
        });
        setCommande(commandeData); // Garder la commande pour debug
        setSelectedItems([]);
        return;
      }
      
      if (commandeData.items.length === 0) {
        console.warn('⚠️ Aucun article trouvé dans la commande');
        setNotification({
          type: 'warning',
          message: `Commande ${commandeData.reference} trouvée mais ne contient aucun article valide.`
        });
        setCommande(commandeData);
        setSelectedItems([]);
        return;
      }
      
      // Initialiser les items sélectionnés avec toutes les quantités restantes disponibles
      const initialSelectedItems = commandeData.items
        .filter(item => {
          // Vérifier que l'item a les données minimales requises
          if (!item) return false;
          
          // Vérifier la quantité restante
          const quantiteRestante = item.quantiteRestante || 0;
          if (quantiteRestante <= 0) return false;
          
          // Vérifier que l'article et le dépôt existent (soit comme objet, soit comme ID)
          const hasArticle = item.article && (item.article._id || typeof item.article === 'string');
          const hasDepot = item.depot && (item.depot._id || typeof item.depot === 'string');
          
          return hasArticle && hasDepot;
        })
        .map(item => {
          // Extraire les IDs de manière sécurisée
          const articleId = typeof item.article === 'string' ? item.article : item.article?._id;
          const depotId = typeof item.depot === 'string' ? item.depot : item.depot?._id;
          
          // Extraire les noms de manière sécurisée
          const articleNom = item.articleNom || 
                           (typeof item.article === 'object' ? (item.article.intitule || item.article.nom) : null) || 
                           `Article ${articleId}`;
          
          const depotNom = item.depotNom || 
                          (typeof item.depot === 'object' ? (item.depot.intitule || item.depot.nom) : null) || 
                          `Dépôt ${depotId}`;
          
          return {
            article: articleId,
            depot: depotId,
            quantiteKg: item.quantiteRestante || 0,
            quantiteMax: item.quantiteRestante || 0,
            quantiteOriginale: item.quantiteKg || 0,
            quantiteLivree: item.quantiteLivree || 0,
            articleNom: articleNom,
            depotNom: depotNom,
            prixUnitaire: item.prixUnitaire || 0
          };
        });
      
      setSelectedItems(initialSelectedItems);
      
      if (commandeData.totalementLivree) {
        setNotification({
          type: 'warning',
          message: `Cette commande a été entièrement livrée (${commandeData.nombreLivraisonsExistantes} livraison(s) effectuée(s)). Aucun article n'est disponible pour livraison.`
        });
      } else if (initialSelectedItems.length === 0) {
        setNotification({
          type: 'warning',
          message: 'Aucun article disponible pour livraison dans cette commande.'
        });
      } else {
        const nombreArticlesTotal = commandeData.items.length;
        const message = nombreArticlesTotal > initialSelectedItems.length 
          ? `Commande trouvée! ${initialSelectedItems.length} sur ${nombreArticlesTotal} article(s) disponible(s) pour livraison.`
          : `Commande trouvée avec succès! ${initialSelectedItems.length} article(s) disponible(s) pour livraison.`;
        
        setNotification({
          type: 'success',
          message: message
        });
      }
    } catch (error) {
      console.error('Erreur lors de la recherche de commande:', error);
      
      let errorMessage = 'Erreur lors de la recherche de la commande';
      let errorType = 'error';
      
      if (error.response) {
        const { status, data } = error.response;
        
        switch (status) {
          case 404:
            errorMessage = data.message || 'Aucune commande trouvée avec cette référence';
            errorType = 'warning';
            
            // Afficher les suggestions si disponibles
            if (data.suggestions && data.suggestions.length > 0) {
              errorMessage += '\n\nRéférences similaires trouvées:\n' + 
                data.suggestions.map(s => `• ${s.reference}${s.client ? ` (${s.client})` : ''}`).join('\n');
            }
            break;
          case 400:
            if (data.code === 'NO_VALID_ITEMS') {
              errorMessage = data.message || 'Aucun article valide trouvé dans cette commande';
              errorType = 'warning';
              
              // Si on a des données de commande malgré l'erreur, les afficher
              if (data.commande) {
                console.log('📋 Données de commande disponibles malgré l\'erreur:', data.commande);
                setCommande(data.commande);
                setSelectedItems([]);
                
                errorMessage += `\n\nCommande ${data.commande.reference || 'trouvée'} avec des problèmes de structure.`;
                if (data.itemsInvalides && data.itemsInvalides.length > 0) {
                  errorMessage += `\n${data.itemsInvalides.length} article(s) invalide(s) détecté(s).`;
                }
              }
              
              // Afficher des informations de diagnostic si disponibles
              if (data.diagnostic) {
                errorMessage += '\n\n' + data.diagnostic.message;
                if (data.diagnostic.suggestion) {
                  errorMessage += '\nSuggestion: ' + data.diagnostic.suggestion;
                }
              }
            } else if (data.code === 'INVALID_ITEMS_STRUCTURE') {
              // Nouveau : traiter cette erreur comme récupérable
              errorMessage = data.message || 'Structure d\'articles invalide détectée';
              errorType = 'warning';
              
              if (data.commande) {
                console.log('📋 Commande avec structure invalide mais récupérable:', data.commande);
                setCommande(data.commande);
                setSelectedItems([]);
                errorMessage += `\n\nCommande ${data.commande.reference || 'trouvée'} nécessite une validation manuelle.`;
              }
            } else {
              errorMessage = data.message || 'Référence de commande invalide';
            }
            break;
          case 401:
            errorMessage = 'Vous devez être connecté pour effectuer cette recherche';
            break;
          case 403:
            errorMessage = 'Vous n\'avez pas les droits pour accéder à cette commande';
            break;
          case 500:
            errorMessage = data.message || 'Erreur interne du serveur. Veuillez réessayer.';
            break;
          default:
            errorMessage = data.message || `Erreur ${status}`;
        }
      } else if (error.request) {
        errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
      } else {
        errorMessage = error.message || 'Erreur inconnue lors de la recherche';
      }
      
      setNotification({
        type: errorType,
        message: errorMessage
      });
      setCommande(null);
      setSelectedItems([]);
    }
    setSearchLoading(false);
  };

  const handleQuantiteChange = (index, newQuantite) => {
    const updatedItems = [...selectedItems];
    updatedItems[index].quantiteKg = Math.min(Math.max(0, newQuantite), updatedItems[index].quantiteMax);
    setSelectedItems(updatedItems);
  };

  const handleItemToggle = (index) => {
    const updatedItems = [...selectedItems];
    if (updatedItems[index].quantiteKg === 0) {
      updatedItems[index].quantiteKg = updatedItems[index].quantiteMax;
    } else {
      updatedItems[index].quantiteKg = 0;
    }
    setSelectedItems(updatedItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const itemsToDeliver = selectedItems.filter(item => item.quantiteKg > 0);
    
    if (itemsToDeliver.length === 0) {
      setNotification({
        type: 'error',
        message: 'Veuillez sélectionner au moins un article à livrer'
      });
      return;
    }

    const sortieData = {
      commande: commande._id,
      items: itemsToDeliver.map(item => ({
        article: item.article,
        depot: item.depot,
        quantiteKg: item.quantiteKg
      })),
      typeLivraison,
      notes
    };

    setLoading(true);
    try {
      const result = await sortieService.createSortie(sortieData);
      setNotification({
        type: 'success',
        message: result.message || 'Sortie créée avec succès!'
      });
      
      // Réinitialiser le formulaire
      setSearchRef('');
      setCommande(null);
      setSelectedItems([]);
      setNotes('');
      
      if (onSortieCreated) {
        onSortieCreated(result.sortie);
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Erreur lors de la création de la sortie'
      });
    }
    setLoading(false);
  };

  const getTotalQuantite = () => {
    return selectedItems.reduce((total, item) => total + item.quantiteKg, 0);
  };

  const getTotalValue = () => {
    return selectedItems.reduce((total, item) => total + (item.quantiteKg * item.prixUnitaire), 0);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      {notification && (
        <FlashNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <Package className="mr-2" />
          Créer une Sortie
        </h2>
      </div>

      {/* Recherche de commande */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">
          1. Rechercher une commande
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={searchRef}
            onChange={(e) => setSearchRef(e.target.value)}
            placeholder="Référence de la commande (ex: CMD-001)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && handleSearchCommande()}
          />
          <Button
            onClick={handleSearchCommande}
            loading={searchLoading}
            leftIcon={<Search size={20} />}
            variant="primary"
          >
            Rechercher
          </Button>
        </div>
      </div>

      {/* Détails de la commande */}
      {commande && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            2. Détails de la commande
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p><strong>Référence:</strong> {commande.reference}</p>
                <p><strong>Client:</strong> {commande.client?.nom}</p>
                {commande.nombreLivraisonsExistantes > 0 && (
                  <div>
                    <p><strong>Livraisons précédentes:</strong> {commande.nombreLivraisonsExistantes}</p>
                    <Button
                      onClick={() => setShowLivraisonModal(true)}
                      variant="outline"
                      size="sm"
                      leftIcon={<History size={16} />}
                      className="mt-2"
                    >
                      Voir l'historique
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <p><strong>Statut:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    commande.statutBonDeCommande === 'LIVREE' ? 'bg-green-100 text-green-800' :
                    commande.statutBonDeCommande === 'INCOMPLET' ? 'bg-yellow-100 text-yellow-800' :
                    commande.statutBonDeCommande === 'PARTIELLEMENT_LIVREE' ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {commande.statutBonDeCommande}
                  </span>
                </p>
                <p><strong>Date:</strong> {new Date(commande.dateCommande).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Type de livraison */}
          <div className="mb-4">
            <h4 className="font-semibold text-gray-700 mb-2">Type de livraison</h4>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="COMPLETE"
                  checked={typeLivraison === 'COMPLETE'}
                  onChange={(e) => setTypeLivraison(e.target.value)}
                  className="mr-2"
                />
                Livraison complète
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="PARTIELLE"
                  checked={typeLivraison === 'PARTIELLE'}
                  onChange={(e) => setTypeLivraison(e.target.value)}
                  className="mr-2"
                />
                Livraison partielle
              </label>
            </div>
            
            {/* Message explicatif pour livraison partielle */}
            {typeLivraison === 'PARTIELLE' && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Livraison partielle sélectionnée :</strong> Utilisez l'interface avancée de livraison partielle 
                  qui vous permet de sélectionner précisément les quantités à livrer pour chaque article.
                </p>
                <Button
                  onClick={() => setShowLivraisonModal(true)}
                  variant="primary"
                  size="sm"
                  className="mt-2"
                  leftIcon={<Package size={16} />}
                >
                  Ouvrir l'interface de livraison partielle
                </Button>
              </div>
            )}
          </div>

          {/* Interface pour livraison complète seulement */}
          {typeLivraison === 'COMPLETE' && (
            <>
              {/* Liste des articles */}
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">
                  3. Sélectionner les articles à livrer
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 border text-left">Article</th>
                        <th className="px-4 py-2 border text-left">Dépôt</th>
                        <th className="px-4 py-2 border text-center">Qté originale</th>
                        <th className="px-4 py-2 border text-center">Déjà livrée</th>
                        <th className="px-4 py-2 border text-center">Qté restante</th>
                        <th className="px-4 py-2 border text-center">Qté à livrer</th>
                        <th className="px-4 py-2 border text-center">Prix unitaire</th>
                        <th className="px-4 py-2 border text-center">Total</th>
                        <th className="px-4 py-2 border text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.map((item, index) => (
                        <tr key={`${item.article}-${item.depot}`} className="hover:bg-gray-50">
                          <td className="px-4 py-2 border">{item.articleNom}</td>
                          <td className="px-4 py-2 border">{item.depotNom}</td>
                          <td className="px-4 py-2 border text-center">{item.quantiteOriginale?.toFixed(2)} kg</td>
                          <td className="px-4 py-2 border text-center">{item.quantiteLivree?.toFixed(2)} kg</td>
                          <td className="px-4 py-2 border text-center font-semibold text-blue-600">{item.quantiteMax?.toFixed(2)} kg</td>
                          <td className="px-4 py-2 border text-center">
                            <input
                              type="number"
                              min="0"
                              max={item.quantiteMax}
                              step="0.1"
                              value={item.quantiteKg}
                              onChange={(e) => handleQuantiteChange(index, parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border rounded text-center"
                            />
                          </td>
                          <td className="px-4 py-2 border text-center">{item.prixUnitaire?.toFixed(2)} €</td>
                          <td className="px-4 py-2 border text-center">
                            {(item.quantiteKg * item.prixUnitaire).toFixed(2)} €
                          </td>
                          <td className="px-4 py-2 border text-center">
                            <Button
                              onClick={() => handleItemToggle(index)}
                              variant={item.quantiteKg > 0 ? "danger" : "success"}
                              size="sm"
                            >
                              {item.quantiteKg > 0 ? 'Retirer' : 'Ajouter'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Résumé */}
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p><strong>Quantité totale à livrer:</strong> {getTotalQuantite().toFixed(2)} kg</p>
                  </div>
                  <div>
                    <p><strong>Valeur totale:</strong> {getTotalValue().toFixed(2)} €</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes de livraison (optionnel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Informations supplémentaires sur la livraison..."
                />
              </div>
            </>
          )}

          {/* Actions - seulement pour livraison complète */}
          {typeLivraison === 'COMPLETE' && (
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => {
                  if (onCancel) {
                    onCancel();
                  } else {
                    // Réinitialiser le formulaire si pas de fonction onCancel fournie
                    setSearchRef('');
                    setCommande(null);
                    setSelectedItems([]);
                    setNotes('');
                    setNotification(null);
                  }
                }}
                variant="secondary"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                loading={loading}
                leftIcon={<CheckCircle size={20} />}
                variant="primary"
                disabled={getTotalQuantite() === 0}
              >
                Créer la sortie
              </Button>
            </div>
          )}

          {/* Actions pour livraison partielle */}
          {typeLivraison === 'PARTIELLE' && (
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => {
                  if (onCancel) {
                    onCancel();
                  } else {
                    // Réinitialiser le formulaire si pas de fonction onCancel fournie
                    setSearchRef('');
                    setCommande(null);
                    setSelectedItems([]);
                    setNotes('');
                    setNotification(null);
                  }
                }}
                variant="secondary"
              >
                Annuler
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modal d'historique des livraisons partielles */}
      {showLivraisonModal && commande && (
        <LivraisonPartielleModal
          commande={commande}
          onClose={() => setShowLivraisonModal(false)}
          onLivraisonCreated={(livraison) => {
            setShowLivraisonModal(false);
            // Rafraîchir la commande pour mettre à jour les quantités
            handleSearchCommande();
            if (onSortieCreated) {
              onSortieCreated(livraison);
            }
          }}
          formatCurrency={(value) => `${(value || 0).toFixed(2)} €`}
          formatNumber={(value) => (value || 0).toLocaleString('fr-FR')}
        />
      )}
    </div>
  );
};

export default SortieForm;
