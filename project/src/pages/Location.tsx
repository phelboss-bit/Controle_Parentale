import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Clock, Navigation } from 'lucide-react';

interface Child {
  id: string;
  name: string;
}

interface LocationEntry {
  id: string;
  child_id: string;
  latitude: number;
  longitude: number;
  address: string | null;
  recorded_at: string;
}

export default function Location() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [locations, setLocations] = useState<LocationEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChildren = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('children')
      .select('id, name')
      .eq('parent_id', user.id);
    if (data && data.length > 0) {
      setChildren(data);
      setSelectedChildId(data[0].id);
    }
    setLoading(false);
  };

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('location_history')
      .select('*')
      .eq('child_id', selectedChildId)
      .order('recorded_at', { ascending: false })
      .limit(20);
    if (data) setLocations(data);
  };

  useEffect(() => {
    fetchChildren();
  }, [user]);

  useEffect(() => {
    if (selectedChildId) fetchLocations();
  }, [selectedChildId]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="page-loading">Chargement...</div>;
  }

  return (
    <div className="location-page">
      <div className="page-header">
        <div>
          <h1>Localisation</h1>
          <p>Suivez la position de vos enfants</p>
        </div>
      </div>

      {children.length === 0 ? (
        <div className="empty-state">
          <MapPin size={48} />
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

          <div className="card">
            <div className="card-header">
              <h3><Navigation size={18} /> Carte de localisation</h3>
            </div>
            <div className="card-body">
              <div className="map-placeholder">
                <MapPin size={48} />
                <p>Carte de localisation</p>
                <p className="text-muted">
                  La carte affichera la position en temps reel de l'appareil de votre enfant.
                  L'application mobile FamilyGuard doit etre installee sur l'appareil enfant.
                </p>
                {locations.length > 0 && (
                  <div className="current-location">
                    <span className="location-label">Derniere position connue :</span>
                    <span className="location-coords">
                      {locations[0].latitude.toFixed(4)}, {locations[0].longitude.toFixed(4)}
                    </span>
                    {locations[0].address && (
                      <span className="location-address">{locations[0].address}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3><Clock size={18} /> Historique des positions</h3>
            </div>
            <div className="card-body">
              {locations.length === 0 ? (
                <p className="text-muted">Aucun historique de localisation disponible</p>
              ) : (
                <div className="location-history">
                  {locations.map((loc) => (
                    <div key={loc.id} className="location-entry">
                      <div className="location-dot" />
                      <div className="location-entry-info">
                        <span className="location-address">
                          {loc.address || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`}
                        </span>
                        <span className="location-time">{formatDate(loc.recorded_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
