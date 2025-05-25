import React, { useState, useEffect } from 'react';
import axios from '../api/axios';

function PoissonList() {
  const [poissons, setPoissons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPoissons();
  }, []);

  const fetchPoissons = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/poissons'); 
      // => /api/poissons
      setPoissons(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des Poissons:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Liste des Poissons</h1>
      {loading ? (
        <div>Chargement...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border">Date Création</th>
                <th className="px-4 py-2 border">Taille</th>
                <th className="px-4 py-2 border">Quantité (Kg)</th>
                <th className="px-4 py-2 border">Nb Cartons</th>
                <th className="px-4 py-2 border">No Lot</th>
                <th className="px-4 py-2 border">Bateau</th>
                <th className="px-4 py-2 border">Type</th>
                <th className="px-4 py-2 border">Espèce</th>
                <th className="px-4 py-2 border">Prix Unitaire</th>
                <th className="px-4 py-2 border">Prix Total</th>
                <th className="px-4 py-2 border">Statut BC</th>
                <th className="px-4 py-2 border">Payment Statut</th>
                <th className="px-4 py-2 border">Montant Payé</th>
                <th className="px-4 py-2 border">Reliquat</th>
              </tr>
            </thead>
            <tbody className="text-center">
              {poissons.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border">{new Date(p.dateCreation).toLocaleDateString()}</td>
                  <td className="px-4 py-2 border">{p.taille}</td>
                  <td className="px-4 py-2 border">{p.quantiteEnKg}</td>
                  <td className="px-4 py-2 border">{p.nbCartons}</td>
                  <td className="px-4 py-2 border">{p.noLot}</td>
                  <td className="px-4 py-2 border">{p.bateau}</td>
                  <td className="px-4 py-2 border">{p.type}</td>
                  <td className="px-4 py-2 border">{p.espece}</td>
                  <td className="px-4 py-2 border">{p.prixUnitaire}</td>
                  <td className="px-4 py-2 border">{p.prixTotal}</td>
                  <td className="px-4 py-2 border">{p.statutBonDeCommande}</td>
                  <td className="px-4 py-2 border">{p.paymentStatus}</td>
                  <td className="px-4 py-2 border">{p.montantPaye}</td>
                  <td className="px-4 py-2 border">{p.reliquat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PoissonList;
