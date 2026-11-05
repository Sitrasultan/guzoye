import { useState } from 'react';
import { guideAreaApi } from '../../services/guideArea';
import { useResource } from '../../hooks/useResource';
import { ErrorState } from '../../components/States';
import Button from '../../components/Button';
import { GuideEmpty, GuidePageHeader } from '../../components/guide/GuideUI';
import '../../guide.css';
const TYPES = [['tour_assignment', 'Tour assignment'], ['destination_assignment', 'Destination assignment'], ['time_off', 'Time off']];
export default function GuideRequests() {
  const [form, setForm] = useState({ type: 'tour_assignment', tourId: '', destinationId: '', dates: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [version, setVersion] = useState(0);
  const requests = useResource(() => guideAreaApi.requests({ limit: 20 }), `guide-requests-${version}`);
  const tours = useResource(() => guideAreaApi.schedule(), 'request-options');
  function change(event) { setForm(old => ({ ...old, [event.target.name]: event.target.value })); setMessage(''); }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const body = { type: form.type, message: form.message };
      if (form.type === 'tour_assignment') body.tourId = form.tourId;
      if (form.type === 'destination_assignment') body.destinationId = form.destinationId;
      if (form.type === 'time_off') body.blockedDates = form.dates.split(',').map(value => value.trim()).filter(Boolean);
      const response = await guideAreaApi.createRequest(body);
      setMessage(response.message); setForm(old => ({ ...old, tourId: '', destinationId: '', dates: '', message: '' })); setVersion(value => value + 1);
    } catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }
  async function cancel(id) {
    setBusy(true); setError('');
    try { await guideAreaApi.cancelRequest(id); setVersion(value => value + 1); } catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }
  return <>
    <GuidePageHeader eyebrow="ADMIN SUPPORT" title="Requests to admin" description="Ask for a tour or destination assignment, or request time off." />
    <section className="guide-panel"><h2>New request</h2>
      <form className="guide-form" onSubmit={submit}>
        <label>Request type<select name="type" value={form.type} onChange={change}>{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {form.type === 'tour_assignment' && <label>Tour<select name="tourId" value={form.tourId} onChange={change} required><option value="">Choose an assigned tour</option>{(tours.data?.assignedTours || []).map(tour => <option key={tour._id} value={tour._id}>{tour.title}</option>)}</select></label>}
        {form.type === 'destination_assignment' && <label>Destination ID<input name="destinationId" value={form.destinationId} onChange={change} required placeholder="Destination identifier" /></label>}
        {form.type === 'time_off' && <label>Dates (YYYY-MM-DD, comma separated)<input name="dates" value={form.dates} onChange={change} required placeholder="2026-12-24, 2026-12-25" /></label>}
        <label>Message<textarea name="message" value={form.message} onChange={change} required minLength={10} maxLength={2000} rows={4} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p className="guide-success" role="status">{message}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit request'}</Button>
      </form>
    </section>
    <section className="guide-panel"><h2>My requests</h2>
      {requests.loading ? <p role="status">Loading requests…</p> : requests.error ? <ErrorState message={requests.error} retry={requests.retry} /> : !(requests.data?.data || []).length ? <GuideEmpty title="No requests yet" message="Your assignment and time-off requests will appear here." /> : <ul className="guide-request-list">{requests.data.data.map(request => <li key={request._id}><div><strong>{request.type.replace(/_/g, ' ')}</strong><span>{request.status}</span></div><p>{request.message}</p>{request.decisionNote && <p className="guide-note">Admin note: {request.decisionNote}</p>}{request.status === 'pending' && <Button variant="secondary" disabled={busy} onClick={() => cancel(request._id)}>Cancel</Button>}</li>)}</ul>}
    </section>
  </>;
}
