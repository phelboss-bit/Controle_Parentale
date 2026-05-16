import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Smartphone, KeyRound, FingerprintPattern as Fingerprint, Lock, Battery, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Circle as XCircle } from 'lucide-react';

interface SecuritySetting {
  id: string;
  mfa_enabled: boolean;
  mfa_method: string;
  phone_verified: boolean;
  phone_number: string | null;
  biometric_enabled: boolean;
  trusted_devices: Record<string, unknown>[];
}

interface ConnectedDevice {
  id: string;
  child_id: string;
  device_name: string;
  device_type: string;
  os_version: string | null;
  battery_level: number | null;
  is_online: boolean;
  last_seen: string;
  security_level: string;
  anti_bypass_active: boolean;
}

interface BypassAttempt {
  id: string;
  child_id: string;
  attempt_type: string;
  details: string | null;
  detected_at: string;
  was_prevented: boolean;
}

interface Child {
  id: string;
  name: string;
}

const SECURITY_LEVELS: Record<string, { label: string; color: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>; desc: string }> = {
  high: { label: 'Tres securise', color: '#22c55e', icon: ShieldCheck, desc: 'Toutes les protections sont actives' },
  medium: { label: 'Protection moyenne', color: '#f59e0b', icon: ShieldAlert, desc: 'Certaines protections sont desactivees' },
  low: { label: 'Protection faible', color: '#ef4444', icon: ShieldX, desc: 'Protections insuffisantes' },
  critical: { label: 'Critique', color: '#dc2626', icon: ShieldX, desc: 'Protections desactivees ou contournees' },
};

const BYPASS_LABELS: Record<string, string> = {
  uninstall: 'Tentative de desinstallation',
  time_change: 'Changement d\'heure systeme',
  permission_revoke: 'Retrait de permission',
  vpn: 'Utilisation de VPN',
  safe_mode: 'Demarrage en mode sans echec',
  apk_install: 'Installation d\'APK externe',
  proxy: 'Utilisation de proxy',
  dev_mode: 'Activation du mode developpeur',
};

