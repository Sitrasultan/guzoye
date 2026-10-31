# Wondu — Ethiopia, with a local

Wondu is a MERN tour and local-guide booking platform. This complete-file upgrade builds
Parts A and C of the requested final phase on working Phases 1–4. Read docs/STATUS.md:
verified reviews/wishlist/discovery upgrades and some final polish remain unfinished.
Do not describe this as a fully completed final release.

## Features by role

- Guests: discover published tours and approved active guides; view future departures.
- Travelers: httpOnly-cookie login, CSRF-protected booking requests, server pricing,
  capacity-safe transactions, cancellation and booking history.
- Guides: pending/approved/rejected application status, editable public profile with live
  preview, own-tour publishing, itinerary/images/pricing, departure management, owned-tour
  booking decisions, guide-specific dashboard and counts. Rejected/pending guides can edit
  their profile, but cannot publish or manage tours.
- Admins: stats, readable bar charts, guide approval/rejection reasons, tour reassignment
  and archive, booking filters, user search/deactivation, and audit history.

## Stack and architecture

React + Vite, React Router, Axios, Lucide and custom CSS variables. Express + Node.js,
MongoDB/Mongoose, bcrypt, jsonwebtoken, cookie-parser, CORS, helmet and rate limits.
MongoDB replica set or Atlas REQUIRED for transaction-backed inventory/admin actions.

UI → credentialed Axios → existing CSRF handshake → Express auth/current DB role →
controller validation → Mongoose/transactions. Tour.guide is always the server-assigned
owner. Conditional seat increments, unique active booking index and transaction rollback
prevent overbooking/double release. Tour locking serializes active-booking edits and
reassignment with guide booking actions. Admin action and audit insert commit together.

New booking creation also locks the traveler account to serialize it with deactivation.
Guide deactivation archives remaining owned tours; active bookings must first be resolved
or reassigned. No admin account can be deactivated via the dashboard.

## Apply the upgrade

The ZIP is an OVERLAY for the existing Phase 4 repository, not a standalone application.
Its client/, server/, docs/ and scripts/ folders are directly at the root, without a wrapper.
README.md replaces the old root README. Keep all unlisted files unchanged. Commit/back up
both code and development DB first. Exact changes are in docs/CHANGELOG_GUIDE_ADMIN.md.

No npm package or dependency changes. No package.json files are supplied. The helper
parses all three of your existing manifests as actual JSON before installation.

## Windows setup (PowerShell)

Use Node.js 22.12+ and your existing Phase 4 project with a working replica set or Atlas.
Do not run two MongoDB processes on the same port. Existing .env files should be MERGED,
not blindly replaced by examples.

```powershell
node scripts/verify-guide-admin.mjs
npm install
```

npm install is only needed if dependencies are missing; this upgrade adds none. Keep
and commit the valid existing package-lock.json after installation. Use npm ci thereafter.

Add just this new variable to server/.env, choosing your own strong password:

```dotenv
DEMO_GUIDE_PASSWORD=choose-your-own-strong-demo-guide-password
```

