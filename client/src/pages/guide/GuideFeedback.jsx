import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { guideAreaApi } from '../../services/guideArea';
import { useResource } from '../../hooks/useResource';
import { ErrorState } from '../../components/States';
import { GuideEmpty, GuidePageHeader } from '../../components/guide/GuideUI';
import '../../guide.css';
export default function GuideFeedback() {
  const state = useResource(() => guideAreaApi.feedback(), 'guide-feedback');
  if (state.loading) return <p role="status">Loading feedback…</p>;
  if (state.error) return <ErrorState message={state.error} retry={state.retry} />;
  const data = state.data;
  const distribution = (data.distribution || [0,0,0,0,0]).map((count,index)=>({rating:`${index+1} star`,count}));
 
  return <>
    <GuidePageHeader eyebrow="GUEST VOICE" title="Feedback and ratings" description="Understand what travelers value about your journeys." />
    <section className="guide-panel"><h2>Feedback</h2><GuideEmpty title="Feedback appears here after your first completed tour" message="Traveler feedback, sub-ratings and one public reply will appear here after a completed booking is reviewed." /></section>
    <section className="guide-panel"><h2>Rating distribution</h2><ResponsiveContainer width="100%" height={240}><BarChart data={distribution}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="rating" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#14532d" /></BarChart></ResponsiveContainer></section>
  </>;
}
