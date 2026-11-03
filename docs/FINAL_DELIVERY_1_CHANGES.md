# Final Delivery 1 exact file inventory

Built against uploaded guzoye-current.zip. Complete replacement/new files, no snippets.
Scope: items 1–2; items 3–7 and Delivery 2 still incomplete.

## Changed existing files

- `.gitignore`
- `README.md`
- `client/src/components/GuideCard.jsx`
- `client/src/components/Navbar.jsx`
- `client/src/components/TourCard.jsx`
- `client/src/pages/GuideMyProfile.jsx`
- `client/src/pages/GuideProfile.jsx`
- `client/src/pages/GuideTourForm.jsx`
- `client/src/pages/Guides.jsx`
- `client/src/pages/TourDetails.jsx`
- `client/src/services/api.js`
- `docs/API.md`
- `docs/DEPLOYMENT.md`
- `docs/GUIDE_ADMIN_API.md`
- `docs/STATUS.md`
- `server/.env.example`
- `server/package.json`
- `server/src/app.js`
- `server/src/controllers/authController.js`
- `server/src/controllers/catalogController.js`
- `server/src/controllers/guideManagementController.js`
- `server/src/index.js`
- `server/src/middleware/csrf.js`
- `server/src/middleware/managementValidation.js`
- `server/src/models/Guide.js`
- `server/src/seed.js`
- `server/test/management.integration.test.js`

## New files

- `client/src/components/Avatar.jsx`
- `client/src/components/DestinationGuides.jsx`
- `client/src/components/ImageUploader.jsx`
- `client/src/services/media.js`
- `client/src/uploads.css`
- `docs/FINAL_DELIVERY_1.md`
- `docs/FINAL_DELIVERY_1_CHANGES.md`
- `docs/FINAL_DELIVERY_1_VERIFICATION.json`
- `scripts/verify-final-delivery-1.mjs`
- `server/src/controllers/mediaController.js`
- `server/src/middleware/imageUpload.js`
- `server/src/models/Media.js`
- `server/src/routes/mediaRoutes.js`
- `server/src/scripts/cleanupMedia.js`
- `server/src/scripts/migrateCoveredPlaces.js`
- `server/src/services/guideDiscovery.js`
- `server/src/services/guideFilters.js`
- `server/src/services/imageValidation.js`
- `server/src/services/mediaLifecycle.js`
- `server/src/services/mediaStorage.js`
- `server/test/delivery1.integration.test.js`
- `server/test/delivery1.validation.test.js`

## Unchanged safeguards and data

AuthContext/useAuth/ProtectedRoute, cookie session service, auth/role enforcement,
bookings/departures/transactions, admin tools and prior CSS palette are retained.
CSRF is changed ONLY to permit multipart on server-marked image routes; JSON-only
requirements on other writes, Origin/signature/session binding remain. Profile image URL
editing is replaced by dedicated owned upload endpoints. Coverage uses Destination IDs.
Media attaches/cleans up with transaction safeguards. Local images resolve at API origin.
No package manifests except server/package.json are replaced; no lockfiles supplied.
The small existing management integration test adjustment removes now-disallowed generic
photo URL assignment; that behavior has a new negative validation test instead.

## Apply and rollback

Back up code and DB/media storage. Copy this overlay directly over the existing root.
Run npm install at root; commit updated root lockfile. No required reseed. Run the
idempotent migrateCoveredPlaces.js to prefill coverage from existing tours. To roll back,
restore previous code/package lock and keep a backup of new Media references/bytes; do
not delete uploaded assets while a deployed version still references them. Never drop
new Media data as an unreviewed production rollback shortcut.