export default function SecurityCenter() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [securitySettings, setSecuritySettings] = useState<SecuritySetting | null>(null);
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [bypassAttempts, setBypassAttempts] = useState<BypassAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;

    const { data: childrenData } = await supabase
      .from('children')
      .select('id, name')
      .eq('parent_id', user.id);
    if (childrenData) setChildren(childrenData);

    const { data: secData } = await supabase
      .from('security_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (secData) setSecuritySettings(secData);

    if (childrenData && childrenData.length > 0) {
      const childIds = childrenData.map(c => c.id);

      const { data: devData } = await supabase
        .from('connected_devices')
        .select('*')
        .in('child_id', childIds);
      if (devData) setDevices(devData);

      const { data: bypassData } = await supabase
        .from('bypass_attempts')
        .select('*')
        .in('child_id', childIds)
        .order('detected_at', { ascending: false })
        .limit(20);
      if (bypassData) setBypassAttempts(bypassData);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const getSecurityScore = () => {
    let score = 50;
    if (securitySettings?.mfa_enabled) score += 15;
    if (securitySettings?.biometric_enabled) score += 10;
    if (securitySettings?.phone_verified) score += 10;
    const onlineDevices = devices.filter(d => d.is_online && d.anti_bypass_active);
    score += Math.min(onlineDevices.length * 5, 15);
    return Math.min(score, 100);
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: '#22c55e' };
    if (score >= 60) return { label: 'Bon', color: '#84cc16' };
    if (score >= 40) return { label: 'Moyen', color: '#f59e0b' };
    return { label: 'Faible', color: '#ef4444' };
  };

  const toggleMfa = async () => {
    if (!securitySettings) return;
    const newEnabled = !securitySettings.mfa_enabled;
    const { error } = await supabase
      .from('security_settings')
      .update({ mfa_enabled: newEnabled, updated_at: new Date().toISOString() })
      .eq('id', securitySettings.id);
    if (!error) {
      setSecuritySettings(prev => prev ? { ...prev, mfa_enabled: newEnabled } : null);
    }
  };

  const toggleBiometric = async () => {
    if (!securitySettings) return;
    const newEnabled = !securitySettings.biometric_enabled;
    const { error } = await supabase
      .from('security_settings')
      .update({ biometric_enabled: newEnabled, updated_at: new Date().toISOString() })
      .eq('id', securitySettings.id);
    if (!error) {
      setSecuritySettings(prev => prev ? { ...prev, biometric_enabled: newEnabled } : null);
    }
  };

  const disconnectDevice = async (deviceId: string) => {
    await supabase.from('connected_devices').delete().eq('id', deviceId);
    setDevices(prev => prev.filter(d => d.id !== deviceId));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const score = getSecurityScore();
  const scoreInfo = getScoreLabel(score);

  if (loading) return <div className="page-loading">Chargement...</div>;

  return (
    <div className="security-page">
      <div className="page-header">
        <div>
          <h1>Centre de securite</h1>
          <p>Etat de protection et parametres de securite</p>
        </div>
      </div>

      <div className="security-score-card">
        <div className="score-ring" style={{ '--score-color': scoreInfo.color, '--score-pct': `${score}%` } as React.CSSProperties}>
          <div className="score-inner">
            <span className="score-number">{score}</span>
            <span className="score-max">/100</span>
          </div>
        </div>
        <div className="score-details">
          <h2>Niveau de securite : {scoreInfo.label}</h2>
          <p>Score global de protection de votre compte et appareils</p>
          <div className="score-breakdown">
            <div className="score-item">
              <KeyRound size={14} /> Double authentification : {securitySettings?.mfa_enabled ? 'Activee' : 'Desactivee'}
            </div>
            <div className="score-item">
              <Fingerprint size={14} /> Biomimetrie : {securitySettings?.biometric_enabled ? 'Activee' : 'Desactivee'}
            </div>
            <div className="score-item">
              <Smartphone size={14} /> Telephone : {securitySettings?.phone_verified ? 'Verifie' : 'Non verifie'}
            </div>
            <div className="score-item">
              <Shield size={14} /> Appareils surveilles : {devices.length}
            </div>
          </div>
        </div>
      </div>

      <div className="security-grid">
        <div className="card">
          <div className="card-header">
            <h3><Lock size={18} /> Authentification</h3>
          </div>
          <div className="card-body">
            <div className="security-toggle-list">
              <div className="security-toggle-item">
                <div className="toggle-info">
                  <KeyRound size={18} />
                  <div>
                    <span className="toggle-title">Verification en deux etapes (2FA)</span>
                    <span className="toggle-desc">Ajoute une couche de securite supplementaire a votre connexion</span>
                  </div>
                </div>
                <button
                  className={`toggle-switch ${securitySettings?.mfa_enabled ? 'on' : ''}`}
                  onClick={toggleMfa}
                >
                  <span className="toggle-knob" />
                </button>
              </div>

              <div className="security-toggle-item">
                <div className="toggle-info">
                  <Fingerprint size={18} />
                  <div>
                    <span className="toggle-title">Authentification biomimetrique</span>
                    <span className="toggle-desc">Utilisez votre empreinte digitale ou Face ID</span>
                  </div>
                </div>
                <button
                  className={`toggle-switch ${securitySettings?.biometric_enabled ? 'on' : ''}`}
                  onClick={toggleBiometric}
                >
                  <span className="toggle-knob" />
                </button>
              </div>

              <div className="security-toggle-item">
                <div className="toggle-info">
                  <Smartphone size={18} />
                  <div>
                    <span className="toggle-title">Verification par telephone</span>
                    <span className="toggle-desc">{securitySettings?.phone_verified ? `Numero verifie` : 'Ajoutez votre numero pour les alertes et la recuperation'}</span>
                  </div>
                </div>
                <span className={`status-badge ${securitySettings?.phone_verified ? 'success' : 'warning'}`}>
                  {securitySettings?.phone_verified ? 'Verifie' : 'Non verifie'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3><Shield size={18} /> Appareils connectes</h3>
          </div>
          <div className="card-body">
            {devices.length === 0 ? (
              <div className="empty-state small">
                <Smartphone size={32} />
                <p>Aucun appareil enfant connecte</p>
                <p className="text-muted">Les appareils apparaitront ici une fois l'application enfant installee.</p>
              </div>
            ) : (
              <div className="device-list">
                {devices.map((device) => {
                  const levelInfo = SECURITY_LEVELS[device.security_level] || SECURITY_LEVELS.medium;
                  const LevelIcon = levelInfo.icon;
                  return (
                    <div key={device.id} className="device-item">
                      <div className="device-status">
                        <span className={`status-dot ${device.is_online ? 'online' : 'offline'}`} />
                      </div>
                      <div className="device-info">
                        <span className="device-name">{device.device_name}</span>
                        <span className="device-meta">
                          {device.device_type} {device.is_online ? '- En ligne' : `- Vu le ${formatDate(device.last_seen)}`}
                        </span>
                        {device.battery_level !== null && (
                          <span className="device-battery">
                            <Battery size={12} /> {device.battery_level}%
                          </span>
                        )}
                      </div>
                      <div className="device-security">
                        <LevelIcon size={16} style={{ color: levelInfo.color }} />
                        <span style={{ color: levelInfo.color, fontSize: '0.75rem' }}>{levelInfo.label}</span>
                      </div>
                      <button className="btn-icon btn-danger" onClick={() => disconnectDevice(device.id)} title="Deconnecter">
                        <XCircle size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {bypassAttempts.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3><AlertTriangle size={18} className="text-red" /> Tentatives de contournement</h3>
          </div>
          <div className="card-body">
            <div className="bypass-list">
              {bypassAttempts.map((attempt) => {
                const child = children.find(c => c.id === attempt.child_id);
                return (
                  <div key={attempt.id} className={`bypass-item ${attempt.was_prevented ? 'prevented' : 'not-prevented'}`}>
                    <div className="bypass-icon">
                      {attempt.was_prevented ? <CheckCircle size={18} className="text-green" /> : <AlertTriangle size={18} className="text-red" />}
                    </div>
                    <div className="bypass-info">
                      <span className="bypass-type">{BYPASS_LABELS[attempt.attempt_type] || attempt.attempt_type}</span>
                      <span className="bypass-meta">
                        {child?.name} - {formatDate(attempt.detected_at)}
                      </span>
                      {attempt.details && <span className="bypass-details">{attempt.details}</span>}
                    </div>
                    <span className={`status-badge ${attempt.was_prevented ? 'success' : 'danger'}`}>
                      {attempt.was_prevented ? 'Bloque' : 'Non bloque'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
