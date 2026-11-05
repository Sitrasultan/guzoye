import { guideAreaApi } from '../../services/guideArea';
import { useResource } from '../../hooks/useResource';
import { ErrorState } from '../../components/States';
import { GuideEmpty, GuideKpi, GuidePageHeader } from '../../components/guide/GuideUI';
import '../../guide.css';
const LABELS = { rating: 'Guest rating', completion: 'Completion rate', acceptance: 'Request acceptance', response: 'Response speed', reliability: 'Low cancellation / decline', experience: 'Completed-tour experience' };
export default function GuidePerformance() {
  const state = useResource(() => guideAreaApi.performance(), 'guide-performance');
  if (state.loading) return <p role="status">Calculating performance…</p>;
  if (state.error) return <ErrorState message={state.error} retry={state.retry} />;
  const data = state.data;
  return <>
    <GuidePageHeader eyebrow="PERFORMANCE" title="Your guide performance" description="A transparent 0-100 score based on ratings, reliability, responsiveness and experience." />
    <div className="guide-kpis">
      <GuideKpi label="Performance score" value={data.score} />
      <GuideKpi label="Overall rank" value={data.rank ? `#${data.rank}` : 'Unranked'} />
      <GuideKpi label="Tier" value={data.tier} />
      <GuideKpi label="Completed tours" value={data.metrics.completedTours} />
    </div>
    <section className="guide-panel"><h2>Score breakdown</h2><ul className="guide-breakdown">{Object.entries(data.breakdown).map(([key, item]) => <li key={key}><strong>{LABELS[key]}</strong><span>{item.value === null ? 'No data' : `${item.value}/100`}</span><small>{item.contribution} of {item.weight} points</small></li>)}</ul></section>
    <section className="guide-panel"><h2>Destination ranks</h2>{data.destinationRanks.length ? <ul className="guide-assignment-list">{data.destinationRanks.map(destination => <li key={destination.destinationId}><strong>{destination.name}</strong><span>{destination.rank ? `Rank #${destination.rank}` : 'Not ranked yet'}</span></li>)}</ul> : <GuideEmpty title="No destination ranks yet" message="Once you cover a destination and meet the minimum activity threshold, its rank appears here." />}</section>
    <section className="guide-panel"><h2>Tips to improve</h2><ul className="guide-activity"><li>Respond to booking and assignment requests within two hours.</li><li>Complete tours and avoid cancellations or declines.</li><li>Encourage travelers to leave honest reviews after completed journeys.</li><li>Keep your profile photo, bio, languages and specialties complete.</li></ul></section>
  </>;
}
