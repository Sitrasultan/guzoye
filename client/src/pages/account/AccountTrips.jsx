import { useState } from 'react';
import { travelerApi } from '../../services/traveler';
import { bookingsApi, formatDeparture, formatMoney } from '../../services/bookings';
import { useResource } from '../../hooks/useResource';
import { ErrorState } from '../../components/States';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { AccountEmpty, AccountPageHeader } from '../../components/account/AccountUI';
import { mediaUrl } from '../../services/media';
import '../../account.css';
const TABS = [['upcoming', 'Upcoming'], ['past', 'Past'], ['cancelled', 'Cancelled']];
export default function AccountTrips() {
  const [tab, setTab] = useState('upcoming');
  const [version, setVersion] = useState(0);
  const [cancel, setCancel] = useState(null);
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const state = useResource(() => travelerApi.overview(), `account-trips-${version}`);
  if (state.loading) return <p role="status">Loading trips…</p>;
  if (state.error) return <ErrorState message={state.error} retry={state.retry} />;
  const rows = state.data.trips[tab] || [];
  async function doCancel() {
    setBusy(true); setError('');
    try { const response = await bookingsApi.cancel(cancel._id); setMessage(response.message); setCancel(null); setVersion(value => value + 1); }
    catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }
  return <>
    <AccountPageHeader eyebrow="MY TRIPS" title="Journeys and booking requests" description="Track departures, guides, references and completed experiences." />
    {message && <p className="account-success" role="status">{message}</p>}
    <div className="account-tabs" role="tablist">{TABS.map(([value, label]) => <button key={value} role="tab" aria-selected={tab === value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{label}</button>)}</div>
    {!rows.length ? <AccountEmpty title="No trips in this view" message="Your bookings will appear here after you request a departure." action={<Button to="/tours">Browse tours</Button>} /> : <div className="account-trip-grid">{rows.map(booking => <article className="account-trip-card" key={booking._id}>
      <img src={mediaUrl(booking.tour?.images?.[0])} alt="" loading="lazy" />
      <div className="account-trip-body">
        <small className="account-reference">{booking.reference}</small>
        <h3>{booking.tour?.title}</h3>
        <p>{formatDeparture(booking.departureDate)} · {booking.guests} traveler(s) · {formatMoney(booking.totalPrice)}</p>
        <p className="account-guide">{booking.guide?.user?.name || 'Guide pending'} {booking.guide?.performance?.tier ? `· ${booking.guide.performance.tier}` : ''}</p>
        <span className={`account-status ${booking.status}`}>{booking.status}</span>
        <div className="account-actions">
          {['pending', 'confirmed'].includes(booking.status) && <Button variant="secondary" disabled={busy} onClick={() => { setError(''); setCancel(booking); }}>Cancel</Button>}
          {booking.status === 'completed' && <Button variant="secondary" onClick={() => { setError(''); setReview(booking); }}>Rate your tour and guide</Button>}
        </div>
      </div>
    </article>)}</div>}
    <Modal open={Boolean(cancel)} onClose={() => !busy && setCancel(null)} title="Cancel booking">
      <p>Cancel {cancel?.reference}? Reserved spots will be returned to availability.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="account-actions"><Button disabled={busy} onClick={doCancel}>{busy ? 'Cancelling…' : 'Cancel booking'}</Button><Button variant="secondary" disabled={busy} onClick={() => setCancel(null)}>Keep booking</Button></div>
    </Modal>
    <Modal open={Boolean(review)} onClose={() => setReview(null)} title="Rate your experience">
      <p>Choose a rating and tell future travelers about your experience.</p>
      <div className="account-actions"><Button variant="secondary" onClick={() => setReview(null)}>Close</Button></div>
    </Modal>
  </>;
}
