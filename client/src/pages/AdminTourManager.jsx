import { useState } from 'react';
import { adminManagement, adminTourApi } from '../services/management';
import { useResource } from '../hooks/useResource';
import { Skeletons, ErrorState, EmptyState } from '../components/States';
import Button from '../components/Button';
import '../management.css';
export default function AdminTourManager() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: '', destination: '', description: '', price: 100, duration: 3, difficulty: 'Moderate', capacity: 8, images: 'https://images.unsplash.com/photo-1533676802871-eca1ae998cd5?w=1200', guideIds: '' });
  const tours = useResource(() => adminTourApi.list({ page: 1, limit: 20 }), 'admin-tour-manager');
  const guides = useResource(() => adminManagement.guides({ status: 'approved', page: 1, limit: 50 }), 'admin-approved-guides');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const response = await adminTourApi.create({
        ...form,
        price: Number(form.price), duration: Number(form.duration), capacity: Number(form.capacity),
        images: form.images.split('\n').map(value => value.trim()).filter(Boolean),
        itinerary: Array.from({ length: Number(form.duration) }, (_, index) => ({ day: index + 1, title: `Day ${index + 1}`, description: `Guided experiences and transfer time for day ${index + 1}.` })),
        assignedGuides: form.guideIds.split(',').map(value => value.trim()).filter(Boolean),
        departures: [{ date: new Date(Date.now() + 21 * 86400000).toISOString(), capacity: Number(form.capacity) }]
      });
      setMessage(response.message); tours.retry();
    } catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }
  async function assign(tour) {
    const guideIds = window.prompt('Enter approved guide IDs, separated by commas:', (tour.assignedGuides || []).map(item => item._id).join(','));
    if (!guideIds) return;
    setBusy(true); setError(''); setMessage('');
    try { const response = await adminTourApi.assignGuides(tour._id, guideIds.split(',').map(value => value.trim()).filter(Boolean)); setMessage(response.message); tours.retry(); }
    catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }
  return <main className="container page">
    <header className="guide-workspace-header"><span className="eyebrow">GUZOYE ADMIN</span><h1>Tours & guide assignments</h1><p>Create platform-owned tours, assign approved guides, and manage departure groups.</p></header>
    {message && <p className="success-message" role="status">{message}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="management-section"><h2>Create a tour</h2>
      <form onSubmit={submit} className="account-panel">
        <label>Title<input required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></label>
        <label>Destination ID<input required value={form.destination} onChange={event => setForm({ ...form, destination: event.target.value })} /></label>
        <label>Approved guide IDs (comma separated)<input required value={form.guideIds} onChange={event => setForm({ ...form, guideIds: event.target.value })} /></label>
        <label>Price (USD)<input type="number" min="1" required value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} /></label>
        <label>Duration (days)<input type="number" min="1" max="365" required value={form.duration} onChange={event => setForm({ ...form, duration: event.target.value })} /></label>
        <label>Capacity<input type="number" min="1" required value={form.capacity} onChange={event => setForm({ ...form, capacity: event.target.value })} /></label>
        <label>Difficulty<select value={form.difficulty} onChange={event => setForm({ ...form, difficulty: event.target.value })}>{['Easy', 'Moderate', 'Challenging'].map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Description<textarea required rows="4" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
        <label>Image URLs (one per line)<textarea rows="2" value={form.images} onChange={event => setForm({ ...form, images: event.target.value })} /></label>
        <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create tour'}</Button>
      </form>
    </section>
    <section className="management-section"><h2>Existing tours</h2>
      {tours.loading ? <Skeletons count={3} /> : tours.error ? <ErrorState message={tours.error} retry={tours.retry} /> : !tours.data.data.length ? <EmptyState title="No tours yet" message="Create the first Guzoye tour above." /> : (
        <div className="booking-table-wrap"><table className="booking-table"><thead><tr><th>Tour</th><th>Destination</th><th>Assigned guides</th><th>Action</th></tr></thead><tbody>
          {tours.data.data.map(tour => <tr key={tour._id}><td>{tour.title}</td><td>{tour.destination?.name}</td><td>{(tour.assignedGuides || []).map(guide => guide.user?.name).join(', ') || 'None'}</td><td><Button variant="secondary" disabled={busy} onClick={() => assign(tour)}>Assign guides</Button></td></tr>)}
        </tbody></table></div>
      )}
      {guides.data?.data?.length ? <p className="muted">Approved guides: {guides.data.data.map(guide => `${guide.user?.name} (${guide._id})`).join(' · ')}</p> : null}
    </section>
    <Button variant="secondary" to="/dashboard/admin">Back to admin dashboard</Button>
  </main>;
}
