import { travelerApi } from '../../services/traveler';
import { api } from '../../services/api';
import { useResource } from '../../hooks/useResource';
import { useAuth } from '../../hooks/useAuth';
import { Skeletons, ErrorState } from '../../components/States';
import TourCard from '../../components/TourCard';
import Button from '../../components/Button';
import { AccountEmpty, AccountKpi, AccountPageHeader } from '../../components/account/AccountUI';
import '../../account.css';
export default function AccountOverview() {
  const { user } = useAuth();
  const state = useResource(async () => {
    const [overview, recommended] = await Promise.all([travelerApi.overview(), api.list('tours', { limit: 3 })]);
    return { overview, recommended: recommended.data };
  }, 'account-overview');
  if (state.loading) return <Skeletons count={4} />;
  if (state.error) return <ErrorState message={state.error} retry={state.retry} />;
  const data = state.data.overview;
  const next = data.nextTrip;
  return <>
    <AccountPageHeader eyebrow="YOUR GUZOYE" title={`Welcome back, ${user?.name || 'traveler'}`} description="Your next journey, saved ideas, reviews and account settings." />
    <section className="account-panel next-trip">{next ? <><div><span className="account-eyebrow">NEXT TRIP</span><h2>{next.tour.title}</h2><p>{new Date(next.departureDate).toLocaleDateString()} · {next.guests} traveler(s)</p><p className="account-reference">Reference {next.reference}</p><Button to="/account/trips">View trip</Button></div><div className="countdown"><strong>{next.countdownDays}</strong><span>days to go</span></div></> : <AccountEmpty title="No upcoming trip yet" message="Find a locally led journey and request your next departure." action={<Button to="/tours">Browse tours</Button>} />}</section>
    <div className="account-kpis"><AccountKpi label="Upcoming" value={data.kpis.upcoming} /><AccountKpi label="Completed" value={data.kpis.completed} /><AccountKpi label="Saved" value={data.kpis.saved} /></div>
    <section className="account-panel"><h2>Recent activity</h2>{data.activity.length ? <ul className="account-activity">{data.activity.map((item, index) => <li key={index}><span>{item.text}</span><small>{new Date(item.at).toLocaleString()}</small></li>)}</ul> : <AccountEmpty title="Nothing here yet" message="Bookings, saved tours and reviews will appear here." />}</section>
    <section className="account-panel"><h2>Recommended for you</h2><div className="account-recommendations">{state.data.recommended.map(tour => <TourCard key={tour._id} tour={tour} />)}</div></section>
  </>;
}
