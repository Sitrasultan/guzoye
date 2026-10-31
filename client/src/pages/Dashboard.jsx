import { Navigate } from 'react-router-dom';
import { useAuth, dashboardPath } from '../hooks/useAuth';
import Button from '../components/Button';
import GuideDashboard from './GuideDashboard';
export function DashboardRedirect() { const { user } = useAuth(); return <Navigate to={dashboardPath(user.role)} replace />; }
export default function Dashboard() {
  const { user } = useAuth();
  if (user.role === 'guide') return <GuideDashboard />;
  return <main className="container page"><header className="page-heading"><span className="eyebrow">YOUR WONDU</span><h1>Welcome, {user.name.split(' ')[0]}.</h1><p>Your next chapter starts here.</p></header><section className="account-panel"><h2>Traveler dashboard</h2><p>Discover future departures and manage your booking requests.</p><div className="account-actions"><Button to="/tours">Explore journeys</Button><Button to="/bookings" variant="secondary">My bookings</Button></div></section></main>;
}
