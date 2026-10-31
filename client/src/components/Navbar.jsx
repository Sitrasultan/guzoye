import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Mountain, Menu, X, ArrowUpRight } from 'lucide-react';
import Button from './Button';
export default function Navbar() {
  const [open,setOpen]=useState(false);
  return <header className="site-header"><div className="container nav-inner"><Link className="brand" to="/" onClick={()=>setOpen(false)}><Mountain size={32}/><span>wondu<span className="brand-dot">.</span></span></Link><button className="icon-btn mobile-toggle" aria-label={open?'Close navigation':'Open navigation'} aria-expanded={open} aria-controls="main-navigation" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button><nav id="main-navigation" className={open?'navigation open':'navigation'} aria-label="Main navigation">{[['/','Discover'],['/tours','Explore tours'],['/guides','Local guides'],['/bookings','My bookings']].map(([to,label])=><NavLink key={to} to={to} end={to==='/'} onClick={()=>setOpen(false)}>{label}</NavLink>)}<div className="nav-auth"><Link to="/login" onClick={()=>setOpen(false)}>Log in</Link><Button to="/register" onClick={()=>setOpen(false)}>Get started <ArrowUpRight size={16}/></Button></div></nav></div></header>;
}
