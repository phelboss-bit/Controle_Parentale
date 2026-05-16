import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Children from './pages/Children';
import ScreenTime from './pages/ScreenTime';
import AppBlock from './pages/AppBlock';
import WebFilter from './pages/WebFilter';
import Location from './pages/Location';
import SOS from './pages/SOS';
import SecurityCenter from './pages/SecurityCenter';
import Notifications from './pages/Notifications';
import FamilyManagement from './pages/FamilyManagement';
import Reports from './pages/Reports';
import { useEffect, useState } from 'react';

function Router() {
  const [path, setPath] = useState(window.location.hash || '#/');

  useEffect(() => {
    const handleHashChange = () => setPath(window.location.hash || '#/');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const renderPage = () => {
    switch (path) {
      case '#/onboarding':
        return <Onboarding />;
      case '#/children':
        return <Children />;
      case '#/screen-time':
        return <ScreenTime />;
      case '#/app-block':
        return <AppBlock />;
      case '#/web-filter':
        return <WebFilter />;
      case '#/location':
        return <Location />;
      case '#/sos':
        return <SOS />;
      case '#/security':
        return <SecurityCenter />;
      case '#/notifications':
        return <Notifications />;
      case '#/family':
        return <FamilyManagement />;
      case '#/reports':
        return <Reports />;
      case '#/':
      default:
        return <Dashboard />;
    }
  };

  return <Layout>{renderPage()}</Layout>;
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="app-loading">Chargement...</div>;
  }

  if (!user) {
    return <Login />;
  }

  return <Router />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
