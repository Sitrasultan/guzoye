import { useEffect, useState } from 'react';
import { mediaUrl } from '../services/media';
import '../uploads.css';
export default function Avatar({ src, name = 'Wondu guide', size = 48, className = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const initials = name.trim().split(/\s+/).slice(0, 2).map(value => value[0]).join('').toUpperCase();
  return <span className={`avatar ${className}`} style={{ width: size, height: size }} role={(!src || failed) ? 'img' : undefined} aria-label={(!src || failed) ? name : undefined}>{src && !failed ? <img src={mediaUrl(src)} alt={name} onError={() => setFailed(true)} loading="lazy" /> : <span aria-hidden="true">{initials}</span>}</span>;
}
