// frontend/src/components/TransfertFormWrapper.js
import React, { useState } from 'react';
import TransfertForm from './TransfertForm';
import TransfertMultipleForm from './TransfertMultipleForm';

function TransfertFormWrapper({ onClose, onTransfertCreated, initialTransfert }) {
  const [isMultipleMode, setIsMultipleMode] = useState(false);

  const handleSwitchToMultiple = () => {
    setIsMultipleMode(true);
  };

  const handleSwitchToSingle = () => {
    setIsMultipleMode(false);
  };

  if (isMultipleMode) {
    return (
      <div className="relative">
        {/* Bouton de retour au mode simple */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={handleSwitchToSingle}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm flex items-center"
          >
            ← Transfert Simple
          </button>
        </div>
        
        <TransfertMultipleForm
          onClose={onClose}
          onTransfertCreated={onTransfertCreated}
          initialTransfert={initialTransfert}
        />
      </div>
    );
  }

  return (
    <TransfertForm
      onClose={onClose}
      onTransfertCreated={onTransfertCreated}
      initialTransfert={initialTransfert}
      onSwitchToMultiple={handleSwitchToMultiple}
    />
  );
}

export default TransfertFormWrapper;
