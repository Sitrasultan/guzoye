import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Bell, BookOpen, CalendarClock, ClipboardList, Compass, FileText, Gauge, LogOut, MapPin, Menu, PanelLeftClose, PanelLeftOpen, Star, Users, UserCheck, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { adminApi } from '../../services/adminApi';
import '../../admin.css';

const GROUPS = [
  { label: 'Overview', items: [{ to: '/admin', label: 'Overview', icon: Gauge, end: true }] },
  { label: 'Catalog', items: [
    { to: '/admin/tours', label: 'Tours', icon: Compass },
    { to: '/admin/destinations', label: 'Destinations', icon: MapPin }
  ] },
  { label: 'People', items: [
    { to: '/admin/guides', label: 'Guides', icon: UserCheck, badge: 'approvals' },
    { to: '/admin/guide-requests', label: 'Guide Requests', icon: ClipboardList, badge: 'requests' },
    { to: '/admin/users', label: 'Users', icon: Users }
  ] },
  { label: 'Operations', items: [
    { to: '/admin/bookings', label: 'Bookings', icon: CalendarClock },
    { to: '/admin/reviews', label: 'Reviews', icon: Star }
  ] },
  { label: 'Insights', items: [
    { to: '/admin/activity', label: 'Activity and Reports', icon: BarChart3 },
    { to: '/admin/audit', label: 'Audit Log', icon: FileText }
  ] }
];
const TITLES = { '/admin': ['Overview', 'Platform performance'], '/admin/tours': ['Tours', 'Create and manage Guzoye tours'], '/admin/destinations': ['Destinations', 'Manage destinations'], '/admin/guides': ['Guides', 'Approve and support guides'], '/admin/guide-requests': ['Guide Requests', 'Review guide requests'], '/admin/users': ['Users', 'Manage platform accounts'], '/admin/bookings': ['Bookings', 'Review reservations'], '/admin/reviews': ['Reviews', 'Moderate traveler feedback'], '/admin/activity': ['Activity and Reports', 'Operational activity and performance'], '/admin/audit': ['Audit Log', 'Administrative action history'] };
export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const searchRef = useRef(null);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('guzoye-admin-collapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [alerts, setAlerts] = useState({ loading: true, approvals: 0, requests: 0, tours: 0 });
  const [title, subtitle] = TITLES[location.pathname] || ['Admin', 'Guzoye operations'];
  useEffect(() => { localStorage.setItem('guzoye-admin-collapsed', collapsed ? '1' : '0'); }, [collapsed]);
  useEffect(() => { setMobileOpen(false); setBellOpen(false); setAccountOpen(false); }, [location.pathname]);
  useEffect(() => {
    const onKey = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchRef.current?.focus(); }
      if (event.key === 'Escape') { setBellOpen(false); setAccountOpen(false); setMobileOpen(false); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    let active = true;
    setAlerts(value => ({ ...value, loading: true }));
    Promise.all([adminApi.overview({ range: '30' }), adminApi.guideRequests({ status: 'pending', limit: 1 })])
      .then(([overview, requests]) => { if (active) setAlerts({ loading: false, approvals: overview.needsAttention.pendingGuideApprovals, requests: requests.pagination.total, tours: overview.needsAttention.toursWithoutGuides + overview.needsAttention.toursWithoutFutureDepartures }); })
      .catch(() => { if (active) setAlerts({ loading: false, approvals: 0, requests: 0, tours: 0 }); });
    return () => { active = false; };
  }, [location.pathname]);
  const alertTotal = alerts.approvals + alerts.requests + alerts.tours;
  const initials = (user?.name || 'A').split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase();
  return <div className={`admin-shell ${collapsed ? 'collapsed' : ''}`}>
    <a className="admin-skip-link" href="#admin-content">Skip to admin content</a>
    <button className="admin-scrim" hidden={!mobileOpen} onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
    <aside className="admin-sidebar" data-open={mobileOpen} aria-label="Admin sidebar">
      <div className="admin-brand"><span className="admin-brand-mark" aria-hidden="true">G</span><strong>Guzoye</strong></div>
      <nav aria-label="Admin navigation"><ul>
        {GROUPS.map(group => <li key={group.label}><p className="admin-nav-group">{group.label}</p><ul>
          {group.items.map(item => {
            const Icon = item.icon; const count = item.badge === 'approvals' ? alerts.approvals : item.badge === 'requests' ? alerts.requests : 0;
            return <li key={item.to}><NavLink to={item.to} end={item.end} className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`} title={collapsed ? item.label : undefined} aria-label={`${item.label}${count ? `, ${count} pending` : ''}`}><Icon size={17} aria-hidden="true" /><span>{item.label}</span>{count > 0 && <span className="admin-nav-badge">{count}</span>}</NavLink></li>;
          })}
        </ul></li>)}
      </ul></nav>
      <div className="admin-sidebar-footer">
        <button className="admin-collapse" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}{!collapsed && <span>Collapse</span>}</button>
        <div className="admin-user-card"><span className="admin-avatar" aria-hidden="true">{initials}</span><div><strong>{user?.name}</strong><small>Administrator</small></div><button onClick={logout} aria-label="Sign out"><LogOut size={16} /></button></div>
      </div>
    </aside>
    <div className="admin-main">
      <header className="admin-topbar">
        <button className="admin-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
        <div className="admin-topbar-title"><nav aria-label="Breadcrumb"><ol><li><Link to="/admin">Admin</Link></li><li aria-current="page">{title}</li></ol></nav><h1>{title}</h1><p>{subtitle}</p></div>
        <input ref={searchRef} className="admin-search" type="search" placeholder="Search tours, guides, bookings…" aria-label="Global admin search" />
        <div className="admin-topbar-actions">
          <div className="admin-popover-wrap"><button className="admin-icon-button" onClick={() => { setBellOpen(value => !value); setAccountOpen(false); }} aria-expanded={bellOpen} aria-label={`Notifications, ${alertTotal} items need attention`}><Bell size={19} />{alertTotal > 0 && <em>{alertTotal}</em>}</button>
            {bellOpen && <div className="admin-popover" role="dialog" aria-label="Notifications"><h2>Needs attention</h2>
              {alerts.loading ? <p>Loading alerts…</p> : alertTotal === 0 ? <p>You are all caught up.</p> : <ul>
                <li><Link to="/admin/guides?status=pending">{alerts.approvals} guide approvals pending</Link></li>
                <li><Link to="/admin/guide-requests?status=pending">{alerts.requests} guide requests pending</Link></li>
                <li><Link to="/admin/tours">{alerts.tours} tours need attention</Link></li>
              </ul>}
            </div>}
          </div>
          <a className="admin-view-site" href="/">View site</a>
          <div className="admin-popover-wrap"><button className="admin-account-button" onClick={() => { setAccountOpen(value => !value); setBellOpen(false); }} aria-expanded={accountOpen}><span className="admin-avatar small" aria-hidden="true">{initials}</span><span>{user?.name}</span></button>
            {accountOpen && <div className="admin-popover admin-account-popover" role="dialog" aria-label="Account menu"><strong>{user?.name}</strong><small>{user?.email}</small><button onClick={logout}><LogOut size={15} /> Sign out</button></div>}
          </div>
        </div>
      </header>
      <main id="admin-content" tabIndex={-1}><Outlet /></main>
    </div>
    {mobileOpen && <button className="admin-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button>}
  </div>;
}
