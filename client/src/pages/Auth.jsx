import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Mountain, ArrowRight, LockKeyhole } from 'lucide-react';
import Button from '../components/Button';
import { useAuth, dashboardPath } from '../hooks/useAuth';
export default function Auth({ register = false }) {
  const auth = useAuth(), navigate = useNavigate(), location = useLocation();
  const [values, setValues] = useState({ name: '', email: '', password: '', role: 'traveler' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  function change(event) { setValues(old => ({ ...old, [event.target.name]: event.target.value })); }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setFields({});
    try {
      const user = await (register ? auth.register(values) : auth.login({ email: values.email, password: values.password }));
      setValues(old => ({ ...old, password: '' }));
      const from = location.state?.from;
      const safeReturn = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/dashboard');
      navigate(safeReturn ? from : dashboardPath(user.role), { replace: true });
    } catch (problem) { setError(problem.message); setFields(problem.fields || {}); }
    finally { setBusy(false); }
  }
  if (!auth.loading && auth.user && !busy) return <Navigate to={dashboardPath(auth.user.role)} replace />;
  const fieldError = name => fields[name] ? <small id={`${name}-error`} className="field-error">{fields[name]}</small> : null;
  return <main className="container auth-page">
    <section className="auth-story"><Mountain size={40} /><span className="eyebrow">WELCOME TO WONDU</span><h1>A world of stories.<br />A place for yours.</h1><p>Your next chapter begins with a little curiosity.</p></section>
    <section className="auth-form">
      <span className="eyebrow">{register ? 'START SOMETHING GOOD' : 'GOOD TO SEE YOU AGAIN'}</span>
      <h2>{register ? 'Let’s find your next story.' : 'Welcome back, explorer.'}</h2>
      <p className="auth-security"><LockKeyhole size={16} />Your session stays in an httpOnly cookie, never local storage.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <form onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy || auth.loading}>
          {register && <label>Your name<input name="name" autoComplete="name" required maxLength={100} value={values.name} onChange={change} aria-invalid={Boolean(fields.name)} aria-describedby={fields.name ? 'name-error' : undefined} />{fieldError('name')}</label>}
          <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} value={values.email} onChange={change} aria-invalid={Boolean(fields.email)} aria-describedby={fields.email ? 'email-error' : undefined} />{fieldError('email')}</label>
          <label>Password<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 8 : undefined} value={values.password} onChange={change} aria-invalid={Boolean(fields.password)} aria-describedby={fields.password ? 'password-error' : register ? 'password-help' : undefined} />{fieldError('password')}</label>
          {register && <><small id="password-help" className="form-help">At least 8 characters; at most 72 UTF-8 bytes.</small><label>I’m joining as<select name="role" value={values.role} onChange={change}><option value="traveler">Traveler — discover Ethiopia</option><option value="guide">Guide — share local knowledge</option></select>{fieldError('role')}</label>{values.role === 'guide' && <p className="notice">Guide accounts start pending. An admin must approve your application before guide-only workspace access is enabled.</p>}</>}
          <Button type="submit" className="full-width" disabled={busy || auth.loading}>{busy ? 'Please wait…' : register ? 'Create account' : 'Log in'}<ArrowRight size={16} /></Button>
        </fieldset>
      </form>
      <p>{register ? 'Already part of the journey?' : 'New around here?'} <Link to={register ? '/login' : '/register'}>{register ? 'Log in' : 'Join Wondu'}</Link></p>
      <Link className="section-link" to="/tours">Explore without an account <ArrowRight size={16} /></Link>
    </section>
  </main>;
}
