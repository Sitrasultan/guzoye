# Wondu — Phase 2: MERN discovery platform

Complete source for a React (Vite), React Router, Axios, Express, MongoDB/Mongoose
application with a custom responsive CSS design system. The separate Phase 1 archive
contains the runnable mock-data frontend. This archive contains the complete Phase 2
project; it does not require copying files from Phase 1.

## Scope and phase boundary

All discovery pages and read-only APIs are implemented. Login and Register are explicitly
disabled previews. My Bookings is an honest empty state. Booking is a local, non-persistent
preview, not a reservation. Authentication, authorization, roles, and booking writes are
not implemented. JWT is installed for Phase 3, but no token is issued or trusted.
User password hashing is present as model groundwork and for seed users.

## Prerequisites

- Node.js 22.12+ and npm.
- Local MongoDB or a MongoDB Atlas development database.
- Network access for initial npm install and external images/fonts.
- No generated lockfile is included. After installation, commit the resulting lockfile
  and use npm ci for future reproducible installations.

## Setup and run

From the extracted monorepo root:

```sh
npm install
cp client/.env.example client/.env
cp server/.env.example server/.env
```

On PowerShell replace `cp` with `Copy-Item`.

1. Start your local MongoDB service, or set MONGODB_URI in server/.env to your Atlas URI.
2. Keep NODE_ENV=development. Set ALLOW_DEMO_SEED=true in server/.env.
3. Double-check that the target database is a disposable development database.
4. Run:

```sh
npm run seed
```

5. Set ALLOW_DEMO_SEED=false again, then start both apps:

```sh
npm run dev
```

Frontend: http://localhost:5173. API: http://localhost:5000/api.
For separate terminals: `npm run dev -w server` and `npm run dev -w client`.

Client environment:

```dotenv
VITE_DATA_SOURCE=api
VITE_API_URL=http://localhost:5000/api
```

Restart Vite after editing environment variables. Set VITE_DATA_SOURCE=mock to compare
Phase 1 behavior; API mode never falls back to fixtures on failure. No secrets belong
in VITE-prefixed variables. CLIENT_ORIGIN must match the actual frontend origin.

## Build and tests

```sh
npm run build
npm test
npm start
```

Build produces the frontend distribution. Start runs only the API; serve the built
frontend separately with SPA rewrites. `npm run preview -w client` previews the build;
if accessing the API from the preview port, set CLIENT_ORIGIN to http://localhost:4173
and restart the API.

Tests include standard-library validation and fixture tests, Supertest HTTP tests
that do not require MongoDB, and opt-in read-only integration tests.

After seeding, enable integration tests with:

```sh
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/wondu npm test
```

PowerShell: `$env:TEST_MONGODB_URI='mongodb://127.0.0.1:27017/wondu'; npm test`.
The integration suite expects exactly the seeded 8 tours, 6 guides, and 8 destinations.
It reads the development database but does not write to it.

## Verification checklist

- [ ] Seed reports 8 tours, 6 guides, 8 destinations and 8 reviews.
- [ ] Re-running seed with ALLOW_DEMO_SEED=true does not duplicate fixtures.
- [ ] GET /api/health reports connected, HTTP 200.
- [ ] GET /api/tours?limit=6 returns pagination.total=8 and pages=2.
- [ ] Search, region, price, max duration, difficulty, guide, language, and sorting work.
- [ ] Single items populate safe public relationships, not user passwords or emails.
- [ ] Bad ID returns JSON 400; valid missing ID returns JSON 404.
- [ ] Invalid page / limit returns 400; beyond-last page returns an empty list.
- [ ] Reviews return one sample review for each seeded tour.
- [ ] Browser Network tab shows API requests, not silent fixture fallback.
- [ ] Stop API and visit a new route: an error state and retry button appear.
- [ ] Restart API and retry: the page recovers.
- [ ] No match shows a clear empty state and reset control.
- [ ] All requested routes work at mobile and desktop widths.
- [ ] Booking preview updates totals but does not create a server record.
- [ ] Auth / booking / review POST requests are not exposed (404).
- [ ] npm test, opt-in integration tests, and npm run build pass locally.

## Seed safety and data notes

The seed refuses production mode and requires ALLOW_DEMO_SEED=true. It replaces only
known fixture IDs, never drops the database or wipes unrelated collections. It refuses
if fixture tours have bookings. Seed operations are not transactional; a failure can
leave a partial fixture set, so use a disposable database and rerun after correction.
Passwords are generated randomly and hashed with bcrypt; no usable demo login is provided.
Fixture guide names, stock portraits, prices, itineraries, ratings, and review counts
are illustrative. Aggregate ratings/counts are not derived from the single seeded
review per tour. All sample users have reserved example email domains.

## Implementation documentation

- docs/API.md: complete endpoints, filters, response contracts, and curl examples.
- docs/DESIGN.md: design tokens, accessibility, data flow, phase boundaries, launch gaps.
- shared/catalog.json: single fixture source consumed by both mock frontend and seed.
- server/test: validation, fixture integrity, HTTP and opt-in MongoDB tests.

## Folder tree

```text
wondu/
├── .gitignore
├── README.md
├── client/
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Button.jsx
│   │   │   ├── FilterPanel.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── GuideCard.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── RatingStars.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   ├── States.jsx
│   │   │   └── TourCard.jsx
│   │   ├── hooks/
│   │   │   └── useResource.js
│   │   ├── main.jsx
│   │   ├── pages/
│   │   │   ├── Auth.jsx
│   │   │   ├── GuideProfile.jsx
│   │   │   ├── Guides.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── MyBookings.jsx
│   │   │   ├── TourDetails.jsx
│   │   │   └── Tours.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   └── styles.css
│   └── vite.config.js
├── docs/
│   ├── API.md
│   └── DESIGN.md
├── package.json
├── server/
│   ├── .env.example
│   ├── package.json
│   ├── src/
│   │   ├── app.js
│   │   ├── config/
│   │   │   ├── db.js
│   │   │   └── env.js
│   │   ├── controllers/
│   │   │   └── catalogController.js
│   │   ├── index.js
│   │   ├── middleware/
│   │   │   ├── errors.js
│   │   │   └── validate.js
│   │   ├── models/
│   │   │   ├── Booking.js
│   │   │   ├── Destination.js
│   │   │   ├── Guide.js
│   │   │   ├── Review.js
│   │   │   ├── Tour.js
│   │   │   └── User.js
│   │   ├── routes/
│   │   │   └── catalogRoutes.js
│   │   └── seed.js
│   └── test/
│       ├── catalog.integration.test.js
│       ├── fixtures.test.js
│       ├── http.test.js
│       └── validation.test.js
└── shared/
    └── catalog.json
```

## Validation performed during delivery

Node syntax checks passed for all .js files. Standard-library validation and fixture
integrity tests were executed successfully. Dependency installation, Vite production
build, Supertest tests, MongoDB integration, and browser/accessibility QA were not
executed in the delivery environment. Run the commands and checklists above locally.

## Next phase

Stop here. Phase 3 authentication and roles are intentionally not included.
