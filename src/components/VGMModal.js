// frontend/src/components/VGMModal.js
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { generateVGMPDF } from './pdfGenerators';

const VGMModal = ({ commande, isOpen, onClose }) => {
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [vgmData, setVgmData] = useState({
    grossWeight: 29120,
    containerTare: 4640,
    verifiedWeight: 33760,
    weighingMethod: 'METHOD 1',
    dateOfVerification: new Date().toLocaleDateString('fr-FR'),
    companyName: 'TOP FISH TRADE SARL',
    referenceNumber: '',
    blNumber: '',
    containerNumber: '',
    shipperInfo: 'BP 545 Zone portuaire-Nouadhibou'
  });

  // Calculer le poids vérifié automatiquement
  useEffect(() => {
    setVgmData(prev => ({
      ...prev,
      verifiedWeight: prev.grossWeight + prev.containerTare
    }));
  }, [vgmData.grossWeight, vgmData.containerTare]);

  if (!isOpen) return null;

  const handleContainerSelect = (cargo, index) => {
    setSelectedContainer({ cargo, index });
    
    // Initialiser avec les données du conteneur
    setVgmData(prev => ({
      ...prev,
      containerNumber: cargo.noDeConteneur || 'MNBU001917/0',
      grossWeight: cargo.poidsCarton || 29120,
      referenceNumber: `PO : ${commande.reference || 'REF001'}`,
      blNumber: cargo.areDeConteneur || 'ML-MR0008336'
    }));
  };

  const handleInputChange = (field, value) => {
    setVgmData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateVGM = () => {
    try {
      console.log('Génération VGM avec données:', vgmData);
      console.log('Conteneur sélectionné:', selectedContainer);
      
      const vgmInfo = {
        ...vgmData,
        container: selectedContainer.cargo,
        commande: commande
      };
      
      generateVGMPDF(vgmInfo, commande, selectedContainer.index);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la génération du VGM:', error);
      alert('Erreur lors de la génération du PDF VGM : ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            ⚖️ Génération VGM (Verified Gross Mass)
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {!selectedContainer ? (
          // Étape 1: Sélection du conteneur
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Sélectionnez un conteneur pour générer le VGM :
            </h3>
            
            {commande.cargo && commande.cargo.length > 0 ? (
              <div className="grid gap-4">
                {commande.cargo.map((cargo, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleContainerSelect(cargo, index)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-lg">
                          {cargo.nom || 'MAERSK'} - Conteneur #{index + 1}
                        </h4>
                        <p className="text-gray-600">
                          N° Conteneur: {cargo.noDeConteneur || 'N/A'}
                        </p>
                        <p className="text-gray-600">
                          Poids: {cargo.poidsCarton || 'N/A'} kg
                        </p>
                      </div>
                      <div className="text-blue-600 font-semibold">
                        Sélectionner →
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucun conteneur disponible</p>
              </div>
            )}
          </div>
        ) : (
          // Étape 2: Configuration du VGM
          <div>
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">
                Conteneur sélectionné: {selectedContainer.cargo.nom || 'MAERSK'}
              </h3>
              <p className="text-gray-700">
                N° Conteneur: {selectedContainer.cargo.noDeConteneur || 'N/A'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informations générales */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg border-b pb-2">Informations générales</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de la compagnie
                  </label>
                  <input
                    type="text"
                    value={vgmData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de référence
                  </label>
                  <input
                    type="text"
                    value={vgmData.referenceNumber}
                    onChange={(e) => handleInputChange('referenceNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro BL
                  </label>
                  <input
                    type="text"
                    value={vgmData.blNumber}
                    onChange={(e) => handleInputChange('blNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Méthode de pesée
                  </label>
                  <select
                    value={vgmData.weighingMethod}
                    onChange={(e) => handleInputChange('weighingMethod', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="METHOD 1">Method 1</option>
                    <option value="METHOD 2">Method 2</option>
                  </select>
                </div>
              </div>

              {/* Poids et mesures */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg border-b pb-2">Poids et mesures</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Poids brut (kg)
                  </label>
                  <input
                    type="number"
                    value={vgmData.grossWeight}
                    onChange={(e) => handleInputChange('grossWeight', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tare du conteneur (kg)
                  </label>
                  <input
                    type="number"
                    value={vgmData.containerTare}
                    onChange={(e) => handleInputChange('containerTare', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Poids vérifié (VGM) - Calculé automatiquement
                  </label>
                  <input
                    type="number"
                    value={vgmData.verifiedWeight}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de vérification
                  </label>
                  <input
                    type="text"
                    value={vgmData.dateOfVerification}
                    onChange={(e) => handleInputChange('dateOfVerification', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex justify-between mt-8 pt-4 border-t">
              <Button
                onClick={() => setSelectedContainer(null)}
                variant="secondary"
                size="md"
              >
                ← Retour
              </Button>
              
              <Button
                onClick={generateVGM}
                variant="primary"
                size="md"
              >
                ⚖️ Générer VGM PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VGMModal;
