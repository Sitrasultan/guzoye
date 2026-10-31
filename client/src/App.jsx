import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Tours from './pages/Tours';
import TourDetails from './pages/TourDetails';
import Guides from './pages/Guides';
import GuideProfile from './pages/GuideProfile';
import Auth from './pages/Auth';
import MyBookings from './pages/MyBookings';
import { EmptyState } from './components/States';
import Button from './components/Button';
function ScrollReset(){const {pathname}=useLocation();useEffect(()=>{window.scrollTo(0,0)},[pathname]);return null}
export default function App(){return <><a className="skip-link" href="#content">Skip to content</a><Navbar/><ScrollReset/><div id="content" tabIndex={-1}><Routes><Route path="/" element={<Home/>}/><Route path="/tours" element={<Tours/>}/><Route path="/tours/:id" element={<TourDetails/>}/><Route path="/guides" element={<Guides/>}/><Route path="/guides/:id" element={<GuideProfile/>}/><Route path="/login" element={<Auth/>}/><Route path="/register" element={<Auth register/>}/><Route path="/bookings" element={<MyBookings/>}/><Route path="*" element={<main className="container page"><EmptyState title="A little off the beaten path" message="This page doesn’t exist. Let’s find your way back."><Button to="/">Back to discovery</Button></EmptyState></main>}/></Routes></div><Footer/></>}
