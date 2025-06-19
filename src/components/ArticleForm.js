import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import Button from './Button';

function ArticleForm({ article, onClose, onArticleCreated }) {
  const [reference, setReference] = useState('');
  const [intitule, setIntitule] = useState('');
  const [nomScientifique, setNomScientifique] = useState('');
  const [specification, setSpecification] = useState('');
  const [taille, setTaille] = useState('');
  const [typeCarton, setTypeCarton] = useState('');
  const [prixSMCP, setPrixSMCP] = useState('');
  // Nouvel état pour la monnaie du prix SMCP
  const [prixSMCPCurrency, setPrixSMCPCurrency] = useState('MRU');
  const [loading, setLoading] = useState(false);

  // Préremplissage ou réinitialisation en fonction du mode (création/édition)
  useEffect(() => {
    if (article) {
      setReference(article.reference || '');
      setIntitule(article.intitule || '');
      setNomScientifique(article.nomScientifique || '');
      setSpecification(article.specification || '');
      setTaille(article.taille || '');
      setTypeCarton(article.typeCarton || '');
      setPrixSMCP(article.prixSMCP != null ? article.prixSMCP : '');
      setPrixSMCPCurrency(article.prixSMCPCurrency || 'MRU');
    } else {
      setReference('');
      setIntitule('');
      setNomScientifique('');
      setSpecification('');
      setTaille('');
      setTypeCarton('');
      setPrixSMCP('');
      setPrixSMCPCurrency('MRU');
    }
  }, [article]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      reference,
      intitule,
      nomScientifique,
      specification,
      taille,
      typeCarton,
      prixSMCP: prixSMCP ? Number(prixSMCP) : undefined,
      prixSMCPCurrency  // envoi de la monnaie sélectionnée
    };

    try {
      if (article) {
        await axios.put(`/articles/${article._id}`, payload);
      } else {
        await axios.post('/articles', payload);
      }
      onArticleCreated();
    } catch (err) {
      console.error("Erreur lors de la soumission de l'article :", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">
        {article ? "Modifier l'article" : 'Nouvel Article'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label>Référence</label>
          <input
            className="w-full border px-2 py-1"
            type="text"
            required
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>
        <div>
          <label>Intitulé</label>
          <input
            className="w-full border px-2 py-1"
            type="text"
            required
            value={intitule}
            onChange={(e) => setIntitule(e.target.value)}
          />
        </div>
        <div>
          <label>Nom scientifique</label>
          <input
            className="w-full border px-2 py-1"
            type="text"
            value={nomScientifique}
            onChange={(e) => setNomScientifique(e.target.value)}
            placeholder="ex: Sardina pilchardus"
          />
        </div>
        <div>
          <label>Spécification</label>
          <input
            className="w-full border px-2 py-1"
            type="text"
            value={specification}
            onChange={(e) => setSpecification(e.target.value)}
          />
        </div>
        <div>
          <label>Taille</label>
          <input
            className="w-full border px-2 py-1"
            type="text"
            value={taille}
            onChange={(e) => setTaille(e.target.value)}
          />
        </div>

        {/* Sélect pour Type Carton */}
        <div>
          <label>Type Carton</label>
          <select
            className="w-full border px-2 py-1"
            value={typeCarton}
            onChange={(e) => setTypeCarton(e.target.value)}
          >
            <option value="">-- Choisir --</option>
            <option value="1*20">1*20</option>
            <option value="2*10">2*10</option>
            <option value="autre">autre</option>
          </select>
        </div>

        {/* Champ pour Prix SMCP */}
        <div>
          <label>Prix SMCP</label>
          <input
            className="w-full border px-2 py-1"
            type="number"
            step="0.01"
            value={prixSMCP}
            onChange={(e) => setPrixSMCP(e.target.value)}
          />
        </div>

        {/* Sélect pour la monnaie du Prix SMCP */}
        <div>
          <label>Monnaie pour Prix SMCP</label>
          <select
            className="w-full border px-2 py-1"
            value={prixSMCPCurrency}
            onChange={(e) => setPrixSMCPCurrency(e.target.value)}
          >
            <option value="MRU">MRU</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={loading}
            loading={loading}
          >
            {article ? 'Modifier' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ArticleForm;
