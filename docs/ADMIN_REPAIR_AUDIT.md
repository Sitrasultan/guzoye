# Admin repair: identifiers, imports and routes

Source: latest uploaded wondu-current.zip (563357 bytes). No server files changed.

## Checks actually run
- Babel JSX parsing and lexical binding scan: all client/src .js and .jsx files; no unresolved referenced identifiers after fixing legacy AdminDashboard.
- Relative import target and named/default export resolution: all client files; no missing relative exports.
- Eight mocked service regression checks passed. These are not live API/integration tests.
- JSON parsing: root, client and server package.json passed. No manifests changed; no dependencies added.
- Offline dependency installation failed: recharts absent from cache.
- npm run build attempted in client, failed because vite is not installed. No successful Vite build is claimed.
- No browser, responsive screenshot, live API, MongoDB, auth or CSRF integration test was run.

## Exact causes identified
1. admin-shell grid auto-placement included an unstyled skip link and an unstyled scrim button before the sidebar. The sidebar landed in the content column; the header/content landed in the narrow column.
2. Missing admin-nav-link/footer/collapsed/popover styling made labels spread apart and account text overlap.
3. Destination fetch calls used the Vite origin instead of the configured Axios API base URL; no proxy existed.
4. Tour and destination lists requested limit=100 although pagination enforces max=50.
5. POST destination response envelope was unwrapped twice: callers expected result.data and message.
6. GET admin/guides is registered twice: the first route returns approved guides without pagination, hiding the pending/rejected application list.
7. Editing departures only changed frontend state; updateTour ignores departures. The repair uses existing add/remove endpoints.
8. Legacy AdminDashboard referenced item outside its map scope. It now redirects to the current admin shell.
9. management.js adminTourApi called undefined mutate. It now calls the defined write helper.

## Scope limits / remaining blockers
- Part 1c scope was not provided; no server behavior was modified.
- Pending/rejected guide applications cannot be listed through the shadowed server route. Approved guides load with client pagination; the unsupported views display an explicit explanation instead of false data.
- Reviews remain explicitly unavailable because there is no moderation endpoint. Bookings now uses the existing read-only admin bookings endpoint.
- Tour saves involve several existing endpoints and are NOT an atomic multi-request operation. A partial-save warning is shown on error; reload before retrying.
- Creating a draft currently requires createTour then setTourStatus because the server ignores create status; the initial create can briefly expose a published tour. A safe atomic draft workflow requires an authorized server change.
- Existing server validation/transaction errors are surfaced, not suppressed. No seed or migration is required.

## Files changed
- `client/vite.config.js`
- `client/src/App.jsx`
- `client/src/admin.css`
- `client/src/services/adminApi.js`
- `client/src/services/management.js`
- `client/src/pages/AdminDashboard.jsx`
- `client/src/pages/AdminTourManager.jsx`
- `client/src/pages/admin/AdminLayout.jsx`
- `client/src/pages/admin/AdminDestinations.jsx`
- `client/src/pages/admin/AdminGuides.jsx`

## Files new
- `scripts/test-admin-repair.cjs`
- `docs/ADMIN_REPAIR_AUDIT.md`
- `docs/admin-repair-identifiers.json`

## Files deleted
None.

