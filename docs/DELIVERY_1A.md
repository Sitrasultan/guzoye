# Guzoye Delivery 1a

## Implemented

- Renamed Wondu to Guzoye across package names, session cookie, JWT issuer/audience, UI copy, documentation, and demo emails.
- Demo guide emails are now `guide1@guzoye.example` through `guide6@guzoye.example`; the traveler demo is `traveler@guzoye.example`.
- Tours are admin-owned (`Tour.owner`) and support multiple approved assigned guides (`Tour.assignedGuides`).
- Guide tour creation, editing, archiving, and departure management are disabled; guide tour views are read-only.
- Each future departure has per-guide groups with independent capacity and remaining spots.
- Guides support `blockedDates` and availability notes.
- Travelers choose an assigned guide during booking. The guide group and overall departure availability are decremented in one MongoDB transaction.
- Cancellation and declined bookings restore both the departure and selected guide-group availability.
- Added admin tour creation, editing, guide assignment, and departure management endpoints.
- Added an idempotent, data-preserving migration with JSON backup and rollback notes.

## Migration

```bash
npm run migrate:guzoye-1a -- --dry-run
npm run migrate:guzoye-1a
```

The migration assigns the first active admin as tour owner, converts each legacy tour guide into an assigned guide, creates one guide group per departure, and assigns the legacy guide to every existing booking. It writes a backup under `server/data/` before changing data.

Rollback: restore `owner`, `assignedGuides`, departure `guideGroups`, and booking `guide` from the generated backup. The legacy `Tour.guide` field is retained during 1a specifically to make rollback possible.

## Tests

Run:

```bash
npm test
```

`server/test/delivery1a.validation.test.js` covers booking guide-choice validation, migration helpers, and permission-oriented validation without requiring a database. Existing integration tests require the configured MongoDB replica set.

## Honest status

- Code and JSON files were generated and validated structurally.
- No live MongoDB replica set, browser, or test suite was executed in this packaging environment.
- Run `npm install`, migration/seed, and `npm test` locally before interview use.
