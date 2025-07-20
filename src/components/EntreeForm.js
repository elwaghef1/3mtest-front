// frontend/src/components/EntreeForm.js
import React, { useEffect, useState, useMemo } from 'react';
import axios from '../api/axios';
import Button from './Button';
import PriceCalculatorModal from './PriceCalculatorModal';
import { convertKgToCarton, calculateKgFromCartons } from '../utils/cartonsUtils';

function EntreeForm({ onClose, onEntreeCreated, initialEntree }) {
  const [depots, setDepots] = useState([]);
  const [articles, setArticles] = useState([]);
  
  const [depotId, setDepotId] = useState('');
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  // Champ "block" supprimé
  const [origine, setOrigine] = useState(''); // Par défaut vide
  
  // État global pour le calcul de prix de l'entrée
  const [globalPriceCalculation, setGlobalPriceCalculation] = useState({
    prixUnitaireFinal: 0,
    calculationData: null
  });
  
  // Tableau d'items (chaque item correspond à un article)
  const [items, setItems] = useState([
    {
      article: '',
      quantiteKg: '',
      quantiteTunnel: '',
      // Champ "qualité" supprimé
      prixUnitaire: '',
      // Par défaut, la monnaie est MRU
      monnaie: 'MRU',
      // Le champ Prix Location n'est plus obligatoire
      prixLocation: '',
      quantiteCarton: 0,
    },
  ]);
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Calcul du résumé en temps réel
  const resumeQuantites = useMemo(() => {
    const validItems = items.filter(item => 
      item.article && 
      (
        (item.quantiteKg !== '' && parseFloat(item.quantiteKg) >= 0) ||
        (item.quantiteCarton && parseFloat(item.quantiteCarton) > 0) ||
        (item.quantiteTunnel && parseFloat(item.quantiteTunnel) > 0)
      )
    );

    let totalKg = 0;
    let totalCartons = 0;
    let totalTunnel = 0;
    let totalValeur = 0;
    let articlesTraites = 0;

    validItems.forEach(item => {
      const article = articles.find(a => a._id === item.article);
      if (article) {
        const kg = parseFloat(item.quantiteKg) || 0;
        const cartons = parseFloat(item.quantiteCarton) || 0;
        const tunnel = parseFloat(item.quantiteTunnel) || 0;
        const prix = parseFloat(item.prixUnitaire) || 0;
        
        // Utiliser la quantité en kg si disponible (même si 0), sinon convertir depuis cartons
        const quantiteKgFinal = item.quantiteKg !== '' ? kg : calculateKgFromCartons(cartons, article);
        const quantiteCartonsFinal = cartons > 0 ? cartons : convertKgToCarton(kg, article);
        
        totalKg += quantiteKgFinal;
        totalCartons += quantiteCartonsFinal;
        totalTunnel += tunnel;
        totalValeur += quantiteKgFinal * prix;
        articlesTraites++;
      }
    });

    return {
      totalKg: totalKg.toFixed(2),
      totalCartons: totalCartons.toFixed(2),
      totalTunnel: totalTunnel.toFixed(2),
      totalValeur: totalValeur.toFixed(2),
      articlesTraites,
      totalArticles: items.length
    };
  }, [items, articles]);

  // Récupération des dépôts et articles
  useEffect(() => {
    fetchDepots();
    fetchArticles();
  }, []);

  // Pré-remplissage en cas d'édition (une fois que les articles sont chargés)
  useEffect(() => {
    if (initialEntree && articles.length > 0) {
      setDepotId(initialEntree.depot?._id || initialEntree.depot);
      setOrigine(initialEntree.origine || '');
      
      // Récupération des données de calcul global
      if (initialEntree.globalPriceCalculation) {
        setGlobalPriceCalculation(initialEntree.globalPriceCalculation);
      }
      
      const initialItems = (initialEntree.items || []).map((item) => {
        const articleData = articles.find(a => a._id === (item.article?._id || item.article));
        return {
          article: item.article?._id || item.article,
          quantiteKg: item.quantiteKg || '',
          quantiteTunnel: item.quantiteTunnel || '',
          prixUnitaire: item.prixUnitaire || '',
          monnaie: item.monnaie || 'MRU',
          prixLocation: item.prixLocation || '',
          quantiteCarton: articleData ? convertKgToCarton(item.quantiteKg, articleData) : 0,
        };
      });
      setItems(initialItems);
    }
  }, [initialEntree, articles]);

  // Fonction pour gérer le calcul global de prix
  const handleGlobalPriceCalculation = (calculatedPrice, calculationData) => {
    setGlobalPriceCalculation({
      prixUnitaireFinal: calculatedPrice,
      calculationData: calculationData
    });
    
    // Appliquer le prix calculé à tous les articles existants
    const newItems = items.map(item => ({
      ...item,
      prixUnitaire: calculatedPrice.toFixed(2)
    }));
    setItems(newItems);
  };

  const sortedArticles = useMemo(
    () =>
      [...articles].sort((a, b) =>
        a.reference.localeCompare(b.reference, 'fr', { sensitivity: 'base' })
      ),
    [articles]
  );
  
  const fetchDepots = async () => {
    try {
      const res = await axios.get('/depots');
      setDepots(res.data);
    } catch (err) {
      console.error('Erreur fetch depots:', err);
    }
  };
  
  const fetchArticles = async () => {
    try {
      const res = await axios.get('/articles');
      setArticles(res.data);
    } catch (err) {
      console.error('Erreur fetch articles:', err);
    }
  };
  
  // Mise à jour d'un item
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    const articleId = field === 'article' ? value : newItems[index].article;
    const selectedArticle = articles.find(a => a._id === articleId);
    
    if (field === 'quantiteKg') {
      const kg = parseFloat(value) || 0;
      newItems[index]['quantiteCarton'] = convertKgToCarton(kg, selectedArticle);
    } else if (field === 'quantiteCarton') {
      const cartons = parseFloat(value) || 0;
      newItems[index]['quantiteKg'] = calculateKgFromCartons(cartons, selectedArticle);
    } else if (field === 'article' && selectedArticle) {
      // Recalculer les cartons quand l'article change (en gardant les kg)
      const kg = parseFloat(newItems[index]['quantiteKg']) || 0;
      if (newItems[index]['quantiteKg'] !== '') {
        newItems[index]['quantiteCarton'] = convertKgToCarton(kg, selectedArticle);
      }
    }
    
    setItems(newItems);
  };
  
  const addItem = () => {
    setItems([
      ...items,
      {
        article: '',
        quantiteKg: '',
        quantiteTunnel: '',
        prixUnitaire: globalPriceCalculation.prixUnitaireFinal > 0 ? globalPriceCalculation.prixUnitaireFinal.toFixed(2) : '',
        monnaie: 'MRU',
        prixLocation: '',
        quantiteCarton: 0,
      },
    ]);
  };
  
  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    
    try {
      // Validation des items
      const validItems = items.filter(item => 
        item.article && 
        (
          (item.quantiteKg !== '' && parseFloat(item.quantiteKg) >= 0) ||
          (item.quantiteCarton && parseFloat(item.quantiteCarton) > 0) ||
          (item.quantiteTunnel && parseFloat(item.quantiteTunnel) > 0)
        ) &&
        item.prixUnitaire &&
        parseFloat(item.prixUnitaire) > 0
      );

      if (validItems.length === 0) {
        setErrorMessage("Veuillez remplir au moins un article avec une quantité (kg, cartons ou tunnel) et un prix valides.");
        setLoading(false);
        return;
      }

      // Préparation des données
      const payload = {
        depot: depotId,
        origine,
        globalPriceCalculation: globalPriceCalculation.calculationData ? globalPriceCalculation : null,
        items: validItems.map((item) => {
          // S'assurer qu'on a une quantité en kg, soit directement soit par conversion
          let quantiteKg = item.quantiteKg !== '' ? parseFloat(item.quantiteKg) : 0;
          if (quantiteKg === 0 && item.quantiteCarton && parseFloat(item.quantiteCarton) > 0) {
            const selectedArticle = articles.find(a => a._id === item.article);
            quantiteKg = calculateKgFromCartons(parseFloat(item.quantiteCarton), selectedArticle);
          }
          
          return {
            article: item.article,
            quantiteKg: quantiteKg,
            quantiteTunnel: item.quantiteTunnel ? parseFloat(item.quantiteTunnel) : undefined,
            prixUnitaire: parseFloat(item.prixUnitaire),
            monnaie: item.monnaie,
            prixLocation: item.prixLocation ? parseFloat(item.prixLocation) : undefined,
          };
        }),
      };

      // Soumission directe des données
      if (initialEntree) {
        await axios.put(`/entrees/${initialEntree._id}`, payload);
      } else {
        await axios.post('/entrees', payload);
      }
      
      // Succès - fermer le formulaire
      onEntreeCreated();
      
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de l\'entrée:', err);
      setErrorMessage("Erreur lors de la création/mise à jour de l'entrée.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-8">
        {initialEntree ? 'Modifier l’Entrée' : 'Nouvelle Entrée'}
      </h2>
  
      {errorMessage && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
          {errorMessage}
        </div>
      )}
  
      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Sélection du dépôt et origine */}
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-lg font-semibold text-gray-800">
                Dépôt *
              </label>
              <select
                className="w-full border-2 border-gray-300 rounded-lg shadow-sm p-4 text-lg focus:ring-3 focus:ring-blue-500 focus:border-blue-500"
                value={depotId}
                onChange={(e) => setDepotId(e.target.value)}
                required
              >
                <option value="">-- Choisir un dépôt --</option>
                {depots.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.intitule}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-lg font-semibold text-gray-800">
                Origine
              </label>
              <input
                type="text"
                className="w-full border-2 border-gray-300 rounded-lg shadow-sm p-4 text-lg focus:ring-3 focus:ring-blue-500 focus:border-blue-500"
                value={origine}
                onChange={(e) => setOrigine(e.target.value)}
                placeholder="Ex: Bateau XYZ, Port ABC..."
              />
            </div>
          </div>
        </div>
        
        {/* Section Calcul de Prix Global */}
        <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-blue-800">Calcul du Prix Unitaire Global</h3>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCalcOpen(true)}
              className="flex items-center space-x-2"
            >
              <span>⚙️</span>
              <span>Calculer Prix</span>
            </Button>
          </div>
          
          {globalPriceCalculation.prixUnitaireFinal > 0 && (
            <div className="bg-white p-4 rounded-lg border border-blue-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Prix Unitaire Final:</span>
                  <div className="text-lg font-bold text-blue-600">
                    {globalPriceCalculation.prixUnitaireFinal.toFixed(2)} MRU/kg
                  </div>
                </div>
                {globalPriceCalculation.calculationData && (
                  <>
                    <div>
                      <span className="font-medium text-gray-700">Valeur Camion:</span>
                      <div className="text-lg font-semibold text-gray-800">
                        {globalPriceCalculation.calculationData.valeurCamion?.toFixed(2) || 0} MRU
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Prix Total:</span>
                      <div className="text-lg font-semibold text-gray-800">
                        {globalPriceCalculation.calculationData.prixTotal?.toFixed(2) || 0} MRU
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-600">
                ✓ Ce prix sera appliqué automatiquement à tous les articles de cette entrée
              </div>
            </div>
          )}
        </div>
  
        {/* Saisie des articles (items) */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-800">Articles</h3>
          {items.map((item, index) => (
            <div key={index} className="p-6 border-2 border-gray-200 rounded-lg bg-gray-50">
              {/* Ligne unique : Article, Quantité (cartons) et Quantité (kg) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Article *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500"
                    value={item.article}
                    onChange={(e) =>
                      handleItemChange(index, 'article', e.target.value)
                    }
                    required
                  >
                    <option value="">-- Choisir un article --</option>
                    {sortedArticles.map((a) => {
                      // Vérifier si cet article est déjà sélectionné dans un autre item
                      const isAlreadySelected = items.some((otherItem, otherIndex) => 
                        otherIndex !== index && otherItem.article === a._id
                      );
                      
                      const parts = [a.reference, a.specification, a.taille].filter(Boolean);
                      return (
                        <option 
                          key={a._id} 
                          value={a._id}
                          disabled={isAlreadySelected}
                          style={isAlreadySelected ? { color: '#999', fontStyle: 'italic' } : {}}
                        >
                          {parts.join(' – ')} {isAlreadySelected ? ' (déjà sélectionné)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    📦 Quantité (Cartons) *
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500"
                    type="number"
                    step="0.01"
                    value={item.quantiteCarton}
                    onChange={(e) =>
                      handleItemChange(index, 'quantiteCarton', e.target.value)
                    }
                    placeholder="Conversion automatique"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Conversion automatique
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    ⚖️ Quantité (Kg)
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500"
                    type="number"
                    step="0.01"
                    value={item.quantiteKg}
                    onChange={(e) =>
                      handleItemChange(index, 'quantiteKg', e.target.value)
                    }
                  />
                </div>
              </div>
              
              {/* Deuxième ligne : Quantité Tunnel uniquement */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Quantité Tunnel (Kg)
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500"
                    type="number"
                    value={item.quantiteTunnel || ''}
                    onChange={(e) =>
                      handleItemChange(index, 'quantiteTunnel', e.target.value)
                    }
                    placeholder="Quantité tunnel optionnelle"
                  />
                </div>
                <div></div> {/* Colonne vide */}
                <div></div> {/* Colonne vide */}
              </div>
              <div className="space-y-1 flex items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Prix Unitaire *
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500"
                    type="number"
                    step="0.01"
                    value={item.prixUnitaire}
                    onChange={(e) =>
                      handleItemChange(index, 'prixUnitaire', e.target.value)
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Monnaie *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500"
                    value={item.monnaie}
                    onChange={(e) =>
                      handleItemChange(index, 'monnaie', e.target.value)
                    }
                    required
                  >
                    <option value="MRU">MRU</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Prix Location (MRU/tonne/semaine)
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500"
                    type="number"
                    step="0.01"
                    value={item.prixLocation}
                    onChange={(e) =>
                      handleItemChange(index, 'prixLocation', e.target.value)
                    }
                    // Ce champ n'est plus obligatoire
                  />
                </div>
              </div>
              {items.length > 1 && (
                <div className="mt-4">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => removeItem(index)}
                  >
                    Supprimer cet article
                  </Button>
                </div>
              )}
            </div>
          ))}
          <Button
            variant="info"
            size="lg"
            onClick={addItem}
            className="mt-4"
          >
            + Ajouter un autre article
          </Button>
        </div>

        {/* Résumé en temps réel - Table des articles */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-xl border-2 border-blue-200 shadow-lg">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
              <span className="text-blue-600">📊</span>
              Résumé de l'entrée
              <span className="text-green-600">📈</span>
            </h3>
          </div>

          {/* Statistiques rapides */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-3 rounded-lg shadow-md text-center border-l-4 border-blue-500">
              <p className="text-sm font-medium text-gray-600">Total Kg</p>
              <p className="text-xl font-bold text-blue-600">{resumeQuantites.totalKg}</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-md text-center border-l-4 border-green-500">
              <p className="text-sm font-medium text-gray-600">Total Cartons</p>
              <p className="text-xl font-bold text-green-600">{resumeQuantites.totalCartons}</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-md text-center border-l-4 border-purple-500">
              <p className="text-sm font-medium text-gray-600">Total Tunnel</p>
              <p className="text-xl font-bold text-purple-600">{resumeQuantites.totalTunnel} kg</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-md text-center border-l-4 border-orange-500">
              <p className="text-sm font-medium text-gray-600">Articles</p>
              <p className="text-xl font-bold text-orange-600">{resumeQuantites.articlesTraites}/{resumeQuantites.totalArticles}</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-md text-center border-l-4 border-yellow-500">
              <p className="text-sm font-medium text-gray-600">Valeur</p>
              <p className="text-xl font-bold text-yellow-600">{resumeQuantites.totalValeur} MRU</p>
            </div>
          </div>

          {/* Table des articles */}
          {resumeQuantites.articlesTraites > 0 ? (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Article
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantité (Kg)
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantité (Cartons)
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantité Tunnel (Kg)
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prix Unit.
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.filter(item => 
                      item.article && 
                      (
                        (item.quantiteKg !== '' && parseFloat(item.quantiteKg) >= 0) ||
                        (item.quantiteCarton && parseFloat(item.quantiteCarton) > 0) ||
                        (item.quantiteTunnel && parseFloat(item.quantiteTunnel) > 0)
                      )
                    ).map((item, index) => {
                      const article = articles.find(a => a._id === item.article);
                      if (!article) return null;
                      
                      const kg = parseFloat(item.quantiteKg) || 0;
                      const cartons = parseFloat(item.quantiteCarton) || 0;
                      const tunnel = parseFloat(item.quantiteTunnel) || 0;
                      const prix = parseFloat(item.prixUnitaire) || 0;
                      
                      const quantiteKgFinal = item.quantiteKg !== '' ? kg : calculateKgFromCartons(cartons, article);
                      const quantiteCartonsFinal = cartons > 0 ? cartons : convertKgToCarton(kg, article);
                      const total = quantiteKgFinal * prix;
                      
                      // Création du nom complet de l'article
                      const articleComplet = [
                        article.reference || '', 
                        article.specification || '', 
                        article.taille || ''
                      ].filter(Boolean).join(' - ');
                      
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {articleComplet}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900 font-medium">
                            {quantiteKgFinal.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900 font-medium">
                            {quantiteCartonsFinal.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-700">
                            {tunnel.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-700">
                            {prix.toFixed(2)} {item.monnaie}/kg
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900 font-bold">
                            {total.toFixed(2)} {item.monnaie}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Ligne de total */}
                    <tr className="bg-blue-50 border-t-2 border-blue-200">
                      <td className="px-4 py-3 text-sm font-bold text-gray-800">
                        TOTAL
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-bold text-blue-600">
                        {resumeQuantites.totalKg} kg
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-bold text-green-600">
                        {resumeQuantites.totalCartons} cartons
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-bold text-purple-600">
                        {resumeQuantites.totalTunnel} kg
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-700">
                        -
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-bold text-yellow-600">
                        {resumeQuantites.totalValeur} MRU
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-lg text-gray-600 mb-2">Aucun article configuré</p>
              <p className="text-sm text-gray-500">
                Commencez par sélectionner un article et saisir des quantités pour voir le résumé
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-6 mt-10 pt-6 border-t border-gray-200">
          <Button
            variant="secondary"
            size="lg"
            onClick={onClose}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
            loading={loading}
          >
            {initialEntree ? 'Mettre à jour' : 'Enregistrer'}
          </Button>
          {isCalcOpen && (
          <PriceCalculatorModal
            isOpen={true}
            onClose={() => setIsCalcOpen(false)}
            onCalculate={handleGlobalPriceCalculation}
            initialData={{
              ...globalPriceCalculation.calculationData,
              quantiteTunnel: globalPriceCalculation.calculationData?.quantiteTunnel || 
                             items.find(item => item.quantiteTunnel)?.quantiteTunnel || 
                             items.reduce((sum, item) => sum + (parseFloat(item.quantiteTunnel) || 0), 0) || ''
            }}
            isGlobalCalculation={true}
          />
        )}
        </div>
      </form>
    </div>
  );
}
  
export default EntreeForm;
