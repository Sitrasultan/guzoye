import { useState } from 'react';
import { guideAreaApi } from '../../services/guideArea';
import { guideManagement } from '../../services/management';
import { useResource } from '../../hooks/useResource';
import { Skeletons, ErrorState } from '../../components/States';
import Button from '../../components/Button';
import GuideCard from '../../components/GuideCard';
import ImageUploader from '../../components/ImageUploader';
import { GuidePageHeader } from '../../components/guide/GuideUI';
import '../../guide.css';
const split = value => String(value || '').split(',').map(item => item.trim()).filter(Boolean);
function completeness(guide) {
  const checks = [Boolean(guide.image), guide.bio && guide.bio.length >= 20, guide.languages?.length, guide.specialties?.length, guide.yearsExperience > 0, guide.certifications?.length];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}
function Editor({ guide, destinations }) {
  const [form, setForm] = useState({ bio: guide.bio || '', languages: (guide.languages || []).join(', '), specialties: (guide.specialties || []).join(', '), certifications: (guide.certifications || []).join(', '), yearsExperience: guide.yearsExperience || 0, contactPreference: guide.contactPreference || 'platform' });
  const [photo, setPhoto] = useState(guide.image ? [{ url: guide.image }] : []);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const preview = { ...guide, ...form, image: photo[0]?.url || '', languages: split(form.languages), specialties: split(form.specialties), certifications: split(form.certifications), coveredPlaces: destinations.filter(destination => (guide.coveredDestinations || []).some(item => item._id === destination._id)) };
  const percent = completeness({ ...guide, ...form, image: photo[0]?.url, languages: split(form.languages), specialties: split(form.specialties), certifications: split(form.certifications) });
  function change(event) { setForm(old => ({ ...old, [event.target.name]: event.target.value })); setMessage(''); }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      await guideManagement.saveProfile({ bio: form.bio, languages: split(form.languages), specialties: split(form.specialties), certifications: split(form.certifications), yearsExperience: Number(form.yearsExperience), contactPreference: form.contactPreference });
      setMessage('Profile saved.');
    } catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }
  return <div className="guide-profile-grid">
    <section className="guide-panel"><h2>Profile completeness</h2><div className="guide-meter" role="progressbar" aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${percent}%` }} /></div><p>{percent}% complete</p><ul className="guide-checklist">{['Profile photo', 'Bio', 'Languages', 'Specialties', 'Experience', 'Certifications'].map(label => <li key={label}>{label}</li>)}</ul></section>
    <section className="guide-panel"><ImageUploader kind="avatar" value={photo} onChange={setPhoto} name={guide.user?.name || 'Guide'} disabled={busy || guide.status === 'rejected'} onBusyChange={setUploading} onPhotoChanged={() => window.dispatchEvent(new Event('guzoye:photo-updated'))} /></section>
    <form className="guide-panel guide-form" onSubmit={save}>
      <h2>My profile</h2>
      <label>About you<textarea name="bio" value={form.bio} onChange={change} required minLength={20} maxLength={3000} rows={7} /></label>
      <label>Languages (comma separated)<input name="languages" value={form.languages} onChange={change} required /></label>
      <label>Specialties (comma separated)<input name="specialties" value={form.specialties} onChange={change} /></label>
      <label>Certifications (comma separated)<input name="certifications" value={form.certifications} onChange={change} /></label>
      <label>Years of experience<input type="number" name="yearsExperience" min="0" max="80" value={form.yearsExperience} onChange={change} required /></label>
      <label>Contact preference<select name="contactPreference" value={form.contactPreference} onChange={change}><option value="platform">Through Guzoye</option><option value="email">Email</option><option value="phone">Phone</option></select></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="guide-success" role="status">{message}</p>}
      <Button type="submit" disabled={busy || uploading}>{busy ? 'Saving…' : 'Save profile'}</Button>
    </form>
    <aside className="guide-panel"><h2>Assigned places</h2>{(guide.coveredDestinations || []).length ? <ul>{guide.coveredDestinations.map(destination => <li key={destination._id}>{destination.name}</li>)}</ul> : <p>No places assigned yet.</p>}<Button variant="secondary" to="/guide/requests">Request another place</Button></aside>
    <aside className="guide-panel"><h2>Live public preview</h2><GuideCard guide={preview} /></aside>
  </div>;
}
export default function GuideProfile() {
  const state = useResource(async () => {
    const [profile, places] = await Promise.all([guideManagement.profile(), guideManagement.destinations()]);
    return { guide: profile.data, destinations: places.data };
  }, 'guide-profile-page');
  if (state.loading) return <Skeletons count={3} />;
  if (state.error) return <ErrorState message={state.error} retry={state.retry} />;
  return <><GuidePageHeader eyebrow="MY PROFILE" title="Let travelers get to know you" description="Create a complete, trustworthy public guide profile." /><Editor guide={state.data.guide} destinations={state.data.destinations} /></>;
}
