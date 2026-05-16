import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Trash2, User, Smartphone } from 'lucide-react';

interface Child {
  id: string;
  name: string;
  age: number;
  device_name: string;
  avatar_url: string | null;
}

export default function Children() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchChildren = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('children')
      .select('*')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: true });
    if (data) setChildren(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchChildren();
  }, [user]);

  const addChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase
      .from('children')
      .insert({
        parent_id: user.id,
        name,
        age: parseInt(age),
        device_name: deviceName,
      });

    if (!error) {
      setName('');
      setAge('');
      setDeviceName('');
      setShowForm(false);
      fetchChildren();
    }
  };

  const deleteChild = async (id: string) => {
    await supabase.from('children').delete().eq('id', id);
    fetchChildren();
  };

  return (
    <div className="children-page">
      <div className="page-header">
        <div>
          <h1>Mes enfants</h1>
          <p>Gerez les profils de vos enfants</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> Ajouter
        </button>
      </div>

      {showForm && (
        <div className="card form-card">
          <h3>Nouvel enfant</h3>
          <form onSubmit={addChild}>
            <div className="form-group">
              <label>Nom</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Prenom de l'enfant"
                required
              />
            </div>
            <div className="form-group">
              <label>Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Age"
                required
                min="3"
                max="18"
              />
            </div>
            <div className="form-group">
              <label>Nom de l'appareil</label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="ex: Samsung Galaxy A14"
                required
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">Enregistrer</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="page-loading">Chargement...</div>
      ) : children.length === 0 ? (
        <div className="empty-state">
          <User size={48} />
          <h2>Aucun enfant configure</h2>
          <p>Ajoutez le profil de votre enfant pour commencer.</p>
        </div>
      ) : (
        <div className="children-grid">
          {children.map((child) => (
            <div key={child.id} className="child-card">
              <div className="child-card-avatar">
                {child.name.charAt(0).toUpperCase()}
              </div>
              <div className="child-card-info">
                <h3>{child.name}</h3>
                <p>{child.age} ans</p>
                <p className="text-muted">
                  <Smartphone size={14} /> {child.device_name}
                </p>
              </div>
              <button
                className="btn-icon btn-danger"
                onClick={() => deleteChild(child.id)}
                title="Supprimer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
