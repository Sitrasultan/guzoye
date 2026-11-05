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
import { EmptyState } from './components/States';
import Button from './components/Button';
import { useAuth } from './hooks/useAuth';
import './admin.css';
function ScrollReset() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo(0, 0); }, [pathname]); return null; }
function PublicShell({ children }) { return <><Navbar /><ScrollReset /><div id="content" tabIndex={-1}>{children}</div><Footer /></>; }
function AdminLoginRedirect({ children }) {
  const { user } = useAuth(); const location = useLocation();
  if (user?.role === 'admin' && location.pathname === '/dashboard') return <Navigate to="/admin" replace />;
  return children;
}
function AdminGate() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace state={{ message: 'Please sign in with an administrator account.' }} />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace state={{ adminDenied: 'Administrator access is required.' }} />;
  return <AdminLayout />;
}
function AdminPlaceholder({ title, description }) {
  return <div className="admin-page"><EmptyState title={`${title} is being built`} message={description || 'This section will be available in the next Guzoye admin delivery.'} /></div>;
}
export default function App() {
  return <Routes>
    <Route path="/admin" element={<AdminGate />}>
      <Route index element={<AdminOverview />} />
      <Route path="tours" element={<AdminTourManager />} />
      <Route path="destinations" element={<AdminPlaceholder title="Destinations" description="Destination management is being built." />} />
      <Route path="guides" element={<AdminPlaceholder title="Guides" description="Guide management is being built." />} />
      <Route path="guide-requests" element={<AdminPlaceholder title="Guide Requests" description="The guide-request inbox is being built." />} />
      <Route path="bookings" element={<AdminPlaceholder title="Bookings" description="Booking management is being built." />} />
      <Route path="reviews" element={<AdminPlaceholder title="Reviews" description="Review moderation is being built." />} />
      <Route path="users" element={<AdminPlaceholder title="Users" description="User management is being built." />} />
      <Route path="activity" element={<AdminActivity />} />
      <Route path="audit" element={<AdminPlaceholder title="Audit Log" description="Audit-log browsing is being built." />} />
    </Route>
    <Route path="*" element={<PublicShell>
      <Routes>
        <Route path="/" element={<Home />} /><Route path="/tours" element={<Tours />} /><Route path="/tours/:id" element={<TourDetails />} /><Route path="/guides" element={<Guides />} /><Route path="/guides/:id" element={<GuideProfile />} />
        <Route path="/login" element={<Auth key="login" />} /><Route path="/register" element={<Auth key="register" register />} />
        <Route element={<ProtectedRoute />}><Route path="/dashboard" element={<AdminLoginRedirect><DashboardRedirect /></AdminLoginRedirect>} /><Route path="/bookings" element={<MyBookings />} /></Route>
        <Route element={<ProtectedRoute roles={['traveler']} />}><Route path="/dashboard/traveler" element={<Dashboard />} /></Route>
        <Route element={<ProtectedRoute roles={['guide']} />}><Route path="/dashboard/guide" element={<Dashboard />} /><Route path="/dashboard/guide/profile" element={<GuideMyProfile />} /><Route path="*" element={<EmptyState title="Tour studio retired" message="Guzoye admins now create tours and assign guides." />} /></Route>
       <Route element={<ProtectedRoute roles={['admin']} />}>
  <Route path="/dashboard/admin" element={<Navigate to="/admin" replace />} />
  <Route path="/dashboard/admin/tours" element={<Navigate to="/admin/tours" replace />} />
</Route>
        <Route path="*" element={<main className="container page"><EmptyState title="A little off the beaten path" message="This page doesn’t exist. Let’s find your way back."><Button to="/">Back to discovery</Button></EmptyState></main>} />
      </Routes>
    </PublicShell>} />
  </Routes>;
}
