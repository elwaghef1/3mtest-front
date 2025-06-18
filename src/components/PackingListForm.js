// frontend/src/components/PackingListForm.js
import React, { useState, useEffect } from 'react';
import Button from './Button';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const PackingListForm = ({ commande, isOpen, onClose, onSave }) => {
  const [packingData, setPackingData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Initialiser les données du packing list basées sur les cargos de la commande
  useEffect(() => {
    if (commande && commande.cargo && isOpen) {
      const initialData = commande.cargo.map((cargo, index) => {
        // Calculer les totaux pour ce cargo
        const totalQuantity = cargo.itemsAlloues ? 
          cargo.itemsAlloues.reduce((sum, item) => sum + (item.quantiteAllouee || 0), 0) : 0;
        
        const numOfBoxes = Math.ceil(totalQuantity / 20);
        const netWeight = totalQuantity;
        const grossWeight = netWeight + (1 * numOfBoxes);

        // Obtenir la taille à partir du premier article du cargo
        const firstItem = cargo.itemsAlloues && cargo.itemsAlloues.length > 0 ? 
          cargo.itemsAlloues[0] : null;
        const size = firstItem && firstItem.article ? firstItem.article.taille : '';

        // Obtenir le mois courant
        const currentDate = new Date();
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                       'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const currentMonth = `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

        return {
          containerNo: cargo.noDeConteneur || '',
          sealNo: cargo.noPlomb || '',
          size: size || '',
          marks: '', // À remplir par l'utilisateur
          prod: '', // À remplir par l'utilisateur
          date: currentMonth,
          box: '', // À remplir par l'utilisateur
          numOfBox: numOfBoxes,
          netWeight: netWeight,
          grossWeight: grossWeight
        };
      });
      
      setPackingData(initialData);
    }
  }, [commande, isOpen]);

  const handleInputChange = (index, field, value) => {
    const newData = [...packingData];
    newData[index] = { ...newData[index], [field]: value };
    
    // Recalculer automatiquement si nécessaire
    if (field === 'netWeight') {
      const numOfBoxes = newData[index].numOfBox || 0;
      newData[index].grossWeight = parseFloat(value) + (1 * numOfBoxes);
    } else if (field === 'numOfBox') {
      const netWeight = newData[index].netWeight || 0;
      newData[index].grossWeight = netWeight + (1 * parseFloat(value));
    }
    
    setPackingData(newData);
  };

  const calculateTotals = () => {
    const totals = {
      totalBoxes: packingData.reduce((sum, row) => sum + (parseFloat(row.numOfBox) || 0), 0),
      totalNetWeight: packingData.reduce((sum, row) => sum + (parseFloat(row.netWeight) || 0), 0),
      totalGrossWeight: packingData.reduce((sum, row) => sum + (parseFloat(row.grossWeight) || 0), 0)
    };
    return totals;
  };

  const generatePackingListPDF = () => {
    const doc = new jsPDF();
    const totals = calculateTotals();

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PACKING LIST', 105, 20, { align: 'center' });

    // Informations de la commande
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Commande: ${commande.reference || 'N/A'}`, 20, 40);
    doc.text(`Client: ${commande.client?.raisonSociale || 'N/A'}`, 20, 50);
    doc.text(`Destination: ${commande.destination || 'N/A'}`, 20, 60);

    // Tableau des données
    const tableData = packingData.map((row, index) => [
      index + 1,
      row.containerNo,
      row.sealNo,
      row.size,
      row.marks,
      row.prod,
      row.date,
      row.box,
      row.numOfBox,
      row.netWeight,
      row.grossWeight
    ]);

    // Ajouter la ligne des totaux
    tableData.push([
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'TOTAL',
      totals.totalBoxes,
      totals.totalNetWeight,
      totals.totalGrossWeight
    ]);

    doc.autoTable({
      head: [['#', 'Container N°', 'Seal N°', 'Size', 'Marks', 'Prod', 'Date', 'Box', 'Num of Box', 'Net Weight', 'Gross Weight']],
      body: tableData,
      startY: 80,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [66, 139, 202], textColor: 255 },
      columnStyles: {
        8: { halign: 'center' },
        9: { halign: 'right' },
        10: { halign: 'right' }
      }
    });

    // Sauvegarder le PDF
    doc.save(`Packing_List_${commande.reference || 'commande'}.pdf`);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Sauvegarder les données du packing list dans la commande
      if (onSave) {
        await onSave(packingData);
      }
      
      // Générer le PDF
      generatePackingListPDF();
      
      alert('Packing list créé avec succès !');
      onClose();
    } catch (error) {
      console.error('Erreur lors de la création du packing list:', error);
      alert('Erreur lors de la création du packing list');
    } finally {
      setLoading(false);
    }
  };

  const getArticleOptions = () => {
    if (!commande.items) return [];
    return commande.items.map(item => ({
      value: item.article?.reference || '',
      label: `${item.article?.reference || ''} - ${item.article?.specification || ''}`
    }));
  };

  const totals = calculateTotals();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Créer le Packing List</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Commande: <strong>{commande.reference}</strong> | 
              Client: <strong>{commande.client?.raisonSociale}</strong>
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-2 text-sm font-semibold">Container N°</th>
                  <th className="border border-gray-300 px-2 py-2 text-sm font-semibold">Seal N°</th>
                  <th className="border border-gray-300 px-2 py-2 text-sm font-semibold">Size</th>
                  <th className="border border-gray-300 px-2 py-2 text-sm font-semibold">Marks</th>
                  <th className="border border-gray-300 px-2 py-2 text-sm font-semibold">Prod</th>
                  <th className="border border-gray-300 px-2 py-2 text-sm font-semibold">Date</th>
                  <th className="border border-gray-300 px-2 py-2 text-sm font-semibold">Box</th>
                  <th className="border border-gray-300 px-2 py-2 text-sm font-semibold">Num of Box</th>
                  <th className="border border-gray-300 px-2 py-2 text-sm font-semibold">Net Weight</th>
                  <th className="border border-gray-300 px-2 py-2 text-sm font-semibold">Gross Weight</th>
                </tr>
              </thead>
              <tbody>
                {packingData.map((row, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        value={row.containerNo}
                        onChange={(e) => handleInputChange(index, 'containerNo', e.target.value)}
                        className="w-full p-1 text-sm border-none outline-none"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        value={row.sealNo}
                        onChange={(e) => handleInputChange(index, 'sealNo', e.target.value)}
                        className="w-full p-1 text-sm border-none outline-none"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        value={row.size}
                        onChange={(e) => handleInputChange(index, 'size', e.target.value)}
                        className="w-full p-1 text-sm border-none outline-none"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <select
                        value={row.marks}
                        onChange={(e) => handleInputChange(index, 'marks', e.target.value)}
                        className="w-full p-1 text-sm border-none outline-none"
                      >
                        <option value="">Sélectionner un article</option>
                        {getArticleOptions().map((option, optIndex) => (
                          <option key={optIndex} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        value={row.prod}
                        onChange={(e) => handleInputChange(index, 'prod', e.target.value)}
                        className="w-full p-1 text-sm border-none outline-none"
                        placeholder="Prod"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        value={row.date}
                        onChange={(e) => handleInputChange(index, 'date', e.target.value)}
                        className="w-full p-1 text-sm border-none outline-none"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        value={row.box}
                        onChange={(e) => handleInputChange(index, 'box', e.target.value)}
                        className="w-full p-1 text-sm border-none outline-none"
                        placeholder="Box"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="number"
                        value={row.numOfBox}
                        onChange={(e) => handleInputChange(index, 'numOfBox', e.target.value)}
                        className="w-full p-1 text-sm border-none outline-none text-center"
                        step="1"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="number"
                        value={row.netWeight}
                        onChange={(e) => handleInputChange(index, 'netWeight', e.target.value)}
                        className="w-full p-1 text-sm border-none outline-none text-right"
                        step="0.01"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="number"
                        value={row.grossWeight}
                        onChange={(e) => handleInputChange(index, 'grossWeight', e.target.value)}
                        className="w-full p-1 text-sm border-none outline-none text-right"
                        step="0.01"
                      />
                    </td>
                  </tr>
                ))}
                {/* Ligne des totaux */}
                <tr className="bg-gray-100 font-semibold">
                  <td colSpan="7" className="border border-gray-300 p-2 text-right">TOTAL:</td>
                  <td className="border border-gray-300 p-2 text-center">{totals.totalBoxes}</td>
                  <td className="border border-gray-300 p-2 text-right">{totals.totalNetWeight.toFixed(2)}</td>
                  <td className="border border-gray-300 p-2 text-right">{totals.totalGrossWeight.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              onClick={onClose}
              variant="secondary"
              size="md"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              variant="primary"
              size="md"
              disabled={loading}
            >
              {loading ? 'Création...' : 'Créer et Télécharger PDF'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackingListForm;
