import { useState } from 'react';
import { guideManagement } from '../services/management';
import { useResource } from '../hooks/useResource';
import { Skeletons, ErrorState, EmptyState } from './States';
import Button from './Button';
import Modal from './Modal';
import '../management.css';
export default function OwnTours() {
  const [page, setPage] = useState(1), [chosen, setChosen] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const state = useResource(() => guideManagement.tours({ page, limit: 6 }), page);
  async function archive() { setBusy(true); setError(''); try { await guideManagement.archive(chosen._id); setChosen(null); state.retry(); } catch (problem) { setError(problem.message); } finally { setBusy(false); } }
  return <section className="management-section"><div className="section-heading"><h2>My tours</h2><Button to="/dashboard/guide/tours/new">Create a tour</Button></div>
    {state.loading ? <Skeletons count={3} /> : state.error ? <ErrorState message={state.error} retry={state.retry} /> : !state.data.data.length ? <EmptyState title="Your first tour starts with your story" message="Create a tour with future departures so travelers can send booking requests directly to you."><Button to="/dashboard/guide/tours/new">Create your first tour</Button></EmptyState> : <>
      <div className="owned-tour-grid">{state.data.data.map(tour => <article className="account-panel owned-tour" key={tour._id}><span className={`booking-status ${tour.archived ? 'status-cancelled' : 'status-confirmed'}`}>{tour.archived ? 'Archived' : 'Published'}</span><h3>{tour.title}</h3><p>{tour.destination?.name} · ${tour.price} / person</p><p>{tour.bookingCounts.total} bookings · {tour.bookingCounts.active} active</p><div className="account-actions"><Button variant="secondary" to={`/dashboard/guide/tours/${tour._id}/edit`}>Manage tour</Button>{!tour.archived && <Button variant="secondary" onClick={() => { setError(''); setChosen(tour); }}>Archive</Button>}</div></article>)}</div>
      <div className="pagination"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page} of {state.data.pagination.pages}</span><Button variant="secondary" disabled={page >= state.data.pagination.pages} onClick={() => setPage(page + 1)}>Next</Button></div>
    </>}
    <Modal open={Boolean(chosen)} onClose={() => { if (!busy) setChosen(null); }} title="Archive tour?"><p>{chosen?.title}</p><p>This hides the tour from discovery and blocks new bookings. Existing requests remain manageable.</p>{error && <p className="form-error" role="alert">{error}</p>}<div className="account-actions"><Button disabled={busy} onClick={archive}>{busy ? 'Archiving…' : 'Archive tour'}</Button><Button variant="secondary" disabled={busy} onClick={() => setChosen(null)}>Go back</Button></div></Modal>
  </section>;
}
