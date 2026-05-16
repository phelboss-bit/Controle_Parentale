import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, MapPin, Clock } from 'lucide-react';

interface Child {
  id: string;
  name: string;
}

interface SOSAlert {
  id: string;
  child_id: string;
  latitude: number | null;
  longitude: number | null;
  message: string | null;
  is_resolved: boolean;
  created_at: string;
  resolved_at: string | null;
}

export default function SOS() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChildren = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('children')
      .select('id, name')
      .eq('parent_id', user.id);
    if (data) {
      setChildren(data);
      fetchAlerts(data.map(c => c.id));
    }
    setLoading(false);
  };

  const fetchAlerts = async (childIds: string[]) => {
    if (childIds.length === 0) return;
    const { data } = await supabase
      .from('sos_alerts')
      .select('*')
      .in('child_id', childIds)
      .order('created_at', { ascending: false });
    if (data) setAlerts(data);
  };

  useEffect(() => {
    fetchChildren();
  }, [user]);

  const resolveAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('sos_alerts')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alertId);
    if (!error) {
      fetchAlerts(children.map(c => c.id));
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getChildName = (childId: string) => {
    return children.find(c => c.id === childId)?.name ?? 'Inconnu';
  };

  const activeAlerts = alerts.filter(a => !a.is_resolved);
  const resolvedAlerts = alerts.filter(a => a.is_resolved);

  if (loading) {
    return <div className="page-loading">Chargement...</div>;
  }

  return (
    <div className="sos-page">
      <div className="page-header">
        <div>
          <h1>Alertes SOS</h1>
          <p>Alertes d'urgence de vos enfants</p>
        </div>
        {activeAlerts.length > 0 && (
          <div className="alert-badge pulse">{activeAlerts.length} active{activeAlerts.length > 1 ? 's' : ''}</div>
        )}
      </div>

      {children.length === 0 ? (
        <div className="empty-state">
          <AlertTriangle size={48} />
          <h2>Aucun enfant configure</h2>
        </div>
      ) : (
        <>
          {activeAlerts.length > 0 && (
            <div className="active-alerts-section">
              <h2 className="section-title text-red">
                <AlertTriangle size={20} /> Alertes actives
              </h2>
              {activeAlerts.map((alert) => (
                <div key={alert.id} className="alert-card active">
                  <div className="alert-card-header">
                    <div className="alert-child-name">{getChildName(alert.child_id)}</div>
                    <div className="alert-time">
                      <Clock size={14} /> {formatDate(alert.created_at)}
                    </div>
                  </div>
                  {alert.message && (
                    <p className="alert-message">{alert.message}</p>
                  )}
                  {alert.latitude && alert.longitude && (
                    <div className="alert-location">
                      <MapPin size={14} />
                      <span>{alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</span>
                    </div>
                  )}
                  <button
                    className="btn-primary btn-resolve"
                    onClick={() => resolveAlert(alert.id)}
                  >
                    <CheckCircle size={18} /> Marquer comme resolu
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h3><CheckCircle size={18} /> Alertes resolues</h3>
            </div>
            <div className="card-body">
              {resolvedAlerts.length === 0 ? (
                <p className="text-muted">Aucune alerte resolue</p>
              ) : (
                <div className="resolved-list">
                  {resolvedAlerts.map((alert) => (
                    <div key={alert.id} className="alert-card resolved">
                      <div className="alert-card-header">
                        <div className="alert-child-name">{getChildName(alert.child_id)}</div>
                        <div className="alert-time">
                          <Clock size={14} /> {formatDate(alert.created_at)}
                        </div>
                      </div>
                      {alert.message && (
                        <p className="alert-message">{alert.message}</p>
                      )}
                      {alert.resolved_at && (
                        <div className="alert-resolved-time">
                          Resolu le {formatDate(alert.resolved_at)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {alerts.length === 0 && (
            <div className="empty-state small">
              <AlertTriangle size={32} />
              <p>Aucune alerte SOS pour le moment</p>
              <p className="text-muted">
                Les alertes SOS apparaitront ici lorsque votre enfant appuie sur le bouton d'urgence.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
