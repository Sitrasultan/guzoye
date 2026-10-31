import { useState } from 'react';
import { guideManagement } from '../services/management';
import { useResource } from '../hooks/useResource';
import { Skeletons, ErrorState } from '../components/States';
import Button from '../components/Button';
import GuideCard from '../components/GuideCard';
import '../management.css';
const split = value => value.split(',').map(v => v.trim()).filter(Boolean);
function Editor({ guide }) {
  const [form, setForm] = useState({ bio: guide.bio || '', languages: guide.languages.join(', '), specialties: guide.specialties.join(', '), regionsCovered: (guide.regionsCovered || []).join(', '), yearsExperience: guide.yearsExperience || 0, image: guide.image || '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const preview = { ...guide, ...form, languages: split(form.languages), specialties: split(form.specialties), regionsCovered: split(form.regionsCovered) };
  function change(event) { setForm(old => ({ ...old, [event.target.name]: event.target.value })); setMessage(''); }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { await guideManagement.saveProfile({ ...form, languages: split(form.languages), specialties: split(form.specialties), regionsCovered: split(form.regionsCovered), yearsExperience: Number(form.yearsExperience) }); setMessage('Your profile has been saved.'); }
    catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }
  return <div className="management-split"><form className="account-panel management-form" onSubmit={save}>
    <h2>My profile</h2><p>Profile editing is available while your application is pending. Only approved, active profiles appear publicly.</p>
    {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="success-message" role="status">{message}</p>}
    <fieldset disabled={busy}>
      <label>About you<textarea name="bio" value={form.bio} onChange={change} required minLength={20} maxLength={3000} rows={7} /></label>
      {[['languages', 'Languages (comma separated)'], ['specialties', 'Specialties (comma separated)'], ['regionsCovered', 'Regions covered (comma separated)']].map(([name, label]) => <label key={name}>{label}<input name={name} value={form[name]} onChange={change} maxLength={2000} /></label>)}
      <label>Years of experience<input type="number" name="yearsExperience" min="0" max="80" step="1" value={form.yearsExperience} onChange={change} required /></label>
      <label>Profile photo URL<input type="url" name="image" value={form.image} onChange={change} required maxLength={2048} placeholder="https://…" /></label><small>Use an HTTPS image on a public hostname. The server does not download or verify image content.</small>
      <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</Button>
    </fieldset>
  </form><aside><span className="eyebrow">LIVE PUBLIC-PROFILE PREVIEW</span><GuideCard guide={preview} /><section className="account-panel preview-bio"><h3>About {guide.user.name}</h3><p>{form.bio}</p><p>{form.yearsExperience} years of experience</p><p>Regions: {preview.regionsCovered.join(', ') || 'Not specified yet'}</p></section></aside></div>;
}
export default function GuideMyProfile() {
  const state = useResource(() => guideManagement.profile(), 'my-profile');
  return <main className="container page"><header className="page-heading"><span className="eyebrow">YOUR LOCAL STORY</span><h1>Let travelers get to know you.</h1><Button to="/dashboard/guide" variant="secondary">Back to guide dashboard</Button></header>{state.loading ? <Skeletons count={2} /> : state.error ? <ErrorState message={state.error} retry={state.retry} /> : <Editor key={state.data.data._id} guide={state.data.data} />}</main>;
}