## Route contracts checked
- `adminApi.overview`: GET /api/admin/overview — adminAnalyticsRoutes.js → overview
- `adminApi.activity`: GET /api/admin/activity — adminAnalyticsRoutes.js → activity
- `adminApi.guideRequests`: GET /api/admin/guide-requests — guideRequestRoutes.js → listRequests
- `adminApi.decideGuideRequest`: PATCH /api/admin/guide-requests/:id/approve|reject — guideRequestRoutes.js → decideRequest
- `adminApi.destinations`: GET /api/destinations — catalogRoutes.js → listDestinations
- `adminApi.createDestination`: POST /api/admin/destinations — adminTourRoutes.js → createDestination
- `adminApi.guides`: GET /api/admin/guides — adminTourRoutes.js → listGuides (approved only; shadows listApplications)
- `adminApi.tourGuides`: GET /api/admin/guides — adminTourRoutes.js → listGuides
- `adminApi.decideGuide`: PATCH /api/admin/guides/:id/approve|reject — adminRoutes.js → approveGuide/rejectGuide
- `adminApi.users`: GET /api/admin/users — adminRoutes.js → users
- `adminApi.deactivateUser`: PATCH /api/admin/users/:id/deactivate — adminRoutes.js → deactivate
- `adminApi.audit`: GET /api/admin/audit — adminRoutes.js → auditLog
- `adminApi.tours`: GET /api/admin/tours — adminTourRoutes.js → listTours
- `adminApi.createTour`: POST /api/admin/tours — adminTourRoutes.js → createTour; PATCH status when requesting draft
- `adminApi.updateTour`: PATCH /api/admin/tours/:id — adminTourRoutes.js → updateTour
- `adminApi.setTourStatus`: PATCH /api/admin/tours/:id/status — adminTourRoutes.js → setTourStatus
- `adminApi.assignGuides`: PATCH /api/admin/tours/:id/assigned-guides — adminTourRoutes.js → assignGuides
- `adminApi.addDeparture`: POST /api/admin/tours/:id/departures — adminTourRoutes.js → addDeparture
- `adminApi.removeDeparture`: DELETE /api/admin/tours/:id/departures/:departureId — adminTourRoutes.js → removeDeparture
- `adminApi.uploadTourImageFile`: POST /api/admin/tour-images — adminTourRoutes.js → uploadTourImage
- `bookingsApi.admin`: GET /api/admin/bookings — bookingRoutes.js → adminBookings.
- All admin service writes: GET /api/auth/csrf before sending X-CSRF-Token. Existing session and role middleware unchanged.

## Per-file identifier / import / call audit
The full binding/reference names and import specifiers are in admin-repair-identifiers.json.

### `client/vite.config.js`
- Config imports defineConfig and react are defined by the existing Vite packages. Proxy uses existing backend port 5000.

### `client/src/App.jsx`
- Defined/imported bindings: `AdminActivity`, `AdminAudit`, `AdminDestinations`, `AdminGuideRequests`, `AdminGuides`, `AdminLayout`, `AdminLoginRedirect`, `AdminOverview`, `AdminPlaceholder`, `AdminTourManager`, `AdminUnavailable`, `AdminUsers`, `App`, `Auth`, `BookingsList`, `Button`, `Dashboard`, `DashboardRedirect`, `EmptyState`, `Footer`, `GuideMyProfile`, `GuideProfile`, `Guides`, `Home`, `MyBookings`, `Navbar`, `Navigate`, `ProtectedRoute`, `PublicShell`, `Route`, `Routes`, `ScrollReset`, `TourDetails`, `Tours`, `children`, `location`, `message`, `pathname`, `title`, `useAuth`, `useEffect`, `useLocation`, `user`
- External/global references and local references checked: `AdminActivity`, `AdminAudit`, `AdminDestinations`, `AdminGuideRequests`, `AdminGuides`, `AdminLayout`, `AdminLoginRedirect`, `AdminOverview`, `AdminPlaceholder`, `AdminTourManager`, `AdminUnavailable`, `AdminUsers`, `Auth`, `BookingsList`, `Button`, `Dashboard`, `DashboardRedirect`, `EmptyState`, `Footer`, `GuideMyProfile`, `GuideProfile`, `Guides`, `Home`, `MyBookings`, `Navbar`, `Navigate`, `ProtectedRoute`, `PublicShell`, `Route`, `Routes`, `ScrollReset`, `TourDetails`, `Tours`, `children`, `location`, `message`, `pathname`, `title`, `useAuth`, `useEffect`, `useLocation`, `user`, `window`
- Imports: react → useEffect; react-router-dom → Navigate, Route, Routes, useLocation; ./components/Navbar → Navbar; ./components/Footer → Footer; ./components/ProtectedRoute → ProtectedRoute; ./pages/Home → Home; ./pages/Tours → Tours; ./pages/TourDetails → TourDetails; ./pages/Guides → Guides; ./pages/GuideProfile → GuideProfile; ./pages/Auth → Auth; ./pages/MyBookings → MyBookings; ./pages/Dashboard → Dashboard, DashboardRedirect; ./pages/AdminTourManager → AdminTourManager; ./pages/GuideMyProfile → GuideMyProfile; ./pages/admin/AdminLayout → AdminLayout; ./pages/admin/AdminOverview → AdminOverview; ./pages/admin/AdminActivity → AdminActivity; ./pages/admin/AdminDestinations → AdminDestinations; ./pages/admin/AdminGuides → AdminGuides; ./pages/admin/AdminGuideRequests → AdminGuideRequests; ./pages/admin/AdminUsers → AdminUsers; ./pages/admin/AdminAudit → AdminAudit; ./pages/admin/AdminUnavailable → AdminUnavailable; ./components/States → EmptyState; ./components/Button → Button; ./components/BookingsList → BookingsList; ./hooks/useAuth → useAuth; ./admin.css → 
- API calls: None directly.
- Unresolved names: none.

