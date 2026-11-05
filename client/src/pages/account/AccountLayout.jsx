import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bookmark, Compass, LogOut, Menu, MessageSquareQuote, PanelLeftClose, PanelLeftOpen, Settings, X, LayoutDashboard, Plane } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import ThemeToggle from '../../components/ThemeToggle';
import '../../account.css';
const NAV = [
  { to: '/account', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/account/trips', label: 'My Trips', icon: Plane },
  { to: '/account/wishlist', label: 'Wishlist', icon: Bookmark },
  { to: '/account/reviews', label: 'My Reviews', icon: MessageSquareQuote },
  { to: '/account/profile', label: 'Profile and Settings', icon: Settings }
];
export default function AccountLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('guzoye-account-collapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { localStorage.setItem('guzoye-account-collapsed', collapsed ? '1' : '0'); }, [collapsed]);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  const skip = () => document.getElementById('account-content')?.focus();
  const initials = (user?.name || 'T').split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase();
  return <div className={`account-shell ${collapsed ? 'collapsed' : ''}`}>
    <button type="button" className="account-skip-link" onClick={skip}>Skip to account content</button>
    <button type="button" className="account-scrim" hidden={!mobileOpen} onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
    <aside className="account-sidebar" data-open={mobileOpen}>
      <div className="account-brand"><span className="account-brand-mark">G</span><strong>Guzoye Traveler</strong></div>
      <nav aria-label="Traveler navigation"><ul>{NAV.map(item => { const Icon = item.icon; return <li key={item.to}><NavLink to={item.to} end={item.end} className={({ isActive }) => `account-nav-link${isActive ? ' active' : ''}`} title={collapsed ? item.label : undefined}><Icon size={17} /><span>{item.label}</span></NavLink></li>; })}</ul></nav>
      <div className="account-sidebar-footer">
        <Link className="account-sidebar-link" to="/tours"><Compass size={16} /><span>Browse tours</span></Link>
        <button type="button" className="account-collapse" onClick={() => setCollapsed(value => !value)}>{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}{!collapsed && <span>Collapse</span>}</button>
        <div className="account-user-card"><span className="account-avatar">{initials}</span><div><strong>{user?.name}</strong><small>Traveler</small></div><button type="button" onClick={logout} aria-label="Sign out"><LogOut size={16} /></button></div>
      </div>
    </aside>
    <div className="account-main">
      <header className="account-topbar">
        <button type="button" className="account-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
        <div className="account-topbar-title"><strong>Traveler area</strong><span>{location.pathname === '/account' ? 'Overview' : location.pathname.replace('/account/', '').replace(/-/g, ' ')}</span></div>
        <div className="account-topbar-actions"><ThemeToggle compact /><Link className="account-browse" to="/tours">Browse tours</Link><div className="account-account"><span className="account-avatar small">{initials}</span><span>{user?.name}</span><button type="button" onClick={logout} aria-label="Sign out"><LogOut size={15} /></button></div></div>
      </header>
      <main id="account-content" tabIndex={-1}><Outlet /></main>
    </div>
    {mobileOpen && <button type="button" className="account-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button>}
  </div>;
}
