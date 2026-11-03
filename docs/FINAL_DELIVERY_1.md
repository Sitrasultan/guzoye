# Final Delivery 1 — apply this partial upgrade

This is a complete-file OVERLAY for the uploaded guzoye-current.zip. Only changed/new
files are included. ZIP folders client/server/docs/scripts are directly at root, no wrapper.
Keep unchanged files. Scope is items 1–2, not the entire Delivery 1. Read STATUS.md.

## Install and run (Windows PowerShell or terminal)

Back up project and DB. Stop running frontend/backend before copying files.

```sh
node scripts/verify-final-delivery-1.mjs
npm install
node server/src/scripts/migrateCoveredPlaces.js
npm run dev
```

Required new backend dependencies (declared in server/package.json):
- multer ^2.0.2
- sharp ^0.34.5
- cloudinary ^2.7.0 (dynamically used only in Cloudinary mode)

The supplied server manifest was generated as JSON and parsed by Python + Node.
No dependency install was run here; no fabricated or stale lockfile is supplied.
Run npm install at the MONOREPO ROOT to update the existing root package-lock.json,
then commit it. Do not use npm ci until it has been regenerated for these dependencies.
Existing nested workspace lockfiles are not this upgrade's install authority.

Migration is idempotent/non-destructive: add explicit place IDs from actual published
owned tours. It does not translate region strings or delete data. Existing filter matching
already includes owned tours even without this migration; migration improves initial
profile checkbox selections. Existing profiles use initials if no photo is set.

No re-seed is REQUIRED. If you want fresh demo fixtures, the existing optional command is:

```sh
npm run seed
```

Only run with ALLOW_DEMO_SEED=true on a disposable DB, then restore false. It resets the
8 fixture tours/ownership/departures/spots/archive state, bookings for those tours,
6 fixture guides, 7 fixture users, fixture destinations/reviews, configured demo admin
credentials and fixture sessions. New seed also populates coveredDestinations from owned
tours. It retains unrelated registered users, guide-created tours and audit history.
Re-seeding can detach old fixture images: run cleanup after it; never seed a production DB.

## Existing settings

Keep existing replica-set/Atlas MONGODB_URI, JWT_SECRET, COOKIE_SECURE, CLIENT_ORIGIN,
DEMO_ADMIN_* and DEMO_GUIDE_PASSWORD. Auth/CSRF writes remain credentialed.
Use VITE_DATA_SOURCE=api and the correct VITE_API_URL. Local upload image URLs are resolved
against API origin, not frontend origin, so development ports 5173/5000 work separately.
If using a reverse proxy, expose /uploads on the same origin as the API URL as well.

## New OPTIONAL server environment settings

| Variable | Default / requirement |
| --- | --- |
| MEDIA_STORAGE | local by default; set cloudinary to enable cloud storage |
| CLOUDINARY_CLOUD_NAME | only required in cloudinary mode |
| CLOUDINARY_API_KEY | only required in cloudinary mode |
| CLOUDINARY_API_SECRET | only required in cloudinary mode; secret |

Do not put Cloudinary secrets in VITE variables. Local mode needs none of them.
Disk is NOT assumed persistent in hosting containers/free plans. Use Cloudinary or another
durable provider in production unless your host explicitly provides a persistent volume.
This implementation does not migrate previously local assets when switching providers.
Preserve local uploads/back them up until an explicit migration has been performed.

## Cleanup job

Schedule hourly on a worker with DB/storage credentials:

```sh
node server/src/scripts/cleanupMedia.js
```

It retries stored deletion records, expires unattached tour drafts after 24 hours, and
reconciles untracked UUID WebP files older than 24 hours on local disk. It checks DB
references before deletion. Attached/current profile media is not intentionally deleted.
It processes up to 500 tracked rows per run. No TTL index silently deletes ownership
records before storage bytes are cleaned. Keep the app's media DB and uploads together
in backups. Storage deletion can fail; monitor logs/pending records, do not promise
immediate erasure of browser/CDN copies.

## Tests and build

```sh
npm test
npm run build
```

For real DB tests (disposable transaction-capable database only):

```powershell
$env:TEST_MONGODB_URI='mongodb://127.0.0.1:27017/guzoye_media_test?replicaSet=rs0'
npm test
Remove-Item Env:TEST_MONGODB_URI
```

Each suite derives/drops only its unique test DB. New integration tests force local storage,
not your real Cloudinary account. Sharp decoder tests run after packages are installed even
without a DB URI; DB/HTTP integration is explicitly skipped without that URI.

## Manual traveler steps

1. Open Guides and combine a place/language/name/min rating/sort. Copy URL into another
   tab; same filters/results should appear. Change pages and browser back/forward.
2. Open Tour Details; confirm Local guides in <place> and guide link/profile coverage.
3. Log in as traveler and attempt upload routes: expect 403, no stored image.
4. Existing booking flow should still work. Reviews/wishlist persistence remain unbuilt.

## Manual guide steps

1. Login guide1@guzoye.example with your DEMO_GUIDE_PASSWORD. Open My Profile.
2. Upload a JPEG/PNG/WebP from disk/phone, then replace it. Check progress/circular preview,
   public card/profile/tour guide photo/Navbar; reload and verify persistence.
3. Remove photo; initials appear. A pending guide may do this; a rejected guide may not.
4. Drop text renamed .jpg, malformed image, SVG/GIF and >2MB file: clear error, old photo
   remains. Valid image bytes with an unusual extension are judged by content, not filename.
5. Select covered places, Save profile, verify filters. Own published tour places are
   included automatically; unchecking a place does not remove coverage from an owned tour.
6. Create/edit an unbooked tour; upload up to 6 images, move them earlier/later, save.
   First is cover; reload and verify order. Try adding a seventh: blocked.
7. Remove an attached image then save: file is deleted after successful DB update.
   Navigate away with unsaved uploads: find them in the uploader's upload library.
8. Different guide cannot attach/delete your uploads. Active-booking tour edit guards remain.

## Manual admin steps

1. Existing admin stats/approval/reassignment/archive screens should work unchanged.
2. Approve a pending guide, verify tour upload/publishing becomes available.
3. Deactivate a guide (following existing active-work guards); future upload requests denied.
4. Admin cannot call guide upload endpoints as a guide impersonation shortcut.
5. Monitor cleanup failures; run cleanup job on test data and verify only unused images go.

Stop here. Finish Delivery 1 items 3–7 before beginning Delivery 2 UI redesign.
