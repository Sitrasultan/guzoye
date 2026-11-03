import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useResource } from '../hooks/useResource';
import GuideCard from './GuideCard';
import { Skeletons, ErrorState, EmptyState } from './States';
export default function DestinationGuides({ destination }) {
  const state = useResource(() => api.list('guides', { destination: destination._id, limit: 3 }), destination._id);
  return <section className="detail-section local-guides-section"><h2>Local guides in {destination.name}</h2>{state.loading ? <Skeletons count={3} /> : state.error ? <ErrorState message={state.error} retry={state.retry} /> : !state.data.data.length ? <EmptyState title="Local connections are growing" message="No approved guides currently match this place." /> : <div className="guide-grid">{state.data.data.map(guide => <GuideCard guide={guide} key={guide._id} />)}</div>}<Link className="section-link" to={`/guides?destination=${destination._id}`}>See all guides in {destination.name} →</Link></section>;
}