### `client/src/admin.css`
- CSS file: shell, navigation, tables, forms, charts, popovers, collapse/mobile and focus selectors checked against current admin markup.

### `client/src/services/adminApi.js`
- Defined/imported bindings: `action`, `adminApi`, `axios`, `baseURL`, `body`, `data`, `departureId`, `error`, `file`, `getAll`, `guideIds`, `http`, `id`, `job`, `limit`, `method`, `mutate`, `page`, `params`, `payload`, `problem`, `queue`, `reason`, `response`, `result`, `rows`, `status`, `token`, `url`
- External/global references and local references checked: `Array`, `Error`, `Event`, `FormData`, `Math`, `Promise`, `action`, `axios`, `baseURL`, `body`, `data`, `departureId`, `error`, `file`, `getAll`, `guideIds`, `http`, `id`, `job`, `limit`, `method`, `mutate`, `page`, `params`, `payload`, `problem`, `queue`, `reason`, `response`, `result`, `rows`, `status`, `token`, `url`, `window`
- Imports: axios → axios
- API calls: None directly.
- Unresolved names: none.

### `client/src/services/management.js`
- Defined/imported bindings: `adminManagement`, `adminTourApi`, `axios`, `body`, `departureId`, `error`, `get`, `guideId`, `guideIds`, `guideManagement`, `http`, `id`, `method`, `params`, `problem`, `reason`, `response`, `token`, `url`, `write`
- External/global references and local references checked: `Error`, `Event`, `Promise`, `axios`, `body`, `departureId`, `error`, `get`, `guideId`, `guideIds`, `http`, `id`, `method`, `params`, `problem`, `reason`, `response`, `token`, `url`, `window`, `write`
- Imports: axios → axios
- API calls: None directly.
- Unresolved names: none.

### `client/src/pages/AdminDashboard.jsx`
- Defined/imported bindings: `AdminDashboard`, `Navigate`
- External/global references and local references checked: `Navigate`
- Imports: react-router-dom → Navigate
- API calls: None directly.
- Unresolved names: none.

