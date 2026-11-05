import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { adminApi } from '../../services/adminApi';
import { ChartCard, DataTable, EmptyState, PageHeader, Skeleton } from '../../components/admin/AdminUI';
import '../../admin.css';

function tooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="admin-chart-tooltip"><strong>{label}</strong><p>Bookings: {payload[0].value}</p></div>;
}
export default function AdminActivity() {
  const [state, setState] = useState({ loading: true, error: '', feed: [], trend: [] });
  useEffect(() => {
    let active = true;
    setState({ loading: true, error: '', feed: [], trend: [] });
    Promise.all([adminApi.activity(), adminApi.overview({ range: '30' })])
      .then(([activity, overview]) => { if (active) setState({ loading: false, error: '', feed: activity, trend: overview.bookingsOverTime }); })
      .catch(error => { if (active) setState({ loading: false, error: error.message, feed: [], trend: [] }); });
    return () => { active = false; };
  }, []);
  return <div className="admin-page">
    <PageHeader eyebrow="Insights" title="Activity and Reports" description="Recent platform activity and a 30-day booking trend." action={<Link className="admin-link-button" to="/admin">Back to overview</Link>} />
    {state.error && <EmptyState title="Could not load activity" message={state.error} />}
    <div className="admin-grid">
      <ChartCard title="Booking trend" description="Bookings created during the last 30 days." loading={state.loading}
        table={<DataTable caption="Booking trend" columns={[{ key: 'date', label: 'Date' }, { key: 'bookings', label: 'Bookings' }]} rows={state.trend} renderRow={row => <tr key={row._id}><td>{row._id}</td><td>{row.count}</td></tr>} />}>
        {state.trend.length ? <ResponsiveContainer width="100%" height={250}><AreaChart data={state.trend}><defs><linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#14532d" stopOpacity={0.32} /><stop offset="100%" stopColor="#14532d" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="#e2e6dc" /><XAxis dataKey="_id" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip content={tooltip} /><Area type="monotone" dataKey="count" name="Bookings" stroke="#14532d" strokeWidth={2} fill="url(#activityFill)" /></AreaChart></ResponsiveContainer> : <EmptyState title="No booking activity" message="The trend appears when bookings exist." />}
      </ChartCard>
      <section className="admin-panel"><h2>Recent activity</h2>
        {state.loading ? <div className="admin-table-skeleton">{[0, 1, 2, 3, 4].map(index => <Skeleton key={index} height={34} />)}</div> : state.feed.length ? <ul className="admin-feed">{state.feed.map((item, index) => <li key={index}><span className="admin-feed-time">{new Date(item.at).toLocaleString()}</span><p>{item.text}</p><small>{item.type}</small></li>)}</ul> : <EmptyState title="No recent activity" message="New bookings, guide activity, and admin actions will appear here." />}
      </section>
    </div>
  </div>;
}
