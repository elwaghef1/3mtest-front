// frontend/src/components/TransfertForm.js
import React, { useEffect, useState, useMemo } from 'react';
import axios from '../api/axios';
import Button from './Button';

function TransfertForm({ onClose, onTransfertCreated, initialTransfert }) {
  // Champs globaux
  const [depotDepartId, setDepotDepartId] = useState('');
  const [depotArriveeId, setDepotArriveeId] = useState('');
  const [dateTransfert, setDateTransfert] = useState('');
  const [pointeur, setPointeur] = useState('');
  const [moyenDeTransfert, setMoyenDeTransfert] = useState('');
  const [immatricule, setImmatricule] = useState('');

  // Listes de référence
  const [articles, setArticles] = useState([]);
  const [depots, setDepots] = useState([]);

  // Items de transfert (similaire à EntreeForm)
  const [items, setItems] = useState([
    {
      article: '',
      quantiteKg: '',
      availableLots: [],
      selectedLot: '',
      stockDisponible: 0,
    }
  ]);

  // Contrôle du chargement
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Chargement initial
  useEffect(() => {
    fetchArticles();
    fetchDepots();
  }, []);

  // Tri des articles par référence
  const sortedArticles = useMemo(
    () =>
      [...articles].sort((a, b) =>
        a.reference.localeCompare(b.reference, 'fr', { sensitivity: 'base' })
      ),
    [articles]
  );

  const fetchArticles = async () => {
    try {
      const res = await axios.get('/articles');
      setArticles(res.data);
    } catch (err) {
      console.error('Erreur fetch articles:', err);
    }
  };

  const fetchDepots = async () => {
    try {
      const res = await axios.get('/depots');
      setDepots(res.data);
    } catch (err) {
      console.error('Erreur fetch depots:', err);
    }
  };

  // Charger les lots disponibles quand un article ou le dépôt de départ change
  const loadAvailableLotsForItem = async (index, articleId) => {
    if (!articleId || !depotDepartId) {
      return;
    }

    try {
      // Charger les entrées pour trouver les lots
      const resEntrees = await axios.get('/entrees');
      const filtered = resEntrees.data.filter((e) => {
        return (
          e.depot &&
          e.depot._id === depotDepartId &&
          e.items &&
          e.items.some(
            (item) =>
              item.article &&
              item.article._id === articleId &&
              item.quantiteRestante > 0
          )
        );
      });

      // Charger le stock disponible
      const resStock = await axios.get('/stock');
      const found = resStock.data.find(
        (s) =>
          s.depot &&
          s.depot._id === depotDepartId &&
          s.article &&
          s.article._id === articleId
      );

      const newItems = [...items];
      newItems[index].availableLots = filtered;
      newItems[index].stockDisponible = found ? found.quantiteCommercialisableKg || 0 : 0;
      newItems[index].selectedLot = '';
      setItems(newItems);
    } catch (err) {
      console.error('Erreur lors du chargement des lots :', err);
    }
  };

  // Mise à jour d'un item
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // Si l'article change, charger les lots disponibles
    if (field === 'article') {
      loadAvailableLotsForItem(index, value);
    }

    setItems(newItems);
  };

  // Ajouter un nouvel item
  const addItem = () => {
    setItems([
      ...items,
      {
        article: '',
        quantiteKg: '',
        availableLots: [],
        selectedLot: '',
        stockDisponible: 0,
      }
    ]);
  };

  // Supprimer un item
  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  // Recharger les lots pour tous les items quand le dépôt de départ change
  useEffect(() => {
    if (depotDepartId) {
      items.forEach((item, index) => {
        if (item.article) {
          loadAvailableLotsForItem(index, item.article);
        }
      });
    } else {
      // Réinitialiser tous les lots
      const newItems = items.map(item => ({
        ...item,
        availableLots: [],
        selectedLot: '',
        stockDisponible: 0,
      }));
      setItems(newItems);
    }
  }, [depotDepartId]);

  // Formattage du libellé de lot
  const formatLotLabel = (lot, articleId) => {
    const sum = lot.items
      .filter((i) => i.article && i.article._id === articleId)
      .reduce((acc, i) => acc + (i.quantiteRestante || 0), 0);

    return `${lot.batchNumber} (${sum} Kg dispo)`;
  };

  // Gestion de la soumission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    // Validations
    if (depotDepartId === depotArriveeId) {
      setErrorMessage("Vous ne pouvez pas transférer vers le même dépôt.");
      setLoading(false);
      return;
    }

    // Vérifier que tous les items ont les données requises
    const validItems = items.filter(item => 
      item.article && 
      item.quantiteKg && 
      parseFloat(item.quantiteKg) > 0 && 
      item.selectedLot
    );

    if (validItems.length === 0) {
      setErrorMessage("Au moins un article avec une quantité et un lot doit être spécifié.");
      setLoading(false);
      return;
    }

    // Vérifier les quantités par rapport aux stocks disponibles
    for (const item of validItems) {
      const quantite = parseFloat(item.quantiteKg);
      if (quantite > item.stockDisponible) {
        const selectedArticle = articles.find(a => a._id === item.article);
        const articleName = selectedArticle ? 
          [selectedArticle.reference, selectedArticle.specification, selectedArticle.taille, selectedArticle.typeCarton]
            .filter(Boolean).join(' - ') : 
          'Article inconnu';
        setErrorMessage(`Quantité insuffisante pour l'article "${articleName}". Stock disponible: ${item.stockDisponible} Kg`);
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        depotDepart: depotDepartId,
        depotArrivee: depotArriveeId,
        pointeur,
        moyenDeTransfert,
        immatricule,
        dateTransfert: dateTransfert ? new Date(dateTransfert) : undefined,
        items: validItems.map(item => ({
          article: item.article,
          quantiteKg: parseFloat(item.quantiteKg),
          selectedLotId: item.selectedLot,
        })),
      };

      await axios.post('/transferts/multiple', payload);
      onTransfertCreated();
    } catch (err) {
      console.error('Erreur lors de la création du transfert multiple:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setErrorMessage(err.response.data.message);
      } else {
        setErrorMessage("Une erreur est survenue pendant la création du transfert.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 w-full max-h-[90vh] overflow-y-auto">
      <h2 className="text-2xl font-bold mb-6">Nouveau Transfert</h2>

      {errorMessage && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations générales */}
        <div className="p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-medium mb-4">Informations générales</h3>
          
          {/* Ligne 1 : Dépôts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Dépôt de Départ *
              </label>
              <select
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-2 focus:ring-blue-500"
                value={depotDepartId}
                onChange={(e) => setDepotDepartId(e.target.value)}
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
            
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Dépôt d'Arrivée *
              </label>
              <select
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-2 focus:ring-blue-500"
                value={depotArriveeId}
                onChange={(e) => setDepotArriveeId(e.target.value)}
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

          {/* Ligne 2 : Date et Pointeur */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Date Transfert
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-2 focus:ring-blue-500"
                value={dateTransfert}
                onChange={(e) => setDateTransfert(e.target.value)}
              />
            </div>
            
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Pointeur *
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-2 focus:ring-blue-500"
                value={pointeur}
                onChange={(e) => setPointeur(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Ligne 3 : Moyen de transfert et Immatricule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Moyen de Transfert
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-2 focus:ring-blue-500"
                value={moyenDeTransfert}
                onChange={(e) => setMoyenDeTransfert(e.target.value)}
              />
            </div>
            
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Immatricule
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-2 focus:ring-blue-500"
                value={immatricule}
                onChange={(e) => setImmatricule(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Articles à transférer */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Articles à transférer</h3>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={addItem}
            >
              + Ajouter un article
            </Button>
          </div>

          {items.map((item, index) => (
            <div key={index} className="p-4 border rounded-lg bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Article */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Article *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={item.article}
                    onChange={(e) => handleItemChange(index, 'article', e.target.value)}
                    required
                  >
                    <option value="">-- Choisir un article --</option>
                    {sortedArticles.map((a) => {
                      const parts = [a.reference, a.specification, a.taille].filter(Boolean);
                      return (
                        <option key={a._id} value={a._id}>
                          {parts.join(' – ')}
                        </option>
                      );
                    })}
                  </select>
                  {item.stockDisponible !== undefined && (
                    <p className="text-sm text-red-600 font-semibold">
                      {item.stockDisponible} Kg disponibles
                    </p>
                  )}
                </div>

                {/* Quantité */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Quantité à transférer (Kg) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={item.quantiteKg}
                    onChange={(e) => handleItemChange(index, 'quantiteKg', e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Sélection du lot */}
              {item.availableLots.length > 0 && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lot (Batch Number) *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={item.selectedLot}
                    onChange={(e) => handleItemChange(index, 'selectedLot', e.target.value)}
                    required
                  >
                    <option value="">-- Choisir un lot --</option>
                    {item.availableLots.map((lot) => (
                      <option key={lot._id} value={lot._id}>
                        {formatLotLabel(lot, item.article)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Bouton de suppression */}
              {items.length > 1 && (
                <div className="mt-4">
                  <Button
                    type="button"
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
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-end space-x-4 mt-8">
          <Button
            type="button"
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
            Créer le transfert
          </Button>
        </div>
      </form>
    </div>
  );
}

export default TransfertForm;
