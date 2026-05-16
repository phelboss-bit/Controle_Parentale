import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ChartBar as BarChart3, TrendingUp, TrendingDown, Clock, Smartphone, Sparkles, Download, ChevronLeft, ChevronRight, Shield } from 'lucide-react';

interface Child {
  id: string;
  name: string;
}

interface ActivityReport {
  id: string;
  child_id: string;
  report_date: string;
  total_screen_time: number;
  most_used_apps: Record<string, unknown>[];
  categories_summary: Record<string, number>;
  ai_insights: Record<string, unknown>[] | null;
  risk_flags: Record<string, unknown>[] | null;
  recommendations: Record<string, unknown>[] | null;
  security_score: number;
}

interface PermissionRequest {
  id: string;
  child_id: string;
  request_type: string;
  detail: string;
  extra_minutes: number | null;
  status: string;
  parent_response: string | null;
  created_at: string;
}

const REQUEST_LABELS: Record<string, string> = {
  extra_time: 'Temps supplementaire',
  app_access: 'Acces a une application',
  site_access: 'Acces a un site web',
  mode_change: 'Changement de mode',
};

export default function Reports() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [reports, setReports] = useState<ActivityReport[]>([]);
  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

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

  const fetchReports = async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weekOffset + 1) * 7);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - weekOffset * 7);

    const { data } = await supabase
      .from('activity_reports')
      .select('*')
      .eq('child_id', selectedChildId)
      .gte('report_date', startDate.toISOString().split('T')[0])
      .lte('report_date', endDate.toISOString().split('T')[0])
      .order('report_date', { ascending: false });
    if (data) setReports(data);
  };

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('permission_requests')
      .select('*')
      .eq('child_id', selectedChildId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (data) setRequests(data);
  };

  useEffect(() => {
    fetchChildren();
  }, [user]);

  useEffect(() => {
    if (selectedChildId) {
      fetchReports();
      fetchRequests();
    }
  }, [selectedChildId, weekOffset]);

  const respondToRequest = async (id: string, approved: boolean) => {
    const { error } = await supabase
      .from('permission_requests')
      .update({
        status: approved ? 'approved' : 'denied',
        parent_response: approved ? 'Approuve' : 'Refuse',
        responded_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (!error) {
      setRequests(prev => prev.filter(r => r.id !== id));
    }
  };

  const totalScreenTime = reports.reduce((sum, r) => sum + r.total_screen_time, 0);
  const avgScreenTime = reports.length > 0 ? Math.round(totalScreenTime / reports.length) : 0;
  const avgSecurityScore = reports.length > 0 ? Math.round(reports.reduce((sum, r) => sum + r.security_score, 0) / reports.length) : 0;

  const weekLabel = () => {
    if (weekOffset === 0) return 'Cette semaine';
    if (weekOffset === 1) return 'Semaine derniere';
    return `Il y a ${weekOffset} semaines`;
  };

  if (loading) return <div className="page-loading">Chargement...</div>;

  return (
    <div className="reports-page">
      <div className="page-header">
        <div>
          <h1>Rapports et analyses</h1>
          <p>Statistiques detaillees et recommandations IA</p>
        </div>
        <button className="btn-secondary">
          <Download size={16} /> Exporter PDF
        </button>
      </div>

      {children.length === 0 ? (
        <div className="empty-state">
          <BarChart3 size={48} />
          <h2>Aucune donnee disponible</h2>
          <p>Ajoutez un enfant pour voir les rapports.</p>
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

          {requests.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3><Clock size={18} className="text-orange" /> Demandes en attente ({requests.length})</h3>
              </div>
              <div className="card-body">
                <div className="request-list">
                  {requests.map((req) => (
                    <div key={req.id} className="request-item">
                      <div className="request-info">
                        <span className="request-type">{REQUEST_LABELS[req.request_type] || req.request_type}</span>
                        <span className="request-detail">{req.detail}</span>
                        {req.extra_minutes && <span className="request-minutes">+{req.extra_minutes} min</span>}
                        <span className="request-time">{new Date(req.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="request-actions">
                        <button className="btn-icon text-green" onClick={() => respondToRequest(req.id, true)} title="Approuver">
                          <Sparkles size={16} />
                        </button>
                        <button className="btn-icon text-red" onClick={() => respondToRequest(req.id, false)} title="Refuser">
                          <Sparkles size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="week-nav">
            <button className="btn-icon" onClick={() => setWeekOffset(prev => prev + 1)}>
              <ChevronLeft size={20} />
            </button>
            <span className="week-label">{weekLabel()}</span>
            <button className="btn-icon" onClick={() => setWeekOffset(prev => Math.max(0, prev - 1))} disabled={weekOffset === 0}>
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="stats-grid">
            <div className="stat-card stat-blue">
              <div className="stat-icon"><Clock size={24} /></div>
              <div className="stat-info">
                <span className="stat-value">{avgScreenTime} min</span>
                <span className="stat-label">Moyenne quotidienne</span>
              </div>
            </div>
            <div className="stat-card stat-green">
              <div className="stat-icon"><Smartphone size={24} /></div>
              <div className="stat-info">
                <span className="stat-value">{reports.length}</span>
                <span className="stat-label">Jours d'activite</span>
              </div>
            </div>
            <div className="stat-card stat-orange">
              <div className="stat-icon"><Shield size={24} /></div>
              <div className="stat-info">
                <span className="stat-value">{avgSecurityScore}/100</span>
                <span className="stat-label">Score de securite</span>
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="card">
              <div className="card-header">
                <h3><BarChart3 size={18} /> Temps d'ecran quotidien</h3>
              </div>
              <div className="card-body">
                {reports.length === 0 ? (
                  <p className="text-muted">Aucune donnee pour cette periode</p>
                ) : (
                  <div className="chart-bars">
                    {reports.slice(0, 7).map((report, i) => {
                      const maxTime = Math.max(...reports.map(r => r.total_screen_time), 1);
                      const pct = (report.total_screen_time / maxTime) * 100;
                      return (
                        <div key={i} className="chart-bar-item">
                          <div className="chart-bar-container">
                            <div className="chart-bar" style={{ height: `${pct}%` }} />
                          </div>
                          <span className="chart-bar-label">
                            {new Date(report.report_date).toLocaleDateString('fr-FR', { weekday: 'short' })}
                          </span>
                          <span className="chart-bar-value">{report.total_screen_time}m</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3><Sparkles size={18} /> Recommandations IA</h3>
              </div>
              <div className="card-body">
                {reports.length === 0 ? (
                  <p className="text-muted">Pas assez de donnees pour generer des recommandations</p>
                ) : (
                  <div className="ai-recommendations">
                    {reports[0]?.recommendations && Array.isArray(reports[0].recommendations) ? (
                      reports[0].recommendations.map((rec: Record<string, unknown>, i: number) => (
                        <div key={i} className="ai-rec-item">
                          <Sparkles size={14} className="text-primary" />
                          <span>{typeof rec === 'string' ? rec : (rec.message as string) || JSON.stringify(rec)}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="ai-rec-item">
                          <Sparkles size={14} className="text-primary" />
                          <span>Le temps d'ecran moyen est de {avgScreenTime} minutes par jour. {avgScreenTime > 120 ? 'Envisagez de reduire les limites.' : 'C\'est dans les recommandations.'}</span>
                        </div>
                        <div className="ai-rec-item">
                          <Sparkles size={14} className="text-primary" />
                          <span>Score de securite : {avgSecurityScore}/100. {avgSecurityScore < 60 ? 'Activez plus de protections.' : 'Bon niveau de protection.'}</span>
                        </div>
                        <div className="ai-rec-item">
                          <Sparkles size={14} className="text-primary" />
                          <span>Verifiez regulierement les demandes d'autorisation de votre enfant pour maintenir la confiance.</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {reports.length > 0 && reports[0].risk_flags && Array.isArray(reports[0].risk_flags) && reports[0].risk_flags.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3><TrendingUp size={18} className="text-red" /> Alertes de risque</h3>
              </div>
              <div className="card-body">
                <div className="risk-list">
                  {reports[0].risk_flags.map((flag: Record<string, unknown>, i: number) => (
                    <div key={i} className="risk-item">
                      <TrendingDown size={16} className="text-red" />
                      <span>{typeof flag === 'string' ? flag : (flag.message as string) || JSON.stringify(flag)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
