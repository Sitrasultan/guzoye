import { useState } from 'react';
import { travelerApi } from '../../services/traveler';
import { useResource } from '../../hooks/useResource';
import { useAuth } from '../../hooks/useAuth';
import { ErrorState } from '../../components/States';
import Button from '../../components/Button';
import Avatar from '../../components/Avatar';
import ThemeToggle from '../../components/ThemeToggle';
import { AccountPageHeader } from '../../components/account/AccountUI';
import '../../account.css';
export default function AccountProfile() {
  const { user, refresh } = useAuth();
  const state = useResource(() => travelerApi.profile(), 'account-profile');
  const [form, setForm] = useState(null);
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  if (state.loading) return <p role="status">Loading profile…</p>;
  if (state.error) return <ErrorState message={state.error} retry={state.retry} />;
  const profile = state.data;
  const value = form || {
    name: user?.name || '', country: profile.country || '', bio: profile.bio || '',
    languages: (profile.languages || []).join(', '), interests: (profile.interests || []).join(', '),
    travelStyle: profile.travelStyle || '', emergencyContactName: profile.emergencyContact?.name || '',
    emergencyContactPhone: profile.emergencyContact?.phone || '', notifications: profile.notifications || { email: true, marketing: false }
  };
  function change(event) { const name = event.target.name; const next = { ...value, [name]: event.target.value }; setForm(next); setMessage(''); }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      await travelerApi.updateProfile({
        name: value.name, country: value.country, bio: value.bio, languages: value.languages.split(',').map(x => x.trim()).filter(Boolean),
        interests: value.interests.split(',').map(x => x.trim()).filter(Boolean), travelStyle: value.travelStyle,
        emergencyContact: { name: value.emergencyContactName, phone: value.emergencyContactPhone },
        notifications: value.notifications
      });
      setMessage('Profile saved.'); await refresh();
    } catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }
  async function upload(event) {
    const file = event.target.files?.[0]; if (!file) return;
    setBusy(true); setError(''); setMessage('');
    try { await travelerApi.uploadAvatar(file); setMessage('Profile photo updated.'); await refresh(); }
    catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }
  async function changePassword(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { await travelerApi.changePassword(password); setMessage('Password changed. Please sign in again.'); }
    catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }
  const complete = [value.name, value.country, value.bio, value.languages, value.interests, value.travelStyle].filter(Boolean).length;
  return <>
    <AccountPageHeader eyebrow="ACCOUNT" title="Profile and settings" description="Control your public traveler profile, privacy and appearance." />
    <section className="account-panel"><h2>Profile completeness</h2><div className="account-meter"><span style={{ width: `${Math.round(complete / 6 * 100)}%` }} /></div><p>{complete} of 6 profile sections completed</p></section>
    <div className="account-profile-grid">
      <form className="account-panel account-form" onSubmit={save}>
        <h2>Traveler profile</h2>
        <label>Display name<input name="name" value={value.name} onChange={change} required /></label>
        <label>Country<input name="country" value={value.country} onChange={change} /></label>
        <label>Bio<textarea name="bio" rows={4} value={value.bio} onChange={change} /></label>
        <label>Languages (comma separated)<input name="languages" value={value.languages} onChange={change} /></label>
        <label>Interests (comma separated)<input name="interests" value={value.interests} onChange={change} /></label>
        <label>Travel style<input name="travelStyle" value={value.travelStyle} onChange={change} placeholder="Slow travel, culture, hiking" /></label>
        <fieldset><legend>Emergency contact (private)</legend><input name="emergencyContactName" value={value.emergencyContactName} onChange={change} placeholder="Name" /><input name="emergencyContactPhone" value={value.emergencyContactPhone} onChange={change} placeholder="Phone" /></fieldset>
        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p className="account-success" role="status">{message}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</Button>
      </form>
      <aside className="account-panel"><h2>Profile photo</h2><Avatar src={user?.image} name={user?.name || 'Traveler'} size={130} /><label className="account-upload">Choose from device gallery<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={upload} /></label></aside>
      <aside className="account-panel"><h2>Appearance</h2><p>Choose Light, Dark, or System. System follows your device preference.</p><ThemeToggle /></aside>
      <form className="account-panel account-form" onSubmit={changePassword}>
        <h2>Change password</h2>
        <label>Current password<input type="password" value={password.currentPassword} onChange={event => setPassword(old => ({ ...old, currentPassword: event.target.value }))} required /></label>
        <label>New password<input type="password" minLength={8} value={password.newPassword} onChange={event => setPassword(old => ({ ...old, newPassword: event.target.value }))} required /></label>
        <Button type="submit" variant="secondary" disabled={busy}>Change password</Button>
      </form>
    </div>
  </>;
}
