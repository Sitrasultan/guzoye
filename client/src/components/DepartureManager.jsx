import { useState } from 'react';
import { guideManagement } from '../services/management';
import { formatDeparture } from '../services/bookings';
import Button from './Button';
import Modal from './Modal';
export default function DepartureManager({ tour, onRefresh }) {
  const [date, setDate] = useState(''), [capacity, setCapacity] = useState(tour.capacity), [chosen, setChosen] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function add(event) { event.preventDefault(); setBusy(true); setError(''); try { await guideManagement.addDeparture(tour._id, { date: new Date(`${date}:00+03:00`).toISOString(), capacity: Number(capacity) }); setDate(''); onRefresh(); } catch (problem) { setError(problem.message); } finally { setBusy(false); } }
  async function remove() { setBusy(true); setError(''); try { await guideManagement.removeDeparture(tour._id, chosen._id); setChosen(null); onRefresh(); } catch (problem) { setError(problem.message); } finally { setBusy(false); } }
  return <section className="account-panel management-section"><h2>Departure management</h2><p>Only future departures without active bookings may be removed. Existing booking history keeps its date snapshot.</p>{error && !chosen && <p className="form-error" role="alert">{error}</p>}
    <ul className="departure-list">{tour.departures.map(d => <li key={d._id}><span>{formatDeparture(d.date)} EAT<br /><small>{d.spotsLeft} / {d.capacity} spots left</small></span><Button variant="secondary" disabled={busy || +new Date(d.date) <= Date.now()} onClick={() => { setError(''); setChosen(d); }}>Remove</Button></li>)}</ul>{!tour.departures.length && <p>No departures remain.</p>}
    {!tour.archived && <form className="departure-row" onSubmit={add}><label>New date/time (Ethiopia)<input type="datetime-local" required value={date} disabled={busy} onChange={e => setDate(e.target.value)} /></label><label>Capacity<input type="number" min="1" max="1000" required value={capacity} disabled={busy} onChange={e => setCapacity(e.target.value)} /></label><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Add departure'}</Button></form>}
    <Modal open={Boolean(chosen)} onClose={() => { if (!busy) setChosen(null); }} title="Remove departure?"><p>{chosen && formatDeparture(chosen.date)} EAT</p>{error && <p className="form-error" role="alert">{error}</p>}<div className="account-actions"><Button disabled={busy} onClick={remove}>Remove departure</Button><Button variant="secondary" disabled={busy} onClick={() => setChosen(null)}>Go back</Button></div></Modal>
  </section>;
}
