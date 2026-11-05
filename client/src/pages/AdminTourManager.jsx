import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApi } from '../services/adminApi';
import { useResource } from '../hooks/useResource';
import { EmptyState, PageHeader, Skeleton, StatusBadge } from '../components/admin/AdminUI';
import Button from '../components/Button';
import '../admin.css';
const STEPS = ['Basics', 'Itinerary', 'Photos', 'Departures', 'Guides', 'Review'];
const blankDay = index => ({
  day: index + 1,
  title: '',
  description: ''
});
const blankForm = () => ({
  title: '',
  destination: '',
  summary: '',
  description: '',
  highlights: '',
  difficulty: 'Moderate',
  duration: 3,
  price: 100,
  capacity: 8,
  languages: 'English',
  meetingPoint: '',
  included: '',
  excluded: '',
  itinerary: Array.from({
    length: 3
  }, (_, index) => blankDay(index)),
  images: [],
  departures: [],
  guideIds: []
});
const shortId = id => `#${String(id).slice(-6)}`;
function nextDeparture(tour) {
  const dates = (tour.departures || []).map(item => +new Date(item.date)).filter(value => value > Date.now());
  return dates.length ? new Date(Math.min(...dates)).toLocaleDateString() : 'None';
}
export default function AdminTourManager() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  useEffect(() => {
    setSearch(searchParams.get('q') || '');
    setPage(1);
  }, [searchParams]);
  const [filters, setFilters] = useState({
    status: '',
    destination: '',
    guide: '',
    difficulty: '',
    sort: 'newest'
  });
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(blankForm());
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [destinationDraft, setDestinationDraft] = useState({
    open: false,
    name: '',
    region: '',
    description: '',
    image: ''
  });
  const [single, setSingle] = useState({
    date: '',
    capacity: 8
  });
  const [recurring, setRecurring] = useState({
    startDate: '',
    weekday: '6',
    weeks: 8,
    capacity: 8
  });
  const limit = 8;
  const tours = useResource(() => adminApi.tours(), 'admin-tours-all');
  const destinations = useResource(() => adminApi.destinations(), 'admin-destinations');
  const guides = useResource(() => adminApi.tourGuides(), 'admin-tour-guides');
  useEffect(() => {
    const handler = event => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  const allTours = tours.data?.data || [];
  const filtered = useMemo(() => {
    let rows = [...allTours];
    const term = search.trim().toLowerCase();
    if (term) rows = rows.filter(tour => `${tour.title} ${tour.destination?.name || ''}`.toLowerCase().includes(term));
    if (filters.status) rows = rows.filter(tour => (tour.status || (tour.archived ? 'archived' : 'published')) === filters.status);
    if (filters.destination) rows = rows.filter(tour => String(tour.destination?._id) === filters.destination);
    if (filters.guide) rows = rows.filter(tour => (tour.assignedGuides || []).some(guide => String(guide._id) === filters.guide));
    if (filters.difficulty) rows = rows.filter(tour => tour.difficulty === filters.difficulty);
    if (filters.sort === 'price-asc') rows.sort((a, b) => a.price - b.price);else if (filters.sort === 'price-desc') rows.sort((a, b) => b.price - a.price);else if (filters.sort === 'title') rows.sort((a, b) => a.title.localeCompare(b.title));else rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return rows;
  }, [allTours, search, filters]);
  const pages = Math.max(1, Math.ceil(filtered.length / limit));
  const rows = filtered.slice((page - 1) * limit, page * limit);
  const selectedGuides = (guides.data || []).filter(guide => form.guideIds.includes(guide._id));
  const missing = [];
  if (!form.images.length) missing.push('one image');
  if (!form.guideIds.length) missing.push('one approved guide');
  if (!form.departures.length) missing.push('one future departure');
  const recurringPreview = useMemo(() => {
    if (!recurring.startDate || !recurring.weeks) return [];
    return Array.from({
      length: Math.min(Number(recurring.weeks), 52)
    }, (_, index) => {
      const date = new Date(`${recurring.startDate}T06:00:00.000Z`);
      const target = Number(recurring.weekday);
      const current = date.getUTCDay();
      date.setUTCDate(date.getUTCDate() + (target - current + 7) % 7 + index * 7);
      return date.toISOString();
    });
  }, [recurring]);
  function set(patch) {
    setForm(value => ({
      ...value,
      ...patch
    }));
    setDirty(true);
  }
  function startNew() {
    setMode('form');
    setEditingId(null);
    setStep(0);
    setForm(blankForm());
    setDirty(false);
    setError('');
    setMessage('');
  }
  function editTour(tour) {
    setMode('form');
    setEditingId(tour._id);
    setStep(0);
    setDirty(false);
    setError('');
    setMessage('');
    setForm({
      title: tour.title,
      destination: String(tour.destination?._id || ''),
      summary: '',
      description: tour.description,
      highlights: '',
      difficulty: tour.difficulty,
      duration: tour.duration,
      price: tour.price,
      capacity: tour.capacity,
      languages: 'English',
      meetingPoint: '',
      included: (tour.included || []).join('\n'),
      excluded: (tour.excluded || []).join('\n'),
      itinerary: tour.itinerary?.length ? tour.itinerary : [blankDay(0)],
      images: (tour.images || []).map(url => ({
        url
      })),
      departures: tour.departures || [],
      guideIds: (tour.assignedGuides || []).map(guide => String(guide._id || guide))
    });
  }
  async function createDestination(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await adminApi.createDestination(destinationDraft);
      destinations.retry();
      set({
        destination: result.data._id
      });
      setDestinationDraft({
        open: false,
        name: '',
        region: '',
        description: '',
        image: ''
      });
      setMessage('Destination created.');
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  }
  async function uploadImages(files) {
    const selected = Array.from(files || []).slice(0, 6 - form.images.length);
    if (!selected.length) return;
    setBusy(true);
    setError('');
    try {
      for (const file of selected) {
        const result = await adminApi.uploadTourImageFile(file);
        setForm(value => ({
          ...value,
          images: [...value.images, {
            _id: result.data._id,
            url: result.data.url
          }]
        }));
      }
      setDirty(true);
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  }
  function addDepartures() {
    const created = [];
    if (single.date) created.push({
      date: new Date(`${single.date}T06:00:00.000Z`).toISOString(),
      capacity: Number(single.capacity)
    });
    recurringPreview.forEach(date => created.push({
      date,
      capacity: Number(recurring.capacity)
    }));
    if (!created.length) {
      setError('Choose a single date or a recurring start date.');
      return;
    }
    set({
      departures: [...form.departures, ...created]
    });
    setSingle({
      date: '',
      capacity: form.capacity
    });
    setRecurring(value => ({
      ...value,
      startDate: '',
      weeks: 8,
      capacity: form.capacity
    }));
  }
  function validateStep(index) {
    if (index === 0) return form.title.trim().length > 2 && form.destination && form.description.trim().length > 19;
    if (index === 1) return form.itinerary.every(day => day.title.trim() && day.description.trim());
    if (index === 2) return form.images.length > 0;
    if (index === 3) return form.departures.length > 0;
    if (index === 4) return form.guideIds.length > 0;
    return true;
  }
  async function save(publish) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        title: form.title.trim(),
        destination: form.destination,
        description: form.description.trim(),
        price: Number(form.price),
        duration: Number(form.duration),
        capacity: Number(form.capacity),
        difficulty: form.difficulty,
        images: form.images.map(image => image.url),
        itinerary: form.itinerary.map((day, index) => ({
          day: index + 1,
          title: day.title.trim(),
          description: day.description.trim()
        })),
        included: form.included.split('\n').map(value => value.trim()).filter(Boolean),
        excluded: form.excluded.split('\n').map(value => value.trim()).filter(Boolean)
      };
      let tour;
      if (editingId) tour = await adminApi.updateTour(editingId, payload);else tour = await adminApi.createTour({
        ...payload,
        assignedGuides: form.guideIds,
        departures: form.departures,
        status: 'draft'
      });
      const tourId = tour._id || editingId;
      if (editingId) {
        const previous = allTours.find(item => item._id === editingId);
        const previousGuides = (previous?.assignedGuides || []).map(guide => String(guide._id || guide)).sort();
        const chosenGuides = [...form.guideIds].sort();
        if (JSON.stringify(previousGuides) !== JSON.stringify(chosenGuides)) {
          await adminApi.assignGuides(tourId, form.guideIds);
        }
        for (const departure of previous?.departures || []) {
          if (!form.departures.some(item => item._id === departure._id)) {
            await adminApi.removeDeparture(tourId, departure._id);
          }
        }
        for (const departure of form.departures.filter(item => !item._id)) {
          await adminApi.addDeparture(tourId, {
            date: departure.date,
            capacity: Number(departure.capacity)
          });
        }
      }
      if (publish) await adminApi.setTourStatus(tourId, 'published');
      if (!publish && editingId) await adminApi.setTourStatus(tourId, 'draft');
      setMessage(publish ? 'Tour published.' : 'Draft saved.');
      setDirty(false);
      setMode('list');
      tours.retry();
    } catch (problem) {
      setError(problem.message + ' Some earlier steps may have saved. Reload tours before retrying.');
      tours.retry();
    } finally {
      setBusy(false);
    }
  }
  async function changeStatus(tour, status) {
    setBusy(true);
    setError('');
    try {
      await adminApi.setTourStatus(tour._id, status);
      setMessage(`Tour marked ${status}.`);
      tours.retry();
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  }
  if (mode === 'form') return <div className="admin-page">
    <PageHeader eyebrow="Tours" title={editingId ? 'Edit tour' : 'Create tour'} description="Complete each step, then save a draft or publish the tour." action={<Button variant="secondary" onClick={() => setMode('list')}>Back to tours</Button>} />
    {message && <p className="success-message" role="status">{message}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {(destinations.error || guides.error) && <p className="form-error" role="alert">{destinations.error || guides.error}</p>}
    <section className="admin-panel">
      <ol className="admin-stepper">{STEPS.map((label, index) => <li key={label} className={index === step ? 'active' : index < step ? 'done' : ''}><button type="button" onClick={() => index <= step && setStep(index)}>{index + 1}. {label}</button></li>)}</ol>
      <form onSubmit={event => {
        event.preventDefault();
        save(true);
      }}>
        {step === 0 && <fieldset><legend>Basics</legend>
          <label>Title<input required minLength={3} value={form.title} onChange={event => set({
              title: event.target.value
            })} /></label>
          <label>Destination<select required value={form.destination} onChange={event => set({
              destination: event.target.value
            })}><option value="">Choose a destination</option>{(destinations.data?.data || []).map(destination => <option key={destination._id} value={destination._id}>{destination.name}</option>)}</select></label>
          <button type="button" className="admin-link-button" onClick={() => setDestinationDraft(value => ({
            ...value,
            open: !value.open
          }))}>{destinationDraft.open ? 'Cancel' : 'Create new destination'}</button>
          {destinationDraft.open && <div className="admin-inline-form">
            <label>Name<input required value={destinationDraft.name} onChange={event => setDestinationDraft(value => ({
                ...value,
                name: event.target.value
              }))} /></label>
            <label>Region<input required value={destinationDraft.region} onChange={event => setDestinationDraft(value => ({
                ...value,
                region: event.target.value
              }))} /></label>
            <label>Description<textarea required rows={3} value={destinationDraft.description} onChange={event => setDestinationDraft(value => ({
                ...value,
                description: event.target.value
              }))} /></label>
            <label>Photo URL<input type="url" value={destinationDraft.image} onChange={event => setDestinationDraft(value => ({
                ...value,
                image: event.target.value
              }))} /></label>
            <button type="button" className="admin-link-button" disabled={busy} onClick={createDestination}>Save destination</button>
          </div>}
          <label>Short summary<input required maxLength={180} value={form.summary} onChange={event => set({
              summary: event.target.value
            })} /></label>
          <label>Full description<textarea required rows={5} minLength={20} value={form.description} onChange={event => set({
              description: event.target.value
            })} /></label>
          <label>Highlights (one per line)<textarea rows={3} value={form.highlights} onChange={event => set({
              highlights: event.target.value
            })} /></label>
          <div className="admin-field-row">
            <label>Difficulty<select value={form.difficulty} onChange={event => set({
                difficulty: event.target.value
              })}>{['Easy', 'Moderate', 'Challenging'].map(value => <option key={value}>{value}</option>)}</select></label>
            <label>Duration<input required type="number" min="1" max="365" value={form.duration} onChange={event => set({
                duration: event.target.value
              })} /></label>
            <label>Price<input required type="number" min="1" value={form.price} onChange={event => set({
                price: event.target.value
              })} /></label>
            <label>Group size<input required type="number" min="1" value={form.capacity} onChange={event => set({
                capacity: event.target.value
              })} /></label>
          </div>
          <label>Languages<input value={form.languages} onChange={event => set({
              languages: event.target.value
            })} /></label>
          <label>Meeting point<input value={form.meetingPoint} onChange={event => set({
              meetingPoint: event.target.value
            })} /></label>
          <label>Included (one per line)<textarea rows={3} value={form.included} onChange={event => set({
              included: event.target.value
            })} /></label>
          <label>Excluded (one per line)<textarea rows={3} value={form.excluded} onChange={event => set({
              excluded: event.target.value
            })} /></label>
        </fieldset>}
        {step === 1 && <fieldset><legend>Itinerary</legend>
          {form.itinerary.map((day, index) => <div key={index} className="admin-itinerary-day"><strong>Day {index + 1}</strong>
            <label>Title<input required value={day.title} onChange={event => set({
                itinerary: form.itinerary.map((item, i) => i === index ? {
                  ...item,
                  title: event.target.value
                } : item)
              })} /></label>
            <label>Description<textarea required rows={3} value={day.description} onChange={event => set({
                itinerary: form.itinerary.map((item, i) => i === index ? {
                  ...item,
                  description: event.target.value
                } : item)
              })} /></label>
            <div className="admin-row-actions"><button type="button" disabled={!index} onClick={() => {
                const next = [...form.itinerary];
                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                set({
                  itinerary: next
                });
              }}>Up</button><button type="button" disabled={index === form.itinerary.length - 1} onClick={() => {
                const next = [...form.itinerary];
                [next[index + 1], next[index]] = [next[index], next[index + 1]];
                set({
                  itinerary: next
                });
              }}>Down</button><button type="button" disabled={form.itinerary.length === 1} onClick={() => set({
                itinerary: form.itinerary.filter((_, i) => i !== index)
              })}>Remove</button></div>
          </div>)}
          <button type="button" className="admin-link-button" onClick={() => set({
            itinerary: [...form.itinerary, blankDay(form.itinerary.length)]
          })}>Add day</button>
        </fieldset>}
        {step === 2 && <fieldset><legend>Photos</legend>
          <p>Upload up to 6 images from your device. The first image is the cover.</p>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || form.images.length >= 6} onChange={event => uploadImages(event.target.files)} />
          <ul className="admin-photo-list">{form.images.map((image, index) => <li key={image._id || image.url}><img src={image.url} alt={`Tour image ${index + 1}`} /><span>{index === 0 ? 'Cover' : `Image ${index + 1}`}</span><div><button type="button" disabled={!index} onClick={() => {
                  const next = [...form.images];
                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  set({
                    images: next
                  });
                }}>←</button><button type="button" disabled={index === form.images.length - 1} onClick={() => {
                  const next = [...form.images];
                  [next[index + 1], next[index]] = [next[index], next[index + 1]];
                  set({
                    images: next
                  });
                }}>→</button><button type="button" onClick={() => set({
                  images: form.images.filter((_, i) => i !== index)
                })}>Remove</button></div></li>)}</ul>
        </fieldset>}
        {step === 3 && <fieldset><legend>Departures</legend>
          <div className="admin-field-row"><label>Single date<input type="date" value={single.date} onChange={event => setSingle(value => ({
                ...value,
                date: event.target.value
              }))} /></label><label>Capacity<input type="number" min="1" value={single.capacity} onChange={event => setSingle(value => ({
                ...value,
                capacity: event.target.value
              }))} /></label></div>
          <div className="admin-field-row"><label>Weekly start date<input type="date" value={recurring.startDate} onChange={event => setRecurring(value => ({
                ...value,
                startDate: event.target.value
              }))} /></label><label>Weekday<select value={recurring.weekday} onChange={event => setRecurring(value => ({
                ...value,
                weekday: event.target.value
              }))}>{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label><label>Weeks<input type="number" min="1" max="52" value={recurring.weeks} onChange={event => setRecurring(value => ({
                ...value,
                weeks: event.target.value
              }))} /></label><label>Capacity<input type="number" min="1" value={recurring.capacity} onChange={event => setRecurring(value => ({
                ...value,
                capacity: event.target.value
              }))} /></label></div>
          {recurringPreview.length > 0 && <p>Preview: {recurringPreview.map(date => new Date(date).toLocaleDateString()).join(', ')}</p>}
          <button type="button" className="admin-link-button" onClick={addDepartures}>Add departures</button>
          <ul className="admin-departure-preview">{form.departures.map((departure, index) => <li key={index}>{new Date(departure.date).toLocaleString()} · {departure.capacity} guests <button type="button" onClick={() => set({
                departures: form.departures.filter((_, i) => i !== index)
              })}>Remove</button></li>)}</ul>
          <small>Departures with bookings cannot be removed after the tour is saved.</small>
        </fieldset>}
        {step === 4 && <fieldset><legend>Guides</legend>
          {guides.loading ? <Skeleton height={180} /> : (guides.data || []).length === 0 ? <EmptyState title="No approved guides" message="Approve a guide before assigning this tour." /> : <ul className="admin-guide-picker">{guides.data.map(guide => <li key={guide._id}><label><input type="checkbox" checked={form.guideIds.includes(guide._id)} onChange={event => set({
                  guideIds: event.target.checked ? [...form.guideIds, guide._id] : form.guideIds.filter(id => id !== guide._id)
                })} /><img src={guide.image} alt="" width={44} height={44} /><span><strong>{guide.user?.name}</strong><br />{guide.languages?.join(', ') || 'Languages not set'} · rating {guide.rating || 'None'} · workload {guide.currentWorkload}<br />{(guide.coveredDestinations || []).some(destination => String(destination._id) === form.destination) ? 'Covers this destination' : 'Destination coverage not confirmed'}</span></label></li>)}</ul>}
          <small>Assigning guides creates one booking group per guide on each future departure. A guide with active bookings cannot be removed until those bookings are reassigned.</small>
        </fieldset>}
        {step === 5 && <fieldset><legend>Review and publish</legend>
          <dl className="admin-review"><dt>Title</dt><dd>{form.title || 'Not set'}</dd><dt>Destination</dt><dd>{(destinations.data?.data || []).find(destination => destination._id === form.destination)?.name || 'Not selected'}</dd><dt>Images</dt><dd>{form.images.length}</dd><dt>Itinerary days</dt><dd>{form.itinerary.length}</dd><dt>Departures</dt><dd>{form.departures.length}</dd><dt>Guides</dt><dd>{selectedGuides.map(guide => guide.user?.name).join(', ') || 'None'}</dd></dl>
          {missing.length > 0 && <p className="form-error">Publishing still needs: {missing.join(', ')}.</p>}
          <div className="admin-step-actions"><Button type="button" variant="secondary" disabled={busy} onClick={() => save(false)}>Save draft</Button><Button type="submit" disabled={busy || missing.length > 0}>{busy ? 'Saving…' : 'Publish tour'}</Button></div>
        </fieldset>}
        <div className="admin-step-actions"><Button type="button" variant="secondary" disabled={!step || busy} onClick={() => setStep(value => value - 1)}>Back</Button>{step < STEPS.length - 1 && <Button type="button" disabled={!validateStep(step) || busy} onClick={() => setStep(value => value + 1)}>Continue</Button>}</div>
      </form>
    </section>
  </div>;
  return <div className="admin-page">
    <PageHeader eyebrow="Catalog" title="Tours" description="Search, filter, publish, and manage Guzoye tours." action={<Button onClick={startNew}>New tour</Button>} />
    {message && <p className="success-message" role="status">{message}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="admin-panel">
      <div className="admin-filter-row">
        <input type="search" placeholder="Search title or destination" value={search} onChange={event => {
          setSearch(event.target.value);
          setPage(1);
        }} aria-label="Search tours" />
        <select value={filters.status} onChange={event => setFilters(value => ({
          ...value,
          status: event.target.value
        }))} aria-label="Filter by status"><option value="">All statuses</option>{['draft', 'published', 'archived'].map(value => <option key={value}>{value}</option>)}</select>
        <select value={filters.destination} onChange={event => setFilters(value => ({
          ...value,
          destination: event.target.value
        }))} aria-label="Filter by destination"><option value="">All destinations</option>{(destinations.data?.data || []).map(destination => <option key={destination._id} value={destination._id}>{destination.name}</option>)}</select>
        <select value={filters.guide} onChange={event => setFilters(value => ({
          ...value,
          guide: event.target.value
        }))} aria-label="Filter by guide"><option value="">All guides</option>{(guides.data || []).map(guide => <option key={guide._id} value={guide._id}>{guide.user?.name}</option>)}</select>
        <select value={filters.difficulty} onChange={event => setFilters(value => ({
          ...value,
          difficulty: event.target.value
        }))} aria-label="Filter by difficulty"><option value="">All difficulty</option>{['Easy', 'Moderate', 'Challenging'].map(value => <option key={value}>{value}</option>)}</select>
        <select value={filters.sort} onChange={event => setFilters(value => ({
          ...value,
          sort: event.target.value
        }))} aria-label="Sort tours"><option value="newest">Newest</option><option value="title">Title</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select>
      </div>
      {tours.loading ? <Skeleton height={320} /> : tours.error ? <EmptyState title="Could not load tours" message={tours.error} action={<Button onClick={tours.retry}>Retry</Button>} /> : !rows.length ? <EmptyState title="No tours match" message="Adjust the filters or create a new tour." /> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ID</th><th>Tour</th><th>Destination</th><th>Status</th><th>Guides</th><th>Next departure</th><th>Price</th><th>Actions</th></tr></thead><tbody>
        {rows.map(tour => {
              const status = tour.status || (tour.archived ? 'archived' : 'published');
              return <tr key={tour._id}><td>{shortId(tour._id)}</td><td><div className="admin-tour-cell"><img src={tour.images?.[0]} alt="" width={48} height={36} /><span>{tour.title}</span></div></td><td>{tour.destination?.name}</td><td><StatusBadge value={status} /></td><td>{(tour.assignedGuides || []).map(guide => <img key={guide._id} className="admin-guide-avatar" src={guide.image} alt={guide.user?.name || 'Guide'} title={guide.user?.name} />)}</td><td>{nextDeparture(tour)}</td><td>${tour.price}</td><td><div className="admin-row-actions"><Button variant="secondary" onClick={() => editTour(tour)}>Edit</Button><Button variant="secondary" disabled={busy} onClick={() => changeStatus(tour, status === 'published' ? 'draft' : 'published')}>{status === 'published' ? 'Unpublish' : 'Publish'}</Button><Button variant="secondary" disabled={busy} onClick={() => changeStatus(tour, status === 'archived' ? 'draft' : 'archived')}>{status === 'archived' ? 'Restore' : 'Archive'}</Button></div></td></tr>;
            })}
      </tbody></table></div>}
      <div className="admin-pagination"><Button variant="secondary" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</Button><span>Page {page} of {pages}</span><Button variant="secondary" disabled={page >= pages} onClick={() => setPage(value => value + 1)}>Next</Button></div>
    </section>
  </div>;
}
