import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, dashboardPath } from '../hooks/useAuth';
import { useResource } from '../hooks/useResource';
import { dashboardApi } from '../services/api';
import { ErrorState } from '../components/States';
import Button from '../components/Button';
import BookingsList from '../components/BookingsList';
export function DashboardRedirect() {
  const { user } = useAuth();
  return <Navigate to={dashboardPath(user.role)} replace />;
}
export default function Dashboard() {
  const { user, refresh } = useAuth();
  const state = useResource(() => dashboardApi.summary(user.role), user.role);
  const [workspace, setWorkspace] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = user.role === 'guide' && user.guide?.status !== 'approved';
  async function checkWorkspace() {
    setBusy(true); setWorkspace('');
    try { setWorkspace((await dashboardApi.workspace()).message); }
    catch (error) { setWorkspace(error.message); }
    finally { setBusy(false); }
  }
  return <main className="container page">
    <header className="page-heading"><span className="eyebrow">YOUR WONDU</span><h1>Welcome, {user.name.split(' ')[0]}.</h1><p>{user.role === 'guide' ? 'Your local knowledge is where great stories begin.' : 'Your next chapter starts here.'}</p></header>
    <section className="account-panel"><h2>{user.role === 'guide' ? 'Guide dashboard' : 'Traveler dashboard'}</h2><p>Signed in as {user.email}</p>
      {state.loading ? <p role="status">Loading your dashboard…</p> : state.error ? <ErrorState message={state.error} retry={state.retry} /> : <p>{state.data.message}</p>}
      {user.role === 'guide' && <><span className={`status-pill ${pending ? 'pending' : 'approved'}`}>{pending ? 'Pending admin approval' : 'Approved guide'}</span><p>{pending ? 'You can explore Wondu while an admin reviews your application. Approved-only booking tools are not available yet.' : 'Your guide application is approved. Manage your own tours’ booking requests below.'}</p><div className="account-actions"><Button variant="secondary" onClick={refresh}>Refresh approval status</Button><Button onClick={checkWorkspace} disabled={pending || busy}>{busy ? 'Checking…' : 'Check guide workspace access'}</Button></div>{workspace && <p role="status">{workspace}</p>}</>}
      {user.role === 'traveler' && <div className="account-actions"><Button to="/tours">Explore journeys</Button><Button variant="secondary" to="/bookings">My bookings</Button></div>}
    </section>
    {user.role === 'guide' && !pending && <BookingsList mode="guide" />}
  </main>;
}
