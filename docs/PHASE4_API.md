# Phase 4 booking API

Base URL: http://localhost:5000/api. Existing Phase 3 cookie authentication, credentials,
CSRF handshake, Origin validation, role middleware and guide approval middleware remain.
Every listed write sends JSON and X-CSRF-Token obtained from GET /auth/csrf using the
same cookie jar. There is no public unauthenticated booking write or admin override.

## Endpoints

| Method | Path | Access | Body / filters |
| --- | --- | --- | --- |
| POST | /bookings | traveler | {tour, departureId, guests} |
| GET | /bookings/mine | traveler, own data | status, page, limit |
| PATCH | /bookings/:id/cancel | traveler, owner | {} |
| GET | /guide/bookings | approved guide, own tours | status, page, limit |
| PATCH | /bookings/:id/status | approved guide, own tours | {status} |
| GET | /admin/bookings | admin | status, page, limit |

List filters: status is pending/confirmed/declined/cancelled/completed; page 1–10000,
limit 1–50 (default 8). Repeated, non-string and unknown query keys return 400.
POST guests must be a JSON number, integer 1–1000, and not exceed remaining spots.
IDs are 24-character hexadecimal strings. departureId must belong to the selected tour.
Unknown POST fields such as totalPrice, user, status or active are not assigned.

Create: 201 {data: booking, message}. Cancel/status: 200 {data: booking, message}.
Lists: {data: [...], pagination:{total,page,limit,pages}}. Lists include populated tour
and traveler name/email; password/tokenVersion are never exposed. Only own records
are available to travelers/guides. Admin can read all, but has no mutation override.

Errors: 400 invalid body/filters/ID; 401 unauthenticated; 403 wrong role, ownership,
unapproved guide, or invalid CSRF; 404 missing tour/departure/booking; 409 unavailable,
past/started departure, duplicate active booking, invalid transition; 503 unsupported
standalone MongoDB. JSON uses {message, errors?:{field:message}}.

## States and inventory

- Create → pending; seats are held immediately, no payment is collected.
- pending → confirmed (guide): seats remain held.
- pending → declined (guide): restore seats.
- pending/confirmed → cancelled (owner): restore seats.
- confirmed → completed (guide): keep the original consumed seats.
- All other changes, repeated cancellation and repeated terminal changes return 409.
- Pending and confirmed are the only active states for duplicate prevention.
- Cancellation/decline permit a new booking for that departure if it is still future.
- This phase imposes no additional date gate on cancellation or guide completion.
- No automatic pending expiration, payment/refund, email or cancellation fee exists.

Tour.departures[] entries have _id, date (UTC instant), capacity, spotsLeft. Date cutoff
uses server time at the atomic decrement; departure <= now is not bookable. UI displays
Africa/Addis_Ababa time and disables full/past choices; the server rechecks everything.
Booking.departureDate snapshots the booked instant for history. totalPrice snapshots
server-side tour.price × guests in integer cents converted to USD. Client estimates are
not authoritative; no client-supplied amount is trusted.

## Concurrency guarantees and requirements

Booking writes require a replica set or Atlas (no non-transactional fallback).
A conditional Tour.findOneAndUpdate uses one $elemMatch for departure ID, future date,
and sufficient spots, and an atomic $inc. A unique partial compound index enforces
one active booking per user/tour/departure. active is an internal persisted index key,
changed only together with status by the server.

The decrement and Booking insert run in a transaction. Insert failure aborts both,
restoring seats by rollback. Cancel/decline update status and restore seats in the same
transaction. Compare-and-set status and transaction conflict retry prevent double release
under simultaneous cancel/decline. Restoration cannot exceed departure capacity.
Do not add a manual increment after an aborted transaction: that would double restore.

Do not manually edit capacity, spotsLeft, active, booked departure dates or tour ownership
in a live database. No production editing endpoint exists in this phase. The demo
assignment helper is for stopped-API development only, refuses tours with bookings,
and is disabled in production.
