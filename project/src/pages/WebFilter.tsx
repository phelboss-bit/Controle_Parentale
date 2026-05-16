import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Globe, Plus, Trash2, ShieldCheck, ShieldX } from 'lucide-react';

interface Child {
  id: string;
  name: string;
}

interface WebFilter {
  id: string;
  child_id: string;
  url_pattern: string;
  category: string;
  is_allowed: boolean;
}

const DEFAULT_FILTERS = [
  { url: '*.adultsite.com', category: 'Adulte', allowed: false },
  { url: '*.gambling.com', category: 'Jeux d\'argent', allowed: false },
  { url: '*.violence.com', category: 'Violence', allowed: false },
  { url: 'youtube.com', category: 'Video', allowed: true },
  { url: 'wikipedia.org', category: 'Education', allowed: true },
  { url: 'google.com', category: 'Recherche', allowed: true },
];

export default function WebFilter() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [filters, setFilters] = useState<WebFilter[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newAllowed, setNewAllowed] = useState(false);

  const fetchChildren = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('children')
      .select('id, name')
      .eq('parent_id', user.id);
    const childrenData = data as Child[] | null;
    if (childrenData && childrenData.length > 0) {
      setChildren(childrenData);
      setSelectedChildId(childrenData[0].id);
    }
  };

  const fetchFilters = async () => {
    const { data } = await supabase
      .from('web_filters')
      .select('*')
      .eq('child_id', selectedChildId);
    const filtersData = data as WebFilter[] | null;
    if (filtersData) setFilters(filtersData);
  };

  useEffect(() => {
    fetchChildren();
  }, [user]);

  useEffect(() => {
    if (selectedChildId) fetchFilters();
  }, [selectedChildId]);

  const toggleFilter = async (filter: WebFilter) => {
    const { error } = await supabase
      .from('web_filters')
      .update({ is_allowed: !filter.is_allowed })
      .eq('id', filter.id);
    if (!error) fetchFilters();
  };

  const addFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('web_filters').insert({
      child_id: selectedChildId,
      url_pattern: newUrl,
      category: newCategory,
      is_allowed: newAllowed,
    });
    if (!error) {
      fetchFilters();
      setNewUrl('');
      setNewCategory('General');
      setNewAllowed(false);
      setShowAddForm(false);
    }
  };

  const deleteFilter = async (id: string) => {
    await supabase.from('web_filters').delete().eq('id', id);
    fetchFilters();
  };

  const addDefaultFilters = async () => {
    for (const f of DEFAULT_FILTERS) {
      const exists = filters.find(fl => fl.url_pattern === f.url);
      if (!exists) {
        await supabase.from('web_filters').insert({
          child_id: selectedChildId,
          url_pattern: f.url,
          category: f.category,
          is_allowed: f.allowed,
        });
      }
    }
    fetchFilters();
  };

  const blockedCount = filters.filter(f => !f.is_allowed).length;

  return (
    <div className="web-filter-page">
      <div className="page-header">
        <div>
          <h1>Filtrage web</h1>
          <p>Controlez l'acces aux sites web</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={addDefaultFilters}>
            Filtres par defaut
          </button>
          <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus size={18} /> Ajouter
          </button>
        </div>
      </div>

      {children.length === 0 ? (
        <div className="empty-state">
          <Globe size={48} />
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
              <span className="mini-stat-value">{filters.length}</span>
              <span className="mini-stat-label">Regles</span>
            </div>
            <div className="mini-stat">
              <span className="mini-stat-value text-red">{blockedCount}</span>
              <span className="mini-stat-label">Bloques</span>
            </div>
            <div className="mini-stat">
              <span className="mini-stat-value text-green">{filters.length - blockedCount}</span>
              <span className="mini-stat-label">Autorises</span>
            </div>
          </div>

          {showAddForm && (
            <div className="card form-card">
              <h3>Ajouter une regle</h3>
              <form onSubmit={addFilter}>
                <div className="form-group">
                  <label>URL ou motif</label>
                  <input
                    type="text"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="ex: *.site.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Categorie</label>
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                    <option value="General">General</option>
                    <option value="Adulte">Adulte</option>
                    <option value="Social">Social</option>
                    <option value="Video">Video</option>
                    <option value="Education">Education</option>
                    <option value="Jeux d'argent">Jeux d'argent</option>
                    <option value="Violence">Violence</option>
                    <option value="Recherche">Recherche</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={newAllowed}
                      onChange={(e) => setNewAllowed(e.target.checked)}
                    />
                    Autoriser ce site
                  </label>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Ajouter</button>
                  <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>Annuler</button>
                </div>
              </form>
            </div>
          )}

          {filters.length === 0 ? (
            <div className="empty-state small">
              <Globe size={32} />
              <p>Cliquez sur "Filtres par defaut" pour ajouter des regles courantes</p>
            </div>
          ) : (
            <div className="filter-list">
              {filters.map((filter) => (
                <div key={filter.id} className={`filter-item ${filter.is_allowed ? 'allowed' : 'blocked'}`}>
                  <div className="filter-item-info">
                    {filter.is_allowed ? (
                      <ShieldCheck size={18} className="text-green" />
                    ) : (
                      <ShieldX size={18} className="text-red" />
                    )}
                    <div>
                      <span className="filter-url">{filter.url_pattern}</span>
                      <span className="filter-category">{filter.category}</span>
                    </div>
                  </div>
                  <div className="filter-item-actions">
                    <button
                      className="btn-icon toggle-btn"
                      onClick={() => toggleFilter(filter)}
                      title={filter.is_allowed ? 'Bloquer' : 'Autoriser'}
                    >
                      {filter.is_allowed ? 'Autorise' : 'Bloque'}
                    </button>
                    <button className="btn-icon btn-danger" onClick={() => deleteFilter(filter.id)}>
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
