import React, { useState, useEffect } from 'react';
import { notification, Badge, Dropdown, List, Button, Typography, Empty } from 'antd';
import { BellOutlined, CheckOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from '../api/axios';
import moment from 'moment';

const { Text } = Typography;

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
    // Vérifier les nouvelles notifications toutes les 30 secondes
    const interval = setInterval(checkForNewNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/quantites-manquantes/notifications');
      setNotifications(response.data);
      setUnreadCount(response.data.filter(n => !n.lu).length);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkForNewNotifications = async () => {
    try {
      const response = await axios.get('/quantites-manquantes/notifications/new');
      if (response.data.length > 0) {
        // Afficher une notification pour chaque nouveau stock disponible
        response.data.forEach(notif => {
          notification.success({
            message: 'Stock Disponible !',
            description: `${notif.article?.intitule || 'Article'} est maintenant disponible en quantité suffisante dans ${notif.depot?.intitule || 'Dépôt'}`,
            duration: 5,
            onClick: () => {
              // Rediriger vers la commande concernée
              window.location.href = `/commandes/${notif.commande._id}`;
            }
          });
        });
        
        // Recharger la liste des notifications
        loadNotifications();
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des nouvelles notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`/quantites-manquantes/notifications/${notificationId}/read`);
      loadNotifications();
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put('/quantites-manquantes/notifications/mark-all-read');
      loadNotifications();
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications comme lues:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`/quantites-manquantes/notifications/${notificationId}`);
      loadNotifications();
    } catch (error) {
      console.error('Erreur lors de la suppression de la notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'STOCK_DISPONIBLE':
        return <CheckOutlined style={{ color: '#52c41a' }} />;
      case 'STOCK_PARTIEL':
        return <BellOutlined style={{ color: '#fa8c16' }} />;
      default:
        return <BellOutlined />;
    }
  };

  const notificationMenu = (
    <div style={{ width: 400, maxHeight: 500, overflow: 'auto' }}>
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong>Notifications ({unreadCount} non lues)</Text>
        <div>
          <Button 
            type="link" 
            size="small" 
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            Tout marquer comme lu
          </Button>
          <Button 
            type="link" 
            size="small" 
            icon={<ReloadOutlined />}
            onClick={loadNotifications}
          />
        </div>
      </div>
      
      {notifications.length === 0 ? (
        <div style={{ padding: 20 }}>
          <Empty 
            description="Aucune notification"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      ) : (
        <List
          dataSource={notifications}
          loading={loading}
          renderItem={(item) => (
            <List.Item
              style={{
                padding: '12px 16px',
                backgroundColor: item.lu ? 'transparent' : '#f6ffed',
                borderLeft: item.lu ? 'none' : '3px solid #52c41a'
              }}
              actions={[
                !item.lu && (
                  <Button
                    type="link"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={() => markAsRead(item._id)}
                  />
                ),
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => deleteNotification(item._id)}
                />
              ].filter(Boolean)}
            >
              <List.Item.Meta
                avatar={getNotificationIcon(item.type)}
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{item.titre}</span>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {moment(item.dateCreation).fromNow()}
                    </Text>
                  </div>
                }
                description={
                  <div>
                    <Text>{item.message}</Text>
                    {item.quantiteManquante && (
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Commande: {item.quantiteManquante?.commande?.numeroCommande || 'N/A'} | 
                          Article: {item.quantiteManquante?.article?.intitule || 'N/A'} | 
                          Dépôt: {item.quantiteManquante?.depot?.intitule || 'N/A'}
                        </Text>
                      </div>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Dropdown
      dropdownRender={() => notificationMenu}
      trigger={['click']}
      open={visible}
      onOpenChange={setVisible}
      placement="bottomRight"
    >
      <Button
        type="text"
        icon={
          <Badge count={unreadCount} size="small">
            <BellOutlined style={{ fontSize: '18px' }} />
          </Badge>
        }
        style={{ border: 'none', boxShadow: 'none' }}
      />
    </Dropdown>
  );
};

export default NotificationCenter;
