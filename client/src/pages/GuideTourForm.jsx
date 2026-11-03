import ImageUploader from '../components/ImageUploader';
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { guideManagement } from '../services/management';
import { useResource } from '../hooks/useResource';
import { Skeletons, ErrorState } from '../components/States';
import Button from '../components/Button';
import DepartureManager from '../components/DepartureManager';
import '../management.css';
const lines = value => value.split('\n').map(v => v.trim()).filter(Boolean);
const emptyDay = () => ({ title: '', description: '' });
const instant = value => new Date(`${value}:00+03:00`).toISOString();
function Editor({ tour, destinations, onRefresh }) {
  const edit = Boolean(tour), navigate = useNavigate();
  const [form, setForm] = useState({ title: tour?.title || '', destination: tour?.destination?._id || '', description: tour?.description || '', price: tour?.price ?? '', duration: tour?.duration || 1, difficulty: tour?.difficulty || 'Easy', capacity: tour?.capacity || 8, images: tour?.images.map(url => ({ url, attached: true })) || [], included: tour?.included.join('\n') || '', excluded: tour?.excluded.join('\n') || '', itinerary: tour?.itinerary.map(day => ({ title: day.title, description: day.description })) || [emptyDay()] });
  const [imageBusy, setImageBusy] = useState(false);
  const [departures, setDepartures] = useState([{ date: '', capacity: 8 }]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const locked = tour?.archived || tour?.activeBookingCount > 0;
  function change(event) { setForm(old => ({ ...old, [event.target.name]: event.target.value })); setMessage(''); }
  function dayChange(index, name, value) { setForm(old => ({ ...old, itinerary: old.itinerary.map((day, i) => i === index ? { ...day, [name]: value } : day) })); }
  async function save(event) {
    event.preventDefault(); if (imageBusy) return; if (!form.images.length || form.images.length > 6) { setError('Choose 1–6 images.'); return; } setBusy(true); setError(''); setMessage('');
    try {
      if (Number(form.duration) !== form.itinerary.length) throw new Error('Duration must equal the number of itinerary days. Add or remove days to match.');
      const body = { ...form, price: Number(form.price), duration: Number(form.duration), capacity: Number(form.capacity), images: form.images.map(image => image.url), included: lines(form.included), excluded: lines(form.excluded) };
      if (!edit) body.departures = departures.map(d => ({ date: instant(d.date), capacity: Number(d.capacity) }));
      const response = await (edit ? guideManagement.save(tour._id, body) : guideManagement.create(body));
      if (!edit) navigate(`/dashboard/guide/tours/${response.data._id}/edit`, { replace: true });
      else { setMessage('Tour saved.'); onRefresh(); }
    } catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }
  return <><form className="account-panel management-form" onSubmit={save}>
    {locked && <p className="notice">{tour.archived ? 'This tour is archived. Its details are read-only.' : 'This tour has active bookings. Details are locked; you may archive the tour or manage eligible departures below.'}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="success-message" role="status">{message}</p>}
    <fieldset disabled={busy || locked}>
      <label>Tour title<input name="title" required minLength={5} maxLength={180} value={form.title} onChange={change} /></label>
      <label>Destination<select name="destination" required value={form.destination} onChange={change}><option value="">Choose a destination</option>{destinations.map(d => <option value={d._id} key={d._id}>{d.name} · {d.region}</option>)}</select></label>
      <label>Description<textarea name="description" required minLength={30} maxLength={10000} rows={6} value={form.description} onChange={change} /></label>
      <div className="form-columns">{[['price', 'Price per person (USD)', 0, 1000000, '.01'], ['duration', 'Duration (days)', 1, 365, '1'], ['capacity', 'Default group capacity', 1, 1000, '1']].map(([name, label, min, max, step]) => <label key={name}>{label}<input name={name} type="number" required min={min} max={max} step={step} value={form[name]} onChange={change} /></label>)}</div>
      <label>Difficulty<select name="difficulty" value={form.difficulty} onChange={change}>{['Easy', 'Moderate', 'Challenging'].map(d => <option key={d}>{d}</option>)}</select></label>
      <h2>Day-by-day itinerary</h2>{form.itinerary.map((day, index) => <section className="itinerary-editor" key={index}><h3>Day {index + 1}</h3><label>Day title<input required minLength={2} maxLength={180} value={day.title} onChange={e => dayChange(index, 'title', e.target.value)} /></label><label>Day description<textarea required minLength={5} maxLength={3000} value={day.description} onChange={e => dayChange(index, 'description', e.target.value)} /></label><Button type="button" variant="secondary" disabled={form.itinerary.length <= 1} onClick={() => setForm(old => ({ ...old, itinerary: old.itinerary.filter((_, i) => i !== index), duration: old.itinerary.length - 1 }))}>Remove day</Button></section>)}
      <Button type="button" variant="secondary" disabled={form.itinerary.length >= 365} onClick={() => setForm(old => ({ ...old, itinerary: [...old.itinerary, emptyDay()], duration: old.itinerary.length + 1 }))}>Add itinerary day</Button>
      <ImageUploader value={form.images} onChange={images => setForm(old => ({ ...old, images }))} disabled={busy || locked} onBusyChange={setImageBusy} />
      {[['included', 'Included (one item per line)'], ['excluded', 'Excluded (one item per line)']].map(([name, label]) => <label key={name}>{label}<textarea name={name} required={name === 'images'} rows={4} value={form[name]} onChange={change} /></label>)}
      {!edit && <section><h2>Future departures</h2><p>Dates and times below use Ethiopia time (UTC+3).</p>{departures.map((d, index) => <div className="departure-row" key={index}><label>Date and time<input type="datetime-local" required value={d.date} onChange={e => setDepartures(old => old.map((value, i) => i === index ? { ...value, date: e.target.value } : value))} /></label><label>Capacity<input type="number" min="1" max="1000" required value={d.capacity} onChange={e => setDepartures(old => old.map((value, i) => i === index ? { ...value, capacity: e.target.value } : value))} /></label><Button type="button" variant="secondary" disabled={departures.length <= 1} onClick={() => setDepartures(old => old.filter((_, i) => i !== index))}>Remove</Button></div>)}<Button type="button" variant="secondary" disabled={departures.length >= 40} onClick={() => setDepartures(old => [...old, { date: '', capacity: Number(form.capacity) }])}>Add departure</Button></section>}
      <Button type="submit" disabled={busy || locked || imageBusy}>{busy ? 'Saving…' : edit ? 'Save tour details' : 'Publish my tour'}</Button>
    </fieldset>
  </form>{edit && <DepartureManager tour={tour} onRefresh={onRefresh} />}</>;
}
export default function GuideTourForm() {
  const { id } = useParams();
  const state = useResource(async () => { const [destinations, profile, tour] = await Promise.all([guideManagement.destinations(), guideManagement.profile(), id ? guideManagement.tour(id) : Promise.resolve(null)]); return { destinations: destinations.data, profile: profile.data, tour: tour?.data }; }, id || 'new-tour');
  return <main className="container page"><header className="page-heading"><span className="eyebrow">GUIDE STUDIO</span><h1>{id ? 'Manage your journey.' : 'Create a journey worth sharing.'}</h1><Button to="/dashboard/guide" variant="secondary">Back to My Tours</Button></header>{state.loading ? <Skeletons count={2} /> : state.error ? <ErrorState message={state.error} retry={state.retry} /> : state.data.profile.status !== 'approved' ? <p className="notice">Only approved guides can create or manage tours.</p> : <Editor key={id || 'new'} tour={state.data.tour} destinations={state.data.destinations} onRefresh={state.retry} />}</main>;
}
