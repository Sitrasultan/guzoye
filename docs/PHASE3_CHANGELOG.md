# Phase 3 file changes

Apply these complete files to the existing Phase 2 root. Keep all other files unchanged.

## Replaced files

- `README.md`
- `client/.env.example`
- `client/package.json`
- `client/src/App.jsx`
- `client/src/components/Footer.jsx`
- `client/src/components/Navbar.jsx`
- `client/src/main.jsx`
- `client/src/pages/Auth.jsx`
- `client/src/pages/MyBookings.jsx`
- `client/src/services/api.js`
- `docs/API.md`
- `docs/DESIGN.md`
- `package.json`
- `server/.env.example`
- `server/package.json`
- `server/src/app.js`
- `server/src/config/env.js`
- `server/src/controllers/catalogController.js`
- `server/src/index.js`
- `server/src/middleware/errors.js`
- `server/src/models/Guide.js`
- `server/src/models/User.js`
- `server/src/seed.js`
- `server/test/catalog.integration.test.js`
- `server/test/http.test.js`

## New files

- `client/src/auth.css`
- `client/src/components/ProtectedRoute.jsx`
- `client/src/context/AuthContext.jsx`
- `client/src/hooks/useAuth.js`
- `client/src/pages/AdminDashboard.jsx`
- `client/src/pages/Dashboard.jsx`
- `scripts/validate-manifests.mjs`
- `server/src/controllers/adminController.js`
- `server/src/controllers/authController.js`
- `server/src/middleware/auth.js`
- `server/src/middleware/authValidation.js`
- `server/src/middleware/csrf.js`
- `server/src/routes/adminRoutes.js`
- `server/src/routes/authRoutes.js`
- `server/src/routes/dashboardRoutes.js`
- `server/src/services/session.js`
- `server/test/auth.integration.test.js`
- `server/test/authValidation.test.js`
- `docs/PHASE3_CHANGELOG.md`

- `docs/PHASE3_VERIFICATION.json`

No files need to be deleted. client/src/styles.css and shared/catalog.json are unchanged.