### `client/src/pages/AdminTourManager.jsx`
- Defined/imported bindings: `AdminTourManager`, `Button`, `EmptyState`, `Link`, `PageHeader`, `STEPS`, `Skeleton`, `StatusBadge`, `_`, `a`, `addDepartures`, `adminApi`, `allTours`, `b`, `blankDay`, `blankForm`, `busy`, `changeStatus`, `chosenGuides`, `createDestination`, `created`, `current`, `date`, `dates`, `day`, `departure`, `destination`, `destinationDraft`, `destinations`, `dirty`, `editTour`, `editingId`, `error`, `event`, `file`, `files`, `filtered`, `filters`, `form`, `guide`, `guides`, `handler`, `i`, `id`, `image`, `index`, `item`, `label`, `limit`, `message`, `missing`, `mode`, `next`, `nextDeparture`, `page`, `pages`, `patch`, `payload`, `previous`, `previousGuides`, `problem`, `publish`, `recurring`, `recurringPreview`, `result`, `rows`, `save`, `search`, `searchParams`, `selected`, `selectedGuides`, `set`, `setBusy`, `setDestinationDraft`, `setDirty`, `setEditingId`, `setError`, `setFilters`, `setForm`, `setMessage`, `setMode`, `setPage`, `setRecurring`, `setSearch`, `setSingle`, `setStep`, `shortId`, `single`, `startNew`, `status`, `step`, `target`, `term`, `tour`, `tourId`, `tours`, `uploadImages`, `url`, `useEffect`, `useMemo`, `useResource`, `useSearchParams`, `useState`, `validateStep`, `value`
- External/global references and local references checked: `Array`, `Boolean`, `Button`, `Date`, `EmptyState`, `JSON`, `Math`, `Number`, `PageHeader`, `STEPS`, `Skeleton`, `StatusBadge`, `String`, `a`, `addDepartures`, `adminApi`, `allTours`, `b`, `blankDay`, `blankForm`, `busy`, `changeStatus`, `chosenGuides`, `createDestination`, `created`, `current`, `date`, `dates`, `day`, `departure`, `destination`, `destinationDraft`, `destinations`, `dirty`, `editTour`, `editingId`, `error`, `event`, `file`, `files`, `filtered`, `filters`, `form`, `guide`, `guides`, `handler`, `i`, `id`, `image`, `index`, `item`, `label`, `limit`, `message`, `missing`, `mode`, `next`, `nextDeparture`, `page`, `pages`, `patch`, `payload`, `previous`, `previousGuides`, `problem`, `publish`, `recurring`, `recurringPreview`, `result`, `rows`, `save`, `search`, `searchParams`, `selected`, `selectedGuides`, `set`, `setBusy`, `setDestinationDraft`, `setDirty`, `setEditingId`, `setError`, `setFilters`, `setForm`, `setMessage`, `setMode`, `setPage`, `setRecurring`, `setSearch`, `setSingle`, `setStep`, `shortId`, `single`, `startNew`, `status`, `step`, `target`, `term`, `tour`, `tourId`, `tours`, `uploadImages`, `url`, `useEffect`, `useMemo`, `useResource`, `useSearchParams`, `useState`, `validateStep`, `value`, `window`
- Imports: react → useEffect, useMemo, useState; react-router-dom → Link, useSearchParams; ../services/adminApi → adminApi; ../hooks/useResource → useResource; ../components/admin/AdminUI → EmptyState, PageHeader, Skeleton, StatusBadge; ../components/Button → Button; ../admin.css → 
- API calls: adminApi.tours, adminApi.destinations, adminApi.tourGuides, adminApi.createDestination, adminApi.uploadTourImageFile, adminApi.updateTour, adminApi.createTour, adminApi.assignGuides, adminApi.removeDeparture, adminApi.addDeparture, adminApi.setTourStatus
- Unresolved names: none.

