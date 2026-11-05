import { useState } from 'react';
import { adminManagement } from '../services/management';
import { useResource } from '../hooks/useResource';
import { Skeletons, ErrorState, EmptyState } from '../components/States';
import BookingsList from '../components/BookingsList';
import Button from '../components/Button';
import Modal from '../components/Modal';
import '../management.css';

function Bars({ rows, label }) {
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <section className="chart-panel" aria-label={label}>
      <h2>{label}</h2>

      {!rows.length ? (
        <p>No data yet.</p>
      ) : (
        <ul className="bar-chart">
          {rows.map((row) => (
            <li key={row.label}>
              <span>{row.label}</span>

              <div className="bar-track">
                <div
                  style={{
                    width: `${(row.value / max) * 100}%`,
                  }}
                />
              </div>

              <strong>{row.value}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Overview() {
  const state = useResource(() => adminManagement.stats(), 'admin-stats');

  if (state.loading) {
    return <Skeletons count={4} />;
  }

  if (state.error) {
    return <ErrorState message={state.error} retry={state.retry} />;
  }

  const data = state.data.data;

  return (
    <>
      <div className="stats-grid">
        {[
          ['Total users', data.totalUsers],
          ['Approved guides', data.approvedGuides],
          ['Pending guides', data.pendingGuides],
          ['Tours (including archived)', data.totalTours],
          [
            'Completed-booking estimate',
            new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(data.revenueEstimate),
          ],
        ].map(([label, value]) => (
          <article className="stat-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <p>
        This is an estimate from completed bookings, not collected revenue. No
        payment processing exists.
      </p>

      <div className="charts-grid">
        <Bars
          label="Bookings by status"
          rows={['pending', 'confirmed', 'declined', 'cancelled', 'completed'].map(
            (status) => ({
              label: status,
              value: data.bookings[status] || 0,
            })
          )}
        />

        <Bars
          label="Bookings per month (UTC; latest 12 nonempty months)"
          rows={data.bookingsPerMonth.map((row) => ({
            label: row._id,
            value: row.count,
          }))}
        />

        <Bars
          label="Top tours by total booking requests (all statuses)"
          rows={data.topTours.map((row) => ({
            label: row.title,
            value: row.count,
          }))}
        />
      </div>

      <Button variant="secondary" onClick={state.retry}>
        Refresh statistics
      </Button>
    </>
  );
}

async function approvedGuides() {
  let page = 1;
  let all = [];
  let result;

  do {
    result = await adminManagement.guides({
      status: 'approved',
      page,
      limit: 50,
    });

    all.push(...result.data);
    page += 1;
  } while (page <= result.pagination.pages);

  return all;
}

function Management({ section }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');
  const [guideId, setGuideId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const state = useResource(async () => {
    const params = {
      page,
      limit: 10,
      ...(section === 'guides' ? { status } : {}),
      ...(section === 'users' ? { search, role } : {}),
    };

    const result = await adminManagement[section](params);

    return {
      ...result,
      approved:
        section === 'tours' ? await approvedGuides() : [],
    };
  }, `${section}:${page}:${status}:${search}:${role}`);

  function choose(type, item) {
    setError('');
    setReason('');
    setGuideId(item.guide?._id || '');
    setAction({ type, item });
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const { type, item } = action;
      let response;

      if (type === 'approve') {
        response = await adminManagement.approve(item._id);
      }

      if (type === 'reject') {
        response = await adminManagement.reject(item._id, reason);
      }

      if (type === 'archive') {
        response = await adminManagement.archive(item._id);
      }

      if (type === 'reassign') {
        response = await adminManagement.reassign(item._id, guideId);
      }

      if (type === 'deactivate') {
        response = await adminManagement.deactivate(item._id, reason);
      }

      setMessage(response.message);
      setAction(null);

      if (page > 1) {
        setPage(1);
      } else {
        state.retry();
      }
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  }

  const rows = state.data?.data || [];

  return (
    <section>
      <div className="results-toolbar">
        <h2>
          {section === 'guides'
            ? 'Guide applications'
            : section === 'audit'
              ? 'Admin audit log'
              : section === 'tours'
                ? 'Tour management'
                : 'User management'}
        </h2>

        {section === 'guides' && (
          <label>
            Application status

            <select
              value={status}
              disabled={busy}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              {['pending', 'approved', 'rejected'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        )}

        {section === 'users' && (
          <>
            <label>
              Search name or email

              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </label>

            <label>
              Role

              <select
                value={role}
                onChange={(event) => {
                  setRole(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All roles</option>

                {['traveler', 'guide', 'admin'].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </>
        )}

        <Button
          variant="secondary"
          disabled={busy || state.loading}
          onClick={state.retry}
        >
          Refresh
        </Button>
      </div>

      {message && (
        <p className="success-message" role="status">
          {message}
        </p>
      )}

      {state.loading ? (
        <Skeletons count={2} />
      ) : state.error ? (
        <ErrorState message={state.error} retry={state.retry} />
      ) : !rows.length ? (
        <EmptyState
          title="Nothing here yet"
          message="No records match this view."
        />
      ) : (
        <>
          <div className="booking-table-wrap">
            <table className="booking-table">
              <thead>
                <tr>
                  {(section === 'guides'
                    ? ['Guide', 'Status / profile', 'Actions']
                    : section === 'tours'
                      ? ['Tour', 'Assigned guide', 'Status', 'Actions']
                      : section === 'users'
                        ? ['User', 'Role', 'Account', 'Actions']
                        : ['When', 'Actor', 'Action / target', 'Details']
                  ).map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((item) => (
                  <tr key={item._id}>
                    {section === 'guides' && (
                      <>
                        <td>
                          {item.user?.name}
                          <small>{item.user?.email}</small>
                        </td>

                        <td>
                          {item.status}
                          <small>{item.bio}</small>

                          {item.rejectionReason && (
                            <small>Reason: {item.rejectionReason}</small>
                          )}
                        </td>

                        <td>
                          <div className="booking-row-actions">
                            {item.status !== 'approved' && (
                              <Button
                                disabled={busy}
                                onClick={() => choose('approve', item)}
                              >
                                Approve
                              </Button>
                            )}

                            {item.status === 'pending' && (
                              <Button
                                variant="secondary"
                                disabled={busy}
                                onClick={() => choose('reject', item)}
                              >
                                Reject with reason
                              </Button>
                            )}
                          </div>
                        </td>
                      </>
                    )}

                    {section === 'tours' && (
                      <>
                        <td>
                          {item.title}
                          <small>{item.destination?.name}</small>
                        </td>

                        <td>
                          {item.guide?.user?.name || 'Unavailable guide'}
                          <small>{item.guide?.user?.email}</small>
                        </td>

                        <td>
                          {item.archived ? 'Archived' : 'Published'}
                        </td>

                        <td>
                          <div className="booking-row-actions">
                            <Button
                              variant="secondary"
                              disabled={busy}
                              onClick={() => choose('reassign', item)}
                            >
                              Reassign guide
                            </Button>

                            {!item.archived && (
                              <Button
                                variant="secondary"
                                disabled={busy}
                                onClick={() => choose('archive', item)}
                              >
                                Archive
                              </Button>
                            )}
                          </div>
                        </td>
                      </>
                    )}

                    {section === 'users' && (
                      <>
                        <td>
                          {item.name}
                          <small>{item.email}</small>
                        </td>

                        <td>{item.role}</td>

                        <td>
                          {item.isActive ? 'Active' : 'Deactivated'}
                        </td>

                        <td>
                          <div className="booking-row-actions">
                            {item.role === 'guide' && item.isActive && (
                              <Button
                                variant="secondary"
                                disabled={busy}
                                onClick={() => choose('deactivate', item)}
                              >
                                Deactivate
                              </Button>
                            )}
                          </div>
                        </td>
                      </>
                    )}

                    {section === 'audit' && (
                      <>
                        <td>
                          {new Date(item.createdAt).toLocaleString()}
                        </td>

                        <td>{item.actor?.name || 'System'}</td>

                        <td>
                          {item.action}
                          <small>{item.targetType}</small>
                        </td>

                        <td>
                          <small>{JSON.stringify(item.details)}</small>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>

            <span>
              Page {page} of {state.data.pagination.pages}
            </span>

            <Button
              variant="secondary"
              disabled={page >= state.data.pagination.pages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}

      <Modal
        open={Boolean(action)}
        onClose={() => {
          if (!busy) setAction(null);
        }}
        title="Confirm admin action"
      >
        <form onSubmit={submit}>
          <p>
            {action?.type === 'approve' && 'Approve this guide application?'}
            {action?.type === 'reject' && 'Reject this guide application?'}
            {action?.type === 'archive' && 'Archive this tour?'}
            {action?.type === 'reassign' && 'Reassign this tour?'}
            {action?.type === 'deactivate' && 'Deactivate this guide?'}
          </p>

          {action?.type === 'reject' && (
            <label>
              Rejection reason

              <textarea
                rows="3"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          )}

          {action?.type === 'reassign' && (
            <label>
              New guide ID

              <select
                value={guideId}
                onChange={(event) => setGuideId(event.target.value)}
              >
                <option value="">Choose a guide</option>

                {state.data?.approved?.map((guide) => (
                  <option key={guide._id} value={guide._id}>
                    {guide.user?.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {action?.type === 'deactivate' && (
            <label>
              Deactivation reason

              <textarea
                rows="3"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          )}

          {action?.type === 'deactivate' &&
            item?.isActive && (
              <p>
                Active bookings must be resolved or reassigned first. This
                revokes sessions and hides the guide’s remaining tours.
              </p>
            )}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="account-actions">
            <Button type="submit" disabled={busy}>
              {busy ? 'Applying…' : 'Confirm action'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => setAction(null)}
            >
              Go back
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');

  return (
    <main className="container page">
      <header className="page-heading">
        <span className="eyebrow">GUZOYE OPERATIONS</span>

        <h1>A clearer view of every journey.</h1>

        <p>
          Monitor the platform, review guides, assign tours, and keep an
          accountable record of admin decisions.
        </p>
      </header>

      <nav className="management-tabs" aria-label="Admin sections">
        {['overview', 'guides', 'tours', 'bookings', 'users', 'audit'].map(
          (value) => (
            <button
              key={value}
              aria-current={tab === value ? 'page' : undefined}
              className={tab === value ? 'active' : ''}
              onClick={() => setTab(value)}
            >
              {value}
            </button>
          )
        )}
      </nav>

      {tab === 'overview' ? (
        <Overview />
      ) : tab === 'bookings' ? (
        <>
          <div className="account-actions">
            <Button to="/admin/tours">
              Manage tours & guide assignments
            </Button>
          </div>

          <BookingsList mode="admin" />
        </>
      ) : (
        <Management key={tab} section={tab} />
      )}
    </main>
  );
}
