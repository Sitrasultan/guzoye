# Security review — guide/admin upgrade

This is a source-level review, NOT a penetration test or declaration of production safety.
See STATUS.md for missing features and tests not executed.

## Endpoint control matrix

| Family | Authentication/roles | Additional check | Write protection |
| --- | --- | --- | --- |
| guide/profile | requireAuth + guide | Owner derived from req.user, never body | requireCsrf + guide write limiter |
| guide/tours + departures | requireAuth + guide + requireApprovedGuide | Tour owner comparison; active booking guards | requireCsrf + guide write limiter |
| guide/summary | requireAuth + guide + approved | Own-tour aggregation | Read only |
| admin management | requireAuth + admin | Approved target guide; safe deactivation rules | requireCsrf + admin write limiter |
| admin stats/users/audit | requireAuth + admin | Explicit user-field projection | Read only |
| booking writes | Existing auth/roles/CSRF | Existing ownership + archive/active guide guard | Existing global limiter + CSRF |
| public discovery | Public | Approved/active Guide + non-archived Tour | No writes |

Existing login/register IP limits remain. New guide/admin writes add 80 changes per
15 minutes per IP; reads are excluded from these write counters. Existing API global
500 requests per 15 minutes remains. These are process-local stores, not multi-node limits.
No new write can be invoked without existing cookies + exact Origin + signed CSRF token.
All new Axios writes fetch fresh /auth/csrf using credentials then send X-CSRF-Token.

## Data/input handling

- Explicit allowlists prevent role/status/owner/rating/inventory mass assignment.
- ObjectIds, numeric ranges, string lengths, arrays, prices and dates are validated.
- Query strings are bounded and allowlisted; search regex metacharacters are escaped.
- No eval, shelling out with user input, unsafe HTML rendering or server-side image fetch.
- User passwords/tokenVersion/mutationVersion are hidden in model serialization;
  current user responses remain explicit. Admin lists select only required public fields.
- Private management routes return no-store headers through requireAuth.
- HTTPS image URLs reject credentials, ports, localhost and literal IP hosts. This is URL
  validation, NOT content verification or DNS allowlisting. External images can track users;
  controlled uploads/proxy storage and a vetted host policy remain desirable. Do not later
  add server-side URL downloads without DNS/IP/redirect protections.
- JSON body limit increases to 128 KB for multi-day itinerary forms, not unlimited bodies.
- Deactivation sets isActive=false and increments tokenVersion; old cookies are invalid at
  next request and login returns generic failure. Requests already executing may complete.
- Traveler deactivation refuses active bookings; guide deactivation requires reassigning or
  resolving active-booking tours. Admin accounts are protected from dashboard deactivation.

## Inventory/ownership/audit consistency

Core edits/departure removal lock the Tour before booking checks. Booking creation writes
inventory in that same document, forcing conflicting transactions to retry. Guide status
changes now lock tour ownership as well, so admin reassignment and old-guide writes cannot
both commit on stale ownership. Traveler booking creation/deactivation serialize on User mutation. Tour creation and admin reassignment also lock the destination Guide against deactivation.

Every admin approve/reject/reassign/archive/deactivate is logged transactionally with its
mutation. Idempotent repeats that change nothing do not emit duplicate action logs. Guide
self-edits/archives are not admin actions. No HTTP log mutation endpoint is exposed, but
DB administrators can edit logs; this is not an immutable compliance-grade log store.

## Production attention required

- Set NODE_ENV=production, COOKIE_SECURE=true, HTTPS CLIENT_ORIGIN and a random JWT_SECRET.
- Prefer frontend/backend subdomains of one owned domain; preserve CSRF even with SameSite.
- Do not use demo credentials/seed data publicly. No secure production admin provisioning
  job is supplied; design an audited one-time bootstrap before launch.
- Configure trusted proxy hops precisely if deploying behind a proxy. Do not blindly enable
  trust proxy or disable IP validation; use a shared limiter store for multiple instances.
- Verify Atlas network rules, least-privilege DB credentials, backups and recovery.
- Run npm audit, dependency/license scanning, test suites and real browser/security QA.
- Add verification/reset/MFA, email notifications, monitoring and incident procedures.
- Add policy for privacy, external image consent, guide identity checks, rejection appeals,
  deactivation/reactivation, cancellation/refunds and long-lived audit retention.
- Part B's real review/wishlist system and Part D's final metadata/E2E work are NOT done.
