# Wondu Phase 4 — booking flow and availability

## Applying this upgrade

This is a minimal complete-file overlay for Phase 3, not a standalone app. The ZIP has
client/, server/, docs/ and scripts/ directly at its top level, with no wondu/ wrapper.
Extract to your existing project root. Back up/commit first and preserve all unchanged
files. See PHASE4_CHANGELOG.md for exact replacement/new paths.

No npm dependencies, package.json files, or environment example files are changed or
supplied. There are no new environment variables. No fresh npm install is required if
your Phase 3 dependencies are installed. scripts/verify-phase4.mjs parses all three of
your existing manifests before any optional installation:

```sh
node scripts/verify-phase4.mjs
```

The root package scripts remain as validated in Phase 3. The upgrade never replaces
AuthContext, auth middleware, role middleware, CSRF middleware, auth routes, api.js,
main.jsx, App.jsx, existing styles.css/auth.css, or environment settings. New booking
requests use the same credentialed Axios + signed CSRF-cookie/token handshake.

## Database prerequisite: transaction-capable MongoDB

Booking status and seat inventory must commit or roll back together. A standalone
MongoDB server cannot execute these multi-document transactions. Use Atlas or a replica
set. No silent unsafe fallback is provided. Check connectivity/indexes with the command
below after seeding. Production replica sets need proper authentication, TLS and backups;
the following unauthenticated single-node container is for localhost development only.

### Optional fresh local replica set with Docker

Stop an existing local MongoDB using port 27017 first, or use Atlas instead. The named
volume below is NEW development data, not your old standalone DB. Existing registered
accounts are not copied automatically. Re-register test users in a fresh database.

```sh
docker run -d --name wondu-mongo-rs -p 127.0.0.1:27017:27017 -v wondu_phase4_mongo:/data/db mongo:8 --replSet rs0 --bind_ip_all
docker exec wondu-mongo-rs mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})'
docker exec wondu-mongo-rs mongosh --quiet --eval 'db.hello().isWritablePrimary'
```