Keep existing JWT_SECRET, DEMO_ADMIN_PASSWORD and connection settings. For a local
replica set the existing URI can be:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/wondu?replicaSet=rs0
```

Stop frontend/API. Set ALLOW_DEMO_SEED=true in server/.env, then:

```powershell
npm run seed
node server/src/scripts/checkBookingDB.js
```

Set ALLOW_DEMO_SEED=false, ensure client/.env uses VITE_DATA_SOURCE=api, then:

```powershell
npm run dev
```

Open http://localhost:5173. API http://localhost:5000/api. Use localhost consistently.
No more manual assignDemoTour script is needed for newly registered guides: they can
create their own tours after approval. The old development helper can remain unused.

## Environment variables

Only DEMO_GUIDE_PASSWORD is new. Existing configuration is retained:

| Variable | Location | Purpose |
| --- | --- | --- |
| PORT | server | API port, local 5000; hosting provider supplies production value |
| NODE_ENV | server | development/test/production |
| MONGODB_URI | server | Replica-set/Atlas URI; keep credentials secret |
| CLIENT_ORIGIN | server | Exact frontend origin, no trailing slash; local http://localhost:5173 |
| JWT_SECRET | server | Random 32+ characters; never a placeholder |
| JWT_EXPIRES_SECONDS | server | Session duration, default 3600; allowed 60–86400 |
| COOKIE_SECURE | server | false only for localhost HTTP; true in HTTPS production |
| ALLOW_DEMO_SEED | server | Explicit opt-in; false except while seeding a disposable development DB |
| DEMO_ADMIN_NAME | server seed | Admin display name |
| DEMO_ADMIN_EMAIL | server seed | Seed-only demo admin identity |
| DEMO_ADMIN_PASSWORD | server seed | Strong admin password; never hardcoded |
| DEMO_GUIDE_PASSWORD | server seed | NEW; shared demo guide password for six seed accounts |
| TEST_MONGODB_URI | test shell | Existing optional test URI with wondu and test in DB name |
| CATALOG_TEST_MONGODB_URI | test shell | Existing optional read-only seeded discovery test DB |
| VITE_API_URL | client build | Public API URL, local http://localhost:5000/api |
| VITE_DATA_SOURCE | client build | api for real profiles/tours/bookings; mock is demonstration only |

No secret belongs in a VITE-prefixed variable. .env remains excluded by existing .gitignore.

## Demo accounts

- guide1@wondu.example through guide6@wondu.example: password is YOUR DEMO_GUIDE_PASSWORD.
  Each linked User has role guide, an approved Guide, and their existing seeded tours.
- Admin: YOUR DEMO_ADMIN_EMAIL + DEMO_ADMIN_PASSWORD.
- Traveler: register your own traveler account. The legacy sample reviewer has a random
  password, not a published demo login.

The environment example contains placeholders only. Never deploy shared demo passwords
or publish the real .env. Public registration can never request admin role.

## Exactly what seed resets

On a disposable development DB, seed replaces eight fixture tours (including departure
IDs, ownership, archived status, spots and pricing), six fixture guides, seven fixture
users, fixture destinations/reviews and configured admin credentials. All bookings for
the eight fixture tours are deleted. Guide fixtures become approved, active and loggable
in using DEMO_GUIDE_PASSWORD. Prior fixture sessions and admin sessions are revoked.

Unrelated registered users, their guide applications, guide-created tours/bookings and
existing audit history are retained. Existing manual ownership assignments on fixture
tours are reset. Dates are regenerated relative to the seed day. The seed is NOT a
transactional production migration; failure can leave partial fixtures. Never point it
at a real user database. Runtime production mode refuses demo seeding.

## API summary

Existing Phase 3 auth and Phase 4 bookings remain. New/extended endpoints:

| Method | Endpoint | Access |
| --- | --- | --- |
| GET/PATCH | /api/guide/profile | guide, including pending/rejected |
| GET | /api/guide/summary | approved guide |
| GET/POST | /api/guide/tours | approved guide; own/create |
| GET/PATCH | /api/guide/tours/:id | approved guide; owner |
| PATCH | /api/guide/tours/:id/archive | approved guide; owner |
| POST | /api/guide/tours/:id/departures | approved guide; owner |
| DELETE | /api/guide/tours/:id/departures/:departureId | approved guide; owner |
| GET | /api/admin/stats | admin |
| GET | /api/admin/guides?status=pending/approved/rejected | admin |
| PATCH | /api/admin/guides/:id/approve or /reject | admin; reject reason required |
| GET | /api/admin/tours | admin |
| PATCH | /api/admin/tours/:id/guide | admin; approved active guideId |
| PATCH | /api/admin/tours/:id/archive | admin |
| GET | /api/admin/users | admin; search/role/page/limit |
| PATCH | /api/admin/users/:id/deactivate | admin; reason required |
| GET | /api/admin/audit | admin |

All new writes use existing auth/roles/CSRF plus write rate limits. Lists are paginated.
See docs/GUIDE_ADMIN_API.md for payloads, validation and business rules.

## Testing

```powershell
node scripts/verify-guide-admin.mjs
npm test
npm run build
```

Run DB integration tests against a dedicated transaction-capable test URI:

```powershell
$env:TEST_MONGODB_URI='mongodb://127.0.0.1:27017/wondu_management_test?replicaSet=rs0'
npm test
Remove-Item Env:TEST_MONGODB_URI
```

Each suite creates and drops only its uniquely generated test DB. Base DB name must
contain wondu and test. Without a URI, integration suites are skipped, not passed.
Existing suites remain. A/C tests cover own/foreign tour edit, pending publish denial,
active departure deletion guard, admin reassignment, archive, stats, reject reason,
deactivation and traveler role denial. Review/wishlist tests are not written because
those features remain missing.

Delivery: six pure new validation tests executed successfully; .js/.mjs syntax checked.
Dependency installation, Vite/JSX build, Supertest, DB integration, browser/device and
screen-reader checks were NOT executed in the delivery environment. Run them locally.

## What I would improve next

- Finish completed-booking reviews/ratings, persistent wishlist, soonest departure sort
  and available-spots filter (Part B is not implemented by this delivery).
- Finish route metadata and executed responsive/accessibility/E2E QA.
- Real payments/refunds, notifications, pending booking expiry and cancellation policy.
- Image uploads to controlled storage rather than external URLs; content moderation.
- Email verification, password reset, MFA, secure production admin provisioning.
- User reactivation and formal guide rejection/resubmission workflow.
- Shared rate-limit store/proxy configuration for multiple API instances.
- Immutable external audit retention, metrics, backups, dependency scanning and recovery drills.

See docs/DEPLOYMENT.md, docs/DEMO_SCRIPT.md and docs/SECURITY_GUIDE_ADMIN.md. These docs
are guidance, not proof of a deployed or fully completed production release.


## Setup checklist

- [ ] Commit/back up code and development database.
- [ ] Copy this overlay into the Phase 4 root, preserving unchanged files.
- [ ] Run node scripts/verify-guide-admin.mjs and install only if needed.
- [ ] Set DEMO_GUIDE_PASSWORD in server/.env; keep existing secrets.
- [ ] Stop app, opt in to dev seed, seed, verify Booking indexes/topology, disable seed flag.
- [ ] Start npm run dev using VITE_DATA_SOURCE=api.
- [ ] Run npm test, opt-in integration suites, npm run build, and browser/manual checks.

## Manual traveler checks

1. Register/login as a traveler. Open a guide-created future tour, select guests/departure
   and confirm a request. Verify server total and pending status in My Bookings.
2. Guide confirms; refresh status. Cancel another request and verify availability returns.
3. Tour archive hides it publicly and blocks new booking while history remains.
4. Guide/admin management routes return 403 for traveler accounts.
5. Do not demonstrate review/wishlist persistence: those features are not implemented.

## Manual guide checks

1. Login as guide1@wondu.example with YOUR DEMO_GUIDE_PASSWORD. Confirm the guide-specific
   workspace, owned fixture tours, status counts and incoming requests.
2. Save My Profile; verify live preview and public regions/languages/bio/photo.
3. Create a tour with valid images, destination, itinerary/duration and future departure.
4. Book it from a separate traveler profile; confirm request appears only for its owner.
5. Confirm/decline via existing booking list; verify appropriate inventory changes.
6. Try deleting its booked departure or editing core details while active: expect 409.
7. Try editing another guide's tour by ID: expect 403.
8. New pending guide can edit profile but cannot create tours; rejected status shows reason.

## Manual admin checks

1. Login with environment-configured demo admin. Review stats and chart labels; completed
   booking revenue is an estimate, not payment revenue.
2. Reject a pending application with a reason; verify reason on guide dashboard. Approve it
   later to unlock tour creation. Both changes appear in the audit log.
3. Reassign a tour to an approved guide. Old owner loses edit/booking authority; new owner
   sees its existing requests. Unapproved/inactive target guide is rejected.
4. Archive any tour. Verify public listing/detail and booking creation reject it.
5. Search users and deactivate one without active work. Old session/login must stop working.
   Active-work deactivation is blocked with explanation; admins cannot deactivate admins.
6. Inspect audit records for approve/reject/reassign/archive/deactivate. Check existing
   booking status filter and paginate users/tours/audit records.
