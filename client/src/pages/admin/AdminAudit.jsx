import { useState } from 'react';
import { adminApi } from '../../services/adminApi';
import { useResource } from '../../hooks/useResource';
import { EmptyState, PageHeader, Skeleton } from '../../components/admin/AdminUI';
import Button from '../../components/Button';
import '../../admin.css';
export default function AdminAudit() {
  const [page, setPage] = useState(1);
  const audit = useResource(() => adminApi.audit({ page, limit: 15 }), `audit-${page}`);
  return <div className="admin-page"><PageHeader eyebrow="Insights" title="Audit Log" description="Every administrative action recorded by Guzoye." />
    <section className="admin-panel">
      {audit.loading ? <Skeleton height={350} /> : audit.error ? <EmptyState title="Could not load audit log" message={audit.error} action={<Button onClick={audit.retry}>Retry</Button>} /> : !(audit.data?.data || []).length ? <EmptyState title="No audit entries" message="Administrative actions will appear here." /> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ID</th><th>When</th><th>Actor</th><th>Action</th><th>Target</th></tr></thead><tbody>{audit.data.data.map(entry => <tr key={entry._id}><td>#{String(entry._id).slice(-6)}</td><td>{new Date(entry.createdAt).toLocaleString()}</td><td>{entry.actor?.name || 'System'}</td><td>{entry.action}</td><td>{entry.targetType} #{String(entry.target).slice(-6)}</td></tr>)}</tbody></table></div>}
      <div className="admin-pagination"><Button variant="secondary" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</Button><span>Page {page}</span><Button variant="secondary" disabled={!audit.data?.pagination || page >= audit.data.pagination.pages} onClick={() => setPage(value => value + 1)}>Next</Button></div>
    </section>
  </div>;
}