Wait until the last command returns true. On shells where quote escaping differs, enter
`docker exec -it wondu-mongo-rs mongosh` and run the rs.initiate expression interactively.
Use this existing environment variable in server/.env:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/wondu?replicaSet=rs0
```

Keep the existing CLIENT_ORIGIN, JWT settings and DEMO_ADMIN_* values. For Atlas use your
Atlas development URI instead. Tests also require a transaction-capable deployment.

## Required commands and seed reset scope

Stop the application first. Ensure the target is a disposable development DB, then set
ALLOW_DEMO_SEED=true in server/.env and run:

```sh
node scripts/verify-phase4.mjs
npm run seed
node server/src/scripts/checkBookingDB.js
```

The seed now resets:
- All Booking documents attached to the eight deterministic fixture tours (any status).
- Those eight tours and their departure IDs, capacities and spotsLeft.
- The six fixture Guide records and their seven fixture Users including the review user.
- The fixture destinations and sample reviews.
- The environment-configured demo admin credentials; existing admin sessions are revoked.
- Any demo guide ownership assignment on the eight tours (restored to fixture guides).

Unrelated registered users, their guide applications, unrelated tours and unrelated
bookings are not intentionally deleted. Old non-fixture Booking documents missing
Phase 4 fields are not silently migrated: back up and migrate/remove such development
records before using the new unique index. Phase 3 had no booking-creation endpoint,
so a normal Phase 3 database has no such legacy records.

Each tour gets 3–4 departures at 09:00 Ethiopia time, starting 7+ days from the seed day,
then every 14 days. Capacity matches its original sensible group size. Departure IDs
change each seed. The seed is non-transactional development tooling; failure can leave
a partial fixture set, so rerun on a disposable DB after correcting the error.

After seeding, set ALLOW_DEMO_SEED=false. Ensure client/.env uses VITE_DATA_SOURCE=api
(mock discovery intentionally has no real bookable departures), then start:

```sh
npm run dev
```

Local frontend http://localhost:5173; API http://localhost:5000/api. Use localhost
consistently for browser/client API URLs to retain Phase 3 cookie behavior.

## Manual test preparation: give a real guide login a demo tour

Fixture guide passwords remain random (no new hardcoded credentials). For a test guide:
1. Register a guide with credentials you control using the existing registration form.
2. Log in as the DEMO_ADMIN_* account and approve it in the existing approval queue.
3. Stop the API. Temporarily set ALLOW_DEMO_SEED=true and assign an UNUSED fixture tour:

```sh
node server/src/scripts/assignDemoTour.js --email your-guide@example.com --tour 000000000000000000000191
```

4. Set ALLOW_DEMO_SEED=false and restart npm run dev.

The helper changes only the tour guide reference, does not change passwords, and refuses
a tour that already has any bookings. It is development-only and not an HTTP endpoint.
Do not rerun the seed after assigning/bookings unless you intentionally want the reset.

## UI and API behavior

- Tour Details now displays real future departures and remaining seats. Full/past dates
  are disabled. Guests cannot exceed the currently displayed spotsLeft.
- Logged-out users go to Login and return to the same tour (then reselect departure).
- Guide/admin sessions get a traveler-only booking explanation.
- Confirm sends only tour/departureId/guests; server calculates the authoritative total.
- My Bookings shows status, date/time, guests, price, and confirmed cancellation dialog.
- Approved guide dashboard lists only owned-tour bookings and supports status filters,
  Confirm, Decline and Mark completed with confirmation dialogs.
- Admin dashboard retains guide approvals and adds a read-only, status-filtered bookings table.
- New components reuse the existing design variables; no replacement design system.
- Lists support loading skeletons, empty/error states, pagination and retry.
- A booking request holds seats immediately; guide confirmation is a separate state.
- No payment, charge, refund, email notification, or automatic hold expiry is implemented.

See PHASE4_API.md for endpoints, validation, state transitions, inventory and transaction details.

## Automated tests

```sh
npm test
npm run build
```

The new integration suite uses the EXISTING optional TEST_MONGODB_URI from Phase 3.
It derives a uniquely named disposable DB, requires wondu and test in the base DB name,
and drops only that generated DB. Never point it at a real user database.

```sh
TEST_MONGODB_URI='mongodb://127.0.0.1:27017/wondu_booking_test?replicaSet=rs0' npm test
```

PowerShell:

```powershell
$env:TEST_MONGODB_URI='mongodb://127.0.0.1:27017/wondu_booking_test?replicaSet=rs0'
npm test
```

Without TEST_MONGODB_URI, database integration tests are explicitly skipped. The new
suite covers server pricing, overbooking, duplicate booking, past date, pending guide,
concurrent last-seat requests, cancellation, repeated cancellation, transitions, guide
ownership, traveler role denial, list isolation, decline release, concurrent double
release prevention, CSRF denial, and rollback after a simulated Booking insert failure.
Existing Phase 3 auth and approval tests are retained, not replaced.

## Delivery checks versus checks still required

New dependency-free validation/pricing/transition tests were executed: five passed.
Supplied .js/.mjs syntax checks and ZIP integrity were checked. No package manifests are
supplied; the helper validates your actual project manifests locally. Dependencies,
MongoDB integration/concurrency tests, Vite JSX build, and browser/accessibility QA were
not executed in the delivery environment. Do not interpret an authored integration
test as an executed production guarantee. Run the commands above locally.

## Setup checklist

- [ ] Back up project and DB; copy this overlay directly over the Phase 3 root.
- [ ] Keep existing Phase 3 auth, middleware, CSRF and package files.
- [ ] Run node scripts/verify-phase4.mjs; install only if dependencies are absent.
- [ ] Use Atlas or a replica set; set the existing MONGODB_URI accordingly.
- [ ] Stop API, opt in to seed, re-seed, run checkBookingDB.js, disable seed flag.
- [ ] Use API discovery mode and restart frontend/backend.
- [ ] Register/approve a test guide and assign an unused demo tour before booking it.
- [ ] Run unit tests, DB integration tests and npm run build.

## Manual traveler test steps

1. Logged out, open the assigned tour; choose a departure and select Log in to book.
   Sign in as a traveler; verify return to the same tour.
2. Select date/guests, check estimate and confirm. Expect pending status and a
   server-calculated total. Refresh tour availability: spots decrease by guests.
3. Attempt the same departure again: expect 409 and no additional decrement.
4. Inspect My Bookings: title, Ethiopia departure time, guests, USD total, status.
5. Cancel a pending booking, confirm the dialog, then refresh availability: spots return.
6. Cancel again using the API: expect 409 and no second restoration.
7. After guide confirmation, verify cancellation still works. After completion, verify
   cancellation is denied. Book a different departure if earlier bookings are terminal.
8. Attempt a full/past departure or an injected price: UI disables unusable options;
   API independently rejects unavailable/past choices and ignores client price.
9. Traveler calls /api/guide/bookings or /api/admin/bookings: expect 403.

## Manual guide test steps

1. Log in as the approved guide assigned above. Pending guides cannot view the incoming list.
2. Submit a new traveler request on that tour from another browser profile. Refresh the
   guide dashboard/filter: verify the request appears with traveler and booking details.
3. Confirm a pending request: status becomes confirmed and inventory does not change.
4. Create another pending request and Decline it: spots return exactly once.
5. Mark a confirmed booking completed: it becomes terminal and keeps consumed seats.
6. Attempt pending→completed or confirmed→declined via API: expect 409.
7. Log in as a different approved guide: original tour requests must not appear.
   Attempt changing the original booking by ID: expect 403.
8. Admin sees all bookings using the status filter but has no override status-write endpoint.

Stop after Phase 4 and wait for continue.
