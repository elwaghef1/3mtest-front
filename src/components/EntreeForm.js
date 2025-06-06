// frontend/src/components/EntreeForm.js
import React, { useEffect, useState, useMemo } from 'react';
import axios from '../api/axios';
import Button from './Button';
import PriceCalculatorModal from './PriceCalculatorModal';

function EntreeForm({ onClose, onEntreeCreated, initialEntree }) {
  const [depots, setDepots] = useState([]);
  const [articles, setArticles] = useState([]);
  
  const [depotId, setDepotId] = useState('');
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  // Champ "block" supprimé
  const [origine, setOrigine] = useState(''); // Par défaut vide
  
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
  
  // Récupération des dépôts et articles, et pré-remplissage en cas d'édition
  useEffect(() => {
    fetchDepots();
    fetchArticles();
    if (initialEntree) {
      setDepotId(initialEntree.depot?._id || initialEntree.depot);
      setOrigine(initialEntree.origine || '');
      const initialItems = (initialEntree.items || []).map((item) => ({
        article: item.article?._id || item.article,
        quantiteKg: item.quantiteKg,
        quantiteTunnel: item.quantiteTunnel || '',
        prixUnitaire: item.prixUnitaire || '',
        monnaie: item.monnaie || 'MRU',
        prixLocation: item.prixLocation || '',
        quantiteCarton: item.quantiteKg / 20,
      }));
      setItems(initialItems);
    }
  }, [initialEntree]);

  const handleCalc = (index) => (calculatedPrice) => {
    const newItems = [...items];
    newItems[index].prixUnitaire = calculatedPrice.toFixed(2);
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
    if (field === 'quantiteKg') {
      const kg = parseFloat(value) || 0;
      newItems[index]['quantiteCarton'] = kg / 20;
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
        prixUnitaire: '',
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
      const payload = {
        depot: depotId,
        // Champs "block" et "qualité" supprimés
        origine,
        items: items.map((item) => ({
          article: item.article,
          quantiteKg: parseFloat(item.quantiteKg),
          quantiteTunnel: item.quantiteTunnel ? parseFloat(item.quantiteTunnel) : undefined,
          prixUnitaire: parseFloat(item.prixUnitaire),
          monnaie: item.monnaie,
          // Si le champ Prix Location est vide, on n'envoie rien
          prixLocation: item.prixLocation ? parseFloat(item.prixLocation) : undefined,
        })),
      };
      if (initialEntree) {
        await axios.put(`/entrees/${initialEntree._id}`, payload);
      } else {
        await axios.post('/entrees', payload);
      }
      onEntreeCreated();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de l’entrée:', err);
      setErrorMessage("Erreur lors de la création/mise à jour de l'entrée.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">
        {initialEntree ? 'Modifier l’Entrée' : 'Nouvelle Entrée'}
      </h2>
  
      {errorMessage && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
          {errorMessage}
        </div>
      )}
  
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sélection du dépôt */}
        <div className="grid grid-cols-1">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Dépôt *
            </label>
            <select
              className="w-full border border-gray-300 rounded-md shadow-sm p-2"
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
        </div>
  
        {/* Saisie des articles (items) */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Articles</h3>
          {items.map((item, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Article *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={item.article}
                    onChange={(e) =>
                      handleItemChange(index, 'article', e.target.value)
                    }
                    required
                  >
                    <option value="">-- Choisir un article --</option>
                    {sortedArticles.map((a) => {
                    // on ne garde que les champs qui existent
                      const parts = [a.reference, a.specification, a.taille].filter(Boolean);
                      return (
                        <option key={a._id} value={a._id}>
                          {parts.join(' – ')}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Quantité (Kg) *
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                    type="number"
                    value={item.quantiteKg}
                    onChange={(e) =>
                      handleItemChange(index, 'quantiteKg', e.target.value)
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Quantité Tunnel (Kg)
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                    type="number"
                    value={item.quantiteTunnel || ''}
                    onChange={(e) =>
                      handleItemChange(index, 'quantiteTunnel', e.target.value)
                    }
                    placeholder="Quantité tunnel optionnelle"
                  />
                </div>
              </div>
              <div className="space-y-1 flex items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Prix Unitaire *
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                    type="number"
                    step="0.01"
                    value={item.prixUnitaire}
                    onChange={(e) =>
                      handleItemChange(index, 'prixUnitaire', e.target.value)
                    }
                    required
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCalcOpen({ open: true, idx: index })}
                  className="ml-2 mb-1"
                  title="Calcul automatique"
                >
                  ⚙️
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Monnaie *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2"
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
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2"
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
              <div className="mt-2 text-sm text-gray-600">
                Quantité Cartons: {item.quantiteCarton}
              </div>
              {items.length > 1 && (
                <div className="mt-2">
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
            size="sm"
            onClick={addItem}
            className="mt-2"
          >
            Ajouter un autre article
          </Button>
        </div>
  
        <div className="flex justify-end space-x-4 mt-8">
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
          {isCalcOpen.open && (
          <PriceCalculatorModal
            isOpen={true}
            onClose={() => setIsCalcOpen({ open: false, idx: null })}
            onCalculate={handleCalc(isCalcOpen.idx)}
          />
        )}
        </div>
      </form>
    </div>
  );
}
  
export default EntreeForm;
