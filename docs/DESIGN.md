# Wondu design and implementation notes

The supplied reference informs the tour cards, destination photography, guide profiles,
search surface, and booking summary. This implementation uses an editorial public
travel-site layout instead of reproducing a desktop dashboard sidebar.

## Design system
- Cream background `#faf8f2`, deep green `#143f35`, warm gold `#dcb469`, terracotta `#ba694c`.
- Custom CSS variables and reusable button, card, label, section-heading, modal, and state patterns.
- DM Sans for body copy, Manrope for headings, Georgia for editorial italic accents.
- Fonts load from Google Fonts with system fallbacks. Unsplash images are remote,
  illustrative stock photographs, not verified photographs of these destinations or people.
- Photo, guide identity, itinerary, price, rating, and review data are demo content.
  Aggregate rating counts are illustrative and are not calculated from the single sample review per tour.
- Favorite buttons are session-local component state, not persisted account favorites.

## Responsiveness and accessibility
- Mobile-first one-column layouts; grids expand at 600px, 960px, and 1200px.
- Mobile navigation with accessible labels and expanded state.
- Keyboard-visible focus, skip link, labeled forms, native details for itineraries,
  and native dialog focus management / Escape handling.
- Loading skeletons, failed-request retry controls, empty results, missing-route state.
- Reduced-motion preference disables animations and transitions.
- Pending: real browser, screen-reader, contrast, device, and end-to-end QA.

## Data flow
`Pages → api service → mock adapter OR Axios → Express routes → controllers → Mongoose`.
The mock adapter and seed both consume the same root `shared/catalog.json`.
Stable IDs preserve links when moving from mock mode to API mode. The Vite mode is
selected explicitly; API errors are never silently replaced with mock data.
The mock catalog is bundled in this demo client even in API mode; it contains no secrets.

## Phase boundaries
Login/Register are disabled design previews. My Bookings is an honest empty state.
The booking panel validates a preferred date and guest count and computes an estimated
USD total, then opens a non-persistent preview dialog. It does not check availability,
reserve capacity, or take payments. Server models prepare for later work without
exposing unsafe unauthenticated writes.

## Before any real-world launch
Replace and license destination-specific photography, validate itineraries and current
travel conditions, verify guides, implement real availability and capacity transactions,
authentication, roles, account security, verified-booking reviews, cancellation and refund
policies, payment processing, observability, deployment hardening, and full QA.
When deploying the SPA, configure the web host to rewrite client routes to index.html.
The Express API and built SPA are separate deployments in this phase; `npm start`
starts the API only. Configure proxy trust and a shared rate limiter if deployment requires them.
