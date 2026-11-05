import { useState } from 'react';
import { adminApi } from '../../services/adminApi';
import { useResource } from '../../hooks/useResource';
import { EmptyState, PageHeader, Skeleton, StatusBadge } from '../../components/admin/AdminUI';
import Button from '../../components/Button';
import '../../admin.css';
export default function AdminDestinations() {
  const destinations = useResource(() => adminApi.destinations(), 'admin-destinations');
  const [form, setForm] = useState({
    name: '',
    region: '',
    description: '',
    image: ''
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await adminApi.createDestination(form);
      setMessage(result.message);
      setForm({
        name: '',
        region: '',
        description: '',
        image: ''
      });
      destinations.retry();
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  }
  return <div className="admin-page"><PageHeader eyebrow="Catalog" title="Destinations" description="Create destinations available to new tours." />
    {message && <p className="success-message" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}
    <section className="admin-panel"><h2>Create destination</h2>
      <form onSubmit={submit} className="admin-inline-form">
        <label>Name<input required value={form.name} onChange={event => setForm(value => ({
            ...value,
            name: event.target.value
          }))} /></label>
        <label>Region<input required value={form.region} onChange={event => setForm(value => ({
            ...value,
            region: event.target.value
          }))} /></label>
        <label>Description<textarea required minLength={20} maxLength={3000} rows={3} value={form.description} onChange={event => setForm(value => ({
            ...value,
            description: event.target.value
          }))} /></label>
        <label>Photo URL<input required type="url" placeholder="https://…" value={form.image} onChange={event => setForm(value => ({
            ...value,
            image: event.target.value
          }))} /></label>
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create destination'}</Button>
      </form>
    </section>
    <section className="admin-panel"><h2>All destinations</h2>
      {destinations.loading ? <Skeleton height={220} /> : destinations.error ? <EmptyState title="Could not load destinations" message={destinations.error} /> : !(destinations.data?.data || []).length ? <EmptyState title="No destinations" message="Create the first destination above." /> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ID</th><th>Name</th><th>Region</th><th>Status</th></tr></thead><tbody>{destinations.data.data.map(destination => <tr key={destination._id}><td>#{String(destination._id).slice(-6)}</td><td>{destination.name}</td><td>{destination.region}</td><td><StatusBadge value="published" /></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
