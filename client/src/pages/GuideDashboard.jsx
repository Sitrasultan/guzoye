import { guideManagement } from '../services/management';
import { useResource } from '../hooks/useResource';
import { useAuth } from '../hooks/useAuth';
import { Skeletons, ErrorState } from '../components/States';
import Button from '../components/Button';
import OwnTours from '../components/OwnTours';
import BookingsList from '../components/BookingsList';
import '../management.css';
function ApprovedWorkspace() {
  const state = useResource(() => guideManagement.summary(), 'guide-summary');
  return <>{state.loading ? <Skeletons count={3} /> : state.error ? <ErrorState message={state.error} retry={state.retry} /> : <div className="stats-grid">{[['My tours', state.data.data.tours], ['Published tours', state.data.data.liveTours], ...['pending', 'confirmed', 'declined', 'cancelled', 'completed'].map(status => [status, state.data.data.bookings[status] || 0])].map(([label, value]) => <article className="stat-card" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>}<OwnTours /><BookingsList mode="guide" /></>;
}
export default function GuideDashboard() {
  const { user, refresh } = useAuth();
  const approved = user.guide?.status === 'approved';
  return <main className="container page"><header className="guide-workspace-header"><span className="eyebrow">GUZOYE GUIDE STUDIO</span><h1>Your knowledge. Your journeys.</h1><p>Welcome, {user.name}. Manage your assigned journeys, availability, and the booking requests assigned to you.</p><div className="account-actions"><Button to="/dashboard/guide/profile" variant="secondary">My Profile</Button>{approved && <span className="notice">Tour creation is managed by Guzoye admins.</span>}<Button variant="secondary" onClick={refresh}>Refresh account status</Button></div></header>{approved ? <ApprovedWorkspace /> : <section className="account-panel"><h2>{user.guide?.status === 'rejected' ? 'Application needs attention' : 'Your application is pending'}</h2><p>{user.guide?.rejectionReason || 'Complete your profile while an admin reviews your application. Tour publishing and incoming requests unlock after approval.'}</p><Button to="/dashboard/guide/profile">Complete My Profile</Button></section>}</main>;
}
