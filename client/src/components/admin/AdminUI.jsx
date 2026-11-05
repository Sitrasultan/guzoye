import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export function Badge({ tone = 'neutral', children }) {
  return <span className={`admin-badge admin-badge-${tone}`}>{children}</span>;
}
export function StatusBadge({ value }) {
  const tone = { pending: 'warn', declined: 'danger', cancelled: 'danger', rejected: 'danger', archived: 'danger', published: 'success', confirmed: 'success', completed: 'success', approved: 'success', draft: 'neutral' }[value] || 'neutral';
  return <Badge tone={tone}>{value}</Badge>;
}
export function Skeleton({ height = 18, width = '100%' }) {
  return <div className="admin-skeleton" style={{ height, width }} aria-hidden="true" />;
}
export function EmptyState({ title, message, action }) {
  return <div className="admin-empty"><h3>{title}</h3><p>{message}</p>{action}</div>;
}
export function PageHeader({ eyebrow, title, description, action }) {
  return <header className="admin-page-header"><div><p className="admin-eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="admin-page-description">{description}</p>}</div>{action && <div className="admin-page-action">{action}</div>}</header>;
}
export function StatCard({ label, value, change, to, loading, hint, icon, sparkline }) {
  const content = (<>
    <div className="admin-stat-top"><span className="admin-stat-icon" aria-hidden="true">{icon}</span><span className="admin-stat-label">{label}</span></div>
    <strong className="admin-stat-value">{loading ? <Skeleton width="70%" /> : value}</strong>
    {sparkline}
    {hint && <small>{hint}</small>}
    {change !== undefined && !loading && <span className={`admin-change ${change >= 0 ? 'up' : 'down'}`}>{change >= 0 ? '+' : ''}{change}% vs previous period</span>}
  </>);
  return to ? <Link className="admin-stat-card" to={to}>{content}</Link> : <div className="admin-stat-card">{content}</div>;
}
export function Drawer({ open, onClose, title, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    ref.current?.focus();
    const onKey = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="admin-overlay" onClick={onClose}><aside className="admin-drawer" role="dialog" aria-modal="true" aria-label={title} onClick={event => event.stopPropagation()} ref={ref} tabIndex={-1}><header><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Close panel">×</button></header><div>{children}</div></aside></div>;
}
export function Toast({ message, tone = 'success', onDone }) {
  useEffect(() => { if (!message) return; const timer = setTimeout(onDone, 4000); return () => clearTimeout(timer); }, [message, onDone]);
  if (!message) return null;
  return <div className={`admin-toast admin-toast-${tone}`} role="status">{message}</div>;
}
export function DataTable({ columns, rows, loading, empty, renderRow, caption }) {
  if (loading) return <div className="admin-table-skeleton">{[0, 1, 2, 3].map(index => <Skeleton key={index} height={38} />)}</div>;
  if (!rows.length) return empty || <EmptyState title="No records" message="Nothing matches this view yet." />;
  return <div className="admin-table-wrap"><table className="admin-table">{caption && <caption className="admin-visually-hidden">{caption}</caption>}<thead><tr>{columns.map(column => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead><tbody>{rows.map(row => renderRow(row))}</tbody></table></div>;
}
export function ChartCard({ title, description, children, table, loading }) {
  const [showTable, setShowTable] = useState(false);
  return <section className="admin-panel admin-chart-card" aria-labelledby={`chart-${title.replace(/\W+/g, '-')}`}>
    <div className="admin-chart-head"><div><h2 id={`chart-${title.replace(/\W+/g, '-')}`}>{title}</h2><p>{description}</p></div>
      <button type="button" className="admin-link-button" onClick={() => setShowTable(value => !value)} aria-expanded={showTable}>{showTable ? 'View chart' : 'View data'}</button>
    </div>
    {loading ? <div className="admin-chart-loading"><Skeleton height={220} /></div> : showTable ? table : children}
  </section>;
}
export function Sparkline({ values }) {
  if (!values?.length) return null;
  const max = Math.max(...values, 1), points = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${30 - (value / max) * 28}`).join(' ');
  return <svg className="admin-sparkline" viewBox="0 0 100 30" aria-hidden="true"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" /></svg>;
}
