import { useState } from 'react';
import { guideAreaApi } from '../../services/guideArea';
import { bookingsApi, formatDeparture, formatMoney } from '../../services/bookings';
import { useResource } from '../../hooks/useResource';
import { ErrorState } from '../../components/States';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { GuideEmpty, GuidePageHeader } from '../../components/guide/GuideUI';
import '../../guide.css';
const TABS = [['pending', 'Pending'], ['confirmed', 'Confirmed'], ['completed', 'Completed'], ['declined', 'Declined / cancelled']];
export default function GuideBookingRequests() {
  const [tab, setTab] = useState('pending');
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const state = useResource(() => bookingsApi.guide({ status: tab, page, limit: 10 }), `guide-bookings-${tab}-${page}-${version}`);
  async function perform() {
    setBusy(true); setError('');
    try {
      const response = await bookingsApi.status(action.booking._id, action.status === 'declined' ? 'declined' : action.status);
      setMessage(response.message); setAction(null); setReason(''); setVersion(value => value + 1);
    } catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }
  const rows = state.data?.data || [];
  return <>
    <GuidePageHeader eyebrow="OPERATIONS" title="Booking requests" description="Review requests assigned to your departure groups." />
    {message && <p className="guide-success" role="status">{message}</p>}
    <div className="guide-tabs" role="tablist">{TABS.map(([value, label]) => <button key={value} role="tab" aria-selected={tab === value} className={tab === value ? 'active' : ''} onClick={() => { setTab(value); setPage(1); }}>{label}</button>)}</div>
    {state.loading ? <p role="status">Loading requests…</p> : state.error ? <ErrorState message={state.error} retry={state.retry} /> : !rows.length ? <GuideEmpty title="No requests in this view" message="When travelers request a place in one of your groups, it appears here." /> : <div className="guide-request-grid">{rows.map(booking => <article className="guide-request-card" key={booking._id}><header><h3>{booking.tour?.title || 'Unavailable tour'}</h3><span>{formatDeparture(booking.departureDate)}</span></header><dl><div><dt>Traveler</dt><dd>{booking.user?.name || 'Unavailable'}</dd></div><div><dt>Guests</dt><dd>{booking.guests}</dd></div><div><dt>Total</dt><dd>{formatMoney(booking.totalPrice)}</dd></div><div><dt>Status</dt><dd>{booking.status}</dd></div></dl>{booking.status === 'pending' && <div className="guide-actions"><Button disabled={busy} onClick={() => { setError(''); setAction({ booking, status: 'confirmed' }); }}>Confirm</Button><Button variant="secondary" disabled={busy} onClick={() => { setError(''); setAction({ booking, status: 'declined' }); setReason(''); }}>Decline</Button></div>}{booking.status === 'confirmed' && <Button variant="secondary" disabled={busy} onClick={() => { setError(''); setAction({ booking, status: 'completed' }); }}>Mark completed</Button>}</article>)}</div>}
    <div className="guide-pagination"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page} of {state.data?.pagination?.pages || 1}</span><Button variant="secondary" disabled={page >= (state.data?.pagination?.pages || 1)} onClick={() => setPage(page + 1)}>Next</Button></div>
    <Modal open={Boolean(action)} onClose={() => !busy && setAction(null)} title="Confirm booking change">
      <p>Change this booking to <strong>{action?.status}</strong>?</p>
      {action?.status === 'declined' && <label>Reason<input value={reason} onChange={event => setReason(event.target.value)} maxLength={500} /></label>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="guide-actions"><Button disabled={busy || (action?.status === 'declined' && reason.trim().length < 5)} onClick={perform}>{busy ? 'Updating…' : 'Confirm change'}</Button><Button variant="secondary" disabled={busy} onClick={() => setAction(null)}>Go back</Button></div>
    </Modal>
  </>;
}
