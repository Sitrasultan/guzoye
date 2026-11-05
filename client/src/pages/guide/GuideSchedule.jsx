import { useState } from 'react';
import { guideAreaApi } from '../../services/guideArea';
import { useResource } from '../../hooks/useResource';
import { ErrorState } from '../../components/States';
import Button from '../../components/Button';
import { GuideEmpty, GuidePageHeader } from '../../components/guide/GuideUI';
import '../../guide.css';
function monthMatrix(year, month) {
  const first = new Date(Date.UTC(year, month, 1));
  const startDay = first.getUTCDay();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = Array.from({ length: startDay }, () => null);
  for (let day = 1; day <= days; day += 1) cells.push(new Date(Date.UTC(year, month, day)));
  while (cells.length % 7) cells.push(null);
  return cells;
}
export default function GuideSchedule() {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getUTCFullYear(), month: today.getUTCMonth() });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [version, setVersion] = useState(0);
  const state = useResource(() => guideAreaApi.schedule(), `guide-schedule-${version}`);
  if (state.loading) return <p role="status">Loading schedule…</p>;
  if (state.error) return <ErrorState message={state.error} retry={state.retry} />;
  const data = state.data;
  const blocked = new Set(data.blockedDates || []);
  const cells = monthMatrix(cursor.year, cursor.month);
  async function toggle(date) {
    const key = date.toISOString().slice(0, 10);
    setBusy(true); setError(''); setMessage('');
    try {
      const response = blocked.has(key) ? await guideAreaApi.unblockDate(key) : await guideAreaApi.blockDate(key);
      setMessage(response.message); setVersion(value => value + 1);
    } catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }
  return <>
    <GuidePageHeader eyebrow="MY SCHEDULE" title="Assigned work and availability" description="Admin-assigned tours and destinations, upcoming groups, and your blocked dates." />
    <section className="guide-panel"><h2>Assigned tours</h2>{data.assignedTours.length ? <ul className="guide-assignment-list">{data.assignedTours.map(tour => <li key={tour._id}><strong>{tour.title}</strong><span>{tour.destination}</span><small>{tour.departures} departure(s)</small></li>)}</ul> : <GuideEmpty title="No tours assigned" message="An administrator assigns tours to guides." />}</section>
    <section className="guide-panel"><h2>Assigned destinations</h2>{data.assignedDestinations.length ? <ul className="guide-chip-list">{data.assignedDestinations.map(destination => <li key={destination._id}>{destination.name}</li>)}</ul> : <GuideEmpty title="No destinations assigned" message="Request a destination assignment from an administrator." action={<Button variant="secondary" to="/guide/requests">Request another place</Button>} />}</section>
    <section className="guide-panel"><h2>Upcoming groups</h2>{data.upcomingGroups.length ? <ul className="guide-departures">{data.upcomingGroups.map(group => <li key={group.departureId}><div><strong>{group.title}</strong><span>{group.destination}</span></div><div><span>{new Date(group.date).toLocaleDateString()}</span><small>{group.groupSpotsLeft} of {group.groupCapacity} spots left</small></div></li>)}</ul> : <GuideEmpty title="No upcoming groups" message="Future assigned departures will appear here." />}</section>
    <section className="guide-panel"><h2>Availability calendar</h2>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="guide-success" role="status">{message}</p>}
      <div className="guide-calendar-head"><Button variant="secondary" onClick={() => setCursor(old => ({ ...old, month: old.month === 0 ? 11 : old.month - 1, year: old.month === 0 ? old.year - 1 : old.year }))}>Previous</Button><strong>{new Date(Date.UTC(cursor.year, cursor.month, 1)).toLocaleString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</strong><Button variant="secondary" onClick={() => setCursor(old => ({ ...old, month: old.month === 11 ? 0 : old.month + 1, year: old.month === 11 ? old.year + 1 : old.year }))}>Next</Button></div>
      <div className="guide-calendar" role="grid">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="guide-calendar-day-name">{day}</div>)}{cells.map((date, index) => date ? <button key={index} className={`guide-calendar-day${blocked.has(date.toISOString().slice(0, 10)) ? ' blocked' : ''}`} disabled={busy} onClick={() => toggle(date)}>{date.getUTCDate()}</button> : <div key={index} />)}</div>
      <p>Click a date to block or unblock it. Dates with confirmed bookings cannot be blocked.</p>
    </section>
  </>;
}
