import { Compass, AlertCircle } from 'lucide-react';
import Button from './Button';
export function Skeletons({count=4}){return <div className="tour-grid" aria-busy="true" aria-label="Loading journeys">{Array.from({length:count},(_,i)=><div className="skeleton-card" key={i}><div className="skeleton skeleton-image"/><div className="skeleton skeleton-line"/><div className="skeleton skeleton-line short"/><div className="skeleton skeleton-line"/></div>)}</div>}
export function ErrorState({message,retry}){return <div className="empty-state" role="alert"><AlertCircle size={32}/><h2>We hit a little detour</h2><p>{message}</p>{retry&&<Button onClick={retry}>Try again</Button>}</div>}
export function EmptyState({title='No journeys found',message='Try another destination or clear a filter.',children}){return <div className="empty-state"><Compass size={38}/><h2>{title}</h2><p>{message}</p>{children}</div>}
