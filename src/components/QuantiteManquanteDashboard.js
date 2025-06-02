import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, List, Typography, Spin, Empty, Badge, Button } from 'antd';
import { 
  ExclamationCircleOutlined,  
  ClockCircleOutlined, 
  CheckCircleOutlined,
  WarningOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { Line, Pie, Column } from '@ant-design/plots';
import axios from '../api/axios';
import moment from 'moment';

const { Title, Text } = Typography;

const QuantiteManquanteDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalQuantitesManquantes: 0,
    enAttente: 0,
    enCours: 0,
    resolues: 0,
    hautePriorite: 0,
    tendance: [],
    repartitionParDepot: [],
    articlesLesPlusManquants: [],
    commandesAffectees: 0,
    valeurTotaleManquante: 0
  });
  const [trendsData, setTrendsData] = useState([]);
  const [depotData, setDepotData] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/quantites-manquantes/dashboard');
      setDashboardData(response.data);
      
      // Préparer les données pour les graphiques
      prepareTrendsData(response.data.tendance || []);
      prepareDepotData(response.data.repartitionParDepot || []);
    } catch (error) {
      console.error('Erreur lors du chargement du tableau de bord:', error);
    } finally {
      setLoading(false);
    }
  };

  const prepareTrendsData = (trends) => {
    const data = trends.map(item => ({
      date: moment(item.date).format('DD/MM'),
      'Quantités Manquantes': item.quantiteManquante,
      'Résolues': item.resolues
    }));
    setTrendsData(data);
  };

  const prepareDepotData = (depots) => {
    const data = depots.map(item => ({
      depot: item.nom,
      count: item.quantiteManquante,
      type: 'Quantités Manquantes'
    }));
    setDepotData(data);
  };

  const getChangeIcon = (change) => {
    if (change > 0) return <ArrowUpOutlined style={{ color: '#ff4d4f' }} />;
    if (change < 0) return <ArrowDownOutlined style={{ color: '#52c41a' }} />;
    return null;
  };

  const trendsConfig = {
    data: trendsData,
    xField: 'date',
    yField: 'value',
    seriesField: 'category',
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000,
      },
    },
  };

  const depotConfig = {
    data: depotData,
    xField: 'depot',
    yField: 'count',
    colorField: 'depot',
    columnWidthRatio: 0.8,
    meta: {
      depot: {
        alias: 'Dépôt',
      },
      count: {
        alias: 'Quantités Manquantes',
      },
    },
  };

  const pieConfig = {
    data: [
      { type: 'En Attente', value: dashboardData.enAttente },
      { type: 'En Cours', value: dashboardData.enCours },
      { type: 'Résolues', value: dashboardData.resolues }
    ],
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'spider',
      labelHeight: 28,
      content: '{name}\n{percentage}',
    },
    interactions: [
      {
        type: 'element-selected',
      },
      {
        type: 'element-active',
      },
    ],
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>Tableau de Bord - Quantités Manquantes</Title>
        <Button 
          type="primary" 
          icon={<ReloadOutlined />} 
          onClick={loadDashboard}
        >
          Actualiser
        </Button>
      </div>

      {/* Statistiques principales */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Quantités Manquantes"
              value={dashboardData.totalQuantitesManquantes}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              suffix={getChangeIcon(dashboardData.tendanceTotal)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="En Attente"
              value={dashboardData.enAttente}
              prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Haute Priorité"
              value={dashboardData.hautePriorite}
              prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Résolues"
              value={dashboardData.resolues}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Graphiques */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Évolution des Quantités Manquantes" extra={<ClockCircleOutlined />}>
            {trendsData.length > 0 ? (
              <Line {...trendsConfig} height={300} />
            ) : (
              <Empty description="Aucune donnée de tendance disponible" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Répartition par Statut">
            <Pie {...pieConfig} height={300} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Répartition par Dépôt">
            {depotData.length > 0 ? (
              <Column {...depotConfig} height={300} />
            ) : (
              <Empty description="Aucune donnée par dépôt disponible" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Articles les Plus Manquants">
            {dashboardData.articlesLesPlusManquants && dashboardData.articlesLesPlusManquants.length > 0 ? (
              <List
                size="small"
                dataSource={dashboardData.articlesLesPlusManquants}
                renderItem={(item, index) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Badge count={index + 1} style={{ backgroundColor: '#1890ff' }} />}
                      title={item.nom}
                      description={
                        <div>
                          <Text type="secondary">
                            {item.quantiteManquante} {item.unite} manquant(s)
                          </Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Dans {item.nombreDepots} dépôt(s)
                          </Text>
                        </div>
                      }
                    />
                    <Progress
                      type="circle"
                      size={50}
                      percent={Math.round((item.quantiteManquante / item.quantiteTotale) * 100)}
                      format={(percent) => `${percent}%`}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="Aucun article manquant" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Métriques additionnelles */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Commandes Affectées"
              value={dashboardData.commandesAffectees}
              prefix={<ExclamationCircleOutlined />}
              suffix="commandes"
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Valeur Totale Manquante"
              value={dashboardData.valeurTotaleManquante}
              prefix="€"
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Taux de Résolution"
              value={dashboardData.totalQuantitesManquantes > 0 ? 
                Math.round((dashboardData.resolues / dashboardData.totalQuantitesManquantes) * 100) : 0}
              suffix="%"
              prefix={<CheckCircleOutlined />}
            />
            <Progress
              percent={dashboardData.totalQuantitesManquantes > 0 ? 
                Math.round((dashboardData.resolues / dashboardData.totalQuantitesManquantes) * 100) : 0}
              size="small"
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default QuantiteManquanteDashboard;
