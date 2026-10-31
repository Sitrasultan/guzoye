# Phase 4 exact file changes

Copy these complete files over the Phase 3 root. No wrapper directory. No deletions.

## Changed existing files

- `client/src/pages/AdminDashboard.jsx` — Retain approval queue and add read-only bookings table.
- `client/src/pages/Dashboard.jsx` — Add incoming requests for approved guides.
- `client/src/pages/MyBookings.jsx` — Show real traveler bookings and cancellation actions.
- `client/src/pages/TourDetails.jsx` — Replace preview-only booking panel with the real BookingPanel component.
- `server/src/app.js` — Mount the new booking router; preserve existing cookie/CORS/auth setup.
- `server/src/models/Booking.js` — Add departure reference, server price, lifecycle status and unique active-booking index.
- `server/src/models/Tour.js` — Add departure subdocuments and availability validation.
- `server/src/routes/dashboardRoutes.js` — Replace obsolete Phase 3 placeholder messages with booking-enabled messages.
- `server/src/seed.js` — Generate future departures and reset fixture booking inventory explicitly.
- `server/test/http.test.js` — Replace the old absent-booking-endpoint assertion with unauthenticated booking rejection.

## New files

- `client/src/bookings.css`
- `client/src/components/BookingPanel.jsx`
- `client/src/components/BookingsList.jsx`
- `client/src/services/bookings.js`
- `docs/PHASE4.md`
- `docs/PHASE4_API.md`
- `docs/PHASE4_CHANGELOG.md`
- `docs/PHASE4_VERIFICATION.json`
- `scripts/verify-phase4.mjs`
- `server/src/controllers/bookingController.js`
- `server/src/middleware/bookingValidation.js`
- `server/src/routes/bookingRoutes.js`
- `server/src/scripts/assignDemoTour.js`
- `server/src/scripts/checkBookingDB.js`
- `server/src/services/bookingService.js`
- `server/test/bookingValidation.test.js`
- `server/test/bookings.integration.test.js`

## Intentionally unchanged

All package.json and .env.example files, AuthContext/useAuth/ProtectedRoute, auth/role/CSRF
middleware, authentication controllers/routes, api.js, App.jsx, main.jsx, styles.css,
auth.css, original shared/catalog.json, catalog controllers, and all other Phase 3
files are kept. The new booking components import bookings.css themselves.

No dependency installation is required when Phase 3 dependencies are already installed.
Required: transaction-capable MongoDB and re-seed of disposable development fixtures.
