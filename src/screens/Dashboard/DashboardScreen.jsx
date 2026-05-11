import AdminDashboard from './AdminDashboard';
import RecepcionistaDashboard from './RecepcionistaDashboard';
import TecnicoDashboard from './TecnicoDashboard';

export default function DashboardScreen({ rol, onNavigate }) {
  if (rol === 'tecnico') return <TecnicoDashboard onNavigate={onNavigate} />;
  if (rol === 'recepcionista') return <RecepcionistaDashboard onNavigate={onNavigate} />;
  return <AdminDashboard onNavigate={onNavigate} />;
}
