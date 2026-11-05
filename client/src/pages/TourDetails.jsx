import Avatar from '../components/Avatar';
import DestinationGuides from '../components/DestinationGuides';
import { mediaUrl } from '../services/media';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Clock3, Users, Mountain, Check, X, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { useResource } from '../hooks/useResource';
import { Skeletons, ErrorState, EmptyState } from '../components/States';
import RatingStars from '../components/RatingStars';
import BookingPanel from '../components/BookingPanel';
export default function TourDetails() {
  const { id } = useParams();
  const state = useResource(() => api.detail('tours', id), id);
  const reviewState = useResource(() => api.reviews(id), `reviews-${id}`);
  if (state.loading) return <main className="container page"><Skeletons count={3} /></main>;
  if (state.error) return <main className="container page"><ErrorState message={state.error} retry={state.retry} /></main>;
  const tour = state.data.data;
  return <main className="container page">
    <div className="breadcrumbs"><Link to="/tours">All journeys</Link><span>/</span>{tour.destination.name}</div>
    <div className="detail-heading"><span className="eyebrow">{tour.destination.region} · {tour.difficulty.toUpperCase()} EXPLORING</span><h1>{tour.title}</h1><div className="detail-meta"><span><MapPin size={16} />{tour.destination.name}, Ethiopia</span><RatingStars rating={tour.rating} count={tour.reviewCount} /></div></div>
    <div className="gallery">{tour.images.map((image, index) => <img key={image} src={mediaUrl(image)} alt={`${tour.destination.name} illustrative travel image ${index + 1}`} />)}</div><p className="image-disclaimer">Photography is illustrative. Sample itineraries, prices, and reviews. Departure times shown in Ethiopia time.</p>
    <div className="detail-layout"><div>
      <div className="trip-facts"><span><Clock3 />{tour.duration} days</span><span><Users />Small-group departures</span><span><Mountain />{tour.difficulty}</span></div>
      <section className="detail-section"><h2>A journey worth taking</h2><p>{tour.description}</p><p>Travel at a thoughtful pace, ask questions, and leave space for the moments you didn’t plan. Your local guide brings the stories a map can’t show you.</p></section>
      <section className="detail-section"><h2>Your day-by-day story</h2><div className="itinerary">{tour.itinerary.map(day => <details key={day.day} open={day.day === 1}><summary><span>DAY {String(day.day).padStart(2, '0')}</span>{day.title}</summary><p>{day.description}</p></details>)}</div></section>
      <section className="detail-section"><h2>The little details</h2><div className="inclusions"><div><h3>What’s included</h3>{tour.included.map(item => <p key={item}><Check size={16} />{item}</p>)}</div><div><h3>Not included</h3>{tour.excluded.map(item => <p key={item}><X size={16} />{item}</p>)}</div></div></section>
      <section className="detail-section"><h2>Your local connections</h2><p className="muted">This Guzoye journey is operated by the platform and led by assigned local guides.</p><div className="guide-grid">{(tour.assignedGuides || []).map(guide => <Link className="inline-guide" key={guide._id} to={`/guides/${guide.slug || guide._id}`}><Avatar src={guide.image} name={guide.user.name} size={72} /><div><h3>{guide.user.name}</h3><p>{(guide.languages || []).join(' · ')}</p><RatingStars rating={guide.rating} /></div><ArrowRight /></Link>)}</div></section>
      <section className="detail-section"><h2>Stories from fellow travelers</h2><p className="muted">Illustrative reviews for this demo.</p>{reviewState.loading ? <Skeletons count={1} /> : reviewState.error ? <ErrorState message={reviewState.error} retry={reviewState.retry} /> : reviewState.data.data.length ? reviewState.data.data.map(review => <article className="review" key={review._id}><div><strong>{review.user.name}</strong><RatingStars rating={review.rating} /></div><p>{review.comment}</p></article>) : <EmptyState title="The first story is still to come" message="No sample reviews for this journey yet." />}</section>
    </div><BookingPanel key={tour._id} tour={tour} onRefresh={state.retry} /></div>
    <DestinationGuides destination={tour.destination} />
  </main>;
}
