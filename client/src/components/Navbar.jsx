import Avatar from './Avatar';
import { authApi } from '../services/api';
import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Mountain, Menu, X, ArrowUpRight, LogOut } from 'lucide-react';
import Button from './Button';
import { useAuth, dashboardPath } from '../hooks/useAuth';
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState(user?.image || '');
  useEffect(() => setPhoto(user?.image || ''), [user]);
  useEffect(() => { const update = () => authApi.me().then(current => setPhoto(current.image || '')).catch(() => {}); window.addEventListener('guzoye:photo-updated', update); return () => window.removeEventListener('guzoye:photo-updated', update); }, []);
  async function handleLogout() {
    setBusy(true); setError('');
    try { await logout(); setOpen(false); navigate('/login'); }
    catch (problem) { setError(problem.message); }
    finally { setBusy(false); }
  }
  return <header className="site-header">
    <div className="container nav-inner">
      <Link className="brand" to="/" onClick={() => setOpen(false)}><Mountain size={32} /><span>guzoye<span className="brand-dot">.</span></span></Link>
      <button className="icon-btn mobile-toggle" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      <nav id="main-navigation" className={open ? 'navigation open' : 'navigation'} aria-label="Main navigation">
        {[['/', 'Discover'], ['/tours', 'Explore tours'], ['/guides', 'Local guides'], ['/bookings', 'My bookings']].map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}>{label}</NavLink>)}
        <div className="nav-auth">
          {loading ? <span role="status">Checking session…</span> : user ? <>
            <Avatar src={photo} name={user.name} size={34} /><span className="nav-user" title={user.name}>{user.name}</span>
            <Link to={dashboardPath(user.role)} onClick={() => setOpen(false)}>Dashboard</Link>
            <button className="btn btn-secondary" disabled={busy} onClick={handleLogout}><LogOut size={15} />{busy ? 'Logging out…' : 'Logout'}</button>
          </> : <><Link to="/login" onClick={() => setOpen(false)}>Log in</Link><Button to="/register" onClick={() => setOpen(false)}>Get started <ArrowUpRight size={16} /></Button></>}
        </div>
      </nav>
    </div>
    {error && <p className="nav-error" role="alert">{error}</p>}
  </header>;
}
