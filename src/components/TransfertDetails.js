// frontend/src/components/TransfertDetails.js
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

function TransfertDetails({ transfert, onClose }) {
  return (
    <div className="max-w-6xl mx-auto p-8 bg-white rounded-lg shadow-lg border border-gray-200">
      <h2 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-green-500">
        Détails du transfert
      </h2>

      {/* Carte récapitulative */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg text-center mb-8 border border-blue-200">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Transfert #{transfert._id?.slice(-6) || 'N/A'}</h3>
        <p className="text-3xl font-bold mb-2 text-blue-600">
          {transfert.quantiteKg || '—'} Kg
        </p>
        <p className="text-lg text-gray-700">
          Date : {transfert.dateTransfert ? new Date(transfert.dateTransfert).toLocaleDateString('fr-FR') : '—'}
        </p>
        <div className="mt-4 flex justify-center items-center space-x-4">
          <div className="bg-red-100 px-3 py-2 rounded-lg border border-red-200">
            <p className="text-sm text-red-600 font-medium">Départ</p>
            <p className="text-lg font-bold text-red-700">{transfert.depotDepart?.intitule || '—'}</p>
          </div>
          <div className="text-2xl text-gray-400">→</div>
          <div className="bg-green-100 px-3 py-2 rounded-lg border border-green-200">
            <p className="text-sm text-green-600 font-medium">Arrivée</p>
            <p className="text-lg font-bold text-green-700">{transfert.depotArrivee?.intitule || '—'}</p>
          </div>
        </div>
      </div>

      {/* Tableau des détails du transfert */}
      <div className="overflow-x-auto mb-8">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 text-left">
                Article transféré
              </th>
              <th className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 text-center">
                Quantité (Kg)
              </th>
              <th className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 text-center">
                Quantité (Cartons)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-gray-50 transition-colors">
              <td className="border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700">
                {transfert.article ? formatArticle(transfert.article) : '—'}
              </td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-center text-gray-700">
                <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                  {transfert.quantiteKg || '—'}
                </span>
              </td>
              <td className="border border-gray-300 px-4 py-3 text-sm text-center text-gray-700">
                <span className="inline-block bg-gray-100 text-gray-800 px-3 py-1 rounded-full font-medium">
                  {transfert.quantiteCarton || (transfert.quantiteKg ? (transfert.quantiteKg / 20).toFixed(2) : '—')}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Détails des lots si disponibles */}
      {transfert.detailsLots && transfert.detailsLots.length > 0 && (
        <div className="mb-8">
          <h4 className="text-lg font-bold mb-4 text-gray-800">Lots transférés</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-blue-50">
                  <th className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 text-left">
                    Batch Number
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 text-center">
                    Quantité transférée
                  </th>
                </tr>
              </thead>
              <tbody>
                {transfert.detailsLots.map((lot, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700">
                      {lot.batchNumber || '—'}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-center text-gray-700">
                      <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                        {lot.quantiteTransferee || '—'} Kg
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grille des informations complémentaires */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <DetailItem 
          label="Pointeur" 
          value={transfert.pointeur} 
        />
        <DetailItem 
          label="Moyen de transport" 
          value={transfert.moyenDeTransfert} 
        />
        <DetailItem 
          label="Immatricule" 
          value={transfert.immatricule} 
        />
        <DetailItem 
          label="Statut" 
          value="Transféré" 
          badge="bg-green-100 text-green-800"
        />
      </div>

      {/* Informations système (si disponibles) */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
        <h4 className="text-sm font-medium text-gray-600 mb-2">Informations système</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
          <div>
            <span className="font-medium">ID Transfert:</span> {transfert._id || '—'}
          </div>
          <div>
            <span className="font-medium">Date création:</span> {transfert.createdAt ? new Date(transfert.createdAt).toLocaleString('fr-FR') : '—'}
          </div>
        </div>
      </div>

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

export default TransfertDetails;
