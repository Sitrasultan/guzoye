export function AccountBadge({ tone = 'neutral', children }) { return <span className={`account-badge account-badge-${tone}`}>{children}</span>; }
export function AccountEmpty({ title, message, action }) { return <section className="account-empty"><h3>{title}</h3><p>{message}</p>{action}</section>; }
export function AccountKpi({ label, value, hint }) { return <article className="account-kpi"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</article>; }
export function AccountPageHeader({ eyebrow, title, description, action }) { return <header className="account-page-header"><div><p className="account-eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</header>; }
