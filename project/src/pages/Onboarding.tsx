import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowRight, ArrowLeft, Check, User, Smartphone, Clock, Shield,
  Globe, MapPin, BookOpen, Gamepad2, Music, MessageCircle, Sparkles
} from 'lucide-react';

type OnboardingStep = 'welcome' | 'child_info' | 'device' | 'protection_level' | 'schedule' | 'apps' | 'social' | 'school' | 'finalize';

interface ChildConfig {
  name: string;
  age: number;
  gender: string;
  deviceType: string;
  deviceName: string;
  protectionLevel: 'strict' | 'moderate' | 'light';
  bedtimeStart: string;
  bedtimeEnd: string;
  dailyLimit: number;
  schoolStart: string;
  schoolEnd: string;
  blockedCategories: string[];
  allowedSocial: string[];
  schoolMode: boolean;
}

const AGE_PRESETS = {
  toddler: { label: 'Petit enfant (3-6 ans)', age: 4, protection: 'strict' as const, limit: 30, bedtime: '19:00' },
  child: { label: 'Enfant (7-10 ans)', age: 8, protection: 'strict' as const, limit: 60, bedtime: '20:00' },
  preteen: { label: 'Preado (11-12 ans)', age: 11, protection: 'moderate' as const, limit: 90, bedtime: '21:00' },
  teen: { label: 'Adolescent (13-15 ans)', age: 14, protection: 'moderate' as const, limit: 120, bedtime: '22:00' },
  older: { label: 'Etudiant (16-18 ans)', age: 17, protection: 'light' as const, limit: 180, bedtime: '23:00' },
};

const DEVICE_TYPES = [
  { value: 'android', label: 'Android', icon: Smartphone },
  { value: 'iphone', label: 'iPhone', icon: Smartphone },
  { value: 'windows', label: 'Windows PC', icon: Smartphone },
  { value: 'mac', label: 'Mac', icon: Smartphone },
  { value: 'chromebook', label: 'Chromebook', icon: Smartphone },
  { value: 'smart_tv', label: 'Smart TV', icon: Smartphone },
  { value: 'console', label: 'Console', icon: Gamepad2 },
];

const CONTENT_CATEGORIES = [
  { id: 'adult', label: 'Contenu adulte', icon: Shield, defaultBlocked: true },
  { id: 'violence', label: 'Violence', icon: Shield, defaultBlocked: true },
  { id: 'gambling', label: 'Jeux d\'argent', icon: Shield, defaultBlocked: true },
  { id: 'drugs', label: 'Drogues et alcool', icon: Shield, defaultBlocked: true },
  { id: 'weapons', label: 'Armes', icon: Shield, defaultBlocked: true },
  { id: 'social', label: 'Reseaux sociaux', icon: MessageCircle, defaultBlocked: false },
  { id: 'gaming', label: 'Jeux en ligne', icon: Gamepad2, defaultBlocked: false },
  { id: 'streaming', label: 'Streaming video', icon: Music, defaultBlocked: false },
  { id: 'messaging', label: 'Messagerie', icon: MessageCircle, defaultBlocked: false },
  { id: 'shopping', label: 'Achats en ligne', icon: Globe, defaultBlocked: false },
  { id: 'fake_news', label: 'Fake news', icon: BookOpen, defaultBlocked: true },
  { id: 'betting', label: 'Paris sportifs', icon: Shield, defaultBlocked: true },
];

const SOCIAL_APPS = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'snapchat', label: 'Snapchat' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'discord', label: 'Discord' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'roblox', label: 'Roblox' },
  { id: 'minecraft', label: 'Minecraft' },
  { id: 'fortnite', label: 'Fortnite' },
  { id: 'twitch', label: 'Twitch' },
];

const STEPS: OnboardingStep[] = ['welcome', 'child_info', 'device', 'protection_level', 'schedule', 'apps', 'social', 'school', 'finalize'];

