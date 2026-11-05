import { useState } from 'react';
import { travelerApi } from '../../services/traveler';
import { useResource } from '../../hooks/useResource';
import { ErrorState } from '../../components/States';
import Button from '../../components/Button';
import RatingStars from '../../components/RatingStars';
import { AccountEmpty, AccountPageHeader } from '../../components/account/AccountUI';
import '../../account.css';
export default function AccountReviews() {
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const state = useResource(() => travelerApi.reviews(), `reviews-${version}`);
  async function remove(id) {
    setBusy(true); setError('');
    try { await travelerApi.deleteReview(id); setVersion(value => value + 1); }
    catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }
  return <>
    <AccountPageHeader eyebrow="YOUR VOICE" title="My reviews" description="Feedback you shared about completed Guzoye journeys." />
    {error && <p className="form-error" role="alert">{error}</p>}
    {state.loading ? <p role="status">Loading reviews…</p> : state.error ? <ErrorState message={state.error} retry={state.retry} /> : !state.data.length ? <AccountEmpty title="No reviews yet" message="After a completed trip, rate your tour and guide from My Trips." action={<Button to="/account/trips">View trips</Button>} /> : <ul className="account-activity">{state.data.map(review => <li key={review._id}><div><strong>{review.tour?.title}</strong><RatingStars rating={review.rating} /></div><p>{review.comment}</p><Button variant="secondary" disabled={busy} onClick={() => remove(review._id)}>Delete review</Button></li>)}</ul>}
  </>;
}
