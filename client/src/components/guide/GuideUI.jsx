import { Link } from 'react-router-dom';
export function GuideBadge({ tone = 'neutral', children }) {
  return <span className={`guide-badge guide-badge-${tone}`}>{children}</span>;
}
export function GuideStatusBanner({ status, rejectionReason }) {
  if (status === 'approved') return null;
  const rejected = status === 'rejected';
  return <section className={`guide-status-banner ${rejected ? 'danger' : 'warning'}`} role={rejected ? 'alert' : 'status'}>
    <h2>{rejected ? 'Application needs attention' : 'Your application is pending'}</h2>
    <p>{rejected ? (rejectionReason || 'An administrator requested changes before your application can be approved.') : 'Complete your profile and submit it for review. Booking, schedule, feedback and performance tools unlock after approval.'}</p>
  </section>;
}
export function GuideEmpty({ title, message, action }) {
  return <section className="guide-empty"><h3>{title}</h3><p>{message}</p>{action}</section>;
}
export function GuideKpi({ label, value, hint }) {
  return <article className="guide-kpi"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</article>;
}
export function GuidePageHeader({ eyebrow, title, description, action }) {
  return <header className="guide-page-header"><div><p className="guide-eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</header>;
}
export function GuidePublicLink({ guideId, children = 'View my public profile' }) {
  return guideId ? <Link className="guide-secondary-link" to={`/guides/${guideId}`}>{children}</Link> : null;
}
