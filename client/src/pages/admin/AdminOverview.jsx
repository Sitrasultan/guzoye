import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarClock, Compass, Star, UserCheck, Users, Wallet } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { ChartCard, DataTable, EmptyState, PageHeader, Skeleton, Sparkline, StatCard, StatusBadge } from '../../components/admin/AdminUI';
import '../../admin.css';

const RANGES = [['7', '7 days'], ['30', '30 days'], ['90', '90 days']];
const COLORS = ['#14532d', '#c8892d', '#b4552f', '#5c7c5c', '#8a6d3b'];
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);
function chartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="admin-chart-tooltip"><strong>{label}</strong>{payload.map(item => <p key={item.name}>{item.name}: {item.value}</p>)}</div>;
}
export default function AdminOverview() {
  const [range, setRange] = useState('30');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [reload, setReload] = useState(0);
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const params = range === 'custom' ? { range, from: custom.from, to: custom.to } : { range };
  useEffect(() => {
    let active = true;
    setState({ loading: true, error: '', data: null });
    adminApi.overview(params).then(data => { if (active) setState({ loading: false, error: '', data }); })
      .catch(error => { if (active) setState({ loading: false, error: error.message, data: null }); });
    return () => { active = false; };
  }, [range, custom.from, custom.to, reload]);
  const data = state.data;
  const statusRows = data ? Object.entries(data.bookingsByStatus).map(([name, value]) => ({ name, value })) : [];
  return <div className="admin-page">
    <PageHeader eyebrow="Overview" title="Platform performance" description="Monitor bookings, guides, tours, and estimated revenue across your selected period." action={
      <div className="admin-range">{RANGES.map(([value, label]) => <button key={value} className={range === value ? 'active' : ''} onClick={() => setRange(value)}>{label}</button>)}<button className={range === 'custom' ? 'active' : ''} onClick={() => setRange('custom')}>Custom</button></div>
    } />
    {range === 'custom' && <form className="admin-custom-range" onSubmit={event => { event.preventDefault(); setReload(value => value + 1); }}>
      <label>From<input type="date" value={custom.from} onChange={event => setCustom(value => ({ ...value, from: event.target.value }))} required /></label>
      <label>To<input type="date" value={custom.to} onChange={event => setCustom(value => ({ ...value, to: event.target.value }))} required /></label>
      <button type="submit">Apply</button>
    </form>}
    {state.loading && <div className="admin-kpis">{[0, 1, 2, 3, 4, 5, 6].map(index => <div key={index} className="admin-stat-card"><Skeleton height={82} /></div>)}</div>}
    {state.error && <EmptyState title="Could not load overview" message={state.error} />}
    {data && <>
      <div className="admin-kpis">
        <StatCard icon={<UserCheck size={18} />} label="Pending guide approvals" value={data.kpis.pendingGuideApprovals.value} change={data.kpis.pendingGuideApprovals.change} to="/admin/guides?status=pending" />
        <StatCard icon={<ClipboardIcon />} label="Pending guide requests" value={data.kpis.pendingGuideRequests.value} change={data.kpis.pendingGuideRequests.change} to="/admin/guide-requests?status=pending" />
        <StatCard icon={<CalendarClock size={18} />} label="Bookings" value={data.kpis.bookings.value} change={data.kpis.bookings.change} to="/admin/bookings" sparkline={<Sparkline values={data.bookingsOverTime.map(row => row.count)} />} />
        <StatCard icon={<Compass size={18} />} label="Active tours" value={data.kpis.activeTours.value} change={data.kpis.activeTours.change} to="/admin/tours" />
        <StatCard icon={<Users size={18} />} label="Approved guides" value={data.kpis.approvedGuides.value} change={data.kpis.approvedGuides.change} to="/admin/guides?status=approved" />
        <StatCard icon={<Wallet size={18} />} label="Revenue estimate" value={money(data.kpis.revenueEstimate.value)} change={data.kpis.revenueEstimate.change} to="/admin/bookings?status=completed" hint="Completed bookings only; estimate" />
        <StatCard icon={<Star size={18} />} label="Average rating" value={data.kpis.averageRating.value ?? 'No reviews'} to="/admin/reviews" hint={data.kpis.averageRating.reviewCount ? `${data.kpis.averageRating.reviewCount} reviews` : 'No reviews yet'} />
      </div>
      <div className="admin-grid">
        <ChartCard title="Bookings over time" description="Daily booking volume in the selected period." loading={state.loading}
          table={<DataTable caption="Bookings over time" columns={[{ key: 'date', label: 'Date' }, { key: 'count', label: 'Bookings' }]} rows={data.bookingsOverTime} renderRow={row => <tr key={row._id}><td>{row._id}</td><td>{row.count}</td></tr>} />}>
          {data.bookingsOverTime.length ? <ResponsiveContainer width="100%" height={240}><AreaChart data={data.bookingsOverTime} onClick={point => point?.activeLabel && window.location.assign('/admin/bookings')}><defs><linearGradient id="bookingFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#14532d" stopOpacity={0.35} /><stop offset="100%" stopColor="#14532d" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="#e2e6dc" /><XAxis dataKey="_id" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip content={chartTooltip} /><Area type="monotone" dataKey="count" name="Bookings" stroke="#14532d" strokeWidth={2} fill="url(#bookingFill)" /></AreaChart></ResponsiveContainer> : <EmptyState title="No bookings yet" message="Booking trends appear when reservations exist." />}
        </ChartCard>
        <ChartCard title="Bookings by status" description="Distribution of bookings by current status." loading={state.loading}
          table={<DataTable caption="Bookings by status" columns={[{ key: 'status', label: 'Status' }, { key: 'count', label: 'Bookings' }]} rows={statusRows} renderRow={row => <tr key={row.name}><td><StatusBadge value={row.name} /></td><td>{row.value}</td></tr>} />}>
          {statusRows.some(row => row.value) ? <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={statusRows} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2} onClick={point => point?.name && window.location.assign(`/admin/bookings?status=${point.name}`)}>{statusRows.map((row, index) => <Cell key={row.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip content={chartTooltip} /><Legend /></PieChart></ResponsiveContainer> : <EmptyState title="No status data" message="Status distribution appears when bookings exist." />}
        </ChartCard>
        <ChartCard title="Revenue estimate by month" description="Completed-booking revenue by month; this is an estimate." loading={state.loading}
          table={<DataTable caption="Revenue estimate by month" columns={[{ key: 'month', label: 'Month' }, { key: 'revenue', label: 'Revenue estimate' }]} rows={data.revenueByMonth} renderRow={row => <tr key={row._id}><td>{row._id}</td><td>{money(row.revenue)}</td></tr>} />}>
          {data.revenueByMonth.length ? <ResponsiveContainer width="100%" height={240}><BarChart data={data.revenueByMonth} onClick={point => point?.activeLabel && window.location.assign('/admin/bookings?status=completed')}><CartesianGrid stroke="#e2e6dc" /><XAxis dataKey="_id" fontSize={11} /><YAxis fontSize={11} /><Tooltip content={chartTooltip} /><Bar dataKey="revenue" name="Revenue estimate" fill="#c8892d" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyState title="No revenue yet" message="Revenue appears after completed bookings." />}
        </ChartCard>
        <ChartCard title="Top tours" description="Tours with the most bookings." loading={state.loading}
          table={<DataTable caption="Top tours" columns={[{ key: 'title', label: 'Tour' }, { key: 'bookings', label: 'Bookings' }]} rows={data.topTours} renderRow={row => <tr key={row._id}><td><Link to={`/admin/tours?id=${row._id}`}>{row.title}</Link></td><td>{row.bookings}</td></tr>} />}>
          {data.topTours.length ? <ResponsiveContainer width="100%" height={240}><BarChart layout="vertical" data={data.topTours} onClick={point => point?.activeLabel && window.location.assign(`/admin/tours?id=${point.activeLabel}`)}><CartesianGrid stroke="#e2e6dc" /><XAxis type="number" allowDecimals={false} fontSize={11} /><YAxis type="category" dataKey="title" width={130} fontSize={11} /><Tooltip content={chartTooltip} /><Bar dataKey="bookings" name="Bookings" fill="#14532d" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer> : <EmptyState title="No tour bookings" message="Tour performance appears when bookings exist." />}
        </ChartCard>
        <ChartCard title="Bookings by destination" description="Where travelers are booking most often." loading={state.loading}
          table={<DataTable caption="Bookings by destination" columns={[{ key: 'name', label: 'Destination' }, { key: 'bookings', label: 'Bookings' }]} rows={data.bookingsByDestination} renderRow={row => <tr key={row._id}><td>{row.name}</td><td>{row.bookings}</td></tr>} />}>
          {data.bookingsByDestination.length ? <ResponsiveContainer width="100%" height={240}><BarChart data={data.bookingsByDestination} onClick={point => point?.activeLabel && window.location.assign('/admin/tours')}><CartesianGrid stroke="#e2e6dc" /><XAxis dataKey="name" fontSize={10} interval={0} angle={-18} textAnchor="end" height={58} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip content={chartTooltip} /><Bar dataKey="bookings" name="Bookings" fill="#b4552f" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyState title="No destination bookings" message="Destination trends appear when bookings exist." />}
        </ChartCard>
        <ChartCard title="Guide workload" description="Bookings handled by each guide." loading={state.loading}
          table={<DataTable caption="Guide workload" columns={[{ key: 'name', label: 'Guide' }, { key: 'bookings', label: 'Bookings' }]} rows={data.guideWorkload} renderRow={row => <tr key={row._id}><td><Link to={`/admin/guides?id=${row._id}`}>{row.name}</Link></td><td>{row.bookings}</td></tr>} />}>
          {data.guideWorkload.length ? <ResponsiveContainer width="100%" height={240}><BarChart data={data.guideWorkload} onClick={point => point?.activeLabel && window.location.assign(`/admin/guides?id=${point.activeLabel}`)}><CartesianGrid stroke="#e2e6dc" /><XAxis dataKey="name" fontSize={10} interval={0} angle={-18} textAnchor="end" height={58} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip content={chartTooltip} /><Bar dataKey="bookings" name="Bookings" fill="#5c7c5c" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyState title="No guide workload" message="Guide workload appears when bookings exist." />}
        </ChartCard>
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
function ClipboardIcon() { return <CalendarClock size={18} />; }
