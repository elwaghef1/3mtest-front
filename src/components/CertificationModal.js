// frontend/src/components/CertificationModal.js
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { generateCertificatePDF } from './pdfGenerators';

const CertificationModal = ({ commande, isOpen, onClose }) => {
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [totalColis, setTotalColis] = useState(1400);
  const [poidsNet, setPoidsNet] = useState(28000);
  const [poidsBrut, setPoidsBrut] = useState(29120);

  // Fonction utilitaire pour récupérer le poids par carton
  const getKgPerCarton = (article) => {
    return article?.kgParCarton || 20;
  };

  // Calculer le poids brut automatiquement en fonction des articles sélectionnés
  useEffect(() => {
    // Calculer le poids net total des articles sélectionnés
    const poidsNetTotal = selectedArticles
      .filter(art => art.selected)
      .reduce((sum, art) => {
        const article = commande?.items?.find(item => item.article?._id === art.articleId)?.article;
        const kgParCarton = getKgPerCarton(article);
        return sum + (art.quantite * kgParCarton);
      }, 0);
    
    // Ajouter un poids d'emballage approximatif (0.8kg par carton)
    const poidsEmballage = totalColis * 0.8;
    const poidsBrutCalculé = poidsNetTotal + poidsEmballage;
    
    setPoidsBrut(poidsBrutCalculé);
  }, [totalColis, selectedArticles, commande]);

  if (!isOpen) return null;

  const handleContainerSelect = (cargo, index) => {
    setSelectedContainer({ cargo, index });
    setShowArticleForm(true);
    
    // Initialiser avec tous les articles de la commande
    const initialArticles = commande.items.map(item => {
      const kgPerCarton = getKgPerCarton(item.article);
      return {
        articleId: item.article._id,
        reference: item.article.reference,
        specification: item.article.specification,
        taille: item.article.taille,
        selected: true,
        quantite: Math.floor(item.quantiteKg / kgPerCarton), // Utiliser le poids par carton de l'article
        poidsNet: item.quantiteKg
      };
    });
    
    setSelectedArticles(initialArticles);
    
    // Calculer les totaux
    const totalQuantite = initialArticles.reduce((sum, art) => sum + art.quantite, 0);
    const totalPoids = initialArticles.reduce((sum, art) => sum + art.poidsNet, 0);
    
    setTotalColis(totalQuantite);
    setPoidsNet(totalPoids);
  };

  const handleArticleToggle = (articleId) => {
    setSelectedArticles(prev => prev.map(art => 
      art.articleId === articleId 
        ? { ...art, selected: !art.selected }
        : art
    ));
  };

  const handleQuantiteChange = (articleId, value) => {
    setSelectedArticles(prev => prev.map(art => 
      art.articleId === articleId 
        ? { ...art, quantite: parseInt(value) || 0 }
        : art
    ));
  };

  const handlePoidsChange = (articleId, value) => {
    setSelectedArticles(prev => prev.map(art => 
      art.articleId === articleId 
        ? { ...art, poidsNet: parseFloat(value) || 0 }
        : art
    ));
  };

  const recalculateTotals = () => {
    const selectedOnly = selectedArticles.filter(art => art.selected);
    const totalQuantite = selectedOnly.reduce((sum, art) => sum + art.quantite, 0);
    const totalPoids = selectedOnly.reduce((sum, art) => sum + art.poidsNet, 0);
    
    setTotalColis(totalQuantite);
    setPoidsNet(totalPoids);
  };

  const generateCertificate = () => {
    const selectedOnly = selectedArticles.filter(art => art.selected);
    
    // Vérifications de sécurité
    if (!selectedContainer || !selectedContainer.cargo) {
      alert('Erreur: Aucun conteneur sélectionné');
      return;
    }
    
    if (selectedOnly.length === 0) {
      alert('Veuillez sélectionner au moins un article');
      return;
    }
    
    // Préparer les données pour le PDF avec la structure correcte
    const certificateData = {
      cargo: selectedContainer.cargo, // Structure correcte avec cargo en tant qu'objet séparé
      commande: {
        ...commande,
        consigne: commande.consigne || 'MARAL FOOD S.L',
        adresseConsigne: commande.adresseConsigne || 'Port de Pêche-Treichville ZONE portuaire Vridi\n04 B.P. 1293 Abidjan 04'
      },
      articles: selectedOnly,
      totals: {
        totalColis,
        poidsNet,
        poidsBrut
      }
    };
    
    console.log('Données du certificat:', certificateData); // Debug
    
    try {
      generateCertificatePDF(certificateData, commande, selectedContainer.index);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Erreur lors de la génération du certificat. Veuillez réessayer.');
    }
  };

  const getProductDescription = () => {
    const selectedOnly = selectedArticles.filter(art => art.selected);
    if (selectedOnly.length === 1) {
      const article = selectedOnly[0];
      return `${article.reference} - ${article.specification} - ${article.taille} `;
    } else if (selectedOnly.length > 1) {
      return "Regarder l'annexe";
    }
    return "SARDINELLA AURITA"; // Défaut
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {!showArticleForm ? 'Sélectionner un Conteneur' : 'Configuration du Certificat CH'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {!showArticleForm ? (
          // Liste des conteneurs
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">
              Sélectionnez le conteneur pour lequel vous souhaitez créer un certificat CH :
            </p>
            
            {commande.cargo && commande.cargo.length > 0 ? (
              commande.cargo.map((cargo, index) => (
                <div
                  key={index}
                  className="border border-gray-300 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleContainerSelect(cargo, index)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-lg">{cargo.nom || `Cargo ${index + 1}`}</h3>
                      <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-gray-600">
                        <div>N° Conteneur: {cargo.noDeConteneur || 'Non défini'}</div>
                        <div>PL: {cargo.areDeConteneur || 'Non défini'}</div>
                        <div>REF/NEMB: {cargo.refNemb || 'Non défini'}</div>
                        <div>REF/EMB: {cargo.refEmb || 'Non défini'}</div>
                      </div>
                    </div>
                    <Button variant="success" size="sm">
                      Créer CH
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                Aucun conteneur trouvé pour cette commande.
              </div>
            )}
          </div>
        ) : (
          // Formulaire de sélection d'articles
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">
                Conteneur sélectionné: {selectedContainer.cargo.nom} - {selectedContainer.cargo.noDeConteneur}
              </h3>
              <p className="text-gray-600">
                Sélectionnez les articles et ajustez les quantités pour ce certificat :
              </p>
            </div>

            {/* Tableau des articles */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 p-3 text-left">Sélection</th>
                    <th className="border border-gray-300 p-3 text-left">Espèces / (Nom Scientifique)</th>
                    <th className="border border-gray-300 p-3 text-left">Nature du produit</th>
                    <th className="border border-gray-300 p-3 text-left">Type de traitement</th>
                    <th className="border border-gray-300 p-3 text-left">Nom et numéro d'agrément des établissements</th>
                    <th className="border border-gray-300 p-3 text-left">Quantité en Colis</th>
                    <th className="border border-gray-300 p-3 text-left">Poids net / Kg</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedArticles.map((article, index) => (
                    <tr key={article.articleId} className={article.selected ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 p-3">
                        <input
                          type="checkbox"
                          checked={article.selected}
                          onChange={() => handleArticleToggle(article.articleId)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="border border-gray-300 p-3">
                        <div className="font-medium">{article.reference}</div>
                        <div className="text-sm text-gray-600">{article.specification} - {article.taille}</div>
                      </td>
                      <td className="border border-gray-300 p-3">Produit de la pêche</td>
                      <td className="border border-gray-300 p-3">Entier congelé</td>
                      <td className="border border-gray-300 p-3">AFCO GROUP SA – 02.133</td>
                      <td className="border border-gray-300 p-3">
                        <input
                          type="number"
                          value={article.quantite}
                          onChange={(e) => handleQuantiteChange(article.articleId, e.target.value)}
                          disabled={!article.selected}
                          className="w-20 p-1 border rounded"
                          min="0"
                        />
                      </td>
                      <td className="border border-gray-300 p-3">
                        <input
                          type="number"
                          step="0.01"
                          value={article.poidsNet}
                          onChange={(e) => handlePoidsChange(article.articleId, e.target.value)}
                          disabled={!article.selected}
                          className="w-24 p-1 border rounded"
                          min="0"
                        />
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-200 font-bold">
                    <td className="border border-gray-300 p-3" colSpan="5">TOTAL</td>
                    <td className="border border-gray-300 p-3">
                      <input
                        type="number"
                        value={totalColis}
                        onChange={(e) => setTotalColis(parseInt(e.target.value) || 0)}
                        className="w-20 p-1 border rounded font-bold"
                        min="0"
                      />
                    </td>
                    <td className="border border-gray-300 p-3">
                      <input
                        type="number"
                        step="0.01"
                        value={poidsNet}
                        onChange={(e) => setPoidsNet(parseFloat(e.target.value) || 0)}
                        className="w-24 p-1 border rounded font-bold"
                        min="0"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Poids brut */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-4">
                <label className="font-medium">Poids brut :</label>
                <input
                  type="number"
                  step="0.01"
                  value={poidsBrut}
                  onChange={(e) => setPoidsBrut(parseFloat(e.target.value) || 0)}
                  className="p-2 border rounded w-32"
                  min="0"
                />
                <span>kg</span>
                <button
                  type="button"
                  onClick={recalculateTotals}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  Recalculer
                </button>
              </div>
            </div>

            {/* Aperçu de la description */}
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Aperçu de la description du produit :</h4>
              <p className="text-gray-700">{getProductDescription()}</p>
            </div>

            {/* Boutons d'action */}
            <div className="flex justify-between space-x-4">
              <Button
                onClick={() => setShowArticleForm(false)}
                variant="secondary"
                size="md"
              >
                ← Retour aux conteneurs
              </Button>
              
              <div className="space-x-2">
                <Button
                  onClick={onClose}
                  variant="secondary"
                  size="md"
                >
                  Annuler
                </Button>
                <Button
                  onClick={generateCertificate}
                  variant="success"
                  size="md"
                  disabled={selectedArticles.filter(art => art.selected).length === 0}
                >
                  📄 Télécharger le Certificat CH
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificationModal;
