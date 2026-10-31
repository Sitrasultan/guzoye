import { useAuth } from '../hooks/useAuth';
import BookingsList from '../components/BookingsList';
import Button from '../components/Button';
export default function MyBookings() {
  const { user } = useAuth();
  return <main className="container page"><header className="page-heading"><span className="eyebrow">YOUR STORIES IN THE MAKING</span><h1>My bookings.</h1><p>Welcome, {user.name}. Your journeys, all in one place.</p></header>{user.role === 'traveler' ? <BookingsList /> : <section className="account-panel"><h2>Traveler bookings</h2><p>Only traveler accounts create personal tour bookings. Use your role dashboard to manage requests.</p><Button to="/dashboard">Go to dashboard</Button></section>}</main>;
}
