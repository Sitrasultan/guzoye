import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useResource } from '../hooks/useResource';
import GuideCard from '../components/GuideCard';
import Button from '../components/Button';
import { Skeletons, ErrorState, EmptyState } from '../components/States';
import '../uploads.css';
export default function Guides() {
  const [params, setParams] = useSearchParams();
  const filter = Object.fromEntries(params), key = params.toString();
  const places = useResource(() => api.list('destinations', { limit: 50 }), 'guide-places');
  const state = useResource(() => api.list('guides', { ...filter, limit: 12 }), key);
  function change(name, value) { setParams(previous => { const next = new URLSearchParams(previous); value ? next.set(name, value) : next.delete(name); if (name !== 'page') next.delete('page'); return next; }); }
  const destination = places.data?.data.find(d => d._id === filter.destination);
  return <main className="container page"><header className="page-heading"><span className="eyebrow">A PLACE IS ONLY HALF THE STORY</span><h1>{destination ? `Local guides in ${destination.name}` : 'Meet your local connection.'}</h1><p>Find the local knowledge, language, and experience for your next journey.</p></header>
    {places.error && <ErrorState message={places.error} retry={places.retry} />}
    <form className="place-filters" onSubmit={event => event.preventDefault()}>
      <label>Place<select value={filter.destination || ''} disabled={places.loading} onChange={event => change('destination', event.target.value)}><option value="">All places</option>{places.data?.data.map(place => <option value={place._id} key={place._id}>{place.name}</option>)}</select></label>
      <label>Language<input list="guide-languages" placeholder="Any language" maxLength={100} value={filter.language || ''} onChange={event => change('language', event.target.value)} /><datalist id="guide-languages">{['English', 'Amharic', 'French', 'Afar', 'Harari', 'Oromo', 'German'].map(language => <option value={language} key={language} />)}</datalist></label>
      <label>Guide name<input type="search" maxLength={100} placeholder="Search by name" value={filter.q || ''} onChange={event => change('q', event.target.value)} /></label>
      <label>Minimum rating<select value={filter.minRating || ''} onChange={event => change('minRating', event.target.value)}><option value="">Any rating</option><option value="3">3+</option><option value="4">4+</option><option value="4.5">4.5+</option><option value="5">5</option></select></label>
      <label>Sort<select value={filter.sort || 'rating'} onChange={event => change('sort', event.target.value)}><option value="rating">Highest rated</option><option value="experience">Most experience</option><option value="name">Name A–Z</option></select></label><Button type="button" variant="secondary" onClick={() => setParams({})}>Reset filters</Button>
    </form>
    {state.loading ? <Skeletons count={6} /> : state.error ? <ErrorState message={state.error} retry={state.retry} /> : !state.data.data.length ? <EmptyState title="No guides match these filters" message="Try another place, language or rating."><Button onClick={() => setParams({})}>Clear filters</Button></EmptyState> : <><p>{state.data.pagination.total} guides found</p><div className="guide-grid">{state.data.data.map(guide => <GuideCard guide={guide} key={guide._id} />)}</div><div className="pagination"><Button variant="secondary" disabled={state.data.pagination.page <= 1} onClick={() => change('page', String(state.data.pagination.page - 1))}>Previous</Button><span>Page {state.data.pagination.page} of {state.data.pagination.pages}</span><Button variant="secondary" disabled={state.data.pagination.page >= state.data.pagination.pages} onClick={() => change('page', String(state.data.pagination.page + 1))}>Next</Button></div></>}
  </main>;
}
