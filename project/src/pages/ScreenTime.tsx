import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Save, Moon, GraduationCap } from 'lucide-react';

interface Child {
  id: string;
  name: string;
  age: number;
}

interface ScreenTimeRule {
  id: string;
  child_id: string;
  daily_limit_minutes: number;
  bedtime_start: string;
  bedtime_end: string;
  school_hours_start: string | null;
  school_hours_end: string | null;
}

export default function ScreenTime() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [rule, setRule] = useState<ScreenTimeRule | null>(null);
  const [dailyLimit, setDailyLimit] = useState(120);
  const [bedtimeStart, setBedtimeStart] = useState('21:00');
  const [bedtimeEnd, setBedtimeEnd] = useState('07:00');
  const [schoolStart, setSchoolStart] = useState('');
  const [schoolEnd, setSchoolEnd] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchChildren = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('children')
      .select('id, name, age')
      .eq('parent_id', user.id);
    if (data && data.length > 0) {
      setChildren(data);
      setSelectedChildId(data[0].id);
    }
  };

  const fetchRule = async () => {
    const { data } = await supabase
      .from('screen_time_rules')
      .select('*')
      .eq('child_id', selectedChildId)
      .maybeSingle();

    if (data) {
      setRule(data);
      setDailyLimit(data.daily_limit_minutes);
      setBedtimeStart(data.bedtime_start);
      setBedtimeEnd(data.bedtime_end);
      setSchoolStart(data.school_hours_start ?? '');
      setSchoolEnd(data.school_hours_end ?? '');
    } else {
      setRule(null);
      setDailyLimit(120);
      setBedtimeStart('21:00');
      setBedtimeEnd('07:00');
      setSchoolStart('');
      setSchoolEnd('');
    }
  };

  useEffect(() => {
    fetchChildren();
  }, [user]);

  useEffect(() => {
    if (selectedChildId) fetchRule();
  }, [selectedChildId]);

  const saveRule = async () => {
    setSaving(true);
    setMessage('');

    const payload = {
      child_id: selectedChildId,
      daily_limit_minutes: dailyLimit,
      bedtime_start: bedtimeStart,
      bedtime_end: bedtimeEnd,
      school_hours_start: schoolStart || null,
      school_hours_end: schoolEnd || null,
      updated_at: new Date().toISOString(),
    };

    let error: string | null = null;
    if (rule) {
      const { error: updateError } = await supabase.from('screen_time_rules').update(payload).eq('id', rule.id);
      error = updateError?.message ?? null;
    } else {
      const { error: insertError } = await supabase.from('screen_time_rules').insert(payload);
      error = insertError?.message ?? null;
    }

    if (!error) {
      setMessage('Regles enregistrees avec succes');
      fetchRule();
    } else {
      setMessage('Erreur lors de la sauvegarde');
    }
    setSaving(false);
  };

  return (
    <div className="screen-time-page">
      <div className="page-header">
        <div>
          <h1>Temps d'ecran</h1>
          <p>Definissez les limites quotidiennes</p>
        </div>
      </div>

      {children.length === 0 ? (
        <div className="empty-state">
          <Clock size={48} />
          <h2>Aucun enfant configure</h2>
          <p>Ajoutez d'abord un enfant pour configurer le temps d'ecran.</p>
        </div>
      ) : (
        <>
          <div className="child-selector">
            {children.map((child) => (
              <button
                key={child.id}
                className={`child-tab ${selectedChildId === child.id ? 'active' : ''}`}
                onClick={() => setSelectedChildId(child.id)}
              >
                <div className="child-avatar">{child.name.charAt(0).toUpperCase()}</div>
                <span>{child.name}</span>
              </button>
            ))}
          </div>

          <div className="card">
            <div className="card-header">
              <h3><Clock size={18} /> Limite quotidienne</h3>
            </div>
            <div className="card-body">
              <div className="time-slider-container">
                <input
                  type="range"
                  min="30"
                  max="480"
                  step="30"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(parseInt(e.target.value))}
                  className="time-slider"
                />
                <div className="time-display">
                  <span className="time-value">{Math.floor(dailyLimit / 60)}h{dailyLimit % 60 > 0 ? `${dailyLimit % 60}` : ''}</span>
                  <span className="time-label">par jour</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3><Moon size={18} /> Heures de coucher</h3>
            </div>
            <div className="card-body">
              <div className="time-range-inputs">
                <div className="form-group">
                  <label>De</label>
                  <input
                    type="time"
                    value={bedtimeStart}
                    onChange={(e) => setBedtimeStart(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>A</label>
                  <input
                    type="time"
                    value={bedtimeEnd}
                    onChange={(e) => setBedtimeEnd(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3><GraduationCap size={18} /> Heures d'ecole</h3>
            </div>
            <div className="card-body">
              <div className="time-range-inputs">
                <div className="form-group">
                  <label>Debut</label>
                  <input
                    type="time"
                    value={schoolStart}
                    onChange={(e) => setSchoolStart(e.target.value)}
                    placeholder="Optionnel"
                  />
                </div>
                <div className="form-group">
                  <label>Fin</label>
                  <input
                    type="time"
                    value={schoolEnd}
                    onChange={(e) => setSchoolEnd(e.target.value)}
                    placeholder="Optionnel"
                  />
                </div>
              </div>
              <p className="text-muted hint">Pendant les heures d'ecole, l'acces sera limite</p>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={saveRule} disabled={saving}>
              <Save size={18} /> {saving ? 'Enregistrement...' : 'Enregistrer les regles'}
            </button>
          </div>

          {message && <div className="form-message">{message}</div>}
        </>
      )}
    </div>
  );
}
