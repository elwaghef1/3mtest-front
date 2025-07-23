import React, { useState, useEffect } from 'react';
import Button from './Button';
import { generateVGMPDF } from './pdfGenerators';

const VGMModal = ({ commande, isOpen, onClose }) => {
  const [vgmData, setVgmData] = useState({
    companyName: 'MS FRIGO',
    referenceNumber: '',
    blNumber: '',
    shipperInfo: 'BP 545 Zone portuaire-Nouadhibou',
    weighingMethod: 'METHOD 1',
    poNumber: '',
    containers: []
  });

  // Initialiser les données lors de l'ouverture
  useEffect(() => {
    if (isOpen && commande) {
      const initialContainers = commande.cargo?.map((cargo, index) => ({
        containerNumber: cargo.noDeConteneur || `MNBU00${1917 + index}/0`,
        grossWeight: 29120,
        containerTare: 4640,
        verifiedWeight: 33760,
        dateOfVerification: new Date().toLocaleDateString('fr-FR'),
        nom: cargo.nom || 'MAERSK'
      })) || [];

      setVgmData({
        companyName: 'MS FRIGO',
        referenceNumber: `PO : ${commande.reference || 'REF001'}`,
        blNumber: commande.cargo?.[0]?.areDeConteneur || '253861304',
        shipperInfo: 'BP 545 Zone portuaire-Nouadhibou',
        weighingMethod: 'METHOD 1',
        poNumber: commande.reference || '',
        containers: initialContainers
      });
    }
  }, [isOpen, commande]);

  if (!isOpen) return null;

  const handleContainerChange = (index, field, value) => {
    const updatedContainers = [...vgmData.containers];
    updatedContainers[index][field] = value;
    
    // Recalculer le VGM si les poids changent
    if (field === 'grossWeight' || field === 'containerTare') {
      const grossWeight = parseFloat(updatedContainers[index].grossWeight) || 0;
      const containerTare = parseFloat(updatedContainers[index].containerTare) || 0;
      updatedContainers[index].verifiedWeight = grossWeight + containerTare;
    }
    
    setVgmData(prev => ({
      ...prev,
      containers: updatedContainers
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
      
      // Préparer les données pour le PDF
      const vgmInfo = {
        ...vgmData,
        containers: vgmData.containers,
        commande: commande
      };
      
      generateVGMPDF(vgmInfo, commande);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la génération du VGM:', error);
      alert('Erreur lors de la génération du PDF VGM : ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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

        {/* Informations générales */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Informations générales</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <option value="METHOD 1">METHOD 1</option>
                <option value="METHOD 2">METHOD 2</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section des conteneurs */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">
            Informations des conteneurs ({vgmData.containers.length} conteneur{vgmData.containers.length > 1 ? 's' : ''})
          </h3>
          
          {vgmData.containers.length > 0 ? (
            <div className="space-y-6">
              {vgmData.containers.map((container, index) => (
                <div key={index} className="border rounded-lg p-4 bg-blue-50">
                  <h4 className="font-semibold text-md mb-3 text-blue-800">
                    Conteneur {index + 1} - {container.nom}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Numéro du conteneur
                      </label>
                      <input
                        type="text"
                        value={container.containerNumber}
                        onChange={(e) => handleContainerChange(index, 'containerNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Poids brut (kg)
                      </label>
                      <input
                        type="number"
                        value={container.grossWeight}
                        onChange={(e) => handleContainerChange(index, 'grossWeight', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tare du conteneur (kg)
                      </label>
                      <input
                        type="number"
                        value={container.containerTare}
                        onChange={(e) => handleContainerChange(index, 'containerTare', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Poids vérifié VGM (kg) - Auto-calculé
                      </label>
                      <input
                        type="number"
                        value={container.verifiedWeight}
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
                        value={container.dateOfVerification}
                        onChange={(e) => handleContainerChange(index, 'dateOfVerification', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
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

        {/* Boutons d'action */}
        <div className="flex justify-end space-x-4 mt-8 pt-4 border-t">
          <Button
            onClick={onClose}
            variant="secondary"
            size="md"
          >
            Annuler
          </Button>
          
          <Button
            onClick={generateVGM}
            variant="primary"
            size="md"
            disabled={vgmData.containers.length === 0}
          >
            ⚖️ Générer VGM PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VGMModal;