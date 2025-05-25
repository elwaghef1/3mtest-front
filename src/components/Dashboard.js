// frontend/src/components/Dashboard.js
import React from 'react';
import StockList from './StockList'; // import direct

function Dashboard() {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Tableau de bord</h2>
      <p className="mb-4">Bienvenue sur l’interface de gestion des stocks.</p>

      {/* Affichage de l’état de stock */}
      <h3 className="text-lg font-bold mb-2">État de Stock</h3>
      <StockList embedded />
    </div>
  );
}

export default Dashboard;
