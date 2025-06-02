import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Badge, Dropdown, Spin, message, Row, Col, Statistic, Input, Select, DatePicker } from 'antd';
import { SearchOutlined, ReloadOutlined, ExclamationCircleOutlined, BellOutlined, CheckCircleOutlined, SettingOutlined } from '@ant-design/icons';
import axios from '../api/axios';
import moment from 'moment';
import BulkOperationsModal from './BulkOperationsModal';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const QuantiteManquanteList = () => {
  const [quantitesManquantes, setQuantitesManquantes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    statut: '',
    priorite: '',
    depot: '',
    dateDebut: null,
    dateFin: null,
    search: ''
  });
  const [dashboard, setDashboard] = useState({
    total: 0,
    enAttente: 0,
    enCours: 0,
    resolu: 0,
    hautePriorite: 0
  });
  const [depots, setDepots] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedQuantites, setSelectedQuantites] = useState([]);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);

  useEffect(() => {
    loadQuantitesManquantes();
    loadDashboard();
    loadDepots();
  }, [pagination.current, pagination.pageSize, filters]);

  const loadQuantitesManquantes = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters,
        dateDebut: filters.dateDebut ? filters.dateDebut.format('YYYY-MM-DD') : undefined,
        dateFin: filters.dateFin ? filters.dateFin.format('YYYY-MM-DD') : undefined
      };

      const response = await axios.get('/quantites-manquantes', { params });
      setQuantitesManquantes(response.data.quantitesManquantes);
      setPagination({
        ...pagination,
        total: response.data.total
      });
    } catch (error) {
      console.error('Erreur lors du chargement des quantités manquantes:', error);
      message.error('Erreur lors du chargement des quantités manquantes');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async () => {
    try {
      const response = await axios.get('/quantites-manquantes/dashboard');
      setDashboard(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement du tableau de bord:', error);
    }
  };

  const loadDepots = async () => {
    try {
      const response = await axios.get('/depots');
      setDepots(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des dépôts:', error);
    }
  };

  const handleUpdatePriorite = async (id, nouvellePriorite) => {
    try {
      await axios.put(`/quantites-manquantes/${id}/priorite`, {
        priorite: nouvellePriorite
      });
      message.success('Priorité mise à jour avec succès');
      loadQuantitesManquantes();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la priorité:', error);
      message.error('Erreur lors de la mise à jour de la priorité');
    }
  };

  const handleCheckStock = async (id) => {
    try {
      setLoading(true);
      const response = await axios.post(`/quantites-manquantes/${id}/check-stock`);
      
      if (response.data.stockDisponible) {
        message.success('Stock disponible ! La quantité manquante a été mise à jour.');
      } else {
        message.info('Stock toujours insuffisant');
      }
      
      loadQuantitesManquantes();
      loadDashboard();
    } catch (error) {
      console.error('Erreur lors de la vérification du stock:', error);
      message.error('Erreur lors de la vérification du stock');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkCheckStock = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Veuillez sélectionner au moins une quantité manquante');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/quantites-manquantes/bulk-check-stock', { 
        ids: selectedRowKeys 
      });
      
      message.success(`${response.data.stocksResolus} quantités manquantes résolues sur ${response.data.totalChecked} vérifiées`);
      
      loadQuantitesManquantes();
      loadDashboard();
      setSelectedRowKeys([]);
      setSelectedQuantites([]);
    } catch (error) {
      console.error('Erreur lors de la vérification en lot:', error);
      message.error('Erreur lors de la vérification en lot');
    } finally {
      setLoading(false);
    }
  };

  const handleRowSelectionChange = (selectedKeys, selectedRows) => {
    setSelectedRowKeys(selectedKeys);
    setSelectedQuantites(selectedRows);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: handleRowSelectionChange,
    getCheckboxProps: (record) => ({
      disabled: record.statut === 'RESOLU',
    }),
  };

  const getPrioriteColor = (priorite) => {
    switch (priorite) {
      case 'HAUTE': return 'red';
      case 'MOYENNE': return 'orange';
      case 'BASSE': return 'blue';
      default: return 'default';
    }
  };

  const getStatutColor = (statut) => {
    switch (statut) {
      case 'EN_ATTENTE': return 'orange';
      case 'EN_COURS': return 'blue';
      case 'RESOLU': return 'green';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Commande',
      dataIndex: ['commande', 'numeroCommande'],
      key: 'commande',
      render: (numero) => (
        <span style={{ fontWeight: 'bold' }}>{numero}</span>
      )
    },
    {
      title: 'Article',
      dataIndex: ['article', 'nom'],
      key: 'article'
    },
    {
      title: 'Dépôt',
      dataIndex: ['depot', 'nom'],
      key: 'depot'
    },
    {
      title: 'Quantité Manquante',
      dataIndex: 'quantiteManquante',
      key: 'quantiteManquante',
      render: (quantite, record) => (
        <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
          {quantite} {record.article?.unite}
        </span>
      )
    },
    {
      title: 'Priorité',
      dataIndex: 'priorite',
      key: 'priorite',
      render: (priorite, record) => (
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              { key: 'HAUTE', label: 'Haute' },
              { key: 'MOYENNE', label: 'Moyenne' },
              { key: 'BASSE', label: 'Basse' }
            ],
            onClick: ({ key }) => handleUpdatePriorite(record._id, key)
          }}
        >
          <Badge 
            color={getPrioriteColor(priorite)} 
            text={priorite}
            style={{ cursor: 'pointer' }}
          />
        </Dropdown>
      )
    },
    {
      title: 'Statut',
      dataIndex: 'statut',
      key: 'statut',
      render: (statut) => (
        <Badge 
          color={getStatutColor(statut)} 
          text={statut.replace('_', ' ')}
        />
      )
    },
    {
      title: 'Date Création',
      dataIndex: 'dateCreation',
      key: 'dateCreation',
      render: (date) => moment(date).format('DD/MM/YYYY HH:mm')
    },
    {
      title: 'Dernière Vérification',
      dataIndex: 'derniereVerification',
      key: 'derniereVerification',
      render: (date) => date ? moment(date).format('DD/MM/YYYY HH:mm') : 'Jamais'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<ReloadOutlined />}
          onClick={() => handleCheckStock(record._id)}
          disabled={record.statut === 'RESOLU'}
        >
          Vérifier Stock
        </Button>
      )
    }
  ];

  const handleFilterChange = (key, value) => {
    setFilters({
      ...filters,
      [key]: value
    });
    setPagination({
      ...pagination,
      current: 1
    });
  };

  const handleDateRangeChange = (dates) => {
    setFilters({
      ...filters,
      dateDebut: dates ? dates[0] : null,
      dateFin: dates ? dates[1] : null
    });
  };

  return (
    <div>
      {/* Tableau de bord */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total"
              value={dashboard.total}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="En Attente"
              value={dashboard.enAttente}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<BellOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="En Cours"
              value={dashboard.enCours}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ReloadOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Résolues"
              value={dashboard.resolu}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filtres */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Search
              placeholder="Rechercher..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              onSearch={() => loadQuantitesManquantes()}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="Statut"
              value={filters.statut}
              onChange={(value) => handleFilterChange('statut', value)}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="EN_ATTENTE">En Attente</Option>
              <Option value="EN_COURS">En Cours</Option>
              <Option value="RESOLU">Résolu</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="Priorité"
              value={filters.priorite}
              onChange={(value) => handleFilterChange('priorite', value)}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="HAUTE">Haute</Option>
              <Option value="MOYENNE">Moyenne</Option>
              <Option value="BASSE">Basse</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="Dépôt"
              value={filters.depot}
              onChange={(value) => handleFilterChange('depot', value)}
              allowClear
              style={{ width: '100%' }}
            >
              {depots.map(depot => (
                <Option key={depot._id} value={depot._id}>{depot.nom}</Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              value={filters.dateDebut && filters.dateFin ? [filters.dateDebut, filters.dateFin] : null}
              onChange={handleDateRangeChange}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Actions en lot */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={handleBulkCheckStock}
              loading={loading}
              disabled={selectedRowKeys.length === 0}
            >
              Vérifier Stock Sélectionnés ({selectedRowKeys.length})
            </Button>
          </Col>
          <Col>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setBulkModalVisible(true)}
              disabled={selectedRowKeys.length === 0}
            >
              Opérations en Lot ({selectedRowKeys.length})
            </Button>
          </Col>
          <Col>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                loadQuantitesManquantes();
                loadDashboard();
              }}
            >
              Actualiser
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Tableau des quantités manquantes */}
      <Card title="Quantités Manquantes">
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={quantitesManquantes}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} sur ${total} quantités manquantes`,
            onChange: (page, pageSize) => {
              setPagination({
                ...pagination,
                current: page,
                pageSize
              });
            }
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Modal d'opérations en lot */}
      <BulkOperationsModal
        visible={bulkModalVisible}
        onClose={() => setBulkModalVisible(false)}
        selectedQuantites={selectedQuantites}
        onRefresh={() => {
          loadQuantitesManquantes();
          loadDashboard();
          setSelectedRowKeys([]);
          setSelectedQuantites([]);
        }}
      />
    </div>
  );
};

export default QuantiteManquanteList;
