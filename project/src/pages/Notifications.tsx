import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Bell, BellOff, Smartphone, Shield, MapPin, Clock, Battery, Moon, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Notification {
  id: string;
  child_id: string | null;
  type: string;
  title: string;
  message: string;
  severity: string;
  is_read: boolean;
  created_at: string;
}

interface Child {
  id: string;
  name: string;
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  app_install: Smartphone,
  protection_removed: Shield,
  screen_time_exceeded: Clock,
  sensitive_content: AlertTriangle,
  dangerous_words: AlertTriangle,
  night_activity: Moon,
  low_battery: Battery,
  bypass_attempt: Shield,
  geo_alert: MapPin,
  sos: AlertTriangle,
  system: Bell,
};

const SEVERITY_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  info: { bg: 'var(--primary-50)', color: 'var(--primary-600)', label: 'Info' },
  warning: { bg: 'var(--warning-50)', color: 'var(--warning-600)', label: 'Attention' },
  critical: { bg: 'var(--error-50)', color: 'var(--error-700)', label: 'Critique' },
};

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');

  const fetchData = async () => {
    if (!user) return;

    const { data: notifData } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (notifData) setNotifications(notifData);

    const { data: childrenData } = await supabase
      .from('children')
      .select('id, name')
      .eq('parent_id', user.id);
    if (childrenData) setChildren(childrenData);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getChildName = (childId: string | null) => {
    if (!childId) return null;
    return children.find(c => c.id === childId)?.name;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'A l\'instant';
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
    return date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'critical') return n.severity === 'critical';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const criticalCount = notifications.filter(n => n.severity === 'critical').length;

  if (loading) return <div className="page-loading">Chargement...</div>;

  return (
    <div className="notifications-page">
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <p>{unreadCount} non lue{unreadCount > 1 ? 's' : ''} {criticalCount > 0 && `dont ${criticalCount} critique${criticalCount > 1 ? 's' : ''}`}</p>
        </div>
        <div className="header-actions">
          {unreadCount > 0 && (
            <button className="btn-secondary" onClick={markAllRead}>
              <CheckCircle size={16} /> Tout marquer comme lu
            </button>
          )}
        </div>
      </div>

      <div className="filter-tabs">
        <button className={`filter-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          Toutes ({notifications.length})
        </button>
        <button className={`filter-tab ${filter === 'unread' ? 'active' : ''}`} onClick={() => setFilter('unread')}>
          Non lues ({unreadCount})
        </button>
        <button className={`filter-tab ${filter === 'critical' ? 'active' : ''}`} onClick={() => setFilter('critical')}>
          Critiques ({criticalCount})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <BellOff size={48} />
          <h2>Aucune notification</h2>
          <p>Vous etes a jour !</p>
        </div>
      ) : (
        <div className="notification-list">
          {filtered.map((notif) => {
            const IconComp = TYPE_ICONS[notif.type] || Bell;
            const severity = SEVERITY_STYLES[notif.severity] || SEVERITY_STYLES.info;
            const childName = getChildName(notif.child_id);

            return (
              <div
                key={notif.id}
                className={`notification-item ${!notif.is_read ? 'unread' : ''} severity-${notif.severity}`}
                onClick={() => !notif.is_read && markAsRead(notif.id)}
              >
                <div className="notif-icon" style={{ background: severity.bg, color: severity.color }}>
                  <IconComp size={18} />
                </div>
                <div className="notif-content">
                  <div className="notif-header">
                    <span className="notif-title">{notif.title}</span>
                    <span className={`severity-badge ${notif.severity}`}>{severity.label}</span>
                  </div>
                  <p className="notif-message">{notif.message}</p>
                  <div className="notif-meta">
                    {childName && <span className="notif-child">{childName}</span>}
                    <span className="notif-time">{formatDate(notif.created_at)}</span>
                  </div>
                </div>
                <button className="btn-icon" onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}>
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
