import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { adminApi } from '../../services/adminApi';
import '../../admin.css';

const NAV = [
  ['/admin', 'Overview'], ['/admin/tours', 'Tours'], ['/admin/destinations', 'Destinations'],
  ['/admin/guides', 'Guides'], ['/admin/guide-requests', 'Guide Requests'], ['/admin/bookings', 'Bookings'],
  ['/admin/reviews', 'Reviews'], ['/admin/users', 'Users'], ['/admin/activity', 'Activity and Reports'], ['/admin/audit', 'Audit Log']
];
export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('guzoye-admin-collapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  useEffect(() => { localStorage.setItem('guzoye-admin-collapsed', collapsed ? '1' : '0'); }, [collapsed]);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => { let active = true;
    adminApi.guideRequests({ status: 'pending', limit: 1 }).then(result => { if (active) setPendingRequests(result.pagination.total); }).catch(() => {});
    return () => { active = false; };
  }, [location.pathname]);
  return <div className={`admin-shell ${collapsed ? 'collapsed' : ''}`}>
    <button className="admin-scrim" hidden={!mobileOpen} onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
    <aside className="admin-sidebar" data-open={mobileOpen}>
      <div className="admin-brand"><span className="admin-brand-mark">G</span>{!collapsed && <strong>Guzoye</strong>}</div>
      <nav aria-label="Admin navigation"><ul>
        {NAV.map(([to, label]) => <li key={to}><NavLink to={to} end={to === '/admin'} className={({ isActive }) => isActive ? 'active' : ''}>{label}{to === '/admin/guide-requests' && pendingRequests > 0 && <span className="admin-nav-badge">{pendingRequests}</span>}</NavLink></li>)}
      </ul></nav>
      <button className="admin-collapse" onClick={() => setCollapsed(value => !value)}>{collapsed ? '»' : '«'} {!collapsed && 'Collapse'}</button>
    </aside>
    <div className="admin-main">
      <header className="admin-topbar">
        <button className="admin-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation">☰</button>
        <div className="admin-topbar-title"><strong>Admin</strong><span>{location.pathname.replace('/admin', '').replace('/', ' ') || 'Overview'}</span></div>
        <input className="admin-search" type="search" placeholder="Search tours, guides, bookings…" aria-label="Global admin search" />
        <div className="admin-topbar-actions">
          <span className="admin-bell" aria-label={`${pendingRequests} pending guide requests`}>🔔{pendingRequests > 0 && <em>{pendingRequests}</em>}</span>
          <a className="admin-view-site" href="/">View site</a>
          <div className="admin-account"><span>{user?.name}</span><button onClick={logout}>Sign out</button></div>
        </div>
      </header>
      <main id="admin-content" tabIndex={-1}><Outlet /></main>
    </div>
  </div>;
}
