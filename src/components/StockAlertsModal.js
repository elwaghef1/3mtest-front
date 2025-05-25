import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Button from './Button';
import { useTranslation } from 'react-i18next';

const StockAlertsModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
    }
  }, [isOpen]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/stock/alerts');
      setAlerts(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des alertes:', error);
    } finally {
      setLoading(false);
    }
  };

  const ignoreAlert = async (alertId) => {
    try {
      await axios.patch(`/stock/alerts/${alertId}/ignore`);
      setAlerts(alerts.filter(alert => alert._id !== alertId));
    } catch (error) {
      console.error('Erreur lors de l\'ignorage de l\'alerte:', error);
    }
  };

  const checkAllAlerts = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/stock/alerts/check');
      setAlerts(response.data.alerts);
    } catch (error) {
      console.error('Erreur lors de la vérification des alertes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'STOCK_FAIBLE':
        return '⚠️';
      case 'STOCK_EPUISE':
        return '🚨';
      case 'STOCK_NEGATIF':
        return '🔴';
      default:
        return '📢';
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'STOCK_FAIBLE':
        return 'bg-yellow-50 border-yellow-200';
      case 'STOCK_EPUISE':
        return 'bg-red-50 border-red-200';
      case 'STOCK_NEGATIF':
        return 'bg-red-100 border-red-300';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            🚨 Alertes de Stock ({alerts.length})
          </h2>
          <div className="flex gap-2">
            <Button
              onClick={checkAllAlerts}
              disabled={loading}
              loading={loading}
              variant="primary"
              size="md"
            >
              Actualiser
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="md"
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[70vh]">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">✅</div>
              <p>Aucune alerte de stock active</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert._id}
                  className={`p-4 rounded-lg border ${getAlertColor(alert.typeAlerte)}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{getAlertIcon(alert.typeAlerte)}</span>
                        <h3 className="font-medium text-gray-800">
                          {alert.article?.nom || 'Article inconnu'} - {alert.depot?.nom || 'Dépôt inconnu'}
                        </h3>
                      </div>
                      
                      <p className="text-gray-600 mb-2">{alert.message}</p>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Stock actuel:</span>
                          <span className="ml-2">{alert.quantiteActuelle} kg</span>
                        </div>
                        {alert.seuilAlerte && (
                          <div>
                            <span className="font-medium">Seuil d'alerte:</span>
                            <span className="ml-2">{alert.seuilAlerte} kg</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-500 mt-2">
                        Créée le {new Date(alert.dateCreation).toLocaleString('fr-FR')}
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => ignoreAlert(alert._id)}
                      variant="outline"
                      size="sm"
                      className="ml-4"
                    >
                      Ignorer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockAlertsModal;
