import { useState } from 'react';
import { adminApi } from '../../services/adminApi';
import { useResource } from '../../hooks/useResource';
import { EmptyState, PageHeader, Skeleton, StatusBadge } from '../../components/admin/AdminUI';
import Button from '../../components/Button';
import '../../admin.css';
export default function AdminGuideRequests() {
  const [status, setStatus] = useState('pending'); const [type, setType] = useState(''); const [page, setPage] = useState(1);
  const requests = useResource(() => adminApi.guideRequests({ status, type, page, limit: 10 }), `requests-${status}-${type}-${page}`);
  async function decide(request, action) {
    const note = action === 'reject' ? window.prompt('Rejection reason (required):') : window.prompt('Decision note (optional):') || '';
    if (action === 'reject' && (!note || note.trim().length < 5)) return;
    try { await adminApi.decideGuideRequest(request._id, action, action === 'reject' ? { reason: note } : { note }); requests.retry(); }
    catch (problem) { window.alert(problem.message); }
  }
  return <div className="admin-page"><PageHeader eyebrow="People" title="Guide Requests" description="Approve or reject guide requests with an audit trail." />
    <section className="admin-panel"><div className="admin-filter-row">
      <select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} aria-label="Filter by status">{['pending','approved','rejected','cancelled'].map(value => <option key={value}>{value}</option>)}</select>
      <select value={type} onChange={event => { setType(event.target.value); setPage(1); }} aria-label="Filter by type"><option value="">All types</option>{['tour_assignment','destination_assignment','time_off'].map(value => <option key={value}>{value}</option>)}</select>
    </div>
    {requests.loading ? <Skeleton height={300} /> : requests.error ? <EmptyState title="Could not load requests" message={requests.error} action={<Button onClick={requests.retry}>Retry</Button>} /> : !(requests.data?.data || []).length ? <EmptyState title="No requests match" message="Guide requests will appear here." /> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ID</th><th>Guide</th><th>Type</th><th>Status</th><th>Message</th><th>Actions</th></tr></thead><tbody>{requests.data.data.map(request => <tr key={request._id}><td>#{String(request._id).slice(-6)}</td><td>{request.guide?.user?.name}</td><td>{request.type}</td><td><StatusBadge value={request.status} /></td><td>{request.message}</td><td>{request.status === 'pending' && <div className="admin-row-actions"><Button variant="secondary" onClick={() => decide(request, 'approve')}>Approve</Button><Button variant="secondary" onClick={() => decide(request, 'reject')}>Reject</Button></div>}</td></tr>)}</tbody></table></div>}
    <div className="admin-pagination"><Button variant="secondary" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</Button><span>Page {page}</span><Button variant="secondary" disabled={!requests.data?.pagination || page >= requests.data.pagination.pages} onClick={() => setPage(value => value + 1)}>Next</Button></div>
    </section>
  </div>;
}
