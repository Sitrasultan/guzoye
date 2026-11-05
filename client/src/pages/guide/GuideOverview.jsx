import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { guideAreaApi } from '../../services/guideArea';
import { useResource } from '../../hooks/useResource';
import { useAuth } from '../../hooks/useAuth';
import { Skeletons, ErrorState } from '../../components/States';
import Button from '../../components/Button';
import { GuideEmpty, GuideKpi, GuidePageHeader } from '../../components/guide/GuideUI';
import '../../guide.css';
export default function GuideOverview() {
  const { user } = useAuth();
  const state = useResource(() => guideAreaApi.overview(), 'guide-overview');
  if (state.loading) return <Skeletons count={4} />;
  if (state.error) return <ErrorState message={state.error} retry={state.retry} />;
  const data = state.data;
  const kpis = data.kpis;
  return <>
    <GuidePageHeader eyebrow="GUIDE WORKSPACE" title={`Welcome, ${user?.name || 'Guide'}`} description="Your requests, departures, rating and performance at a glance." />
    <div className="guide-kpis">
      <GuideKpi label="Pending requests" value={kpis.pendingRequests} />
      <GuideKpi label="Upcoming tours" value={kpis.upcomingTours} />
      <GuideKpi label="Completed tours" value={kpis.completedTours} />
      <GuideKpi label="Current rating" value={kpis.rating || '—'} hint={kpis.rank ? `Rank #${kpis.rank}` : 'Not ranked yet'} />
    </div>
    <section className="guide-panel"><h2>Upcoming departures</h2>
      {!data.upcomingDepartures.length ? <GuideEmpty title="No upcoming departures" message="Admin-assigned departures will appear here." /> : <ul className="guide-departures">{data.upcomingDepartures.map(item => <li key={item.departureId}><div><strong>{item.title}</strong><span>{item.destination}</span></div><div><span>{new Date(item.date).toLocaleDateString()}</span><small>{item.groupSpotsLeft} of {item.groupCapacity} spots left</small></div></li>)}</ul>}
    </section>
    <div className="guide-chart-grid">
      <section className="guide-panel"><h2>Bookings per month</h2>{data.bookingsPerMonth.length ? <ResponsiveContainer width="100%" height={240}><AreaChart data={data.bookingsPerMonth}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="_id" /><YAxis allowDecimals={false} /><Tooltip /><Area type="monotone" dataKey="bookings" stroke="#14532d" fill="#bbf7d0" /></AreaChart></ResponsiveContainer> : <GuideEmpty title="No booking activity yet" message="Bookings assigned to you will appear here." />}</section>
      <section className="guide-panel"><h2>Rating trend</h2>{data.ratingTrend.length ? <ResponsiveContainer width="100%" height={240}><LineChart data={data.ratingTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="_id" /><YAxis domain={[0, 5]} /><Tooltip /><Line type="monotone" dataKey="rating" stroke="#b45309" strokeWidth={2} /></LineChart></ResponsiveContainer> : <GuideEmpty title="No ratings yet" message="Feedback appears here after your first completed tour." />}</section>
    </div>
    <section className="guide-panel"><h2>Quick actions</h2><div className="guide-actions"><Button to="/guide/booking-requests">Review requests</Button><Button variant="secondary" to="/guide/schedule">Manage schedule</Button><Button variant="secondary" to="/guide/requests">Request assignment</Button><Button variant="secondary" to="/guide/profile">Edit profile</Button></div></section>
    <section className="guide-panel"><h2>Recent activity</h2><ul className="guide-activity">{data.activity.map((item, index) => <li key={index}><span>{item.text}</span><small>{new Date(item.at).toLocaleString()}</small></li>)}</ul></section>
  </>;
}
