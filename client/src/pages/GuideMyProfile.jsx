import { useState } from 'react';
import { guideManagement } from '../services/management';
import { useResource } from '../hooks/useResource';
import { Skeletons, ErrorState } from '../components/States';
import Button from '../components/Button';
import GuideCard from '../components/GuideCard';
import ImageUploader from '../components/ImageUploader';
import '../management.css';
const split = value => value.split(',').map(v => v.trim()).filter(Boolean);
function Editor({ guide, destinations }) {
  const [form, setForm] = useState({ bio: guide.bio || '', languages: guide.languages.join(', '), specialties: guide.specialties.join(', '), coveredDestinations: (guide.coveredDestinations || []).map(String), yearsExperience: guide.yearsExperience || 0 });
  const [photo, setPhoto] = useState(guide.image ? [{ url: guide.image }] : []);
  const [busy, setBusy] = useState(false), [uploading, setUploading] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const preview = { ...guide, ...form, image: photo[0]?.url || '', languages: split(form.languages), specialties: split(form.specialties), coveredPlaces: destinations.filter(d => form.coveredDestinations.includes(d._id)) };
  function change(event) { setForm(old => ({ ...old, [event.target.name]: event.target.value })); setMessage(''); }
  function toggle(id) { setForm(old => ({ ...old, coveredDestinations: old.coveredDestinations.includes(id) ? old.coveredDestinations.filter(value => value !== id) : [...old.coveredDestinations, id] })); }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { await guideManagement.saveProfile({ ...form, languages: split(form.languages), specialties: split(form.specialties), yearsExperience: Number(form.yearsExperience) }); setMessage('Profile saved. Photo changes are saved immediately.'); }
    catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }
  return <div className="management-split"><div>
    <section className="account-panel"><ImageUploader kind="avatar" value={photo} onChange={setPhoto} name={guide.user.name} disabled={busy || guide.status === 'rejected'} onBusyChange={setUploading} onPhotoChanged={() => window.dispatchEvent(new Event('guzoye:photo-updated'))} />{guide.status === 'rejected' && <p className="notice">Photo changes require a pending or approved application. Other profile fields can still be edited.</p>}</section>
    <form className="account-panel management-form" onSubmit={save}><h2>My profile</h2>{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="success-message" role="status">{message}</p>}<fieldset disabled={busy || uploading}>
      <label>About you<textarea name="bio" value={form.bio} onChange={change} required minLength={20} maxLength={3000} rows={7} /></label>
      {[['languages', 'Languages (comma separated)'], ['specialties', 'Specialties (comma separated)']].map(([name, label]) => <label key={name}>{label}<input name={name} value={form[name]} onChange={change} /></label>)}
      <fieldset className="place-picker"><legend>Places you cover</legend><p>Published tours also add their destinations to your public coverage automatically.</p>{destinations.map(d => <label key={d._id}><input type="checkbox" checked={form.coveredDestinations.includes(d._id)} onChange={() => toggle(d._id)} />{d.name}</label>)}</fieldset>
      <label>Years of experience<input type="number" name="yearsExperience" min="0" max="80" step="1" value={form.yearsExperience} onChange={change} required /></label><Button type="submit" disabled={busy || uploading}>{busy ? 'Saving…' : 'Save profile'}</Button>
    </fieldset></form></div><aside><span className="eyebrow">LIVE PROFILE PREVIEW</span><GuideCard guide={preview} /><section className="account-panel preview-bio"><h3>About {guide.user.name}</h3><p>{form.bio}</p><p>{form.yearsExperience} years of experience</p></section></aside></div>;
}
export default function GuideMyProfile() {
  const state = useResource(async () => { const [profile, places] = await Promise.all([guideManagement.profile(), guideManagement.destinations()]); return { guide: profile.data, destinations: places.data }; }, 'my-profile');
  return <main className="container page"><header className="page-heading"><span className="eyebrow">YOUR LOCAL STORY</span><h1>Let travelers get to know you.</h1><Button to="/dashboard/guide" variant="secondary">Back to guide dashboard</Button></header>{state.loading ? <Skeletons count={2} /> : state.error ? <ErrorState message={state.error} retry={state.retry} /> : <Editor guide={state.data.guide} destinations={state.data.destinations} />}</main>;
}
