import { Star } from 'lucide-react';
export default function RatingStars({rating=0,count}){return <span className="rating" aria-label={`${rating} out of 5${count ? `, ${count} sample reviews` : ''}`}><Star size={14} fill="currentColor"/><span>{Number(rating).toFixed(1)}</span>{count!==undefined&&<small>({count})</small>}</span>}
