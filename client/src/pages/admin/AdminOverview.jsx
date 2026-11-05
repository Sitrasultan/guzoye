import { useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';
import { StatCard, Sparkline, EmptyState, Skeleton, DataTable } from '../../components/admin/AdminUI';
import '../../admin.css';

const RANGES = [['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days']];
function money(value) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0); }
function Bars({ title, rows, valueKey = 'value', labelKey = 'label', to }) {
  const max = Math.max(1, ...rows.map(row => row[valueKey]));
  return <section className="admin-panel"><h2>{title}</h2>{rows.length ? <ul className="admin-bars">{rows.map(row => <li key={row[labelKey]}>{to ? <Link to={`${to}?${new URLSearchParams({ id: row._id || '' })}`}>{row[labelKey]}</Link> : <span>{row[labelKey]}</span>}<div className="admin-bar-track"><div style={{ width: `${(row[valueKey] / max) * 100}%` }} /></div><strong>{row[valueKey]}</strong></li>)}</ul> : <EmptyState title="No data yet" message="Metrics appear when matching records exist." />}</section>;
}
export default function AdminOverview() {
  const [range, setRange] = useState('30');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [reload, setReload] = useState(0);
  useState(() => {});
  const params = range === 'custom' ? { range, from: custom.from, to: custom.to } : { range };
  (async () => {})();
  // Load on range/reload changes.
  const [loadedKey, setLoadedKey] = useState('');
  const key = JSON.stringify(params) + reload;
  if (loadedKey !== key) {
    setLoadedKey(key); setState({ loading: true, error: '', data: null });
    adminApi.overview(params).then(data => setState({ loading: false, error: '', data }))
      .catch(error => setState({ loading: false, error: error.message, data: null }));
  }
  const data = state.data;
  return <div className="admin-page">
    <header className="admin-page-header"><div><p className="admin-eyebrow">Overview</p><h1>Platform performance</h1></div>
      <div className="admin-range">
        {RANGES.map(([value, label]) => <button key={value} className={range === value ? 'active' : ''} onClick={() => setRange(value)}>{label}</button>)}
        <button className={range === 'custom' ? 'active' : ''} onClick={() => setRange('custom')}>Custom</button>
      </div>
    </header>
    {range === 'custom' && <form className="admin-custom-range" onSubmit={event => { event.preventDefault(); setReload(value => value + 1); }}>
      <label>From<input type="date" value={custom.from} onChange={event => setCustom(value => ({ ...value, from: event.target.value }))} required /></label>
      <label>To<input type="date" value={custom.to} onChange={event => setCustom(value => ({ ...value, to: event.target.value }))} required /></label>
      <button type="submit">Apply</button>
    </form>}
    {state.loading && <div className="admin-kpis">{[0,1,2,3,4,5,6].map(index => <div key={index} className="admin-stat-card"><Skeleton height={70} /></div>)}</div>}
    {state.error && <EmptyState title="Could not load overview" message={state.error} />}
    {data && <>
      <div className="admin-kpis">
        <StatCard loading={state.loading} label="Pending guide approvals" value={data.kpis.pendingGuideApprovals.value} change={data.kpis.pendingGuideApprovals.change} to="/admin/guides?status=pending" />
        <StatCard loading={state.loading} label="Pending guide requests" value={data.kpis.pendingGuideRequests.value} change={data.kpis.pendingGuideRequests.change} to="/admin/guide-requests?status=pending" />
        <StatCard loading={state.loading} label="Bookings" value={data.kpis.bookings.value} change={data.kpis.bookings.change} to="/admin/bookings" hint={<Sparkline values={data.bookingsOverTime.map(row => row.count)} />} />
        <StatCard loading={state.loading} label="Active tours" value={data.kpis.activeTours.value} change={data.kpis.activeTours.change} to="/admin/tours" />
        <StatCard loading={state.loading} label="Approved guides" value={data.kpis.approvedGuides.value} change={data.kpis.approvedGuides.change} to="/admin/guides?status=approved" />
        <StatCard loading={state.loading} label="Revenue estimate" value={money(data.kpis.revenueEstimate.value)} change={data.kpis.revenueEstimate.change} to="/admin/bookings?status=completed" hint="Completed bookings only" />
        <StatCard loading={state.loading} label="Average rating" value={data.kpis.averageRating.value ?? 'No reviews'} to="/admin/reviews" hint={data.kpis.averageRating.reviewCount ? `${data.kpis.averageRating.reviewCount} reviews` : 'No reviews yet'} />
      </div>
      <div className="admin-grid">
        <Bars title="Bookings over time" rows={data.bookingsOverTime.map(row => ({ label: row._id, value: row.count }))} to="/admin/bookings" />
        <Bars title="Bookings by status" rows={Object.entries(data.bookingsByStatus).map(([label, value]) => ({ label, value }))} to="/admin/bookings" />
        <Bars title="Revenue estimate by month" rows={data.revenueByMonth.map(row => ({ label: row._id, value: row.revenue }))} to="/admin/bookings?status=completed" />
        <Bars title="Top tours" rows={data.topTours.map(row => ({ _id: row._id, label: row.title, value: row.bookings }))} to="/admin/tours" />
        <Bars title="Bookings by destination" rows={data.bookingsByDestination.map(row => ({ _id: row._id, label: row.name, value: row.bookings }))} to="/admin/tours" />
        <Bars title="Guide workload" rows={data.guideWorkload.map(row => ({ _id: row._id, label: row.name, value: row.bookings }))} to="/admin/guides" />
      </div>
      <section className="admin-panel"><h2>Needs attention</h2>
        <ul className="admin-attention">
          <li><Link to="/admin/guides?status=pending">{data.needsAttention.pendingGuideApprovals} guide approvals pending</Link></li>
          <li><Link to="/admin/guide-requests?status=pending">{data.needsAttention.pendingGuideRequests} guide requests pending</Link></li>
          <li><Link to="/admin/tours">{data.needsAttention.toursWithoutGuides} tours without guides</Link></li>
          <li><Link to="/admin/tours">{data.needsAttention.toursWithoutFutureDepartures} tours without future departures</Link></li>
          <li><Link to="/admin/reviews">{data.needsAttention.hiddenReviews} hidden reviews</Link></li>
          <li><Link to="/admin/guides">{data.needsAttention.guidesWithoutAssignments} guides without assignments</Link></li>
        </ul>
      </section>
    </>}
  </div>;
}
