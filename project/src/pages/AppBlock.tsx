import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import { useAuth } from '../contexts/AuthContext';
import { Smartphone, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

interface Child {
  id: string;
  name: string;
}

interface AppRestriction {
  id: string;
  child_id: string;
  app_name: string;
  package_name: string;
  is_blocked: boolean;
  time_limit_minutes: number | null;
  category: string | null;
}

const DEFAULT_APPS = [
  { name: 'TikTok', package: 'com.zhiliaoapp.musically', category: 'Social' },
  { name: 'Instagram', package: 'com.instagram.android', category: 'Social' },
  { name: 'Snapchat', package: 'com.snapchat.android', category: 'Social' },
  { name: 'YouTube', package: 'com.google.android.youtube', category: 'Video' },
  { name: 'Facebook', package: 'com.facebook.katana', category: 'Social' },
  { name: 'WhatsApp', package: 'com.whatsapp', category: 'Messaging' },
  { name: 'Telegram', package: 'org.telegram.messenger', category: 'Messaging' },
  { name: 'Discord', package: 'com.discord', category: 'Social' },
  { name: 'Netflix', package: 'com.netflix.mediaclient', category: 'Video' },
  { name: 'Twitch', package: 'tv.twitch.android.app', category: 'Video' },
  { name: 'Roblox', package: 'com.roblox.client', category: 'Games' },
  { name: 'Minecraft', package: 'com.mojang.minecraftpe', category: 'Games' },
];

export default function AppBlock() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [restrictions, setRestrictions] = useState<AppRestriction[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newPackage, setNewPackage] = useState('');
  const [newCategory, setNewCategory] = useState('General');

  const fetchChildren = async () => {
    if (!user) return;
    const { data }: { data: Child[] | null } = await supabase
      .from('children')
      .select('id, name')
      .eq('parent_id', user.id);
    if (data && data.length > 0) {
      setChildren(data);
      setSelectedChildId(data[0].id);
    }
  };

  const fetchRestrictions = async () => {
    const { data }: { data: AppRestriction[] | null } = await supabase
      .from('app_restrictions')
      .select('*')
      .eq('child_id', selectedChildId);
    if (data) setRestrictions(data);
  };

  useEffect(() => {
    fetchChildren();
  }, [user]);

  useEffect(() => {
    if (selectedChildId) fetchRestrictions();
  }, [selectedChildId]);

  const toggleBlock = async (restriction: AppRestriction) => {
    const { error }: { error: PostgrestError | null } = await supabase
      .from('app_restrictions')
      .update({ is_blocked: !restriction.is_blocked, updated_at: new Date().toISOString() })
      .eq('id', restriction.id);
    if (!error) fetchRestrictions();
  };

  const addRestriction = async (appName: string, packageName: string, category: string) => {
    const exists = restrictions.find(r => r.package_name === packageName);
    if (exists) return;

    const { error }: { error: PostgrestError | null } = await supabase.from('app_restrictions').insert({
      child_id: selectedChildId,
      app_name: appName,
      package_name: packageName,
      is_blocked: true,
      category,
    });
    if (!error) {
      fetchRestrictions();
    }
  };

  const addCustomApp = async (e: React.FormEvent) => {
    e.preventDefault();
    await addRestriction(newAppName, newPackage, newCategory);
    setNewAppName('');
    setNewPackage('');
    setShowAddForm(false);
  };

  const deleteRestriction = async (id: string) => {
    await supabase.from('app_restrictions').delete().eq('id', id);
    fetchRestrictions();
  };

  const addDefaultApps = async () => {
    for (const app of DEFAULT_APPS) {
      const exists = restrictions.find(r => r.package_name === app.package);
      if (!exists) {
        await supabase.from('app_restrictions').insert({
          child_id: selectedChildId,
          app_name: app.name,
          package_name: app.package,
          is_blocked: false,
          category: app.category,
        });
      }
    }
    fetchRestrictions();
  };

  const blockedCount = restrictions.filter(r => r.is_blocked).length;

  return (
    <div className="app-block-page">
      <div className="page-header">
        <div>
          <h1>Blocage d'applications</h1>
          <p>Controlez l'acces aux applications</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={addDefaultApps}>
            Apps populaires
          </button>
          <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus size={18} /> Ajouter
          </button>
        </div>
      </div>

      {children.length === 0 ? (
        <div className="empty-state">
          <Smartphone size={48} />
          <h2>Aucun enfant configure</h2>
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

          <div className="stats-row">
            <div className="mini-stat">
              <span className="mini-stat-value">{restrictions.length}</span>
              <span className="mini-stat-label">Applications</span>
            </div>
            <div className="mini-stat">
              <span className="mini-stat-value text-red">{blockedCount}</span>
              <span className="mini-stat-label">Bloquees</span>
            </div>
            <div className="mini-stat">
              <span className="mini-stat-value text-green">{restrictions.length - blockedCount}</span>
              <span className="mini-stat-label">Autorisees</span>
            </div>
          </div>

          {showAddForm && (
            <div className="card form-card">
              <h3>Ajouter une application</h3>
              <form onSubmit={addCustomApp}>
                <div className="form-group">
                  <label>Nom de l'app</label>
                  <input
                    type="text"
                    value={newAppName}
                    onChange={(e) => setNewAppName(e.target.value)}
                    placeholder="ex: TikTok"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Nom du package</label>
                  <input
                    type="text"
                    value={newPackage}
                    onChange={(e) => setNewPackage(e.target.value)}
                    placeholder="ex: com.zhiliaoapp.musically"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Categorie</label>
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                    <option value="Social">Social</option>
                    <option value="Games">Jeux</option>
                    <option value="Video">Video</option>
                    <option value="Messaging">Messagerie</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Ajouter</button>
                  <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>Annuler</button>
                </div>
              </form>
            </div>
          )}

          {restrictions.length === 0 ? (
            <div className="empty-state small">
              <Smartphone size={32} />
              <p>Cliquez sur "Apps populaires" pour ajouter des applications courantes</p>
            </div>
          ) : (
            <div className="app-list">
              {restrictions.map((restriction) => (
                <div key={restriction.id} className={`app-item ${restriction.is_blocked ? 'blocked' : ''}`}>
                  <div className="app-item-info">
                    <div className="app-icon-small">
                      <Smartphone size={14} />
                    </div>
                    <div>
                      <span className="app-name">{restriction.app_name}</span>
                      {restriction.category && (
                        <span className="app-category">{restriction.category}</span>
                      )}
                    </div>
                  </div>
                  <div className="app-item-actions">
                    <button
                      className="btn-icon toggle-btn"
                      onClick={() => toggleBlock(restriction)}
                      title={restriction.is_blocked ? 'Autoriser' : 'Bloquer'}
                    >
                      {restriction.is_blocked ? (
                        <ToggleRight size={24} className="toggle-on" />
                      ) : (
                        <ToggleLeft size={24} className="toggle-off" />
                      )}
                    </button>
                    <button
                      className="btn-icon btn-danger"
                      onClick={() => deleteRestriction(restriction.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
