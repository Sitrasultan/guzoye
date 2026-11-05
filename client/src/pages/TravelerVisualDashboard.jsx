import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Compass, Heart, MapPin, Search, ShieldCheck, Users, Briefcase } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useResource } from '../hooks/useResource';
import { api } from '../services/api';
import { bookingsApi } from '../services/bookings';
import { mediaUrl } from '../services/media';
import { ErrorState, Skeletons } from '../components/States';
import TourCard from '../components/TourCard';
import '../travel-visual.css';
const dateLabel = value => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
export default function TravelerVisualDashboard() {
  const { user } = useAuth();
  const state = useResource(async () => {
    const results = await Promise.allSettled([
      api.list('tours', { limit: 4 }), api.list('destinations', { limit: 3 }),
      bookingsApi.mine({ limit: 50 })
    ]);
    const value = index => results[index].status === 'fulfilled' ? results[index].value : null;
    return { tours: value(0), destinations: value(1), bookings: value(2), errors: results.map(item => item.status === 'rejected' ? item.reason.message : '') };
  }, 'traveler-visual-overview');
  if (state.loading) return <div className="tv-dashboard"><Skeletons count={4} /></div>;
  if (state.error) return <ErrorState message={state.error} retry={state.retry} />;
  const { tours, destinations, bookings, errors } = state.data;
  const rows = bookings?.data || [];
  const upcoming = rows.filter(row => ['pending', 'confirmed'].includes(row.status) && new Date(row.departureDate) >= new Date()).sort((a,b) => new Date(a.departureDate)-new Date(b.departureDate));
  const next = upcoming[0];
  const completed = rows.filter(row => row.status === 'completed').length;
  const places = destinations?.data || [];
  const image = places[0]?.image || tours?.data?.[0]?.images?.[0];
  return <div className="tv-dashboard">
    <div className="tv-welcome-row"><section className="tv-welcome" style={image ? { backgroundImage: `linear-gradient(90deg,rgba(15,29,62,.92),rgba(15,29,62,.15)),url("${mediaUrl(image)}")` } : undefined}>
      <span className="tv-overline">YOUR NEXT CHAPTER STARTS HERE</span><h1>Welcome back, {user?.name?.split(' ')[0] || 'traveler'}!</h1><h2>Ready for your next adventure?</h2><p>Explore extraordinary places, meet local guides,<br />and make unforgettable memories.</p><Link className="tv-pill" to="/tours">Explore tours <ArrowRight size={18} /></Link>
    </section><aside className="tv-adventure"><Compass size={44}/><h2>Your next adventure awaits</h2><p>Discover locally led journeys across Ethiopia.</p><Link className="tv-pill navy" to="/tours">Browse tours <ArrowRight size={17}/></Link></aside></div>
    <div className="tv-stats">{[[Briefcase,'Upcoming trips',bookings ? upcoming.length : '—','blue'],[ShieldCheck,'Completed trips',bookings ? completed : '—','pink'],[Compass,'Tours to discover',tours?.pagination?.total ?? '—','gold'],[MapPin,'Destinations',destinations?.pagination?.total ?? places.length,'mint']].map(([Icon,label,count,tone])=><article className={`tv-stat ${tone}`} key={label}><span className="tv-stat-icon"><Icon size={29}/></span><div><strong>{count}</strong><span>{label}</span></div><ArrowRight size={18}/></article>)}</div>
    {errors.filter(Boolean).length > 0 && <div className="tv-notice" role="status"><p>Some sections could not load. Counts shown as “—” are unavailable, not zero.</p>{errors.filter(Boolean).map((error,index)=><p key={index}>{error}</p>)}<button type="button" onClick={state.retry}>Retry</button></div>}
    <div className="tv-middle"><section className="tv-panel"><header><h2><CalendarDays size={21}/> Your upcoming trip</h2><Link to="/account/trips">View all <ArrowRight size={16}/></Link></header>{next ? <div className="tv-next-trip">{next.tour?.images?.[0] && <img src={mediaUrl(next.tour.images[0])} alt=""/>}<div><h3>{next.tour?.title || 'Your booked tour'}</h3><span className="tv-status">{next.status}</span><p><CalendarDays size={16}/>{dateLabel(next.departureDate)}</p><p><Users size={16}/>{next.guests} travelers</p>{next.reference && <p className="tv-reference">{next.reference}</p>}<Link className="tv-pill blue" to="/account/trips">View details <ArrowRight size={16}/></Link></div></div> : <div className="tv-empty"><Compass size={32}/><h3>Your next journey is waiting</h3><p>{bookings ? 'You have no upcoming departures yet.' : 'Booking information is unavailable.'}</p><Link to="/tours">Find your adventure</Link></div>}</section>
    <section className="tv-panel"><header><h2><MapPin size={21}/> Discover destinations</h2></header><div className="tv-places">{places.map(place=><Link key={place._id} to={`/tours?search=${encodeURIComponent(place.name)}`} className="tv-place">{place.image && <img src={mediaUrl(place.image)} alt="" loading="lazy"/>}<div><h3><MapPin size={15}/>{place.name}</h3><span>{place.region}</span></div></Link>)}</div>{!places.length && <p>Destination inspiration will appear here when available.</p>}</section><aside className="tv-tips"><ShieldCheck size={28}/><h2>Travel thoughtfully</h2><p>Check your departure details, pack for the season, and keep your guide informed about accessibility needs.</p><Link to="/account/trips">Review your trips <ArrowRight size={16}/></Link></aside></div>
    <section className="tv-quick"><h2>Quick actions</h2><div>{[[Search,'Search tours','/tours'],[CalendarDays,'My trips','/account/trips'],[Heart,'Wishlist','/account/wishlist'],[Users,'Meet local guides','/guides']].map(([Icon,label,to])=><Link key={to} to={to}><Icon size={28}/><span>{label}</span></Link>)}</div></section>
    <section className="tv-panel"><header><h2>Find your next great story</h2><Link to="/tours">Explore all <ArrowRight size={16}/></Link></header><div className="tv-tour-grid">{(tours?.data || []).map(tour=><TourCard key={tour._id} tour={tour}/>)}</div></section>
    <section className="tv-bottom-banner"><div><h2>Explore Ethiopia</h2><p>Discover the beauty of locally led travel.</p></div><Link className="tv-pill" to="/tours">Start exploring <ArrowRight size={17}/></Link></section>
  </div>;
}
