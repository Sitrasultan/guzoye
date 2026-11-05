import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
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
import AdminTourManager from './pages/AdminTourManager';
import GuideMyProfile from './pages/GuideMyProfile';
import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminActivity from './pages/admin/AdminActivity';
import AdminDestinations from './pages/admin/AdminDestinations';
import AdminGuides from './pages/admin/AdminGuides';
import AdminGuideRequests from './pages/admin/AdminGuideRequests';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAudit from './pages/admin/AdminAudit';
import AdminUnavailable from './pages/admin/AdminUnavailable';
import { EmptyState } from './components/States';
import Button from './components/Button';
import BookingsList from './components/BookingsList';
import { useAuth } from './hooks/useAuth';
import './admin.css';
function ScrollReset() {
  const {
    pathname
  } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
function PublicShell({
  children
}) {
  return <><Navbar /><ScrollReset /><div id="content" tabIndex={-1}>{children}</div><Footer /></>;
}
function AdminLoginRedirect({
  children
}) {
  const {
    user
  } = useAuth();
  const location = useLocation();
  if (user?.role === 'admin' && location.pathname === '/dashboard') return <Navigate to="/admin" replace />;
  return children;
}
function AdminPlaceholder({
  title,
  message
}) {
  return <AdminUnavailable title={title} message={message} />;
}
export default function App() {
  return <Routes>
    <Route path="/admin" element={<ProtectedRoute roles={['admin']} />}>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminOverview />} />
        <Route path="tours" element={<AdminTourManager />} />
        <Route path="destinations" element={<AdminDestinations />} />
        <Route path="guides" element={<AdminGuides />} />
        <Route path="guide-requests" element={<AdminGuideRequests />} />
        <Route path="bookings" element={<div className="admin-page"><BookingsList mode="admin" /></div>} />
        <Route path="reviews" element={<AdminPlaceholder title="Reviews" message="Review moderation needs a dedicated admin reviews endpoint." />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="activity" element={<AdminActivity />} />
        <Route path="audit" element={<AdminAudit />} />
      </Route>
    </Route>
    <Route path="*" element={<PublicShell><Routes>
      <Route path="/" element={<Home />} /><Route path="/tours" element={<Tours />} /><Route path="/tours/:id" element={<TourDetails />} /><Route path="/guides" element={<Guides />} /><Route path="/guides/:id" element={<GuideProfile />} />
      <Route path="/login" element={<Auth key="login" />} /><Route path="/register" element={<Auth key="register" register />} />
      <Route element={<ProtectedRoute />}><Route path="/dashboard" element={<AdminLoginRedirect><DashboardRedirect /></AdminLoginRedirect>} /><Route path="/bookings" element={<MyBookings />} /></Route>
      <Route element={<ProtectedRoute roles={['traveler']} />}><Route path="/dashboard/traveler" element={<Dashboard />} /></Route>
      <Route element={<ProtectedRoute roles={['guide']} />}><Route path="/dashboard/guide" element={<Dashboard />} /><Route path="/dashboard/guide/profile" element={<GuideMyProfile />} /><Route path="*" element={<EmptyState title="Tour studio retired" message="Guzoye admins now create tours and assign guides." />} /></Route>
      <Route element={<ProtectedRoute roles={['admin']} />}><Route path="/dashboard/admin" element={<Navigate to="/admin" replace />} /><Route path="/dashboard/admin/tours" element={<Navigate to="/admin/tours" replace />} /></Route>
      <Route path="*" element={<main className="container page"><EmptyState title="A little off the beaten path" message="This page doesn’t exist. Let’s find your way back."><Button to="/">Back to discovery</Button></EmptyState></main>} />
    </Routes></PublicShell>} />
  </Routes>;
}
