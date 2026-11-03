import { useEffect, useId, useRef, useState } from 'react';
import { mediaApi, mediaUrl } from '../services/media';
import Avatar from './Avatar';
import Button from './Button';
import '../uploads.css';
export default function ImageUploader({ kind = 'tour', value = [], onChange, name = 'Profile', disabled = false, onBusyChange, onPhotoChanged }) {
  const busyRef = useRef(false);
  const input = useRef(null), id = useId();
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState(0), [error, setError] = useState(''), [dragging, setDragging] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [libraryError, setLibraryError] = useState('');
  function loadLibrary() { if (kind === 'tour') mediaApi.library().then(result => { setDrafts(result.data); setLibraryError(''); }).catch(problem => setLibraryError(problem.message)); }
  useEffect(() => { loadLibrary(); }, [kind]);
  const max = kind === 'avatar' ? 1 : 6;
  function working(flag) { busyRef.current = flag; setBusy(flag); onBusyChange?.(flag); }
  async function receive(files) {
    if (disabled || busyRef.current) return;
    const selected = Array.from(files || []);
    if (!selected.length) return;
    const remaining = kind === 'avatar' ? 1 : Math.max(0, max - value.length);
    if (selected.length > remaining) { setError(`Choose at most ${remaining} more image${remaining === 1 ? '' : 's'}.`); return; }
    if (selected.some(file => file.size > 2 * 1024 * 1024)) { setError('Each image must be 2 MB or smaller.'); return; }
    working(true); setError(''); let next = [...value];
    try {
      for (const file of selected) {
        setProgress(0);
        const result = await mediaApi.upload(file, kind, setProgress);
        next = kind === 'avatar' ? [result.data] : [...next, result.data];
        onChange(next);
      }
      await onPhotoChanged?.();
    } catch (problem) { setError(problem.message); }
    finally { working(false); loadLibrary(); if (input.current) input.current.value = ''; }
  }
  async function remove(index) {
    if (disabled || busyRef.current) return;
    working(true); setError('');
    try {
      if (kind === 'avatar') { await mediaApi.removePhoto(); onChange([]); await onPhotoChanged?.(); }
      else {
        const item = value[index];
        // Attached/legacy assets are removed only after a successful tour save.
        if (item._id && !item.attached) await mediaApi.removeDraft(item._id);
        onChange(value.filter((_, i) => i !== index));
      }
    } catch (problem) { setError(problem.message); } finally { working(false); loadLibrary(); }
  }
  function move(index, offset) { const next = [...value]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; onChange(next); }
  return <section className="image-uploader" aria-label={kind === 'avatar' ? 'Profile photo upload' : 'Tour image upload'}>
    <label htmlFor={id}>{kind === 'avatar' ? 'Profile photo' : 'Tour images — first image is the cover'}</label>
    {kind === 'avatar' ? <Avatar src={value[0]?.url} name={name} size={140} /> : <ol className="upload-gallery">{value.map((item, index) => <li key={item._id || item.url}><img src={mediaUrl(item.url)} alt={`Tour image ${index + 1}${index === 0 ? ', cover' : ''}`} /><div className="upload-image-actions"><span>{index === 0 ? 'Cover' : `Image ${index + 1}`}</span><button type="button" disabled={disabled || busy || index === 0} onClick={() => move(index, -1)} aria-label={`Move image ${index + 1} earlier`}>←</button><button type="button" disabled={disabled || busy || index === value.length - 1} onClick={() => move(index, 1)} aria-label={`Move image ${index + 1} later`}>→</button><button type="button" disabled={disabled || busy} onClick={() => remove(index)}>Remove</button></div></li>)}</ol>}
    <div className={`upload-dropzone ${dragging ? 'dragging' : ''}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); receive(event.dataTransfer.files); }}>
      <input ref={input} id={id} type="file" accept="image/jpeg,image/png,image/webp" multiple={kind === 'tour'} disabled={disabled || busy || (kind === 'tour' && value.length >= max)} onChange={event => receive(event.target.files)} />
      <p>Choose from your device or drop images here.<br />JPEG, PNG or WebP · 2 MB each{kind === 'tour' ? ' · maximum 6' : ' · centered square crop'}.</p>
    </div>
    {kind === 'avatar' && value.length > 0 && <Button type="button" variant="secondary" disabled={disabled || busy} onClick={() => remove(0)}>Remove photo</Button>}
    {busy && <div role="status"><progress max="100" value={progress} aria-label="Upload progress" /><p>{progress < 100 ? `Uploading ${progress}%` : 'Processing and saving image…'}</p></div>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {kind === 'tour' && drafts.filter(item => !value.some(selected => selected.url === item.url)).length > 0 && <details><summary>Reuse an unsaved upload</summary><ul>{drafts.filter(item => !value.some(selected => selected.url === item.url)).map(item => <li key={item._id}><img src={mediaUrl(item.url)} alt="Unsaved tour upload" style={{ width: 90, height: 65 }} /><Button type="button" variant="secondary" disabled={busy || disabled || value.length >= max} onClick={() => onChange([...value, item])}>Use image</Button><Button type="button" variant="secondary" disabled={busy || disabled} onClick={async () => { working(true); try { await mediaApi.removeDraft(item._id); loadLibrary(); } catch (problem) { setError(problem.message); } finally { working(false); } }}>Delete unused image</Button></li>)}</ul></details>}
    {libraryError && kind === 'tour' && <p role="alert">{libraryError} <button type="button" onClick={loadLibrary}>Retry upload library</button></p>}
    {kind === 'tour' && <small>Removal and reordering of saved tour images take effect when you save the tour. Unsaved uploads remain in your upload library for up to 24 hours.</small>}
  </section>;
}
