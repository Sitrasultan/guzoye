import { Link } from 'react-router-dom';
import { MapPin, ArrowUpRight } from 'lucide-react';
import RatingStars from './RatingStars';
import Avatar from './Avatar';
export default function GuideCard({ guide }) {
  return <article className="guide-card"><div className="guide-photo"><Avatar src={guide.image} name={guide.user.name} size={250} /><span className="image-tag">Local storyteller</span></div><div className="card-body"><div className="card-meta"><span><MapPin size={13} />{guide.location || 'Ethiopia'}</span><RatingStars rating={guide.rating} /></div><h3><Link to={`/guides/${guide._id}`}>{guide.user.name}</Link></h3><p>{guide.specialties.join(' · ')}</p><p className="covers-list">Covers: {guide.coveredPlaces?.length ? guide.coveredPlaces.map(place => place.name).join(' · ') : 'Places not specified yet'}</p><div className="guide-bottom"><small>{guide.languages.join(' / ')}</small><Link className="round-link" to={`/guides/${guide._id}`} aria-label={`Meet ${guide.user.name}`}><ArrowUpRight size={20} /></Link></div></div></article>;
}
