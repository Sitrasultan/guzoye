import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { CalendarClock, ClipboardList, Gauge, LayoutDashboard, LogOut, Menu, MessageSquareQuote, PanelLeftClose, PanelLeftOpen, Star, User, X, ExternalLink, Globe } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { GuideStatusBanner } from '../../components/guide/GuideUI';
import '../../guide.css';
import '../../guide-shell.css';
const NAV = [
  { to: '/guide', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/guide/booking-requests', label: 'Booking Requests', icon: ClipboardList, approvedOnly: true },
  { to: '/guide/schedule', label: 'My Schedule', icon: CalendarClock, approvedOnly: true },
  { to: '/guide/requests', label: 'Requests to Admin', icon: MessageSquareQuote, approvedOnly: true },
  { to: '/guide/feedback', label: 'Feedback and Ratings', icon: Star, approvedOnly: true },
  { to: '/guide/performance', label: 'Performance', icon: Gauge, approvedOnly: true },
  { to: '/guide/profile', label: 'My Profile', icon: User }
];
export default function GuideLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const guide = user?.guide || {};
  const approved = guide.status === 'approved';
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('guzoye-guide-collapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { localStorage.setItem('guzoye-guide-collapsed', collapsed ? '1' : '0'); }, [collapsed]);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  const skipToContent = () => {
    const target = document.getElementById('guide-content');
    if (target) {
      target.focus();
      target.scrollIntoView();
    }
  };
  const initials = (user?.name || 'G').split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase();
  const items = NAV.filter(item => approved || !item.approvedOnly);
  return <div className={`guide-shell ${collapsed ? 'collapsed' : ''}`}>
    <button type="button" className="guide-skip-link" onClick={skipToContent}>Skip to guide content</button>
    <button type="button" className="guide-scrim" hidden={!mobileOpen} onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
    <aside className="guide-sidebar" data-open={mobileOpen}>
      <div className="guide-brand"><span className="guide-brand-mark">G</span><strong>Guzoye Guides</strong></div>
      <nav aria-label="Guide navigation"><ul>
        {items.map(item => {
          const Icon = item.icon;
          return <li key={item.to}><NavLink to={item.to} end={item.end} className={({ isActive }) => `guide-nav-link${isActive ? ' active' : ''}`} title={collapsed ? item.label : undefined}><Icon size={17} /><span>{item.label}</span></NavLink></li>;
        })}
      </ul></nav>
      <div className="guide-sidebar-footer">
        <div className="guide-sidebar-links">
          <Link to={guide._id ? `/guides/${guide._id}` : '/guides'}><ExternalLink size={16} /><span>View my public profile</span></Link>
          <Link to="/"><Globe size={16} /><span>View site</span></Link>
        </div>
        <button type="button" className="guide-collapse" onClick={() => setCollapsed(value => !value)}>{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}{!collapsed && <span>Collapse</span>}</button>
        <div className="guide-user-card"><span className="guide-avatar">{initials}</span><div><strong>{user?.name}</strong><small>{approved ? 'Approved guide' : `Guide · ${guide.status || 'pending'}`}</small></div><button type="button" onClick={logout} aria-label="Sign out"><LogOut size={16} /></button></div>
      </div>
    </aside>
    <div className="guide-main">
      <header className="guide-topbar">
        <button type="button" className="guide-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
        <div className="guide-topbar-title"><strong>Guide workspace</strong><span>{location.pathname === '/guide' ? 'Overview' : location.pathname.replace('/guide/', '').replace(/-/g, ' ')}</span></div>
        <div className="guide-topbar-actions"><Link className="guide-view-site" to="/">View site</Link><div className="guide-account"><span className="guide-avatar small">{initials}</span><span>{user?.name}</span><button type="button" onClick={logout} aria-label="Sign out"><LogOut size={15} /></button></div></div>
      </header>
      <main id="guide-content" tabIndex={-1}>
        <GuideStatusBanner status={guide.status} rejectionReason={guide.rejectionReason} />
        <Outlet />
      </main>
    </div>
    {mobileOpen && <button type="button" className="guide-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button>}
  </div>;
}