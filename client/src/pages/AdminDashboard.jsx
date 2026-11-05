import { Navigate } from 'react-router-dom';

// Compatibility entry point. The current admin shell owns every admin section.
export default function AdminDashboard() {
  return <Navigate to="/admin" replace />;
}
