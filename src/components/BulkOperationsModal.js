import React, { useState, useEffect } from 'react';
import { Modal, Table, Button, Select, Progress, Alert, message, Row, Col, Statistic, Space } from 'antd';
import { ReloadOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import axios from '../api/axios';
import moment from 'moment';

const { Option } = Select;

const BulkOperationsModal = ({ visible, onClose, selectedQuantites = [], onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [operation, setOperation] = useState('');
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState('');

  const operations = [
    { value: 'check-stock', label: 'Vérifier le Stock', description: 'Vérifier la disponibilité du stock pour les quantités sélectionnées' },
    { value: 'update-priority-high', label: 'Marquer Priorité Haute', description: 'Mettre à jour la priorité vers HAUTE' },
    { value: 'update-priority-normal', label: 'Marquer Priorité Normale', description: 'Mettre à jour la priorité vers NORMALE' },
    { value: 'update-priority-low', label: 'Marquer Priorité Basse', description: 'Mettre à jour la priorité vers BASSE' }
  ];

  const handleExecuteOperation = async () => {
    if (!operation) {
      message.warning('Veuillez sélectionner une opération');
      return;
    }

    if (selectedQuantites.length === 0) {
      message.warning('Aucune quantité manquante sélectionnée');
      return;
    }

    setLoading(true);
    setResults([]);
    setProgress(0);

    try {
      if (operation === 'check-stock') {
        await executeStockCheck();
      } else if (operation.startsWith('update-priority')) {
        const priority = operation.split('-')[2].toUpperCase();
        await executePriorityUpdate(priority);
      }
    } catch (error) {
      console.error('Erreur lors de l\'exécution de l\'opération:', error);
      message.error('Erreur lors de l\'exécution de l\'opération');
    } finally {
      setLoading(false);
      setCurrentOperation('');
    }
  };

  const executeStockCheck = async () => {
    setCurrentOperation('Vérification du stock en cours...');
    
    try {
      const response = await axios.post('/quantites-manquantes/bulk-check-stock', {
        ids: selectedQuantites.map(q => q._id)
      });

      setResults([{
        type: 'success',
        message: `${response.data.stocksResolus} quantités manquantes résolues sur ${response.data.totalChecked} vérifiées`,
        details: response.data.details || []
      }]);

      setProgress(100);
      
      if (response.data.stocksResolus > 0) {
        message.success(`${response.data.stocksResolus} quantités manquantes ont été résolues !`);
        onRefresh && onRefresh();
      } else {
        message.info('Aucune nouvelle quantité disponible trouvée');
      }
    } catch (error) {
      setResults([{
        type: 'error',
        message: 'Erreur lors de la vérification du stock',
        details: [error.response?.data?.message || error.message]
      }]);
    }
  };

  const executePriorityUpdate = async (priority) => {
    setCurrentOperation(`Mise à jour de la priorité vers ${priority}...`);
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < selectedQuantites.length; i++) {
      const quantite = selectedQuantites[i];
      
      try {
        await axios.put(`/quantites-manquantes/${quantite._id}/priorite`, {
          priorite: priority
        });
        
        results.push({
          id: quantite._id,
          status: 'success',
          message: `Priorité mise à jour pour ${quantite.article?.nom || 'Article inconnu'}`
        });
        successCount++;
      } catch (error) {
        results.push({
          id: quantite._id,
          status: 'error',
          message: `Erreur pour ${quantite.article?.nom || 'Article inconnu'}: ${error.response?.data?.message || error.message}`
        });
        errorCount++;
      }

      setProgress(Math.round(((i + 1) / selectedQuantites.length) * 100));
    }

    setResults([{
      type: successCount > 0 ? 'success' : 'error',
      message: `${successCount} priorités mises à jour avec succès, ${errorCount} erreurs`,
      details: results
    }]);

    if (successCount > 0) {
      message.success(`${successCount} priorités mises à jour avec succès !`);
      onRefresh && onRefresh();
    }
  };

  const getOperationDescription = (opValue) => {
    return operations.find(op => op.value === opValue)?.description || '';
  };

  const columns = [
    {
      title: 'Article',
      dataIndex: ['article', 'nom'],
      key: 'article',
      width: 200
    },
    {
      title: 'Dépôt',
      dataIndex: ['depot', 'nom'],
      key: 'depot',
      width: 150
    },
    {
      title: 'Quantité Manquante',
      dataIndex: 'quantiteManquante',
      key: 'quantiteManquante',
      width: 150,
      render: (quantite, record) => `${quantite} ${record.article?.unite || ''}`
    },
    {
      title: 'Priorité',
      dataIndex: 'priorite',
      key: 'priorite',
      width: 100
    },
    {
      title: 'Statut',
      dataIndex: 'statut',
      key: 'statut',
      width: 120
    }
  ];

  return (
    <Modal
      title="Opérations en Lot"
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Fermer
        </Button>,
        <Button
          key="execute"
          type="primary"
          loading={loading}
          onClick={handleExecuteOperation}
          disabled={!operation || selectedQuantites.length === 0}
        >
          Exécuter l'Opération
        </Button>
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Statistiques de sélection */}
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="Quantités Sélectionnées"
              value={selectedQuantites.length}
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="En Attente"
              value={selectedQuantites.filter(q => q.statut === 'EN_ATTENTE').length}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Haute Priorité"
              value={selectedQuantites.filter(q => q.priorite === 'HAUTE').length}
            />
          </Col>
        </Row>

        {/* Sélection de l'opération */}
        <div>
          <label htmlFor="operation-select" style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
            Choisir une Opération :
          </label>
          <Select
            id="operation-select"
            style={{ width: '100%' }}
            placeholder="Sélectionner une opération"
            value={operation}
            onChange={setOperation}
          >
            {operations.map(op => (
              <Option key={op.value} value={op.value}>
                {op.label}
              </Option>
            ))}
          </Select>
          {operation && (
            <Alert
              message={getOperationDescription(operation)}
              type="info"
              style={{ marginTop: 8 }}
            />
          )}
        </div>

        {/* Progress bar pendant l'exécution */}
        {loading && (
          <div>
            <div style={{ marginBottom: 8 }}>
              <span>{currentOperation}</span>
            </div>
            <Progress percent={progress} status="active" />
          </div>
        )}

        {/* Résultats */}
        {results.length > 0 && (
          <div>
            <h4>Résultats de l'Opération :</h4>
            {results.map((result, index) => (
              <Alert
                key={index}
                message={result.message}
                type={result.type}
                style={{ marginBottom: 8 }}
                description={result.details && result.details.length > 0 && (
                  <div style={{ maxHeight: 200, overflow: 'auto' }}>
                    {result.details.map((detail, i) => (
                      <div key={i} style={{ fontSize: '12px', marginBottom: 4 }}>
                        {typeof detail === 'string' ? detail : detail.message}
                      </div>
                    ))}
                  </div>
                )}
              />
            ))}
          </div>
        )}

        {/* Tableau des quantités sélectionnées */}
        <div>
          <h4>Quantités Manquantes Sélectionnées :</h4>
          <Table
            columns={columns}
            dataSource={selectedQuantites}
            rowKey="_id"
            size="small"
            scroll={{ y: 300 }}
            pagination={false}
          />
        </div>
      </Space>
    </Modal>
  );
};

export default BulkOperationsModal;
