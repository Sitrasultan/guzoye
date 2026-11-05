import '../bookings.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { bookingsApi, formatDeparture, formatMoney } from '../services/bookings';
import Button from './Button';
import Modal from './Modal';
export default function BookingPanel({ tour, onRefresh }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [departureId, setDepartureId] = useState('');
  const [guests, setGuests] = useState(1);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const departures = [...(tour.departures || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
  const selected = departures.find(d => d._id === departureId);
  const guideGroups = selected?.guideGroups || [];
  const guideById = new Map((tour.assignedGuides || []).map(guide => [String(guide._id), guide]));
  const [guideId, setGuideId] = useState('');
  const available = departures.some(d => d.spotsLeft > 0 && (d.guideGroups || []).some(group => group.spotsLeft > 0) && new Date(d.date).getTime() > Date.now());
  const eligible = !user || user.role === 'traveler';
  const total = Math.round(tour.price * 100) * guests / 100;
  function preview(event) {
    event.preventDefault(); setError('');
    if (!user) { navigate('/login', { state: { from: `/tours/${tour.slug || tour._id}` } }); return; }
    const group = guideGroups.find(item => String(item.guide) === guideId);
    if (!selected || !group || group.spotsLeft < guests || selected.spotsLeft < guests || new Date(selected.date).getTime() <= Date.now()) { setError('Choose an available departure, guide, and traveler count.'); return; }
    setOpen(true);
  }
  async function confirm() {
    setBusy(true); setError('');
    try {
      const response = await bookingsApi.create({ tour: tour._id, departureId, guideId, guests });
      setSuccess(response.data); setOpen(false); setDepartureId(''); setGuests(1);
    } catch (problem) { setError(problem.message); }
    finally { setBusy(false); }
  }
  return <aside className="booking-panel">
    <span className="eyebrow">MAKE THIS YOUR NEXT STORY</span>
    <div className="booking-price">{formatMoney(tour.price)}<small> / person</small></div>
    {success ? <div role="status"><h3>Your request is in.</h3><p>Your booking is pending guide confirmation. {success.guests} spots are held.</p><p>Server-calculated total: {formatMoney(success.totalPrice)}</p><Button to="/bookings" className="full-width">View my bookings</Button><Button variant="secondary" className="full-width" onClick={onRefresh}>Refresh tour availability</Button></div> : <>
      {!eligible ? <p className="notice">Only traveler accounts can book tours. Your {user.role} account cannot create a booking.</p> : !available ? <p className="notice">No bookable departures are available. Please check again later.</p> : <form onSubmit={preview}>
        <label>Departure (Ethiopia time)<select required value={departureId} disabled={busy || loading} onChange={event => { setDepartureId(event.target.value); setGuideId(''); setGuests(1); }}><option value="">Choose a departure</option>{departures.map(d => { const past = new Date(d.date).getTime() <= Date.now(); return <option key={d._id} value={d._id} disabled={past || d.spotsLeft < 1}>{formatDeparture(d.date)} · {past ? 'Departed' : d.spotsLeft < 1 ? 'Full' : `${d.spotsLeft} spots left`}</option>; })}</select></label>
        <label>Guide<select required value={guideId} disabled={!selected || busy || loading} onChange={event => setGuideId(event.target.value)}><option value="">Choose a guide</option>{guideGroups.map(group => { const guide = guideById.get(String(group.guide)); return <option key={group._id} value={group.guide} disabled={group.spotsLeft < 1}>{guide?.user?.name || 'Local guide'} · {group.spotsLeft} spots left</option>; })}</select></label>
        <label>Travelers<select value={guests} disabled={!selected || busy || loading} onChange={event => setGuests(Number(event.target.value))}>{Array.from({ length: Math.min(selected?.spotsLeft || 1, guideGroups.find(group => String(group.guide) === guideId)?.spotsLeft || 1) }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} {index ? 'travelers' : 'traveler'}</option>)}</select></label>
        <div className="price-line total"><span>Estimated total</span><strong>{formatMoney(total)}</strong></div>
        <Button type="submit" className="full-width" disabled={busy || loading}>{user ? 'Review booking request' : 'Log in to book'}<ArrowRight size={16} /></Button>
      </form>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="booking-note"><ShieldCheck size={15} />Spots are held when your request is created.</p><small>No online payment is collected. A booking request is not guide confirmation.</small>
      <Button variant="secondary" className="full-width" disabled={busy} onClick={onRefresh}>Refresh availability</Button>
    </>}
    <Modal open={open} onClose={() => { if (!busy) setOpen(false); }} title="Confirm your booking request">
      <p>{tour.title}</p><p>{selected && formatDeparture(selected.date)} EAT<br />{guests} travelers · {formatMoney(total)} estimated total</p><p>The server verifies the price and remaining spots. The request starts pending and holds your spots immediately.</p>
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="account-actions"><Button disabled={busy} onClick={confirm}>{busy ? 'Creating request…' : 'Confirm request'}</Button><Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>Go back</Button></div>
    </Modal>
  </aside>;
}
