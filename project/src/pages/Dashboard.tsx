import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Smartphone, Globe, MapPin, TriangleAlert as AlertTriangle, TrendingUp, Users, ShieldCheck, Shield, Battery, Lock, Sparkles, Hop as Home, GraduationCap, Moon, TreePalm as Palmtree, BookOpen, CircleAlert as AlertCircle, Zap, Heart, Star, Check, Eye } from 'lucide-react';

interface Child {
  id: string;
  name: string;
  age: number;
  device_name: string;
}

interface UsageStat {
  app_name: string;
  duration_minutes: number;
}

interface ConnectedDevice {
  id: string;
  device_name: string;
  device_type: string;
  battery_level: number | null;
  is_online: boolean;
  security_level: string;
}

interface ProtectionMode {
  id: string;
  mode_name: string;
  is_active: boolean;
}

interface Reward {
  id: string;
  task_name: string;
  task_type: string;
  reward_minutes: number;
  is_completed: boolean;
  streak_days: number;
}

const MODE_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  home: Home,
  school: GraduationCap,
  night: Moon,
  vacation: Palmtree,
  homework: BookOpen,
  emergency: AlertCircle,
  travel: MapPin,
  free_time: Zap,
};

const MODE_LABELS: Record<string, string> = {
  home: 'Maison',
  school: 'Ecole',
  night: 'Nuit',
  vacation: 'Vacances',
  homework: 'Devoirs',
  emergency: 'Urgence',
  travel: 'Voyage',
  free_time: 'Temps libre',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStat[]>([]);
  const [totalScreenTime, setTotalScreenTime] = useState(0);
  const [sosAlerts, setSosAlerts] = useState(0);
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [modes, setModes] = useState<ProtectionMode[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChildren = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('children')
      .select('*')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: true });
    if (data && data.length > 0) {
      setChildren(data);
      setSelectedChild(data[0]);
    }
    setLoading(false);
  };

  const fetchUsageStats = async (childId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('app_usage_logs')
      .select('app_name, duration_minutes')
      .eq('child_id', childId)
      .eq('logged_date', today);
    if (data) {
      setUsageStats(data);
      setTotalScreenTime(data.reduce((sum, d) => sum + d.duration_minutes, 0));
    }
    const { count } = await supabase
      .from('sos_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('child_id', childId)
      .eq('is_resolved', false);
    setSosAlerts(count ?? 0);
  };

  const fetchDevices = async (childId: string) => {
    const { data } = await supabase
      .from('connected_devices')
      .select('*')
      .eq('child_id', childId);
    if (data) setDevices(data);
  };

  const fetchModes = async (childId: string) => {
    const { data } = await supabase
      .from('protection_modes')
      .select('*')
      .eq('child_id', childId);
    if (data) setModes(data);
  };

  const fetchRewards = async (childId: string) => {
    const { data } = await supabase
      .from('reward_system')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setRewards(data);
  };

  useEffect(() => {
    fetchChildren();
  }, [user]);

  useEffect(() => {
    if (selectedChild) {
      fetchUsageStats(selectedChild.id);
      fetchDevices(selectedChild.id);
      fetchModes(selectedChild.id);
      fetchRewards(selectedChild.id);
    }
  }, [selectedChild]);

  const toggleMode = async (modeId: string, isActive: boolean) => {
    await supabase
      .from('protection_modes')
      .update({ is_active: !isActive })
      .eq('id', modeId);
    if (selectedChild) fetchModes(selectedChild.id);
  };

  const completeReward = async (rewardId: string) => {
    await supabase
      .from('reward_system')
      .update({ is_completed: true, completed_at: new Date().toISOString() })
      .eq('id', rewardId);
    if (selectedChild) fetchRewards(selectedChild.id);
  };

  const remoteLock = async () => {
    if (!selectedChild) return;
    await supabase.from('notifications').insert({
      user_id: user?.id,
      child_id: selectedChild.id,
      type: 'system',
      title: 'Verrouillage a distance',
      message: `L'appareil de ${selectedChild.name} a ete verrouille a distance`,
      severity: 'critical',
    });
  };

  if (loading) return <div className="page-loading">Chargement...</div>;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>Tableau de bord</h1>
          <p>Vue d'ensemble de la protection familiale</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={remoteLock}>
            <Lock size={16} /> Verrouiller a distance
          </button>
        </div>
      </div>

      {children.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <h2>Aucun enfant configure</h2>
          <p>Ajoutez votre premier enfant pour commencer la surveillance.</p>
          <button className="btn-primary" onClick={() => window.location.hash = '#/onboarding'}>
            Configuration guidee
          </button>
        </div>
      ) : (
        <>
          <div className="child-selector">
            {children.map((child) => (
              <button
                key={child.id}
                className={`child-tab ${selectedChild?.id === child.id ? 'active' : ''}`}
                onClick={() => setSelectedChild(child)}
              >
                <div className="child-avatar">{child.name.charAt(0).toUpperCase()}</div>
                <span>{child.name}</span>
              </button>
            ))}
          </div>

          {/* Device Status Bar */}
          {devices.length > 0 && (
            <div className="device-status-bar">
              {devices.map((device) => (
                <div key={device.id} className={`device-status-card ${device.is_online ? 'online' : 'offline'}`}>
                  <div className="device-status-header">
                    <Smartphone size={16} />
                    <span className="device-status-name">{device.device_name}</span>
                    <span className={`status-dot ${device.is_online ? 'online' : 'offline'}`} />
                  </div>
                  <div className="device-status-details">
                    {device.battery_level !== null && (
                      <span className="device-battery-info">
                        <Battery size={12} /> {device.battery_level}%
                      </span>
                    )}
                    <span className={`security-badge ${device.security_level}`}>
                      {device.security_level === 'high' ? 'Tres securise' : device.security_level === 'medium' ? 'Moyen' : device.security_level === 'low' ? 'Faible' : 'Critique'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Protection Modes */}
          {modes.length > 0 && (
            <div className="modes-bar">
              {modes.map((mode) => {
                const ModeIcon = MODE_ICONS[mode.mode_name] || Shield;
                return (
                  <button
                    key={mode.id}
                    className={`mode-chip ${mode.is_active ? 'active' : ''}`}
                    onClick={() => toggleMode(mode.id, mode.is_active)}
                  >
                    <ModeIcon size={14} />
                    <span>{MODE_LABELS[mode.mode_name] || mode.mode_name}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="stats-grid">
            <div className="stat-card stat-blue">
              <div className="stat-icon"><Clock size={24} /></div>
              <div className="stat-info">
                <span className="stat-value">{totalScreenTime} min</span>
                <span className="stat-label">Temps d'ecran aujourd'hui</span>
              </div>
            </div>
            <div className="stat-card stat-green">
              <div className="stat-icon"><Smartphone size={24} /></div>
              <div className="stat-info">
                <span className="stat-value">{usageStats.length}</span>
                <span className="stat-label">Applications utilisees</span>
              </div>
            </div>
            <div className="stat-card stat-orange">
              <div className="stat-icon"><Globe size={24} /></div>
              <div className="stat-info">
                <span className="stat-value"><ShieldCheck size={20} /> Actif</span>
                <span className="stat-label">Filtrage web</span>
              </div>
            </div>
            <div className="stat-card stat-red">
              <div className="stat-icon"><AlertTriangle size={24} /></div>
              <div className="stat-info">
                <span className="stat-value">{sosAlerts}</span>
                <span className="stat-label">Alertes SOS</span>
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="card">
              <div className="card-header">
                <h3><TrendingUp size={18} /> Utilisation des apps</h3>
              </div>
              <div className="card-body">
                {usageStats.length === 0 ? (
                  <p className="text-muted">Aucune donnee d'utilisation pour aujourd'hui</p>
                ) : (
                  <div className="usage-list">
                    {usageStats.map((stat, i) => (
                      <div key={i} className="usage-item">
                        <div className="usage-app">
                          <div className="app-icon-small"><Smartphone size={14} /></div>
                          <span>{stat.app_name}</span>
                        </div>
                        <div className="usage-bar-container">
                          <div className="usage-bar" style={{ width: `${Math.min((stat.duration_minutes / 120) * 100, 100)}%` }} />
                        </div>
                        <span className="usage-time">{stat.duration_minutes} min</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3><MapPin size={18} /> Acces rapide</h3>
              </div>
              <div className="card-body">
                <div className="quick-actions">
                  <button className="quick-action-btn" onClick={() => window.location.hash = '#/screen-time'}>
                    <Clock size={20} /><span>Temps d'ecran</span>
                  </button>
                  <button className="quick-action-btn" onClick={() => window.location.hash = '#/app-block'}>
                    <Smartphone size={20} /><span>Blocage apps</span>
                  </button>
                  <button className="quick-action-btn" onClick={() => window.location.hash = '#/web-filter'}>
                    <Globe size={20} /><span>Filtre web</span>
                  </button>
                  <button className="quick-action-btn" onClick={() => window.location.hash = '#/location'}>
                    <MapPin size={20} /><span>Localisation</span>
                  </button>
                  <button className="quick-action-btn" onClick={() => window.location.hash = '#/security'}>
                    <Shield size={20} /><span>Securite</span>
                  </button>
                  <button className="quick-action-btn" onClick={() => window.location.hash = '#/reports'}>
                    <TrendingUp size={20} /><span>Rapports</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Rewards Section */}
          {rewards.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3><Star size={18} className="text-orange" /> Systeme de recompenses</h3>
              </div>
              <div className="card-body">
                <div className="reward-list">
                  {rewards.map((reward) => (
                    <div key={reward.id} className={`reward-item ${reward.is_completed ? 'completed' : ''}`}>
                      <div className="reward-info">
                        <Heart size={16} className={reward.is_completed ? 'text-green' : 'text-orange'} />
                        <div>
                          <span className="reward-name">{reward.task_name}</span>
                          <span className="reward-meta">
                            +{reward.reward_minutes} min {reward.streak_days > 0 && `| Serie: ${reward.streak_days}j`}
                          </span>
                        </div>
                      </div>
                      {!reward.is_completed && (
                        <button className="btn-primary btn-sm" onClick={() => completeReward(reward.id)}>
                          <Check size={14} /> Valider
                        </button>
                      )}
                      {reward.is_completed && <span className="reward-done"><Star size={14} /> Fait !</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI Insights */}
          <div className="card ai-card">
            <div className="card-header">
              <h3><Sparkles size={18} /> Assistant IA</h3>
            </div>
            <div className="card-body">
              <div className="ai-insights">
                <div className="ai-insight-item">
                  <Sparkles size={14} />
                  <span>{selectedChild?.age && selectedChild.age <= 8
                    ? 'Pour un enfant de cet age, nous recommandons un temps d\'ecran maximum de 1h par jour et le blocage de tous les reseaux sociaux.'
                    : selectedChild?.age && selectedChild.age <= 12
                      ? 'Pour un preado, activez le GPS et le filtrage web. Limitez les reseaux sociaux et surveillez les messages.'
                      : 'Pour un adolescent, privilegiez le dialogue et les alertes plutot que le blocage total. Activez la detection de cyberharclement.'}</span>
                </div>
                <div className="ai-insight-item">
                  <Eye size={14} />
                  <span>Verifiez regulierement le centre de securite pour vous assurer que toutes les protections sont actives.</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
