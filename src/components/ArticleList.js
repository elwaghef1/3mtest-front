import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import Button from './Button';
import ArticleForm from './ArticleForm';
import { InformationCircleIcon } from '@heroicons/react/24/solid';
import Pagination from './Pagination';

// Export PDF & Excel
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

function ArticleList() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Gestion de la modale pour le formulaire (création / édition)
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);

  const [filtered, setFiltered] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Calcul des éléments à afficher (pagination)
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/articles');
      setArticles(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.error('Erreur récupération articles:', err);
      setError('Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = () => {
    setEditingArticle(null);
    setShowForm(true);
  };

  const handleEditArticle = (article) => {
    setEditingArticle(article);
    setShowForm(true);
  };

  const handleViewMovements = (article) => {
    navigate(`/articles/${article._id}/mouvements`);
  };

  const handleCloseForm = () => setShowForm(false);

  const handleArticleCreated = () => {
    setShowForm(false);
    fetchArticles();
  };

  // Fonction d'export PDF pour la liste des articles
  const exportToPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Liste des Articles', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, 14, 28);

    const columns = [
      { header: 'Référence', dataKey: 'reference' },
      { header: 'Code', dataKey: 'intitule' },
      { header: 'Nom scientifique', dataKey: 'nomScientifique' },
      { header: 'Spécification', dataKey: 'specification' },
      { header: 'Taille', dataKey: 'taille' },
      { header: 'Type Carton', dataKey: 'typeCarton' },
      { header: 'Kg/Carton', dataKey: 'kgParCarton' },
      { header: 'Prix SMCP', dataKey: 'prixSMCP' },
    ];

    const rows = articles.map((a) => ({
      reference: a.reference,
      intitule: a.intitule,
      nomScientifique: a.nomScientifique || '—',
      specification: a.specification || '—',
      taille: a.taille || '—',
      typeCarton: a.typeCarton || '—',
      kgParCarton: a.kgParCarton ? `${a.kgParCarton} kg` : '20 kg',
      prixSMCP:
        a.prixSMCP != null
          ? `${a.prixSMCP} ${a.prixSMCPCurrency || 'MRU'}`
          : '—',
    }));

    doc.autoTable({
      startY: 35,
      head: [columns.map((col) => col.header)],
      body: rows.map((row) => columns.map((col) => row[col.dataKey])),
      theme: 'grid',
      headStyles: {
        fillColor: 'gray',
        textColor: 'white',
        fontStyle: 'bold',
        fontSize: 10,
      },
      styles: { fontSize: 9, cellPadding: 2, valign: 'middle' },
      margin: { horizontal: 14 },
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        `Page ${i} / ${pageCount}`,
        doc.internal.pageSize.getWidth() - 25,
        doc.internal.pageSize.getHeight() - 10
      );
    }

    doc.save(`articles_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Fonction d'export Excel pour la liste des articles
  const exportToExcel = () => {
    const worksheetData = articles.map((a) => ({
      'Référence': a.reference,
      'Code': a.intitule,
      'Nom scientifique': a.nomScientifique || '—',
      'Spécification': a.specification || '—',
      'Taille': a.taille || '—',
      'Type Carton': a.typeCarton || '—',
      'Kg/Carton': a.kgParCarton ? `${a.kgParCarton} kg` : '20 kg',
      'Prix SMCP': a.prixSMCP != null ? `${a.prixSMCP} ${a.prixSMCPCurrency || 'MRU'}` : '—',
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Articles');
    XLSX.writeFile(workbook, 'articles_report.xlsx');
  };

  return (
    <div className="p-4 lg:p-6">
      {/* Header avec boutons d'export */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Liste des Articles</h1>
        <div className="flex items-center space-x-4">
          <Button
            onClick={exportToPDF}
            variant="primary"
            size="md"
          >
            Exporter en PDF
          </Button>
          <Button
            onClick={exportToExcel}
            variant="success"
            size="md"
          >
            Exporter en Excel
          </Button>
          <Button
            onClick={handleOpenForm}
            variant="primary"
            size="md"
          >
            + Nouvel Article
          </Button>
        </div>
      </div>

      {/* Affichage d'une erreur éventuelle */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
          {error} - Veuillez rafraîchir la page
        </div>
      )}

      {/* Chargement */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Chargement en cours...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <InformationCircleIcon className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">Aucun article</h3>
          <p className="mt-1 text-gray-500">Veuillez ajouter un nouvel article</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border shadow-sm">
          <table className="min-w-full border-collapse border border-gray-400">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-gray-700 border border-gray-400">
                  Référence
                </th>
                <th className="px-4 py-3 text-left font-bold text-gray-700 border border-gray-400">
                  Code
                </th>
                <th className="px-4 py-3 text-left font-bold text-gray-700 border border-gray-400">
                  Nom scientifique
                </th>
                <th className="px-4 py-3 text-left font-bold text-gray-700 border border-gray-400">
                  Spécification
                </th>
                <th className="px-4 py-3 text-left font-bold text-gray-700 border border-gray-400">
                  Taille
                </th>
                <th className="px-4 py-3 text-left font-bold text-gray-700 border border-gray-400">
                  Type Carton
                </th>
                <th className="px-4 py-3 text-left font-bold text-gray-700 border border-gray-400">
                  Kg/Carton
                </th>
                <th className="px-4 py-3 text-left font-bold text-gray-700 border border-gray-400">
                  Prix SMCP
                </th>
                <th className="px-4 py-3 text-left font-bold text-gray-700 border border-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {currentItems.map((a) => (
                <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 border border-gray-400">{a.reference}</td>
                  <td className="px-4 py-3 border border-gray-400">{a.intitule}</td>
                  <td className="px-4 py-3 border border-gray-400">{a.nomScientifique || '—'}</td>
                  <td className="px-4 py-3 border border-gray-400">{a.specification || '—'}</td>
                  <td className="px-4 py-3 border border-gray-400">{a.taille || '—'}</td>
                  <td className="px-4 py-3 border border-gray-400">{a.typeCarton || '—'}</td>
                  <td className="px-4 py-3 border border-gray-400">
                    <span className="font-medium text-blue-600">
                      {a.kgParCarton ? `${a.kgParCarton} kg` : '20 kg'}
                    </span>
                  </td>
                  <td className="px-4 py-3 border border-gray-400">
                    {a.prixSMCP != null
                      ? `${a.prixSMCP} ${a.prixSMCPCurrency || 'MRU'}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 border border-gray-400">
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleEditArticle(a)}
                        variant="warning"
                        size="sm"
                      >
                        Modifier
                      </Button>
                      <Button
                        onClick={() => handleViewMovements(a)}
                        variant="info"
                        size="sm"
                      >
                        Mouvements
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <Pagination
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalItems={filtered.length}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}

      {/* Modal Form (création / édition) */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <ArticleForm
              article={editingArticle}
              onClose={handleCloseForm}
              onArticleCreated={handleArticleCreated}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ArticleList;
