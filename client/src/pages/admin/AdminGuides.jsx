import { useState } from 'react';
import { adminApi } from '../../services/adminApi';
import { useResource } from '../../hooks/useResource';
import { EmptyState, PageHeader, Skeleton, StatusBadge } from '../../components/admin/AdminUI';
import Button from '../../components/Button';
import '../../admin.css';
export default function AdminGuides() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('approved');
  const [page, setPage] = useState(1);
  const guides = useResource(() => adminApi.guides({
    status,
    page,
    limit: 10
  }), `guides-${status}-${page}`);
  const rows = (guides.data?.data || []).filter(guide => !search || `${guide.user?.name} ${guide.user?.email}`.toLowerCase().includes(search.toLowerCase()));
  async function decide(guide, action) {
    const reason = action === 'reject' ? window.prompt('Rejection reason (required):') : '';
    if (action === 'reject' && (!reason || reason.trim().length < 5)) return;
    try {
      await adminApi.decideGuide(guide._id, action, action === 'reject' ? {
        reason
      } : {});
      guides.retry();
    } catch (problem) {
      window.alert(problem.message);
    }
  }
  return <div className="admin-page"><PageHeader eyebrow="People" title="Guides" description="Review guide applications and manage approved guides." />
    <section className="admin-panel"><div className="admin-filter-row">
      <input type="search" placeholder="Search name or email" value={search} onChange={event => setSearch(event.target.value)} aria-label="Search guides" />
      <select value={status} onChange={event => {
          setStatus(event.target.value);
          setPage(1);
        }} aria-label="Filter by status">{['pending', 'approved', 'rejected'].map(value => <option key={value}>{value}</option>)}</select>
    </div>
    {guides.loading ? <Skeleton height={300} /> : guides.error ? <EmptyState title="Could not load guides" message={guides.error} action={<Button onClick={guides.retry}>Retry</Button>} /> : !rows.length ? <EmptyState title="No guides match" message="Try another status or search term." /> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ID</th><th>Guide</th><th>Status</th><th>Rating</th><th>Actions</th></tr></thead><tbody>{rows.map(guide => <tr key={guide._id}><td>#{String(guide._id).slice(-6)}</td><td><strong>{guide.user?.name}</strong><br /><small>{guide.user?.email}</small></td><td><StatusBadge value={guide.status} /></td><td>{guide.rating || 'None'}</td><td>{guide.status === 'pending' && <div className="admin-row-actions"><Button variant="secondary" onClick={() => decide(guide, 'approve')}>Approve</Button><Button variant="secondary" onClick={() => decide(guide, 'reject')}>Reject</Button></div>}</td></tr>)}</tbody></table></div>}
    <div className="admin-pagination"><Button variant="secondary" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</Button><span>Page {page}</span><Button variant="secondary" disabled={!guides.data?.pagination || page >= guides.data.pagination.pages} onClick={() => setPage(value => value + 1)}>Next</Button></div>
    </section>
  </div>;
}
