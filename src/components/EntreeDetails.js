// frontend/src/components/EntreeDetails.js
import React from 'react';

// Fonction utilitaire pour formater un article (détail)
const formatArticle = (a) => {
  if (!a) return '—';
  const ref = a.reference || '';
  const spec = a.specification || '';
  const taille = a.taille || '';
  const typeCarton = a.typeCarton || '';
  return `${ref} - ${spec} - ${taille}`;
};

// Fonction utilitaire pour vérifier si une valeur est manquante
const isMissing = (value) => {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
};

// Fonction pour formater la différence tunnel avec code couleur
const formatTunnelDifference = (quantite, quantiteTunnel) => {
  if (!quantite || !quantiteTunnel) return '—';
  const difference = quantite - quantiteTunnel;
  const sign = difference > 0 ? '+' : '';
  const color = difference >= 0 ? 'text-green-600' : 'text-red-600';
  return (
    <span className={`font-semibold ${color}`}>
      {sign}{difference.toFixed(2)}
    </span>
  );
};

// Composant pour afficher une cellule de détail de façon compacte avec un badge "MANQUANT" si nécessaire
const DetailItem = ({ label, value, badge }) => (
  <div className="p-2 border rounded-lg bg-gray-50 relative">
    {isMissing(value) && (
      <span className="absolute top-1 right-1 transform -rotate-6 text-xs bg-red-500 text-white px-1 py-0.5 rounded font-bold shadow-md">
        MANQUANT
      </span>
    )}
    <p className="text-sm text-gray-500">{label}</p>
    <p className="mt-1 text-base font-semibold text-gray-800">
      {!isMissing(value) ? (
        badge ? (
          <span className={`inline-block px-3 py-1 rounded-full ${badge}`}>
            {value}
          </span>
        ) : (
          value
        )
      ) : (
        ''
      )}
    </p>
  </div>
);

function EntreeDetails({ entree, onClose }) {
  // Calcul du prix total de l'entrée
  const totalPrice = entree.items.reduce((sum, item) => sum + item.quantiteKg * item.prixUnitaire, 0);

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-lg border border-gray-200">
      <h2 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-red-700 to-purple-500">
        Détails de l'entrée
      </h2>

      {/* Carte récapitulative */}
      <div className="bg-gray-200 p-6 rounded-lg text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Batch Number</h3>
        <p className="text-3xl font-bold mb-2">
          {entree.batchNumber || '—'}
        </p>
        <p className="text-lg text-gray-700">
          Date : {entree.dateEntree ? new Date(entree.dateEntree).toLocaleDateString('fr-FR') : '—'}
        </p>
        <p className="text-lg text-gray-700">
          Dépôt : {entree.depot?.intitule || '—'}
        </p>
      </div>

      {/* Tableau des articles */}
      <div className="overflow-x-auto mb-8">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 text-left">
                Article
              </th>
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 text-center">
                Quantité (Kg)
              </th>
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 text-center">
                Quantité Tunnel (Kg)
              </th>
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 text-center">
                Différence
              </th>
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 text-center">
                Prix Unitaire
              </th>
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 text-right">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {entree.items && entree.items.length > 0 ? (
              entree.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 whitespace-nowrap">
                    {item.article ? formatArticle(item.article) : '—'}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-xs text-center text-gray-700 whitespace-nowrap">
                    {item.quantiteKg || '—'}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-xs text-center text-gray-700 whitespace-nowrap">
                    {item.quantiteTunnel || '—'}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-xs text-center whitespace-nowrap">
                    {formatTunnelDifference(item.quantiteKg, item.quantiteTunnel)}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-xs text-center text-gray-700 whitespace-nowrap">
                    {item.prixUnitaire || '—'}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-xs text-right text-gray-700 whitespace-nowrap">
                    {item.quantiteKg && item.prixUnitaire ? (item.quantiteKg * item.prixUnitaire).toFixed(2) : '—'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border border-gray-300 px-2 py-1 text-xs text-gray-700" colSpan="6">
                  Aucun article renseigné.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Grille des informations globales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <DetailItem label="Type" value={entree.origine === 'TRANSFERT' ? 'TRANSFERT' : 'NORMAL'} />
        <DetailItem label="Quantité Totale (Kg)" value={entree.items ? entree.items.reduce((sum, item) => sum + item.quantiteKg, 0) : '—'} />
        <DetailItem label="Prix Total" value={totalPrice.toFixed(2)} />
        <DetailItem label="Nombre d'Articles" value={entree.items ? entree.items.length : '—'} />
      </div>

      {/* Section Calcul de Prix Global */}
      {entree.globalPriceCalculation && entree.globalPriceCalculation.calculationData && (
        <div className="mb-8">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">📊</span>
            Détails du Calcul de Prix Global
          </h4>
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Section Données Camion */}
              <div className="space-y-3">
                <h5 className="font-medium text-blue-800 border-b border-blue-300 pb-2">
                  Données Camion
                </h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Poids camion:</span>
                    <span className="font-semibold">{entree.globalPriceCalculation.calculationData.poidsCamion || 0} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Prix unitaire d'achat:</span>
                    <span className="font-semibold">{entree.globalPriceCalculation.calculationData.prixUnitaireAchat || 0} MRU/kg</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-blue-700 font-medium">Valeur camion:</span>
                    <span className="font-bold text-blue-700">{entree.globalPriceCalculation.calculationData.valeurCamion || 0} MRU</span>
                  </div>
                </div>
              </div>

              {/* Section Données Rejet */}
              <div className="space-y-3">
                <h5 className="font-medium text-blue-800 border-b border-blue-300 pb-2">
                  Données Rejet
                </h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantité rejetée:</span>
                    <span className="font-semibold">{entree.globalPriceCalculation.calculationData.quantiteRejetee || 0} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Prix unitaire rejet:</span>
                    <span className="font-semibold">{entree.globalPriceCalculation.calculationData.prixUnitaireRejet || 0} MRU/kg</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-green-700 font-medium">Recette rejet:</span>
                    <span className="font-bold text-green-700">{entree.globalPriceCalculation.calculationData.recetteRejet || 0} MRU</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Calculs Finaux */}
            <div className="mt-6 pt-4 border-t border-blue-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <div className="text-sm text-gray-600 mb-1">Prix Total</div>
                  <div className="text-xl font-bold text-blue-600">
                    {entree.globalPriceCalculation.calculationData.prixTotal?.toFixed(2) || 0} MRU
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Valeur camion - Recette rejet</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <div className="text-sm text-gray-600 mb-1">Prix Unitaire Frais</div>
                  <div className="text-xl font-bold text-green-600">
                    {entree.globalPriceCalculation.calculationData.prixUnitaireFrais?.toFixed(2) || 0} MRU/kg
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Prix total ÷ Quantité tunnel</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <div className="text-sm text-gray-600 mb-1">Prix Unitaire Final</div>
                  <div className="text-xl font-bold text-yellow-600">
                    {entree.globalPriceCalculation.prixUnitaireFinal?.toFixed(2) || 0} MRU/kg
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Prix frais + Frais ({entree.globalPriceCalculation.calculationData.frais || 0} MRU/kg)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition duration-300"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

export default EntreeDetails;