### `client/src/pages/admin/AdminLayout.jsx`
- Defined/imported bindings: `AdminLayout`, `BarChart3`, `Bell`, `CalendarClock`, `ClipboardList`, `Compass`, `FileText`, `GROUPS`, `Gauge`, `Icon`, `LogOut`, `MapPin`, `Menu`, `NavLink`, `Outlet`, `PanelLeftClose`, `PanelLeftOpen`, `Star`, `UserCheck`, `Users`, `X`, `active`, `adminApi`, `alerts`, `bellOpen`, `collapsed`, `count`, `event`, `group`, `initials`, `isActive`, `item`, `location`, `logout`, `mobileOpen`, `navigate`, `onKey`, `overview`, `part`, `requests`, `setAlerts`, `setBellOpen`, `setCollapsed`, `setMobileOpen`, `term`, `total`, `useAuth`, `useEffect`, `useLocation`, `useNavigate`, `useState`, `user`, `value`
- External/global references and local references checked: `BarChart3`, `Bell`, `CalendarClock`, `ClipboardList`, `Compass`, `FileText`, `FormData`, `GROUPS`, `Gauge`, `Icon`, `LogOut`, `MapPin`, `Menu`, `NavLink`, `Outlet`, `PanelLeftClose`, `PanelLeftOpen`, `Promise`, `Star`, `String`, `UserCheck`, `Users`, `X`, `active`, `adminApi`, `alerts`, `bellOpen`, `collapsed`, `count`, `document`, `encodeURIComponent`, `event`, `group`, `initials`, `isActive`, `item`, `localStorage`, `location`, `logout`, `mobileOpen`, `navigate`, `onKey`, `overview`, `part`, `requests`, `setAlerts`, `setBellOpen`, `setCollapsed`, `setMobileOpen`, `term`, `total`, `undefined`, `useAuth`, `useEffect`, `useLocation`, `useNavigate`, `useState`, `user`, `value`
- Imports: react → useEffect, useState; react-router-dom → NavLink, Outlet, useLocation, useNavigate; lucide-react → BarChart3, Bell, CalendarClock, ClipboardList, Compass, FileText, Gauge, LogOut, MapPin, Menu, PanelLeftClose, PanelLeftOpen, Star, Users, UserCheck, X; ../../hooks/useAuth → useAuth; ../../services/adminApi → adminApi; ../../admin.css → 
- API calls: adminApi.overview, adminApi.guideRequests
- Unresolved names: none.

### `client/src/pages/admin/AdminDestinations.jsx`
- Defined/imported bindings: `AdminDestinations`, `Button`, `EmptyState`, `PageHeader`, `Skeleton`, `StatusBadge`, `adminApi`, `busy`, `destination`, `destinations`, `error`, `event`, `form`, `message`, `problem`, `result`, `setBusy`, `setError`, `setForm`, `setMessage`, `submit`, `useResource`, `useState`, `value`
- External/global references and local references checked: `Button`, `EmptyState`, `PageHeader`, `Skeleton`, `StatusBadge`, `String`, `adminApi`, `busy`, `destination`, `destinations`, `error`, `event`, `form`, `message`, `problem`, `result`, `setBusy`, `setError`, `setForm`, `setMessage`, `submit`, `useResource`, `useState`, `value`
- Imports: react → useState; ../../services/adminApi → adminApi; ../../hooks/useResource → useResource; ../../components/admin/AdminUI → EmptyState, PageHeader, Skeleton, StatusBadge; ../../components/Button → Button; ../../admin.css → 
- API calls: adminApi.destinations, adminApi.createDestination
- Unresolved names: none.

### `client/src/pages/admin/AdminGuides.jsx`
- Defined/imported bindings: `AdminGuides`, `Button`, `EmptyState`, `PageHeader`, `Skeleton`, `StatusBadge`, `action`, `adminApi`, `decide`, `event`, `guide`, `guides`, `page`, `problem`, `reason`, `rows`, `search`, `setPage`, `setSearch`, `setStatus`, `status`, `useResource`, `useState`, `value`
- External/global references and local references checked: `Button`, `EmptyState`, `PageHeader`, `Skeleton`, `StatusBadge`, `String`, `action`, `adminApi`, `decide`, `event`, `guide`, `guides`, `page`, `problem`, `reason`, `rows`, `search`, `setPage`, `setSearch`, `setStatus`, `status`, `useResource`, `useState`, `value`, `window`
- Imports: react → useState; ../../services/adminApi → adminApi; ../../hooks/useResource → useResource; ../../components/admin/AdminUI → EmptyState, PageHeader, Skeleton, StatusBadge; ../../components/Button → Button; ../../admin.css → 
- API calls: adminApi.guides, adminApi.decideGuide
- Unresolved names: none.

