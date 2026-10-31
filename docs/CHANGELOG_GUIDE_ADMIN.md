# Exact complete-file overlay inventory

## Replaced existing files

- `README.md`
- `client/src/App.jsx`
- `client/src/pages/AdminDashboard.jsx`
- `client/src/pages/Dashboard.jsx`
- `client/src/pages/GuideProfile.jsx`
- `server/.env.example`
- `server/src/app.js`
- `server/src/controllers/adminController.js`
- `server/src/controllers/authController.js`
- `server/src/controllers/catalogController.js`
- `server/src/middleware/auth.js`
- `server/src/models/Guide.js`
- `server/src/models/Tour.js`
- `server/src/models/User.js`
- `server/src/routes/adminRoutes.js`
- `server/src/seed.js`
- `server/src/services/bookingService.js`

## New files

- `client/src/components/DepartureManager.jsx`
- `client/src/components/OwnTours.jsx`
- `client/src/management.css`
- `client/src/pages/GuideDashboard.jsx`
- `client/src/pages/GuideMyProfile.jsx`
- `client/src/pages/GuideTourForm.jsx`
- `client/src/services/management.js`
- `docs/CHANGELOG_GUIDE_ADMIN.md`
- `docs/DEMO_SCRIPT.md`
- `docs/DEPLOYMENT.md`
- `docs/GUIDE_ADMIN_API.md`
- `docs/SECURITY_GUIDE_ADMIN.md`
- `docs/STATUS.md`
- `docs/VERIFICATION_GUIDE_ADMIN.json`
- `scripts/check-guide-admin-source.mjs`
- `scripts/verify-guide-admin.mjs`
- `server/src/controllers/guideManagementController.js`
- `server/src/middleware/managementValidation.js`
- `server/src/models/AuditLog.js`
- `server/src/routes/guideManagementRoutes.js`
- `server/src/services/management.js`
- `server/test/management.integration.test.js`
- `server/test/managementValidation.test.js`

## Why the existing files change

- User/Guide: activation, rejection reason/regions, and internal mutation counters to
  coordinate deactivation/reassignment; password hook and existing roles retained.
- Tour: archive state and mutation locking; Phase 4 departures/availability retained.
- auth middleware/controller: reject deactivated sessions/login and include application
  rejection reason in own public-user summary. Cookie/CSRF/token contracts unchanged.
- bookingService: refuse archived tours/inactive guides, serialize traveler deactivation,
  and lock tour ownership for guide decisions after reassignment.
- catalog controller: hide archived tours and inactive guides while retaining Phase 4
  filters and pagination. No Part B discovery improvements are silently claimed.
- admin routes/controller: transactional actions/audit plus stats and management endpoints.
- app: mount guide routes and bound 128 KB body limit for itinerary forms.
- seed/environment example: environment-controlled guide logins; exactly one new variable.
- client App: add guide profile/create/edit routes behind existing ProtectedRoute.
- client dashboards/public GuideProfile: distinct workspaces and profile regions.
- README: current scope and complete setup instead of obsolete prior-phase claims.

No package manifests, dependency lists, lockfile, CSRF middleware, session-cookie service,
AuthContext/useAuth/ProtectedRoute, Navbar, booking routes/model, original shared catalog,
existing My Bookings/BookingsList/Tour Details, original styles.css or auth.css are replaced.
Management screens reuse the existing status-filtered booking list and CSRF conventions.
No file deletions are required. All supplied source files are complete, not patch snippets.
