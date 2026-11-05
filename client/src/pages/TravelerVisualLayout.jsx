import { useEffect, useState } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, Compass, Briefcase, Heart, Settings, LayoutDashboard, Mountain, PanelLeftClose } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import '../travel-visual.css';
export default function TravelerVisualLayout() {
 const [open,setOpen]=useState(false), [collapsed,setCollapsed]=useState(false);
 const { user }=useAuth(); const { pathname }=useLocation();
 useEffect(()=>{setOpen(false);},[pathname]);
 useEffect(()=>{const close=event=>{if(event.key==='Escape')setOpen(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[]);
 return <div className={`tv-shell ${collapsed?'tv-collapsed':''}`}><button className="tv-skip" onClick={()=>document.getElementById('tv-content')?.focus()}>Skip to content</button>{open&&<button className="tv-backdrop" onClick={()=>setOpen(false)} aria-label="Close menu"/>}<aside className="tv-sidebar" data-open={open}><Link className="tv-brand" to="/"><Mountain size={40}/><strong>Guzoye</strong><small>Travel · Explore · Experience</small></Link><nav aria-label="Traveler navigation">{[[LayoutDashboard,'Overview','/account'],[Briefcase,'My trips','/account/trips'],[Heart,'Wishlist','/account/wishlist'],[Settings,'Profile and settings','/account/profile'],[Compass,'Browse tours','/tours']].map(([Icon,label,to])=><NavLink key={to} end={to==='/account'} to={to}><Icon size={23}/><span>{label}</span></NavLink>)}</nav><section className="tv-sidebar-promo"><h2>Dream it.<br/>Travel it.</h2><Link className="tv-pill" to="/tours">Explore more</Link></section><button onClick={()=>setCollapsed(value=>!value)} aria-label="Toggle compact sidebar"><PanelLeftClose size={20}/></button></aside><div className="tv-main"><header className="tv-topbar"><button className="tv-menu" onClick={()=>setOpen(value=>!value)} aria-label="Toggle navigation" aria-expanded={open}>{open?<X/>:<Menu/>}</button><form action="/tours"><label><Compass size={20}/><input name="search" placeholder="Search destinations, tours…" aria-label="Search tours"/></label></form><Link to="/account/profile">{user?.name || 'My account'}</Link></header><main id="tv-content" tabIndex={-1}><Outlet/></main></div></div>;
}
