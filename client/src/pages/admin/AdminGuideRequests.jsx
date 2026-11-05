import { useState } from 'react';
import { adminApi } from '../../services/adminApi';
import { useResource } from '../../hooks/useResource';
import { Drawer, EmptyState, PageHeader, Skeleton, StatusBadge } from '../../components/admin/AdminUI';
import Button from '../../components/Button';
import '../../admin.css';
const TYPES = ['tour_assignment', 'destination_assignment', 'time_off'];
export default function AdminGuideRequests() {
  const [status, setStatus] = useState('pending');
  const [type, setType] = useState('');
  const [guide, setGuide] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requests = useResource(() => adminApi.guideRequests({ status, type, guide, page, limit: 10 }), `requests-${status}-${type}-${guide}-${page}`);
  async function decide(request, action) {
    const note = action === 'reject' ? window.prompt('Rejection reason (required):') : window.prompt('Decision note (optional):') || '';
    if (action === 'reject' && (!note || note.trim().length < 5)) return;
    setBusy(true); setError('');
    try { await adminApi.decideGuideRequest(request._id, action, action === 'reject' ? { reason: note } : { note }); requests.retry(); setSelected(null); }
    catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }
  return <div className="admin-page"><PageHeader eyebrow="People" title="Guide Requests" description="Approve assignments and time off. Approvals update assignments and departure groups atomically." />
    <section className="admin-panel"><div className="admin-filter-row">
      <select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} aria-label="Filter by status">{['pending','approved','rejected','cancelled'].map(value => <option key={value}>{value}</option>)}</select>
      <select value={type} onChange={event => { setType(event.target.value); setPage(1); }} aria-label="Filter by type"><option value="">All types</option>{TYPES.map(value => <option key={value}>{value}</option>)}</select>
      <input value={guide} onChange={event => { setGuide(event.target.value); setPage(1); }} placeholder="Guide ID" aria-label="Filter by guide ID" />
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {requests.loading ? <Skeleton height={300} /> : requests.error ? <EmptyState title="Could not load requests" message={requests.error} action={<Button onClick={requests.retry}>Retry</Button>} /> : !(requests.data?.data || []).length ? <EmptyState title="No requests match" message="Guide requests will appear here." /> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Guide</th><th>Type</th><th>Status</th><th>Message</th><th>Actions</th></tr></thead><tbody>{requests.data.data.map(request => <tr key={request._id}><td>{request.guide?.user?.name || 'Unknown'}</td><td>{request.type.replace(/_/g, ' ')}</td><td><StatusBadge value={request.status} /></td><td>{request.message}</td><td><div className="admin-row-actions"><Button variant="secondary" onClick={() => setSelected(request)}>Details</Button>{request.status === 'pending' && <><Button variant="secondary" disabled={busy} onClick={() => decide(request, 'approve')}>Approve</Button><Button variant="secondary" disabled={busy} onClick={() => decide(request, 'reject')}>Reject</Button></>}</div></td></tr>)}</tbody></table></div>}
    <div className="admin-pagination"><Button variant="secondary" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</Button><span>Page {page}</span><Button variant="secondary" disabled={!requests.data?.pagination || page >= requests.data.pagination.pages} onClick={() => setPage(value => value + 1)}>Next</Button></div>
    </section>
    <Drawer open={Boolean(selected)} onClose={() => setSelected(null)} title="Request details">
      {selected && <><p><strong>{selected.guide?.user?.name}</strong> requested <strong>{selected.type.replace(/_/g, ' ')}</strong>.</p><p>{selected.message}</p>{selected.tour && <p>Tour: {selected.tour.title}</p>}{selected.destination && <p>Destination: {selected.destination.name}</p>}{selected.decisionNote && <p>Decision note: {selected.decisionNote}</p>}{selected.status === 'pending' && <div className="admin-row-actions"><Button disabled={busy} onClick={() => decide(selected, 'approve')}>Approve</Button><Button variant="secondary" disabled={busy} onClick={() => decide(selected, 'reject')}>Reject</Button></div>}</>}
    </Drawer>
  </div>;
}
