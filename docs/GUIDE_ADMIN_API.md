# Guide/admin API contract

Keep Phase 3 cookie sessions, credentialed CORS and signed CSRF-token handshake.
POST/PATCH/DELETE require JSON, exact trusted Origin and X-CSRF-Token from /api/auth/csrf.
No bearer/localStorage tokens, public promotion endpoint or public audit endpoint.

## Profile

GET /api/guide/profile returns {data: Guide with public user name/role}.
PATCH accepts only bio (20–3000 chars), languages[], specialties[], regionsCovered[],
yearsExperience (integer 0–80) and coveredDestinations (existing Destination IDs). Lists allow at most
20 unique trimmed entries of 1–150 chars each. All fields are optional individually;
submit at least one. Unknown fields (role/status/rating/user) are rejected.
Photo changes use the dedicated multipart endpoint (pending/approved only). Pending/rejected guides may edit other profile fields, but cannot publish tours and remain hidden.
URL validation checks format/scheme/host, not actual image content or DNS resolution.
The server never downloads submitted URLs, so this is not an image proxy or uploader.

## Own tours

GET /api/guide/tours?page=1&limit=6 returns paginated own tours with total/active booking
request counts. GET /api/guide/tours/:id returns owned tour and activeBookingCount.
POST accepts title, destination (existing ID), description, price, duration, difficulty,
capacity, itinerary[], images[], included[], excluded[], departures[]. Server assigns
req.guide._id; ownership/status/rating cannot be supplied by the client.

Price is nonnegative USD, max 1000000, at most 2 decimals. Duration 1–365 days; capacity
1–1000 integer. Difficulty Easy/Moderate/Challenging. Itinerary day count must equal duration;
server numbers days in array order, each has title/description. Images: 1–6 uploaded or legacy HTTPS image URLs. New UI uses uploads; see docs/API.md.
Included/excluded lists max 40 entries. Initial departures: 1–40 distinct future timestamps,
each with capacity; spotsLeft is computed server-side. Request JSON is capped at 128 KB.

PATCH /:id accepts a subset of editable core fields, not departures/guide/archived.
When a tour has active bookings, core detail edits are rejected (409); archive is allowed.
Archived tours are read-only for core edits and cannot accept new departures/bookings.
There is no destructive tour-delete or unarchive endpoint. Public discovery omits archived
tours; existing booking management remains available. Own-tour lookup/edit returns 403
for another owner's tour, not a silently empty update.

POST /:id/departures accepts {date,capacity}; date must be future ISO with explicit timezone.
DELETE /:id/departures/:departureId allows future departures without pending/confirmed
bookings. Existing completed/cancelled/declined history keeps departureDate snapshots.
Adding departures is allowed even if other departures have active bookings; core metadata
stays locked. Maximum 200 stored departures per tour. No capacity-edit endpoint is exposed;
remove an unbooked future departure and add a replacement instead.

## Admin

GET /stats: total users/tours, active approved/pending guide counts, all booking statuses,
completed-booking revenue estimate, latest 12 months WITH bookings (UTC), top five tours
by all booking requests. This is not collected payment revenue.
GET /guides?status=pending|approved|rejected is paginated; inactive accounts excluded.
PATCH /guides/:id/approve approves pending/rejected applications; repeated approval is
idempotent. PATCH /reject requires 5–1000 character reason and accepts pending only.
Approved guides are not revoked through rejection; reassign/resolve active work, then
deactivate if needed. Rejected guides can edit their profile; an admin may later approve.

GET /tours: all published/archived tours with assigned guide name/email and destination.
PATCH /tours/:id/guide {guideId}: only approved, active guide allowed. Existing requests
transfer immediately to the new owner. Does not rewrite booking traveler or price.
PATCH /tours/:id/archive: archive any tour; no restoration of seats or cancellation.
GET /bookings: existing Phase 4 status-filtered read-only list.

GET /users supports search, role, page, limit; only name/email/role/isActive/createdAt.
PATCH /users/:id/deactivate {reason}: revokes sessions, disables login, hides a guide and
archives remaining owned tours. Protected admin accounts cannot be deactivated. Travelers
must first resolve active bookings; guides must first resolve/reassign active-booking tours.
No user-reactivation endpoint is implemented. Refusals return 409 with a clear reason.

GET /audit: paginated actor name, action, target type/ID, details and timestamps.
Admin approve/reject/reassign/archive/deactivate and their audit entries commit together
in a transaction. Implicit archives during guide deactivation are also logged. Direct DB
edits/dev seeding are not HTTP admin actions and are not logged. No log-edit/delete API.

## Concurrency and errors

Management writes that combine booking guards, ownership and audit use transactions.
Core edit/departure deletion locks the Tour before checking bookings. Booking creation
writes that same Tour; reassignment and guide booking decisions also lock it. Write
conflicts retry so an old guide cannot change a reassigned tour using a stale snapshot.
Traveler deactivation and booking creation serialize on the User document as well.

400 invalid input/filters/ID; 401 guest/expired/deactivated session; 403 role/approval/owner;
404 missing resource; 409 business conflict; 429 rate limit; 503 unsupported transaction DB.
JSON errors use existing {message, errors?:{field:message}}. Lists use existing pagination.
