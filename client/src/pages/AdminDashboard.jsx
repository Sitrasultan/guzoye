import { useState } from 'react';
import { adminApi } from '../services/api';
import { useResource } from '../hooks/useResource';
import { ErrorState, EmptyState } from '../components/States';
import Button from '../components/Button';
import BookingsList from '../components/BookingsList';
export default function AdminDashboard() {
  const [page, setPage] = useState(1);
  const state = useResource(() => adminApi.applications(page), page);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function approve(guide) {
    setBusy(guide._id); setError(''); setMessage('');
    try { await adminApi.approve(guide._id); setMessage(`${guide.user?.name || 'Guide'} approved.`); if (page > 1 && state.data.data.length === 1) setPage(page - 1); else state.retry(); }
    catch (problem) { setError(problem.message); }
    finally { setBusy(''); }
  }
  return <main className="container page">
    <header className="page-heading"><span className="eyebrow">WONDU ADMIN</span><h1>Good journeys start with good people.</h1><p>Review guide applications and monitor bookings.</p></header>
    {message && <p className="success-message" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}
    {state.loading ? <p role="status">Loading applications…</p> : state.error ? <ErrorState message={state.error} retry={state.retry} /> : state.data.data.length ? <>
      <div className="application-list">{state.data.data.map(guide => <article className="application-card" key={guide._id}><div><span className="status-pill pending">Pending</span><h2>{guide.user?.name || 'Unavailable user'}</h2><p>{guide.user?.email}</p><small>Application ID: {guide._id}</small></div><Button disabled={Boolean(busy) || !guide.user} onClick={() => approve(guide)}>{busy === guide._id ? 'Approving…' : 'Approve guide'}</Button></article>)}</div>
      <div className="pagination"><Button variant="secondary" disabled={page <= 1 || Boolean(busy)} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page} of {state.data.pagination.pages}</span><Button variant="secondary" disabled={page >= state.data.pagination.pages || Boolean(busy)} onClick={() => setPage(page + 1)}>Next</Button></div>
    </> : <EmptyState title="All caught up" message="There are no pending guide applications."><Button variant="secondary" onClick={state.retry}>Refresh applications</Button></EmptyState>}
    <BookingsList mode="admin" />
  </main>;
}
