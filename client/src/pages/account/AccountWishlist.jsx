import { useState } from 'react';
import { travelerApi } from '../../services/traveler';
import { useResource } from '../../hooks/useResource';
import { ErrorState } from '../../components/States';
import Button from '../../components/Button';
import TourCard from '../../components/TourCard';
import { AccountEmpty, AccountPageHeader } from '../../components/account/AccountUI';
import '../../account.css';
export default function AccountWishlist() {
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const state = useResource(() => travelerApi.wishlist(), `wishlist-${version}`);
  async function remove(tourId) {
    setBusy(true); setError('');
    try { await travelerApi.removeWishlist(tourId); setVersion(value => value + 1); }
    catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }
  return <>
    <AccountPageHeader eyebrow="SAVED FOR LATER" title="Wishlist" description="Journeys you saved while exploring Guzoye." />
    {error && <p className="form-error" role="alert">{error}</p>}
    {state.loading ? <p role="status">Loading wishlist…</p> : state.error ? <ErrorState message={state.error} retry={state.retry} /> : !state.data.length ? <AccountEmpty title="Your wishlist is empty" message="Tap the heart on any tour to save it for later." action={<Button to="/tours">Browse tours</Button>} /> : <div className="account-recommendations">{state.data.map(item => <div key={item.tour._id} className="account-wishlist-item"><TourCard tour={item.tour} /><Button variant="secondary" disabled={busy} onClick={() => remove(item.tour._id)}>Remove</Button></div>)}</div>}
  </>;
}
