import '../bookings.css';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useResource } from '../hooks/useResource';
import { bookingsApi, formatDeparture, formatMoney } from '../services/bookings';
import { ErrorState, EmptyState } from './States';
import Button from './Button';
import Modal from './Modal';
const statuses = ['pending', 'confirmed', 'declined', 'cancelled', 'completed'];
export default function BookingsList({ mode = 'traveler' }) {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const state = useResource(() => bookingsApi[mode === 'admin' ? 'admin' : mode === 'guide' ? 'guide' : 'mine']({ status, page, limit: 10 }), `${mode}:${status}:${page}:${version}`);
  function resetFilter(value) { setStatus(value); setPage(1); }
  async function perform() {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await (action.status === 'cancelled' ? bookingsApi.cancel(action.booking._id) : bookingsApi.status(action.booking._id, action.status));
      setMessage(response.message); setAction(null);
      if (page > 1 && state.data?.data.length === 1) setPage(page - 1);
      setVersion(value => value + 1);
    } catch (problem) { setError(problem.message); }
    finally { setBusy(false); }
  }
  const rows = state.data?.data || [];
  return <section className="booking-list-section" aria-label={`${mode} bookings`}>
    <div className="results-toolbar"><h2>{mode === 'admin' ? 'All bookings' : mode === 'guide' ? 'Incoming booking requests' : 'Your bookings'}</h2><label>Status<select value={status} disabled={busy} onChange={event => resetFilter(event.target.value)}><option value="">All statuses</option>{statuses.map(value => <option key={value} value={value}>{value}</option>)}</select></label><Button variant="secondary" disabled={busy || state.loading} onClick={state.retry}>Refresh bookings</Button></div>
    {message && <p className="success-message" role="status">{message}</p>}
    {error && !action && <p className="form-error" role="alert">{error}</p>}
    {state.loading ? <div className="booking-skeleton" role="status" aria-busy="true"><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line" /><p>Loading bookings…</p></div> : state.error ? <ErrorState message={state.error} retry={state.retry} /> : !rows.length ? <EmptyState title="No bookings here yet" message={status ? 'No bookings match this status.' : 'New booking requests will appear here.'}><Button variant="secondary" onClick={state.retry}>Refresh bookings</Button></EmptyState> : <>
      <div className="booking-table-wrap"><table className="booking-table"><thead><tr><th>Tour / traveler</th><th>Departure (EAT)</th><th>Guests</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map(booking => <tr key={booking._id}>
        <td>{booking.tour ? <Link to={`/tours/${booking.tour._id}`}>{booking.tour.title}</Link> : 'Unavailable tour'}{mode !== 'traveler' && <small>{booking.user?.name || 'Unavailable traveler'}<br />{booking.user?.email}</small>}</td>
        <td>{formatDeparture(booking.departureDate)}</td><td>{booking.guests}</td><td>{formatMoney(booking.totalPrice)}</td><td><span className={`booking-status status-${booking.status}`}>{booking.status}</span></td>
        <td><div className="booking-row-actions">{mode === 'traveler' && ['pending', 'confirmed'].includes(booking.status) && <Button variant="secondary" disabled={busy} onClick={() => { setError(''); setAction({ booking, status: 'cancelled' }); }}>Cancel</Button>}
          {mode === 'guide' && booking.status === 'pending' && <><Button disabled={busy} onClick={() => { setError(''); setAction({ booking, status: 'confirmed' }); }}>Confirm</Button><Button variant="secondary" disabled={busy} onClick={() => { setError(''); setAction({ booking, status: 'declined' }); }}>Decline</Button></>}
          {mode === 'guide' && booking.status === 'confirmed' && <Button variant="secondary" disabled={busy} onClick={() => { setError(''); setAction({ booking, status: 'completed' }); }}>Mark completed</Button>}
          {(mode === 'admin' || ['completed', 'declined', 'cancelled'].includes(booking.status)) && <small>Read only</small>}
        </div></td></tr>)}</tbody></table></div>
      <div className="pagination"><Button variant="secondary" disabled={page <= 1 || busy} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page} of {state.data.pagination.pages}</span><Button variant="secondary" disabled={page >= state.data.pagination.pages || busy} onClick={() => setPage(page + 1)}>Next</Button></div>
    </>}
    <Modal open={Boolean(action)} onClose={() => { if (!busy) setAction(null); }} title="Confirm booking change">
      <p>Change this booking to {action?.status}?</p><p>{action?.booking.tour?.title}</p>
      {['cancelled', 'declined'].includes(action?.status) && <p>The reserved spots will be returned to availability.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="account-actions"><Button disabled={busy} onClick={perform}>{busy ? 'Updating…' : 'Confirm change'}</Button><Button variant="secondary" disabled={busy} onClick={() => setAction(null)}>Go back</Button></div>
    </Modal>
  </section>;
}
