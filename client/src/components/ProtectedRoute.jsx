import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ErrorState, EmptyState } from './States';
import Button from './Button';
export default function ProtectedRoute({ roles }) {
  const { user, loading, sessionError, refresh } = useAuth();
  const location = useLocation();
  if (loading) return <main className="container page"><p role="status">Checking your session…</p></main>;
  if (sessionError) return <main className="container page"><ErrorState message={sessionError} retry={refresh} /></main>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <main className="container page"><EmptyState title="This path isn’t available to your account" message="You don’t have the role required to open this page."><Button to="/dashboard">Go to your dashboard</Button></EmptyState></main>;
  return <Outlet />;
}
