import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Tours from './pages/Tours';
import TourDetails from './pages/TourDetails';
import Guides from './pages/Guides';
import GuideProfile from './pages/GuideProfile';
import Auth from './pages/Auth';
import MyBookings from './pages/MyBookings';
import Dashboard, { DashboardRedirect } from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminTourManager from './pages/AdminTourManager';
import GuideMyProfile from './pages/GuideMyProfile';
import { EmptyState } from './components/States';
import Button from './components/Button';
function ScrollReset() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo(0, 0); }, [pathname]); return null; }
export default function App() {
  return <><a className="skip-link" href="#content">Skip to content</a><Navbar /><ScrollReset /><div id="content" tabIndex={-1}><Routes>
    <Route path="/" element={<Home />} /><Route path="/tours" element={<Tours />} /><Route path="/tours/:id" element={<TourDetails />} /><Route path="/guides" element={<Guides />} /><Route path="/guides/:id" element={<GuideProfile />} />
    <Route path="/login" element={<Auth key="login" />} /><Route path="/register" element={<Auth key="register" register />} />
    <Route element={<ProtectedRoute />}><Route path="/dashboard" element={<DashboardRedirect />} /><Route path="/bookings" element={<MyBookings />} /></Route>
    <Route element={<ProtectedRoute roles={['traveler']} />}><Route path="/dashboard/traveler" element={<Dashboard />} /></Route>
    <Route element={<ProtectedRoute roles={['guide']} />}><Route path="/dashboard/guide" element={<Dashboard />} /><Route path="/dashboard/guide/profile" element={<GuideMyProfile />} /><Route path="*" element={<EmptyState title="Tour studio retired" message="Guzoye admins now create tours and assign guides." />} /></Route>
    <Route element={<ProtectedRoute roles={['admin']} />}><Route path="/dashboard/admin" element={<AdminDashboard />} /><Route path="/dashboard/admin/tours" element={<AdminTourManager />} /></Route>
    <Route path="*" element={<main className="container page"><EmptyState title="A little off the beaten path" message="This page doesn’t exist. Let’s find your way back."><Button to="/">Back to discovery</Button></EmptyState></main>} />
  </Routes></div><Footer /></>;
}
