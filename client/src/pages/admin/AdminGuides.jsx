import { useState } from 'react';
import { adminApi } from '../../services/adminApi';
import { adminGuideAreaApi } from '../../services/guideArea';
import { useResource } from '../../hooks/useResource';
import { Drawer, EmptyState, PageHeader, Skeleton, StatusBadge } from '../../components/admin/AdminUI';
import Button from '../../components/Button';
import '../../admin.css';
export default function AdminGuides() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('approved');
  const [destination, setDestination] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const guides = useResource(() => adminGuideAreaApi.guides({ status, destination, page, limit: 10 }), `guides-${status}-${destination}-${page}`);
  const rows = (guides.data?.data || []).filter(guide => !search || `${guide.user?.name} ${guide.user?.email}`.toLowerCase().includes(search.toLowerCase()));
  async function decide(guide, action) {
    const reason = action === 'reject' || action === 'suspend' ? window.prompt(`${action} reason (required):`) : '';
    if ((action === 'reject' || action === 'suspend') && (!reason || reason.trim().length < 5)) return;
    setBusy(true); setError('');
    try {
      if (action === 'suspend') await adminGuideAreaApi.suspend(guide._id, reason);
      else if (action === 'reactivate') await adminGuideAreaApi.reactivate(guide._id);
      else await adminApi.decideGuide(guide._id, action, action === 'reject' ? { reason } : {});
      guides.retry(); setSelected(null);
    } catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }
  return <div className="admin-page"><PageHeader eyebrow="People" title="Guides" description="Review applications, inspect performance, and manage guide access." />
    <section className="admin-panel"><div className="admin-filter-row">
      <input type="search" placeholder="Search name or email" value={search} onChange={event => setSearch(event.target.value)} aria-label="Search guides" />
      <select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} aria-label="Filter by status">{['pending', 'approved', 'rejected'].map(value => <option key={value}>{value}</option>)}</select>
      <input value={destination} onChange={event => { setDestination(event.target.value); setPage(1); }} placeholder="Destination ID" aria-label="Filter by destination ID" />
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {guides.loading ? <Skeleton height={300} /> : guides.error ? <EmptyState title="Could not load guides" message={guides.error} action={<Button onClick={guides.retry}>Retry</Button>} /> : !rows.length ? <EmptyState title="No guides match" message="Try another status, destination, or search term." /> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Guide</th><th>Status</th><th>Rank</th><th>Score</th><th>Actions</th></tr></thead><tbody>{rows.map(guide => <tr key={guide._id}><td><strong>{guide.user?.name}</strong><br /><small>{guide.user?.email}</small></td><td><StatusBadge value={guide.status} /> {guide.isActive === false && <StatusBadge value="suspended" />}</td><td>{guide.performance?.rank ? `#${guide.performance.rank}` : '—'}</td><td>{guide.performance?.score ?? '—'}</td><td><div className="admin-row-actions"><Button variant="secondary" onClick={() => setSelected(guide)}>Details</Button>{guide.status === 'pending' && <><Button variant="secondary" disabled={busy} onClick={() => decide(guide, 'approve')}>Approve</Button><Button variant="secondary" disabled={busy} onClick={() => decide(guide, 'reject')}>Reject</Button></>}{guide.isActive !== false && guide.status === 'approved' && <Button variant="secondary" disabled={busy} onClick={() => decide(guide, 'suspend')}>Suspend</Button>}{guide.isActive === false && <Button variant="secondary" disabled={busy} onClick={() => decide(guide, 'reactivate')}>Reactivate</Button>}</div></td></tr>)}</tbody></table></div>}
    <div className="admin-pagination"><Button variant="secondary" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</Button><span>Page {page}</span><Button variant="secondary" disabled={!guides.data?.pagination || page >= guides.data.pagination.pages} onClick={() => setPage(value => value + 1)}>Next</Button></div>
    </section>
    <Drawer open={Boolean(selected)} onClose={() => setSelected(null)} title="Guide details">
      {selected && <><h3>{selected.user?.name}</h3><p>{selected.user?.email}</p><p><strong>Status:</strong> {selected.status}{selected.isActive === false ? ' · suspended' : ''}</p><p><strong>Rejection reason:</strong> {selected.rejectionReason || '—'}</p><p><strong>Performance:</strong> {selected.performance?.score ?? 0}/100 · {selected.performance?.tier || 'New'}</p><p><strong>Bio:</strong> {selected.bio}</p><p><strong>Languages:</strong> {(selected.languages || []).join(', ') || '—'}</p><div className="admin-row-actions">{selected.status === 'pending' && <><Button disabled={busy} onClick={() => decide(selected, 'approve')}>Approve</Button><Button variant="secondary" disabled={busy} onClick={() => decide(selected, 'reject')}>Reject</Button></>}{selected.isActive !== false && selected.status === 'approved' && <Button variant="secondary" disabled={busy} onClick={() => decide(selected, 'suspend')}>Suspend</Button>}{selected.isActive === false && <Button variant="secondary" disabled={busy} onClick={() => decide(selected, 'reactivate')}>Reactivate</Button>}</div></>}
    </Drawer>
  </div>;
}
