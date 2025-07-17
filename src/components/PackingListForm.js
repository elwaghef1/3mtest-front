// frontend/src/components/PackingListForm.js
import React, { useState, useEffect } from 'react';
import Button from './Button';
import './PackingListForm.css';
import { generatePackingListFromFormPDF } from './pdfGenerators';
import { getCartonQuantityFromKg } from '../utils/cartonsUtils';

const PackingListForm = ({ commande, isOpen, onClose, onSave }) => {
  const [containerData, setContainerData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Initialiser les données du packing list basées sur les containers de la commande
  useEffect(() => {
    if (commande && commande.cargo && isOpen) {
      const initialData = commande.cargo.map((cargo, index) => {
        return {
          containerInfo: {
            containerNo: cargo.noDeConteneur || '',
            sealNo: cargo.noPlomb || '',
            areDeConteneur: cargo.areDeConteneur || '20KG CARTON',
            poidsCarton: parseFloat(cargo.poidsCarton) || 22
          },
          articles: [], // Commencer avec une liste vide, les articles seront ajoutés via le bouton "+"
          prod: 'MAY2025', // Valeur par défaut pour le container (peut être supprimée)
          expiryDate: '24 MONTHS FROM DATE OF PRODUCTION' // Expiry date unique pour tout le container
        };
      });
      
      setContainerData(initialData);
    }
  }, [commande, isOpen]);

  // Obtenir les articles disponibles pour ajouter à un container
  const getAvailableArticles = () => {
    if (!commande || !commande.items) return [];
    
    return commande.items.map(item => ({
      id: item.article._id,
      reference: item.article.reference || 'N/A',
      specification: item.article.specification || '',
      taille: item.article.taille || 'M',
      quantiteKg: item.quantiteKg || 0
    }));
  };

  // Ajouter un article à un container
  const addArticleToContainer = (containerIndex, selectedArticleId) => {
    const availableArticles = getAvailableArticles();
    const selectedArticle = availableArticles.find(art => art.id === selectedArticleId);
    
    if (!selectedArticle) return;

    const newData = [...containerData];
    const container = newData[containerIndex];
    
    // Vérifier si l'article n'est pas déjà dans ce container
    const articleExists = container.articles.some(art => art.id === selectedArticle.id);
    if (articleExists) {
      alert('Cet article est déjà dans ce container.');
      return;
    }

    // Ajouter l'article avec les propriétés par défaut
    const newArticle = {
      id: selectedArticle.id,
      reference: selectedArticle.reference,
      specification: selectedArticle.specification,
      taille: selectedArticle.taille,
      quantiteCarton: parseFloat((getCartonQuantityFromKg(selectedArticle.quantiteKg, selectedArticle) || 1).toFixed(2)),
      selected: true,
      prodDate: 'JUNE2025',
      box: '2*10KG'
    };

    container.articles.push(newArticle);
    setContainerData(newData);
  };

  // Supprimer un article d'un container
  const removeArticleFromContainer = (containerIndex, articleIndex) => {
    const newData = [...containerData];
    newData[containerIndex].articles.splice(articleIndex, 1);
    setContainerData(newData);
  };

  // Fonction pour basculer la sélection d'un article
  const toggleArticleSelection = (containerIndex, articleIndex) => {
    const newData = [...containerData];
    newData[containerIndex].articles[articleIndex].selected = !newData[containerIndex].articles[articleIndex].selected;
    setContainerData(newData);
  };

  // Fonction pour mettre à jour le nombre de cartons d'un article
  const updateArticleCartons = (containerIndex, articleIndex, newCartons) => {
    const newData = [...containerData];
    newData[containerIndex].articles[articleIndex].quantiteCarton = parseFloat(newCartons) || 0;
    setContainerData(newData);
  };

  // Fonction pour mettre à jour les propriétés d'un article
  const updateArticleProperty = (containerIndex, articleIndex, property, value) => {
    const newData = [...containerData];
    newData[containerIndex].articles[articleIndex][property] = value;
    setContainerData(newData);
  };

  // Fonction pour mettre à jour les informations d'un container
  const updateContainerInfo = (containerIndex, field, value) => {
    const newData = [...containerData];
    newData[containerIndex].containerInfo[field] = value;
    setContainerData(newData);
  };

  // Fonction pour mettre à jour les dates de production/expiration
  const updateContainerDates = (containerIndex, field, value) => {
    const newData = [...containerData];
    newData[containerIndex][field] = value;
    setContainerData(newData);
  };

  // Calculer les totaux pour un container
  const calculateContainerTotals = (containerIndex) => {
    const container = containerData[containerIndex];
    if (!container) return { numOfBox: 0, netWeight: 0, grossWeight: 0 };

    const selectedArticles = container.articles.filter(article => article.selected);
    const totalBoxes = selectedArticles.reduce((sum, article) => sum + article.quantiteCarton, 0);
    
    // Calculer le poids net en utilisant le kgParCarton de chaque article
    const netWeight = selectedArticles.reduce((sum, article) => {
      const articleData = commande?.items?.find(item => item.article?._id === article.id);
      const kgPerCarton = articleData?.article?.kgParCarton || 20;
      return sum + (article.quantiteCarton * kgPerCarton);
    }, 0);
    
    // Calculer le poids brut : (nombre de cartons × Kg/Carton) + (nombre de cartons × 0.8)
    const grossWeight = selectedArticles.reduce((sum, article) => {
      const articleData = commande?.items?.find(item => item.article?._id === article.id);
      const kgPerCarton = articleData?.article?.kgParCarton || 20;
      const cartonWeight = (article.quantiteCarton * kgPerCarton) + (article.quantiteCarton * 0.8);
      return sum + cartonWeight;
    }, 0);

    return {
      numOfBox: totalBoxes,
      netWeight: netWeight,
      grossWeight: grossWeight
    };
  };

  // Calculer les totaux généraux
  const calculateGrandTotals = () => {
    let totalBoxes = 0;
    let totalNetWeight = 0;
    let totalGrossWeight = 0;

    containerData.forEach((_, index) => {
      const containerTotals = calculateContainerTotals(index);
      totalBoxes += containerTotals.numOfBox;
      totalNetWeight += containerTotals.netWeight;
      totalGrossWeight += containerTotals.grossWeight;
    });

    return {
      totalBoxes,
      totalNetWeight,
      totalGrossWeight
    };
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Préparer les données au format attendu pour la sauvegarde
      const packingData = containerData.map(container => {
        const totals = calculateContainerTotals(containerData.indexOf(container));
        const selectedArticles = container.articles.filter(article => article.selected);
        
        return {
          containerNo: container.containerInfo.containerNo,
          sealNo: container.containerInfo.sealNo,
          size: selectedArticles.map(a => a.taille).filter(Boolean).join(', '),
          marks: selectedArticles.map(a => `${a.reference} ${a.specification}`).join('\n'),
          prod: container.prod,
          date: container.expiryDate,
          box: container.containerInfo.areDeConteneur,
          numOfBox: totals.numOfBox,
          netWeight: totals.netWeight,
          grossWeight: totals.grossWeight
        };
      });

      // Sauvegarder les données du packing list dans la commande
      if (onSave) {
        await onSave(packingData);
      }
      
      // Générer le PDF avec la fonction des pdfGenerators
      generatePackingListFromFormPDF(commande, containerData);
      
      alert('Packing list créé avec succès !');
      onClose();
    } catch (error) {
      console.error('Erreur lors de la création du packing list:', error);
      alert('Erreur lors de la création du packing list');
    } finally {
      setLoading(false);
    }
  };

  const grandTotals = calculateGrandTotals();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-lg max-w-[98vw] w-full h-[95vh] overflow-y-auto">
        <div className="p-4 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Créer le Packing List</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="mb-3">
            <p className="text-sm text-gray-600">
              Commande: <strong>{commande.reference}</strong> | 
              Client: <strong>{commande.client?.raisonSociale}</strong>
            </p>
          </div>

          <div className="flex-1 overflow-auto space-y-6">
            {/* Totaux Généraux */}
            <div className="bg-gray-800 text-white p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">TOTAUX GÉNÉRAUX</h3>
                <div className="text-right">
                  <div className="text-lg">
                    <span className="font-bold">Cartons:</span> {grandTotals.totalBoxes} | 
                    <span className="font-bold ml-4">Net Weight:</span> {grandTotals.totalNetWeight}kg | 
                    <span className="font-bold ml-4">Gross Weight:</span> {grandTotals.totalGrossWeight.toFixed(2)}kg
                  </div>
                </div>
              </div>
            </div>

            {/* Tableau Récapitulatif Éditable Style Packing List */}
            <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
                PACKING LIST - FORMULAIRE ÉDITABLE
              </h3>
              
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#334155' }}>
                      <th style={{ 
                        border: '2px solid #000', 
                        padding: '12px 8px', 
                        textAlign: 'center', 
                        fontWeight: 'bold',
                        color: 'white',
                        width: '120px'
                      }}>
                        Container N°
                      </th>
                      <th style={{ 
                        border: '2px solid #000', 
                        padding: '12px 8px', 
                        textAlign: 'center', 
                        fontWeight: 'bold',
                        color: 'white',
                        width: '120px'
                      }}>
                        Seal Number
                      </th>
                      <th style={{ 
                        border: '2px solid #000', 
                        padding: '12px 8px', 
                        textAlign: 'center', 
                        fontWeight: 'bold',
                        color: 'white',
                        width: '80px'
                      }}>
                        Taille
                      </th>
                      <th style={{ 
                        border: '2px solid #000', 
                        padding: '12px 8px', 
                        textAlign: 'center', 
                        fontWeight: 'bold',
                        color: 'white',
                        width: '150px'
                      }}>
                        Marks
                      </th>
                      <th style={{ 
                        border: '2px solid #000', 
                        padding: '12px 8px', 
                        textAlign: 'center', 
                        fontWeight: 'bold',
                        color: 'white',
                        width: '100px'
                      }}>
                        Prod Date
                      </th>
                      <th style={{ 
                        border: '2px solid #000', 
                        padding: '12px 8px', 
                        textAlign: 'center', 
                        fontWeight: 'bold',
                        color: 'white',
                        width: '140px'
                      }}>
                        Expiry Date
                      </th>
                      <th style={{ 
                        border: '2px solid #000', 
                        padding: '12px 8px', 
                        textAlign: 'center', 
                        fontWeight: 'bold',
                        color: 'white',
                        width: '100px'
                      }}>
                        Box
                      </th>
                      <th style={{ 
                        border: '2px solid #000', 
                        padding: '12px 8px', 
                        textAlign: 'center', 
                        fontWeight: 'bold',
                        color: 'white',
                        width: '80px'
                      }}>
                        Num of Box
                      </th>
                      <th style={{ 
                        border: '2px solid #000', 
                        padding: '12px 8px', 
                        textAlign: 'center', 
                        fontWeight: 'bold',
                        color: 'white',
                        width: '100px'
                      }}>
                        Net Weight
                      </th>
                      <th style={{ 
                        border: '2px solid #000', 
                        padding: '12px 8px', 
                        textAlign: 'center', 
                        fontWeight: 'bold',
                        color: 'white',
                        width: '100px'
                      }}>
                        Gross Weight
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {containerData.map((container, containerIndex) => {
                      const selectedArticles = container.articles.filter(art => art.selected);
                      const availableArticles = getAvailableArticles();
                      const rows = [];
                      
                      // Afficher le container même s'il n'y a pas d'articles
                      if (selectedArticles.length === 0) {
                        rows.push(
                          <tr key={`empty-${containerIndex}`}>
                            {/* Container N° */}
                            <td style={{ 
                              border: '1px solid #000', 
                              padding: '8px', 
                              textAlign: 'center',
                              verticalAlign: 'middle',
                              backgroundColor: '#f8fafc'
                            }}>
                              <input
                                type="text"
                                value={container.containerInfo.containerNo}
                                onChange={(e) => updateContainerInfo(containerIndex, 'containerNo', e.target.value)}
                                className="w-full text-center text-xs border-0 bg-transparent font-semibold"
                                style={{ fontSize: '11px' }}
                              />
                            </td>
                            
                            {/* Seal Number */}
                            <td style={{ 
                              border: '1px solid #000', 
                              padding: '8px', 
                              textAlign: 'center',
                              verticalAlign: 'middle',
                              backgroundColor: '#f8fafc'
                            }}>
                              <input
                                type="text"
                                value={container.containerInfo.sealNo}
                                onChange={(e) => updateContainerInfo(containerIndex, 'sealNo', e.target.value)}
                                className="w-full text-center text-xs border-0 bg-transparent font-semibold"
                                style={{ fontSize: '11px' }}
                              />
                            </td>
                            
                            {/* Cellules vides avec bouton d'ajout */}
                            <td style={{ 
                              border: '1px solid #000', 
                              padding: '8px', 
                              textAlign: 'center'
                            }} colSpan="4">
                              <div className="flex items-center justify-center space-x-2">
                                <select
                                  data-container={containerIndex}
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      addArticleToContainer(containerIndex, e.target.value);
                                      e.target.value = '';
                                    }
                                  }}
                                  className="text-xs border border-gray-300 rounded px-2 py-1"
                                  style={{ fontSize: '10px', minWidth: '150px' }}
                                >
                                  <option value="">Ajouter un article...</option>
                                  {availableArticles.map(art => (
                                    <option key={art.id} value={art.id}>
                                      {art.reference} - {art.specification}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => {
                                    const select = document.querySelector(`select[data-container="${containerIndex}"]`);
                                    if (select && select.value) {
                                      addArticleToContainer(containerIndex, select.value);
                                      select.value = '';
                                    }
                                  }}
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold"
                                  style={{ fontSize: '12px' }}
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            
                            {/* Expiry Date */}
                            <td style={{ 
                              border: '1px solid #000', 
                              padding: '8px', 
                              textAlign: 'center',
                              verticalAlign: 'middle',
                              backgroundColor: '#f8fafc'
                            }}>
                              <textarea
                                value={container.expiryDate}
                                onChange={(e) => updateContainerDates(containerIndex, 'expiryDate', e.target.value)}
                                className="w-full text-center text-xs border-0 bg-transparent resize-none"
                                style={{ fontSize: '9px', height: '50px' }}
                                rows={4}
                              />
                            </td>
                            
                            {/* Cellules totales vides */}
                            <td style={{ 
                              border: '1px solid #000', 
                              padding: '8px', 
                              textAlign: 'center',
                              backgroundColor: '#f1f5f9'
                            }} colSpan="3">
                              <span style={{ fontSize: '10px', color: '#666' }}>Aucun article</span>
                            </td>
                          </tr>
                        );
                      } else {
                        // Afficher les articles existants
                        selectedArticles.forEach((article, articleIndex) => {
                          const isFirstRow = articleIndex === 0;
                          const rowSpan = selectedArticles.length + 1; // +1 pour la ligne "Ajouter"
                          
                          rows.push(
                            <tr key={`${containerIndex}-${articleIndex}`}>
                              {/* Container N° - Éditable sur première ligne uniquement */}
                              {isFirstRow && (
                                <td style={{ 
                                  border: '1px solid #000', 
                                  padding: '4px', 
                                  textAlign: 'center',
                                  verticalAlign: 'middle',
                                  backgroundColor: '#f8fafc'
                                }} rowSpan={rowSpan}>
                                  <input
                                    type="text"
                                    value={container.containerInfo.containerNo}
                                    onChange={(e) => updateContainerInfo(containerIndex, 'containerNo', e.target.value)}
                                    className="w-full text-center text-xs border-0 bg-transparent font-semibold"
                                    style={{ fontSize: '11px' }}
                                  />
                                </td>
                              )}
                              
                              {/* Seal Number - Éditable sur première ligne uniquement */}
                              {isFirstRow && (
                                <td style={{ 
                                  border: '1px solid #000', 
                                  padding: '4px', 
                                  textAlign: 'center',
                                  verticalAlign: 'middle',
                                  backgroundColor: '#f8fafc'
                                }} rowSpan={rowSpan}>
                                  <input
                                    type="text"
                                    value={container.containerInfo.sealNo}
                                    onChange={(e) => updateContainerInfo(containerIndex, 'sealNo', e.target.value)}
                                    className="w-full text-center text-xs border-0 bg-transparent font-semibold"
                                    style={{ fontSize: '11px' }}
                                  />
                                </td>
                              )}
                              
                              {/* Taille - Éditable pour chaque article */}
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '4px', 
                                textAlign: 'center'
                              }}>
                                <div className="flex items-center justify-between">
                                  <input
                                    type="text"
                                    value={article.taille}
                                    onChange={(e) => updateArticleProperty(containerIndex, articleIndex, 'taille', e.target.value)}
                                    className="w-full text-center text-xs border-0 bg-white"
                                    style={{ fontSize: '11px' }}
                                  />
                                  <button
                                    onClick={() => removeArticleFromContainer(containerIndex, articleIndex)}
                                    className="ml-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold"
                                    title="Supprimer cet article"
                                  >
                                    ×
                                  </button>
                                </div>
                              </td>
                              
                              {/* Marks - Éditable pour chaque article */}
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '4px', 
                                textAlign: 'left'
                              }}>
                                <div style={{ fontSize: '10px' }}>
                                  <input
                                    type="text"
                                    value={article.reference}
                                    onChange={(e) => updateArticleProperty(containerIndex, articleIndex, 'reference', e.target.value)}
                                    className="w-full text-xs border-0 bg-white mb-1 font-semibold"
                                    style={{ fontSize: '10px' }}
                                  />
                                  <input
                                    type="text"
                                    value={article.specification}
                                    onChange={(e) => updateArticleProperty(containerIndex, articleIndex, 'specification', e.target.value)}
                                    className="w-full text-xs border-0 bg-white"
                                    style={{ fontSize: '9px' }}
                                  />
                                </div>
                              </td>
                              
                              {/* Prod Date - Éditable pour chaque article */}
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '4px', 
                                textAlign: 'center'
                              }}>
                                <input
                                  type="text"
                                  value={article.prodDate}
                                  onChange={(e) => updateArticleProperty(containerIndex, articleIndex, 'prodDate', e.target.value)}
                                  className="w-full text-center text-xs border-0 bg-white"
                                  style={{ fontSize: '11px' }}
                                />
                              </td>
                              
                              {/* Expiry Date - Un seul champ pour tout le container */}
                              {isFirstRow && (
                                <td style={{ 
                                  border: '1px solid #000', 
                                  padding: '4px', 
                                  textAlign: 'center',
                                  verticalAlign: 'middle',
                                  backgroundColor: '#f8fafc'
                                }} rowSpan={rowSpan}>
                                  <textarea
                                    value={container.expiryDate}
                                    onChange={(e) => updateContainerDates(containerIndex, 'expiryDate', e.target.value)}
                                    className="w-full text-center text-xs border-0 bg-transparent resize-none"
                                    style={{ fontSize: '9px', height: '50px' }}
                                    rows={4}
                                  />
                                </td>
                              )}
                              
                              {/* Box - Éditable pour chaque article */}
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '4px', 
                                textAlign: 'center'
                              }}>
                                <input
                                  type="text"
                                  value={article.box}
                                  onChange={(e) => updateArticleProperty(containerIndex, articleIndex, 'box', e.target.value)}
                                  className="w-full text-center text-xs border-0 bg-white"
                                  style={{ fontSize: '10px' }}
                                />
                              </td>
                              
                              {/* Num of Box - Éditable pour chaque article */}
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '4px', 
                                textAlign: 'center'
                              }}>
                                <input
                                  type="number"
                                  min="0"
                                  value={article.quantiteCarton}
                                  onChange={(e) => updateArticleCartons(containerIndex, articleIndex, e.target.value)}
                                  className="w-full text-center text-xs border-0 bg-white"
                                  style={{ fontSize: '11px' }}
                                />
                              </td>
                              
                              {/* Net Weight - Calculé automatiquement */}
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '4px', 
                                textAlign: 'center',
                                backgroundColor: '#f1f5f9'
                              }}>
                                <span style={{ fontSize: '11px', fontWeight: 'bold' }}>
                                  {(() => {
                                    const articleData = commande?.items?.find(item => item.article?._id === article.id);
                                    const kgPerCarton = articleData?.article?.kgParCarton || 20;
                                    return (article.quantiteCarton * kgPerCarton).toFixed(0);
                                  })()} KG
                                </span>
                              </td>
                              
                              {/* Gross Weight - Calculé automatiquement */}
                              <td style={{ 
                                border: '1px solid #000', 
                                padding: '4px', 
                                textAlign: 'center',
                                backgroundColor: '#f1f5f9'
                              }}>
                                <span style={{ fontSize: '11px', fontWeight: 'bold' }}>
                                  {(() => {
                                    const articleData = commande?.items?.find(item => item.article?._id === article.id);
                                    const kgPerCarton = articleData?.article?.kgParCarton || 20;
                                    const grossWeight = (article.quantiteCarton * kgPerCarton) + (article.quantiteCarton * 0.8);
                                    return grossWeight.toFixed(1);
                                  })()} KG
                                </span>
                              </td>
                            </tr>
                          );
                        });

                        // Ajouter la ligne "Ajouter un article" après les articles existants
                        rows.push(
                          <tr key={`add-${containerIndex}`} style={{ backgroundColor: '#f8fafc' }}>
                            {/* Les cellules Container/Seal/Expiry sont déjà occupées par rowSpan */}
                            <td style={{ 
                              border: '1px solid #000', 
                              padding: '6px', 
                              textAlign: 'center'
                            }} colSpan="5">
                              <div className="flex items-center justify-center space-x-2">
                                <select
                                  data-container={containerIndex}
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      addArticleToContainer(containerIndex, e.target.value);
                                      e.target.value = '';
                                    }
                                  }}
                                  className="text-xs border border-gray-300 rounded px-2 py-1"
                                  style={{ fontSize: '10px', minWidth: '200px' }}
                                >
                                  <option value="">Ajouter un autre article...</option>
                                  {availableArticles.filter(art => 
                                    !container.articles.some(existingArt => existingArt.id === art.id)
                                  ).map(art => (
                                    <option key={art.id} value={art.id}>
                                      {art.reference} - {art.specification}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => {
                                    const select = document.querySelector(`select[data-container="${containerIndex}"]`);
                                    if (select && select.value) {
                                      addArticleToContainer(containerIndex, select.value);
                                      select.value = '';
                                    }
                                  }}
                                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-bold"
                                  style={{ fontSize: '12px' }}
                                >
                                  + Article
                                </button>
                              </div>
                            </td>
                            
                            {/* Colonnes de totaux vides pour cette ligne */}
                            <td style={{ 
                              border: '1px solid #000', 
                              padding: '6px', 
                              textAlign: 'center',
                              backgroundColor: '#f8fafc'
                            }} colSpan="3">
                              <span style={{ fontSize: '9px', color: '#666' }}>Ajouter articles</span>
                            </td>
                          </tr>
                        );
                      }

                      return rows;
                    })}
                    
                    {/* Ligne TOTAL */}
                    <tr style={{ backgroundColor: '#1e293b', color: 'white' }}>
                      <td style={{ 
                        border: '2px solid #000', 
                        padding: '12px 8px', 
                        textAlign: 'center',
                        fontWeight: 'bold',
                        color: 'white'
                      }} colSpan="7">
                        TOTAL
                      </td>
                      <td style={{ 
                        border: '2px solid #000', 
                        padding: '12px 8px', 
                        textAlign: 'center',
                        fontWeight: 'bold',
                        color: 'white'
                      }}>
                        {grandTotals.totalBoxes}
                      </td>
                      <td style={{ 
                        border: '2px solid #000', 
                        padding: '12px 8px', 
                        textAlign: 'center',
                        fontWeight: 'bold',
                        color: 'white'
                      }}>
                        {grandTotals.totalNetWeight} KG
                      </td>
                      <td style={{ 
                        border: '2px solid #000', 
                        padding: '12px 8px', 
                        textAlign: 'center',
                        fontWeight: 'bold',
                        color: 'white'
                      }}>
                        {grandTotals.totalGrossWeight.toFixed(0)} KG
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-4 pt-4 border-t bg-white">
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
