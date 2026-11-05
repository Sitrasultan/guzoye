import { useState } from 'react';
import { adminApi } from '../../services/adminApi';
import { useResource } from '../../hooks/useResource';
import { EmptyState, PageHeader, Skeleton, StatusBadge } from '../../components/admin/AdminUI';
import Button from '../../components/Button';
import '../../admin.css';
export default function AdminUsers() {
  const [search, setSearch] = useState(''); const [role, setRole] = useState(''); const [page, setPage] = useState(1);
  const users = useResource(() => adminApi.users({ search, role, page, limit: 10 }), `users-${search}-${role}-${page}`);
  async function deactivate(user) {
    const reason = window.prompt('Deactivation reason (required):');
    if (!reason || reason.trim().length < 5) return;
    try { await adminApi.deactivateUser(user._id, reason); users.retry(); } catch (problem) { window.alert(problem.message); }
  }
  return <div className="admin-page"><PageHeader eyebrow="People" title="Users" description="Search accounts and deactivate users with safeguards." />
    <section className="admin-panel"><div className="admin-filter-row">
      <input type="search" placeholder="Search name or email" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} aria-label="Search users" />
      <select value={role} onChange={event => { setRole(event.target.value); setPage(1); }} aria-label="Filter by role"><option value="">All roles</option>{['traveler','guide','admin'].map(value => <option key={value}>{value}</option>)}</select>
    </div>
    {users.loading ? <Skeleton height={300} /> : users.error ? <EmptyState title="Could not load users" message={users.error} action={<Button onClick={users.retry}>Retry</Button>} /> : !(users.data?.data || []).length ? <EmptyState title="No users match" message="Try another search or role." /> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>{users.data.data.map(user => <tr key={user._id}><td>#{String(user._id).slice(-6)}</td><td>{user.name}</td><td>{user.email}</td><td>{user.role}</td><td><StatusBadge value={user.isActive === false ? 'archived' : 'published'} /></td><td>{user.role !== 'admin' && user.isActive !== false && <Button variant="secondary" onClick={() => deactivate(user)}>Deactivate</Button>}</td></tr>)}</tbody></table></div>}
    <div className="admin-pagination"><Button variant="secondary" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</Button><span>Page {page}</span><Button variant="secondary" disabled={!users.data?.pagination || page >= users.data.pagination.pages} onClick={() => setPage(value => value + 1)}>Next</Button></div>
    </section>
  </div>;
}
