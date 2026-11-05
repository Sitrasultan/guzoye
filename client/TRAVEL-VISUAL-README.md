# Guzoye travel visual patch

Reference-inspired navy sidebar, cool cream background, pastel statistic cards,
rounded white panels and image-led dashboard. This is a visual patch, not a new
wishlist/review/profile backend. No dependencies, server files, or manifests changed.

## Apply (Windows Command Prompt)
Extract ZIP into the repository root (the folder containing client and server).
Then run from that root:

    node client/apply-travel-visual.cjs
    npm run build
    npm test
    npm run dev

Installer preserves the current App.jsx and backs it up once as
client/src/App.jsx.before-travel-visual. It updates the existing account overview
when recognizable. Otherwise it adds a traveler-only /account shell and preserves
existing guide/admin routing. On unrecognized App structure it aborts before writing.
Do not copy an old App.jsx from an earlier ZIP over your current one.

## Scope and limitations
Public home, tours, guides, detail/auth/booking pages get shared visual overrides;
existing page structure and backend behavior remain. Existing account shell receives
navy/pastel styling, and its overview is replaced. No admin or guide CSS is changed.
The older attached baseline lacks account wishlist/profile implementations: fallback
routes explicitly say so; this patch does not pretend to implement them. Current
account routes are retained if present. No messages, notifications or traveler-rating
statistics are fabricated. Counts come from existing APIs. Booking statistics reflect
the latest 50 bookings returned; destination/tour totals use API pagination totals.
Images come from your catalog, not the supplied screenshot. This is not a pixel-perfect
copy, nor a claim that every existing dark-mode style is complete. Dark account panels
receive scoped overrides; existing theme provider is preserved.

## Per-file review
- TravelerVisualDashboard.jsx: React Router Link; lucide ArrowRight, CalendarDays,
  Compass, Heart, MapPin, Search, ShieldCheck, Users, Briefcase; useAuth, useResource;
  api.list, bookingsApi.mine, mediaUrl; ErrorState, Skeletons and TourCard. All relative
  imports resolve in attached project. Local dateLabel, results, value, rows, upcoming,
  next, completed, places, image, errors, Icon, index and mapping variables are defined.
  Hooks are unconditional. No duplicate imports or top-level declarations. Individual
  API errors retain other sections; unavailable counts show a dash rather than fake data.
- TravelerVisualLayout.jsx: useEffect/useState; NavLink/Link/Outlet/useLocation;
  Menu/X/Compass/Briefcase/Heart/Settings/LayoutDashboard/Mountain/PanelLeftClose;
  useAuth; local open, collapsed, pathname, user, close and mapping Icon defined.
  Escape listener cleaned up, navigation closes drawer. No API writes added.
- travel-visual.css: selectors scope public styling to body data-travel-visual=public;
  dashboard selectors use tv- prefix; account selectors require account scope. No
  root-level palette replacement, admin selectors or guide selectors. Breakpoints at
  1280/1023/640 px; reduced-motion rule and focusable skip button included.
- apply-travel-visual.cjs: fs/path built-ins only; root/appPath/source/backup/marker/
  account/match/element/end/hasAccount declared. Added App imports resolve to new
  files. Existing useEffect/useLocation/Route/ProtectedRoute/MyBookings/EmptyState/
  Navigate imports are reused from inspected baseline. Generated TravelVisualScope
  uses only useLocation/useEffect/document and route-local variables. Installer tested
  on attached baseline, second-run idempotence, and representative account fixture.
  Your current unuploaded App.jsx cannot be certified; script aborts on unsupported shape.
- TRAVEL-VISUAL-CHECKS.json: machine-readable checks/results; valid JSON.
- TRAVEL-VISUAL-README.md: installation, limitations and manual tests.

## API call verification
api.list('tours', {limit:4}) -> GET /api/tours (catalogRoutes/listTours).
api.list('destinations', {limit:3}) -> GET /api/destinations (catalogRoutes/listDestinations).
bookingsApi.mine({limit:50}) -> GET /api/bookings/mine (bookingRoutes/mine).
Services remain unmodified. Their auth/CSRF/error handling remains intact.
Dashboard links reference existing /tours, /guides and account pages; baseline installer
adds missing account trips route with existing MyBookings. API failures are not hidden.

## Verification actually performed
Read all new source files and modified-App output. Resolved relative imports; checked
named project exports in api.js, bookings.js, useAuth.js, useResource.js, States.jsx,
media.js. No new duplicate top-level bindings found in new components. Parsed existing
package manifests without changing them. node --check on installer passed. Tested
installer on baseline, idempotent rerun and existing-account fixture.
Did not run Vite build, server tests, MongoDB, browser, accessibility automation or
visual contrast tooling. No promise that previous backend/test errors are fixed.

## Manual tests
Traveler: log in, visit /account; verify real booking data, missing-data alerts,
trip link, browse tours, sidebar collapse, drawer/Escape and keyboard skip control.
If existing account settings/wishlist/reviews are installed, ensure they still work.
Public: inspect home, tours, guides, tour detail, guide detail, login, booking screens.
At 360/768/1280 px check panels, search, text overflow, focus and touch targets.
Guide: visit /guide and schedule/profile; verify no navy/pastel overrides appear.
Admin: visit /admin, tours and guide requests; verify original styling/actions remain.
Refresh deep routes and ensure role protections still reject unauthorized users.

## Rollback
Restore App.jsx from App.jsx.before-travel-visual, then delete only the six files in
this ZIP. No database migration, installation or reseeding is needed.
