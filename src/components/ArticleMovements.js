import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import Button from './Button';
import Pagination from './Pagination';

// Icônes pour les différents types de mouvements
const MovementIcons = {
  ENTREE: '📦',
  SORTIE: '📤', 
  TRANSFERT_SORTIE: '➡️',
  TRANSFERT_ENTREE: '⬅️',
  COMMANDE: '🛒',
  AJUSTEMENT: '⚖️'
};

const MovementColors = {
  ENTREE: 'bg-green-50 border-green-200 text-green-800',
  SORTIE: 'bg-red-50 border-red-200 text-red-800',
  TRANSFERT_SORTIE: 'bg-orange-50 border-orange-200 text-orange-800',
  TRANSFERT_ENTREE: 'bg-blue-50 border-blue-200 text-blue-800',
  COMMANDE: 'bg-purple-50 border-purple-200 text-purple-800',
  AJUSTEMENT: 'bg-yellow-50 border-yellow-200 text-yellow-800'
};

function ArticleMovements() {
  const { articleId } = useParams();
  const navigate = useNavigate();
  
  const [article, setArticle] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [movements, setMovements] = useState([]);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [articleId, currentPage, pageLimit]);

  // Gestionnaire pour le changement de taille de page
  const handleItemsPerPageChange = (newLimit) => {
    setPageLimit(newLimit);
    setCurrentPage(1); // Retour à la page 1 quand on change la taille
  };

  const fetchData = async (page = currentPage, limit = pageLimit) => {
    try {
      setLoading(true);
      setError(null);
      
      // Charger les données en parallèle
      const [articleRes, stocksRes, movementsRes] = await Promise.all([
        axios.get(`/articles/${articleId}`),
        axios.get(`/stock?article=${articleId}`),
        axios.get(`/articles/${articleId}/mouvements?page=${page}&limit=${limit}`)
      ]);

      setArticle(articleRes.data);
      setStocks(stocksRes.data);
      
      // Récupérer les mouvements et s'assurer qu'ils sont triés par date décroissante
      let movementsData = movementsRes.data.movements || movementsRes.data;
      
      // Tri rigoureux côté frontend (plus récent en premier)
      if (Array.isArray(movementsData)) {
        movementsData = movementsData.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          
          // Tri décroissant : plus récent en premier (dateB - dateA)
          return dateB.getTime() - dateA.getTime();
        });
        
        console.log('Mouvements triés par date:', movementsData.slice(0, 3).map(m => ({
          type: m.type,
          date: m.date,
          formattedDate: new Date(m.date).toLocaleString('fr-FR')
        })));
      }
      
      setMovements(movementsData);
      setPagination(movementsRes.data.pagination || {});
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatQuantity = (qty) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(qty);
  };

  const getMovementDescription = (movement) => {
    // Si le backend fournit déjà une description, l'utiliser directement
    if (movement.description) {
      return movement.description;
    }
    
    // Fallback pour les cas où la description n'est pas fournie
    switch (movement.type) {
      case 'ENTREE':
        return `Entrée de stock - ${movement.origine || 'Approvisionnement'}`;
      case 'SORTIE':
        return `Sortie de stock - Livraison`;
      case 'TRANSFERT_SORTIE':
      case 'TRANSFERT_ENTREE':
        return `Transfert: ${movement.depotDepart?.intitule || 'Dépôt'} → ${movement.depotArrivee?.intitule || 'Dépôt'}`;
      case 'COMMANDE':
        return `Commande ${movement.commandeReference || ''}`;
      case 'AJUSTEMENT':
        return `Ajustement de stock`;
      default:
        return 'Mouvement de stock';
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <Button onClick={() => navigate('/articles')} variant="secondary" className="mt-4">
          Retour à la liste
        </Button>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">Article non trouvé</p>
        <Button onClick={() => navigate('/articles')} variant="secondary" className="mt-4">
          Retour à la liste
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec informations de l'article */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Mouvements - {article.intitule}
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Référence:</span> {article.reference}
              </div>
              <div>
                <span className="font-medium">Nom scientifique:</span> {article.nomScientifique || '—'}
              </div>
              <div>
                <span className="font-medium">Taille:</span> {article.taille || '—'}
              </div>
            </div>
          </div>
          <Button onClick={() => navigate('/articles')} variant="secondary">
            Retour à la liste
          </Button>
        </div>
      </div>

      {/* Bannières de stock par dépôt */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stocks.map((stock) => (
          <div key={stock._id} className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">
                {stock.depot?.intitule || 'Dépôt inconnu'}
              </h3>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                📍 {stock.depot?.ville || 'Ville'}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Stock total:</span>
                <span className="font-bold text-lg text-gray-900">
                  {formatQuantity(stock.quantiteKg)} kg
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Stock commercialisable:</span>
                <span className="font-bold text-lg text-green-600">
                  {formatQuantity(stock.quantiteCommercialisableKg)} kg
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Valeur moyenne:</span>
                <span className="font-medium text-gray-900">
                  {formatQuantity(stock.valeur || 0)} {stock.monnaie || 'MRU'}
                </span>
              </div>
            </div>
            
            {/* Barre de progression du stock */}
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(100, (stock.quantiteCommercialisableKg / Math.max(stock.quantiteKg, 1)) * 100)}%` 
                  }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1 text-center">
                {Math.round((stock.quantiteCommercialisableKg / Math.max(stock.quantiteKg, 1)) * 100)}% disponible
              </div>
            </div>
          </div>
        ))}
        
        {stocks.length === 0 && (
          <div className="col-span-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <div className="text-gray-400 text-4xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun stock trouvé</h3>
            <p className="text-gray-500">Cet article n'a pas encore de stock dans les dépôts.</p>
          </div>
        )}
      </div>

      {/* Historique des mouvements */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              📊 Historique des mouvements
            </h2>
            <div className="flex items-center text-sm text-gray-500">
              <span className="mr-2">📅 Ordre chronologique</span>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                🕒 Plus récent → Plus ancien
              </span>
            </div>
          </div>
          {movements && movements.length > 0 && (
            <div className="mt-2 text-sm text-gray-600 flex items-center">
              <span className="mr-4">{pagination.total || movements.length} mouvements au total</span>
              {movements.length > 0 && (
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  Du {formatDate(movements[movements.length - 1]?.date)} au {formatDate(movements[0]?.date)}
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="p-4">
          {movements && movements.length > 0 ? (
            <>
              <div className="space-y-2">
                {movements.map((movement, index) => {
                  const globalIndex = ((pagination.current || 1) - 1) * (pagination.limit || pageLimit) + index + 1;
                  return (
                    <div 
                      key={index} 
                      className={`p-3 rounded-md border ${MovementColors[movement.type] || 'bg-gray-50 border-gray-200 text-gray-800'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          {/* Numéro d'ordre chronologique */}
                          <div className="text-xs bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center font-medium">
                            {globalIndex}
                          </div>
                          
                          {/* Icône du type de mouvement */}
                          <div className="text-base">
                            {MovementIcons[movement.type] || '📋'}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {getMovementDescription(movement)}
                            </div>
                            <div className="text-xs opacity-75 flex items-center space-x-3 mt-1">
                              <span>📅 {formatDate(movement.date)}</span>
                              <span>📍 {movement.depot?.intitule || 'Non spécifié'}</span>
                              {movement.reference && (
                                <span>🔗 {movement.reference}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right ml-3">
                          <div className="text-sm font-bold">
                            {movement.quantite > 0 ? '+' : ''}{formatQuantity(movement.quantite)} kg
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Pagination avec composant standard */}
              {(pagination.pages > 1 || movements.length > 10) && (
                <div className="mt-6 border-t pt-4">
                  <Pagination
                    currentPage={pagination.current || 1}
                    totalPages={pagination.pages || 1}
                    totalItems={pagination.total || movements.length}
                    itemsPerPage={pagination.limit || pageLimit}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={handleItemsPerPageChange}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun mouvement trouvé</h3>
              <p className="text-gray-500">
                Aucun mouvement de stock n'a été enregistré pour cet article.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ArticleMovements;
