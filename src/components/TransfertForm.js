// frontend/src/components/TransfertForm.js
import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import Button from './Button';

function TransfertForm({ onClose, onTransfertCreated, initialTransfert }) {
  // Champs basiques
  const [articleId, setArticleId] = useState('');
  const [dateTransfert, setDateTransfert] = useState('');
  const [depotDepartId, setDepotDepartId] = useState('');
  const [depotArriveeId, setDepotArriveeId] = useState('');
  const [pointeur, setPointeur] = useState('');
  const [moyenDeTransfert, setMoyenDeTransfert] = useState('');
  const [immatricule, setImmatricule] = useState('');

  // Listes
  const [articles, setArticles] = useState([]);
  const [depots, setDepots] = useState([]);

  // Liste des lots disponibles dans le dépôt de départ pour l’article sélectionné
  const [availableLots, setAvailableLots] = useState([]);
  const [selectedLot, setSelectedLot] = useState('');
  const [lotTransferQuantity, setLotTransferQuantity] = useState('');

  // Stock total dans le dépôt de départ pour l’article sélectionné
  const [depotDepartStock, setDepotDepartStock] = useState(null);

  // Contrôle du chargement
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Au montage, on charge la liste des articles et des dépôts
  useEffect(() => {
    fetchArticles();
    fetchDepots();
  }, []);

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

  // Quand articleId ou depotDepartId changent, on recharge les lots disponibles
  // et on va chercher la quantité totale dans ce dépôt
  useEffect(() => {
    const loadData = async () => {
      // Réinitialisation
      setAvailableLots([]);
      setSelectedLot('');
      setLotTransferQuantity('');
      setDepotDepartStock(null);

      if (articleId && depotDepartId) {
        try {
          // 1) Charger toutes les entrées pour trouver les lots
          const resEntrees = await axios.get('/entrees');
          // Filtrer les entrées (lots) pour articleId + depotDepartId + quantiteRestante > 0
          const filtered = resEntrees.data.filter((e) => {
            return (
              e.depot &&
              e.depot._id === depotDepartId &&
              e.items &&
              // Au moins un item correspond à l'articleId et a de la quantitéRestante
              e.items.some(
                (item) =>
                  item.article &&
                  item.article._id === articleId &&
                  item.quantiteRestante > 0
              )
            );
          });
          setAvailableLots(filtered);

          // 2) Charger le stock (option A : route /stock, on le parcourt pour trouver la ligne)
          const resStock = await axios.get('/stock');
          // On cherche la ligne correspondant au depotDepartId + articleId
          const found = resStock.data.find(
            (s) =>
              s.depot &&
              s.depot._id === depotDepartId &&
              s.article &&
              s.article._id === articleId
          );
          if (found) {
            setDepotDepartStock(found.quantiteCommercialisableKg || 0);
          } else {
            setDepotDepartStock(0);
          }
        } catch (err) {
          console.error('Erreur lors du chargement des lots/stock :', err);
        }
      }
    };
    loadData();
  }, [articleId, depotDepartId]);

  // Gère la soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    // Vérifier qu'on ne transfère pas vers le même dépôt
    if (depotDepartId && depotArriveeId && depotDepartId === depotArriveeId) {
      setErrorMessage("Vous ne pouvez pas transférer vers le même dépôt.");
      setLoading(false);
      return;
    }

    // Vérifier qu'un lot est sélectionné
    if (!selectedLot) {
      setErrorMessage("Veuillez sélectionner un lot à transférer.");
      setLoading(false);
      return;
    }
    // Vérifier la quantité
    const quantityToTransfer = parseFloat(lotTransferQuantity || '0');
    if (quantityToTransfer <= 0) {
      setErrorMessage("Veuillez saisir une quantité à transférer (Kg) > 0.");
      setLoading(false);
      return;
    }

    // On envoie la requête POST /transferts
    try {
      await axios.post('/transferts', {
        article: articleId,
        depotDepart: depotDepartId,
        depotArrivee: depotArriveeId,
        quantiteKg: quantityToTransfer,
        pointeur,
        moyenDeTransfert,
        immatricule,
        dateTransfert: dateTransfert ? new Date(dateTransfert) : undefined,
        // On envoie le lot sélectionné
        selectedLotId: selectedLot,
      });
      onTransfertCreated();
    } catch (err) {
      console.error('Erreur lors de la création du transfert:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setErrorMessage(err.response.data.message);
      } else {
        setErrorMessage("Une erreur est survenue pendant la création du transfert.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Formattage du libellé de lot
  const formatLotLabel = (lot) => {
    // On additionne la quantitéRestante des items correspondants à l'articleId
    const sum = lot.items
      .filter((i) => i.article && i.article._id === articleId)
      .reduce((acc, i) => acc + (i.quantiteRestante || 0), 0);

    return (
      <>
        {lot.batchNumber}{' '}
        <span className="ml-1 text-red-600 font-semibold">
          ({sum} Kg dispo)
        </span>
      </>
    );
  };

  return (
    <div className="p-6 w-full">
      <h2 className="text-2xl font-bold mb-6">Nouveau Transfert</h2>

      {errorMessage && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Ligne 1 : Article & Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Article */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Article *
            </label>
            <select
              className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-2 focus:ring-blue-500"
              value={articleId}
              onChange={(e) => setArticleId(e.target.value)}
              required
            >
              <option value="">-- Choisir un article --</option>
              {articles.map((a) => (
                <option key={a._id} value={a._id}>
                  {/* {a.reference} - {a.specification} - {a.taille} - {a.typeCarton} */}
                  {a.intitule}
                </option>
              ))}
            </select>
          </div>
          {/* Date */}
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
        </div>

        {/* Ligne 2 : Dépôt départ & Dépôt arrivée */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dépôt départ */}
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
            {/* Affichage de la quantité en rouge, juste en dessous */}
            {depotDepartId && depotDepartStock !== null && (
              <p className="mt-1 text-sm text-red-600 font-semibold">
                {depotDepartStock} Kg disponibles au total
              </p>
            )}
          </div>
          {/* Dépôt arrivée */}
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

        {/* Sélection du lot (batch) et quantité à transférer */}
        {availableLots.length > 0 && (
          <div className="p-4 border rounded-md space-y-4 bg-gray-50">
            <h3 className="text-md font-semibold">Lot à transférer</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Lot (Batch Number) *
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-2 focus:ring-blue-500"
                  value={selectedLot}
                  onChange={(e) => setSelectedLot(e.target.value)}
                >
                  <option value="">-- Choisir un lot --</option>
                  {availableLots.map((lot) => (
                    <option key={lot._id} value={lot._id}>
                      {formatLotLabel(lot)}
                    </option>
                  ))}
                </select>
              </div>
              {selectedLot && (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Quantité à transférer (Kg) *
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-2 focus:ring-blue-500"
                    value={lotTransferQuantity}
                    onChange={(e) => setLotTransferQuantity(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Autres champs : pointeur, moyen de transfert, immatricule */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            Enregistrer
          </Button>
        </div>
      </form>
    </div>
  );
}

export default TransfertForm;