### `client/src/pages/admin/AdminUsers.jsx`
- Defined/imported bindings: `AdminUsers`, `Button`, `EmptyState`, `PageHeader`, `Skeleton`, `StatusBadge`, `adminApi`, `deactivate`, `event`, `page`, `problem`, `reason`, `role`, `search`, `setPage`, `setRole`, `setSearch`, `useResource`, `useState`, `user`, `users`, `value`
- External/global references and local references checked: `Button`, `EmptyState`, `PageHeader`, `Skeleton`, `StatusBadge`, `String`, `adminApi`, `deactivate`, `event`, `page`, `problem`, `reason`, `role`, `search`, `setPage`, `setRole`, `setSearch`, `useResource`, `useState`, `user`, `users`, `value`, `window`
- Imports: react → useState; ../../services/adminApi → adminApi; ../../hooks/useResource → useResource; ../../components/admin/AdminUI → EmptyState, PageHeader, Skeleton, StatusBadge; ../../components/Button → Button; ../../admin.css → 
- API calls: adminApi.users, adminApi.deactivateUser
- Unresolved names: none.

### `client/src/pages/admin/AdminGuideRequests.jsx`
- Defined/imported bindings: `AdminGuideRequests`, `Button`, `EmptyState`, `PageHeader`, `Skeleton`, `StatusBadge`, `action`, `adminApi`, `decide`, `event`, `note`, `page`, `problem`, `request`, `requests`, `setPage`, `setStatus`, `setType`, `status`, `type`, `useResource`, `useState`, `value`
- External/global references and local references checked: `Button`, `EmptyState`, `PageHeader`, `Skeleton`, `StatusBadge`, `String`, `action`, `adminApi`, `decide`, `event`, `note`, `page`, `problem`, `request`, `requests`, `setPage`, `setStatus`, `setType`, `status`, `type`, `useResource`, `useState`, `value`, `window`
- Imports: react → useState; ../../services/adminApi → adminApi; ../../hooks/useResource → useResource; ../../components/admin/AdminUI → EmptyState, PageHeader, Skeleton, StatusBadge; ../../components/Button → Button; ../../admin.css → 
- API calls: adminApi.guideRequests, adminApi.decideGuideRequest
- Unresolved names: none.

