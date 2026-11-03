import Avatar from '../components/Avatar';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Languages, Award } from 'lucide-react';
import { api } from '../services/api';
import { useResource } from '../hooks/useResource';
import { Skeletons, ErrorState, EmptyState } from '../components/States';
import TourCard from '../components/TourCard';
import RatingStars from '../components/RatingStars';
export default function GuideProfile() {
  const { id } = useParams();
  const state = useResource(async () => { const [guide, tours] = await Promise.all([api.detail('guides', id), api.list('tours', { guide: id, limit: 50 })]); return { guide: guide.data, tours: tours.data }; }, id);
  if (state.loading) return <main className="container page"><Skeletons count={3} /></main>;
  if (state.error) return <main className="container page"><ErrorState message={state.error} retry={state.retry} /></main>;
  const guide = state.data.guide;
  return <main className="container page"><div className="breadcrumbs"><Link to="/guides">Local guides</Link><span>/</span>{guide.user.name}</div>
    <section className="profile-hero"><Avatar className="profile-portrait" src={guide.image} name={guide.user.name} size={170} /><div><span className="eyebrow">YOUR LOCAL STORYTELLER</span><h1>{guide.user.name}</h1><p><MapPin size={16} />{guide.location || 'Ethiopia'}</p><RatingStars rating={guide.rating} count={guide.reviewCount} /><div className="pills">{guide.specialties.map(value => <span key={value}>{value}</span>)}</div></div></section>
    <div className="profile-info"><section><h2>A little about me</h2><p>{guide.bio}</p><h3>Places I cover</h3><div className="guide-place-pills">{guide.coveredPlaces?.map(place => <Link key={place._id} to={`/guides?destination=${place._id}`}>{place.name}</Link>)}</div>{!guide.coveredPlaces?.length && <p>Ask me about my local expertise.</p>}</section><aside><p><Languages />{guide.languages.join(', ') || 'Languages not specified yet'}</p><p><Award />{guide.yearsExperience} years of guiding experience</p><small>Profiles are self-described. Admin approval is not independent identity verification.</small></aside></div>
    <section className="section"><div className="section-heading"><div><span className="eyebrow">LET’S EXPLORE TOGETHER</span><h2>Journeys with {guide.user.name.split(' ')[0]}</h2></div></div>{state.data.tours.length ? <div className="tour-grid">{state.data.tours.map(tour => <TourCard key={tour._id} tour={tour} />)}</div> : <EmptyState title="New journeys on the horizon" message="This guide has no published tours yet." />}</section>
  </main>;
}
