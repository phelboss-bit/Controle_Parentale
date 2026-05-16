import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Clock, Smartphone, Globe, MapPin, TriangleAlert as AlertTriangle, Users, LogOut, Shield, Menu, X, Bell, ChartBar as BarChart3, UserPlus, KeyRound } from 'lucide-react';

const navItems = [
  { path: '#/', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '#/children', label: 'Mes enfants', icon: Users },
  { path: '#/screen-time', label: 'Temps d\'ecran', icon: Clock },
  { path: '#/app-block', label: 'Blocage apps', icon: Smartphone },
  { path: '#/web-filter', label: 'Filtre web', icon: Globe },
  { path: '#/location', label: 'Localisation', icon: MapPin },
  { path: '#/sos', label: 'Alertes SOS', icon: AlertTriangle },
  { path: '#/notifications', label: 'Notifications', icon: Bell },
  { path: '#/reports', label: 'Rapports', icon: BarChart3 },
  { path: '#/security', label: 'Securite', icon: KeyRound },
  { path: '#/family', label: 'Famille', icon: UserPlus },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentPath = window.location.hash || '#/';

  return (
    <div className="app-layout">
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Shield size={28} />
          <span>FamilyGuard</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className={`nav-item ${currentPath === item.path ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.email?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div className="user-details">
              <span className="user-email">{user?.email}</span>
            </div>
          </div>
          <button className="btn-icon logout-btn" onClick={signOut} title="Deconnexion">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