export default function Onboarding() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [config, setConfig] = useState<ChildConfig>({
    name: '',
    age: 8,
    gender: '',
    deviceType: 'android',
    deviceName: '',
    protectionLevel: 'moderate',
    bedtimeStart: '21:00',
    bedtimeEnd: '07:00',
    dailyLimit: 90,
    schoolStart: '08:00',
    schoolEnd: '16:00',
    blockedCategories: CONTENT_CATEGORIES.filter(c => c.defaultBlocked).map(c => c.id),
    allowedSocial: [],
    schoolMode: true,
  });
  const [saving, setSaving] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(currentStep);

  const next = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1]);
  };

  const prev = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx > 0) setCurrentStep(STEPS[idx - 1]);
  };

  const applyPreset = (key: string) => {
    const preset = AGE_PRESETS[key as keyof typeof AGE_PRESETS];
    if (!preset) return;
    setSelectedPreset(key);
    setConfig(prev => ({
      ...prev,
      age: preset.age,
      protectionLevel: preset.protection,
      dailyLimit: preset.limit,
      bedtimeStart: preset.bedtime,
    }));
  };

  const saveAndFinish = async () => {
    if (!user) return;
    setSaving(true);

    const { data: childData, error: childError } = await supabase
      .from('children')
      .insert({
        parent_id: user.id,
        name: config.name,
        age: config.age,
        device_name: config.deviceName,
      })
      .select()
      .maybeSingle();

    if (childError || !childData) {
      setSaving(false);
      return;
    }

    await supabase.from('screen_time_rules').insert({
      child_id: childData.id,
      daily_limit_minutes: config.dailyLimit,
      bedtime_start: config.bedtimeStart,
      bedtime_end: config.bedtimeEnd,
      school_hours_start: config.schoolMode ? config.schoolStart : null,
      school_hours_end: config.schoolMode ? config.schoolEnd : null,
    });

    if (config.schoolMode) {
      await supabase.from('protection_modes').insert({
        child_id: childData.id,
        mode_name: 'school',
        is_active: false,
        blocked_categories: JSON.stringify(['social', 'gaming', 'streaming']),
      });
    }

    await supabase.from('protection_modes').insert({
      child_id: childData.id,
      mode_name: 'night',
      is_active: false,
      screen_time_override: 0,
    });

    await supabase.from('connected_devices').insert({
      child_id: childData.id,
      device_name: config.deviceName,
      device_type: config.deviceType,
      security_level: config.protectionLevel === 'strict' ? 'high' : config.protectionLevel === 'moderate' ? 'medium' : 'low',
    });

    setSaving(false);
    window.location.hash = '#/';
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="onboarding-step welcome-step">
            <div className="welcome-illustration">
              <Sparkles size={64} />
            </div>
            <h2>Bienvenue dans FamilyGuard</h2>
            <p className="step-description">
              Nous allons vous guider pour configurer la protection de votre enfant en quelques etapes simples.
              L'assistant IA adaptera automatiquement les regles selon l'age et les besoins.
            </p>
            <div className="welcome-features">
              <div className="welcome-feature"><Shield size={18} /> Protection adaptee a l'age</div>
              <div className="welcome-feature"><Clock size={18} /> Limites de temps intelligentes</div>
              <div className="welcome-feature"><MapPin size={18} /> Suivi de localisation</div>
              <div className="welcome-feature"><Globe size={18} /> Filtrage web avance</div>
            </div>
          </div>
        );

      case 'child_info':
        return (
          <div className="onboarding-step">
            <h2>Informations de l'enfant</h2>
            <p className="step-description">Choisissez un profil predefini ou personnalisez manuellement</p>

            <div className="preset-grid">
              {Object.entries(AGE_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  className={`preset-card ${selectedPreset === key ? 'selected' : ''}`}
                  onClick={() => applyPreset(key)}
                >
                  <h4>{preset.label}</h4>
                  <p>Limite: {preset.limit} min/jour</p>
                  <p>Coucher: {preset.bedtime}</p>
                  <span className="preset-protection">{preset.protection === 'strict' ? 'Protection maximale' : preset.protection === 'moderate' ? 'Protection equilibree' : 'Protection legere'}</span>
                </button>
              ))}
            </div>

            <div className="login-divider"><span>ou personnalisez</span></div>

            <div className="form-group">
              <label>Prenom de l'enfant</label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Prenom"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Age</label>
                <input
                  type="number"
                  min="3"
                  max="18"
                  value={config.age}
                  onChange={(e) => setConfig(prev => ({ ...prev, age: parseInt(e.target.value) || 8 }))}
                />
              </div>
              <div className="form-group">
                <label>Sexe</label>
                <select
                  value={config.gender}
                  onChange={(e) => setConfig(prev => ({ ...prev, gender: e.target.value }))}
                >
                  <option value="">--</option>
                  <option value="male">Garcon</option>
                  <option value="female">Fille</option>
                  <option value="other">Autre</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'device':
        return (
          <div className="onboarding-step">
            <h2>Appareil de l'enfant</h2>
            <p className="step-description">Selectionnez le type d'appareil a surveiller</p>

            <div className="device-grid">
              {DEVICE_TYPES.map((dt) => (
                <button
                  key={dt.value}
                  className={`device-card ${config.deviceType === dt.value ? 'selected' : ''}`}
                  onClick={() => setConfig(prev => ({ ...prev, deviceType: dt.value }))}
                >
                  <dt.icon size={24} />
                  <span>{dt.label}</span>
                </button>
              ))}
            </div>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label>Nom de l'appareil</label>
              <input
                type="text"
                value={config.deviceName}
                onChange={(e) => setConfig(prev => ({ ...prev, deviceName: e.target.value }))}
                placeholder="ex: Samsung de Marie"
                required
              />
            </div>
          </div>
        );

      case 'protection_level':
        return (
          <div className="onboarding-step">
            <h2>Niveau de protection</h2>
            <p className="step-description">Choisissez le niveau de surveillance adapte</p>

            <div className="protection-levels">
              {([
                { level: 'strict' as const, title: 'Strict', desc: 'Protection maximale. Toutes les applications dangereuses sont bloquees, le filtrage web est total, GPS actif, anti-VPN actif.', color: '#ef4444', icon: '🔒' },
                { level: 'moderate' as const, title: 'Modere', desc: 'Protection equilibree. Les categories dangereuses sont bloquees, temps d\'ecran limite, GPS actif, filtrage web partiel.', color: '#f59e0b', icon: '🛡️' },
                { level: 'light' as const, title: 'Leger', desc: 'Surveillance basique. Alertes pour contenu dangereux uniquement, temps d\'ecran recommande, GPS en cas d\'urgence.', color: '#22c55e', icon: '✅' },
              ]).map(({ level, title, desc, color, icon }) => (
                <button
                  key={level}
                  className={`protection-card ${config.protectionLevel === level ? 'selected' : ''}`}
                  style={{ '--prot-color': color } as React.CSSProperties}
                  onClick={() => setConfig(prev => ({ ...prev, protectionLevel: level }))}
                >
                  <span className="prot-icon">{icon}</span>
                  <h4>{title}</h4>
                  <p>{desc}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 'schedule':
        return (
          <div className="onboarding-step">
            <h2>Horaires et limites</h2>
            <p className="step-description">Definissez les regles de temps d'ecran</p>

            <div className="form-group">
              <label>Temps d'ecran quotidien</label>
              <div className="time-slider-container">
                <input
                  type="range"
                  min="15"
                  max="480"
                  step="15"
                  value={config.dailyLimit}
                  onChange={(e) => setConfig(prev => ({ ...prev, dailyLimit: parseInt(e.target.value) }))}
                  className="time-slider"
                />
                <div className="time-display">
                  <span className="time-value">{Math.floor(config.dailyLimit / 60)}h{config.dailyLimit % 60 > 0 ? `${config.dailyLimit % 60}` : ''}</span>
                  <span className="time-label">par jour</span>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Heure de coucher</label>
                <input
                  type="time"
                  value={config.bedtimeStart}
                  onChange={(e) => setConfig(prev => ({ ...prev, bedtimeStart: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Reveil</label>
                <input
                  type="time"
                  value={config.bedtimeEnd}
                  onChange={(e) => setConfig(prev => ({ ...prev, bedtimeEnd: e.target.value }))}
                />
              </div>
            </div>
          </div>
        );

      case 'apps':
        return (
          <div className="onboarding-step">
            <h2>Categories a bloquer</h2>
            <p className="step-description">Selectionnez les categories de contenu a filtrer</p>

            <div className="category-grid">
              {CONTENT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  className={`category-toggle ${config.blockedCategories.includes(cat.id) ? 'active' : ''}`}
                  onClick={() => {
                    setConfig(prev => ({
                      ...prev,
                      blockedCategories: prev.blockedCategories.includes(cat.id)
                        ? prev.blockedCategories.filter(c => c !== cat.id)
                        : [...prev.blockedCategories, cat.id],
                    }));
                  }}
                >
                  <cat.icon size={16} />
                  <span>{cat.label}</span>
                  {config.blockedCategories.includes(cat.id) && <Check size={14} className="check-icon" />}
                </button>
              ))}
            </div>
          </div>
        );

      case 'social':
        return (
          <div className="onboarding-step">
            <h2>Reseaux sociaux et jeux</h2>
            <p className="step-description">Choisissez les applications autorisees</p>

            <div className="social-grid">
              {SOCIAL_APPS.map((app) => (
                <button
                  key={app.id}
                  className={`social-toggle ${config.allowedSocial.includes(app.id) ? 'active' : ''}`}
                  onClick={() => {
                    setConfig(prev => ({
                      ...prev,
                      allowedSocial: prev.allowedSocial.includes(app.id)
                        ? prev.allowedSocial.filter(a => a !== app.id)
                        : [...prev.allowedSocial, app.id],
                    }));
                  }}
                >
                  <span>{app.label}</span>
                  {config.allowedSocial.includes(app.id) ? <Check size={14} /> : <span className="blocked-label">Bloque</span>}
                </button>
              ))}
            </div>
          </div>
        );

      case 'school':
        return (
          <div className="onboarding-step">
            <h2>Regles scolaires</h2>
            <p className="step-description">Configurez les restrictions pendant les heures d'ecole</p>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.schoolMode}
                  onChange={(e) => setConfig(prev => ({ ...prev, schoolMode: e.target.checked }))}
                />
                Activer le mode ecole (bloquer les distractions pendant les cours)
              </label>
            </div>

            {config.schoolMode && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>Debut des cours</label>
                    <input
                      type="time"
                      value={config.schoolStart}
                      onChange={(e) => setConfig(prev => ({ ...prev, schoolStart: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Fin des cours</label>
                    <input
                      type="time"
                      value={config.schoolEnd}
                      onChange={(e) => setConfig(prev => ({ ...prev, schoolEnd: e.target.value }))}
                    />
                  </div>
                </div>
                <p className="hint">Pendant les heures scolaires, seules les applications educatives seront accessibles.</p>
              </>
            )}
          </div>
        );

      case 'finalize':
        return (
          <div className="onboarding-step finalize-step">
            <div className="finalize-check">
              <Check size={48} />
            </div>
            <h2>Configuration terminee !</h2>
            <p className="step-description">Voici un resume de vos parametres</p>

            <div className="summary-grid">
              <div className="summary-item">
                <User size={16} />
                <span><strong>{config.name || 'Enfant'}</strong> - {config.age} ans</span>
              </div>
              <div className="summary-item">
                <Smartphone size={16} />
                <span>{config.deviceName || 'Appareil'} ({DEVICE_TYPES.find(d => d.value === config.deviceType)?.label})</span>
              </div>
              <div className="summary-item">
                <Shield size={16} />
                <span>Protection: {config.protectionLevel === 'strict' ? 'Strict' : config.protectionLevel === 'moderate' ? 'Modere' : 'Leger'}</span>
              </div>
              <div className="summary-item">
                <Clock size={16} />
                <span>Limite: {Math.floor(config.dailyLimit / 60)}h{config.dailyLimit % 60 > 0 ? `${config.dailyLimit % 60}` : ''}/jour, coucher a {config.bedtimeStart}</span>
              </div>
              <div className="summary-item">
                <Globe size={16} />
                <span>{config.blockedCategories.length} categories bloquees</span>
              </div>
              <div className="summary-item">
                <MessageCircle size={16} />
                <span>{config.allowedSocial.length} apps autorisees sur {SOCIAL_APPS.length}</span>
              </div>
              {config.schoolMode && (
                <div className="summary-item">
                  <BookOpen size={16} />
                  <span>Mode ecole: {config.schoolStart} - {config.schoolEnd}</span>
                </div>
              )}
            </div>

            <div className="ai-tip">
              <Sparkles size={16} />
              <p>Conseil IA : {config.age <= 6 ? 'Pour un petit enfant, nous recommandons de bloquer tous les reseaux sociaux et de limiter le temps d\'ecran a 30 minutes.' : config.age <= 12 ? 'Pour un enfant, activez le GPS et le filtrage web pour une protection optimale.' : 'Pour un adolescent, privilegiez le dialogue et les alertes plutot que le blocage total.'}</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-container">
        <div className="onboarding-progress">
          {STEPS.map((step, i) => (
            <div
              key={step}
              className={`progress-dot ${i <= stepIndex ? 'completed' : ''} ${i === stepIndex ? 'current' : ''}`}
            />
          ))}
        </div>

        {renderStep()}

        <div className="onboarding-actions">
          {stepIndex > 0 && (
            <button className="btn-secondary" onClick={prev}>
              <ArrowLeft size={18} /> Precedent
            </button>
          )}
          <div style={{ flex: 1 }} />
          {currentStep === 'finalize' ? (
            <button className="btn-primary" onClick={saveAndFinish} disabled={saving || !config.name}>
              {saving ? 'Enregistrement...' : 'Terminer la configuration'} <Check size={18} />
            </button>
          ) : (
            <button className="btn-primary" onClick={next} disabled={currentStep === 'child_info' && !config.name}>
              Suivant <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