### `client/src/pages/admin/AdminOverview.jsx`
- Defined/imported bindings: `AdminOverview`, `Area`, `AreaChart`, `Bar`, `BarChart`, `COLORS`, `CalendarClock`, `CartesianGrid`, `Cell`, `ChartCard`, `ClipboardIcon`, `Compass`, `DataTable`, `EmptyState`, `Legend`, `Link`, `PageHeader`, `Pie`, `PieChart`, `RANGES`, `ResponsiveContainer`, `Skeleton`, `Sparkline`, `Star`, `StatCard`, `StatusBadge`, `Tooltip`, `UserCheck`, `Users`, `Wallet`, `XAxis`, `YAxis`, `active`, `adminApi`, `chartTooltip`, `custom`, `data`, `error`, `event`, `index`, `item`, `label`, `money`, `name`, `params`, `payload`, `point`, `range`, `reload`, `row`, `setCustom`, `setRange`, `setReload`, `setState`, `state`, `statusRows`, `useEffect`, `useState`, `value`
- External/global references and local references checked: `Area`, `AreaChart`, `Bar`, `BarChart`, `COLORS`, `CalendarClock`, `CartesianGrid`, `Cell`, `ChartCard`, `ClipboardIcon`, `Compass`, `DataTable`, `EmptyState`, `Intl`, `Legend`, `Link`, `Object`, `PageHeader`, `Pie`, `PieChart`, `RANGES`, `ResponsiveContainer`, `Skeleton`, `Sparkline`, `Star`, `StatCard`, `StatusBadge`, `Tooltip`, `UserCheck`, `Users`, `Wallet`, `XAxis`, `YAxis`, `active`, `adminApi`, `chartTooltip`, `custom`, `data`, `error`, `event`, `index`, `item`, `label`, `money`, `name`, `params`, `payload`, `point`, `range`, `reload`, `row`, `setCustom`, `setRange`, `setReload`, `setState`, `state`, `statusRows`, `useEffect`, `useState`, `value`, `window`
- Imports: react → useEffect, useState; react-router-dom → Link; recharts → Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis; lucide-react → CalendarClock, Compass, Star, UserCheck, Users, Wallet; ../../services/adminApi → adminApi; ../../components/admin/AdminUI → ChartCard, DataTable, EmptyState, PageHeader, Skeleton, Sparkline, StatCard, StatusBadge; ../../admin.css → 
- API calls: adminApi.overview
- Unresolved names: none.

### `client/src/pages/admin/AdminActivity.jsx`
- Defined/imported bindings: `AdminActivity`, `Area`, `AreaChart`, `CartesianGrid`, `ChartCard`, `DataTable`, `EmptyState`, `Link`, `PageHeader`, `ResponsiveContainer`, `Skeleton`, `Tooltip`, `XAxis`, `YAxis`, `active`, `activity`, `adminApi`, `error`, `index`, `item`, `label`, `overview`, `payload`, `row`, `setState`, `state`, `tooltip`, `useEffect`, `useState`
- External/global references and local references checked: `Area`, `AreaChart`, `CartesianGrid`, `ChartCard`, `DataTable`, `Date`, `EmptyState`, `Link`, `PageHeader`, `Promise`, `ResponsiveContainer`, `Skeleton`, `Tooltip`, `XAxis`, `YAxis`, `active`, `activity`, `adminApi`, `error`, `index`, `item`, `label`, `overview`, `payload`, `row`, `setState`, `state`, `tooltip`, `useEffect`, `useState`
- Imports: react → useEffect, useState; react-router-dom → Link; recharts → Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis; ../../services/adminApi → adminApi; ../../components/admin/AdminUI → ChartCard, DataTable, EmptyState, PageHeader, Skeleton; ../../admin.css → 
- API calls: adminApi.activity, adminApi.overview
- Unresolved names: none.

### `client/src/pages/admin/AdminAudit.jsx`
- Defined/imported bindings: `AdminAudit`, `Button`, `EmptyState`, `PageHeader`, `Skeleton`, `adminApi`, `audit`, `entry`, `page`, `setPage`, `useResource`, `useState`, `value`
- External/global references and local references checked: `Button`, `Date`, `EmptyState`, `PageHeader`, `Skeleton`, `String`, `adminApi`, `audit`, `entry`, `page`, `setPage`, `useResource`, `useState`, `value`
- Imports: react → useState; ../../services/adminApi → adminApi; ../../hooks/useResource → useResource; ../../components/admin/AdminUI → EmptyState, PageHeader, Skeleton; ../../components/Button → Button; ../../admin.css → 
- API calls: adminApi.audit
- Unresolved names: none.

