import { EmptyState, PageHeader } from '../../components/admin/AdminUI';
import Button from '../../components/Button';
import '../../admin.css';
export default function AdminUnavailable({ title, message }) {
  return <div className="admin-page"><PageHeader eyebrow="Operations" title={title} description={message} /><section className="admin-panel"><EmptyState title="Not available yet" message="This area needs a dedicated admin list endpoint, which is outside the approved server changes for this delivery." action={<Button variant="secondary" to="/admin">Back to overview</Button>} /></section></div>;
}