### `client/src/components/admin/AdminUI.jsx`
- Defined/imported bindings: `Badge`, `ChartCard`, `DataTable`, `Drawer`, `EmptyState`, `Link`, `PageHeader`, `Skeleton`, `Sparkline`, `StatCard`, `StatusBadge`, `Toast`, `action`, `caption`, `change`, `children`, `column`, `columns`, `content`, `description`, `empty`, `event`, `eyebrow`, `height`, `hint`, `icon`, `index`, `label`, `loading`, `max`, `message`, `onClose`, `onDone`, `onKey`, `open`, `points`, `previous`, `ref`, `renderRow`, `row`, `rows`, `setShowTable`, `showTable`, `sparkline`, `table`, `timer`, `title`, `to`, `tone`, `useEffect`, `useRef`, `useState`, `value`, `values`, `width`
- External/global references and local references checked: `Badge`, `EmptyState`, `Link`, `Math`, `Skeleton`, `action`, `caption`, `change`, `children`, `clearTimeout`, `column`, `columns`, `content`, `description`, `document`, `empty`, `event`, `eyebrow`, `height`, `hint`, `icon`, `index`, `label`, `loading`, `max`, `message`, `onClose`, `onDone`, `onKey`, `open`, `points`, `previous`, `ref`, `renderRow`, `row`, `rows`, `setShowTable`, `setTimeout`, `showTable`, `sparkline`, `table`, `timer`, `title`, `to`, `tone`, `undefined`, `useEffect`, `useRef`, `useState`, `value`, `values`, `width`
- Imports: react → useEffect, useRef, useState; react-router-dom → Link
- API calls: None directly.
- Unresolved names: none.

### `client/src/components/BookingsList.jsx`
- Defined/imported bindings: `BookingsList`, `Button`, `EmptyState`, `ErrorState`, `Link`, `Modal`, `action`, `booking`, `bookingsApi`, `busy`, `error`, `event`, `formatDeparture`, `formatMoney`, `message`, `mode`, `page`, `perform`, `problem`, `resetFilter`, `response`, `rows`, `setAction`, `setBusy`, `setError`, `setMessage`, `setPage`, `setStatus`, `setVersion`, `state`, `status`, `statuses`, `useResource`, `useState`, `value`, `version`
- External/global references and local references checked: `Boolean`, `Button`, `EmptyState`, `ErrorState`, `Link`, `Modal`, `action`, `booking`, `bookingsApi`, `busy`, `error`, `event`, `formatDeparture`, `formatMoney`, `message`, `mode`, `page`, `perform`, `problem`, `resetFilter`, `response`, `rows`, `setAction`, `setBusy`, `setError`, `setMessage`, `setPage`, `setStatus`, `setVersion`, `state`, `status`, `statuses`, `useResource`, `useState`, `value`, `version`
- Imports: ../bookings.css → ; react → useState; react-router-dom → Link; ../hooks/useResource → useResource; ../services/bookings → bookingsApi, formatDeparture, formatMoney; ./States → ErrorState, EmptyState; ./Button → Button; ./Modal → Modal
- API calls: bookingsApi.[computed], bookingsApi.cancel, bookingsApi.status
- Unresolved names: none.

## Apply and verify
1. Stop Vite; back up your project. Extract this changed-only patch over the latest uploaded source, preserving paths.
2. Run npm install from the project root, then node scripts/test-admin-repair.cjs, then npm run build.
3. Run npm run dev. If the backend port is not 5000 adjust client/vite.config.js and VITE_API_URL accordingly.
4. No reseed, migration, cookie or credential changes are needed.
5. Admin: test overview, collapse, 360/768/1280 layouts, tours list/filters, destinations, approved guides, users, requests, audit, activity, bookings.
6. Test creating a destination with HTTPS image and a description of 20+ characters.
7. Test tour create/edit using a future date, enough capacity per assigned guide, and complete itinerary; add/remove a future departure with no active bookings.
8. Verify rejected requests show server validation and success refreshes the list. Pending GUIDE APPLICATIONS are a separate route-shadowing blocker, not guide assignment requests.
9. Traveler/guide: verify admin routes remain blocked and public tours/login still load.
10. Rollback: restore the changed files from your pre-patch backup; no database rollback is needed.
