# Wondu API — Phase 3

Base URL: http://localhost:5000/api. Local frontend origin: http://localhost:5173.
Use the same hostname consistently: localhost, not a mixture of localhost and 127.0.0.1.

## Session and CSRF contract

GET /auth/csrf returns `{ data: { csrfToken } }` and sets an httpOnly CSRF cookie.
Before every POST/PATCH request, obtain a fresh token using the same cookie jar,
then send JSON, `Origin: http://localhost:5173`, and `X-CSRF-Token: <token>`.
Tokens are signed and bound to the current session cookie; obtain a new one after
login/register/logout. The frontend implements this automatically.

A successful register/login sets wondu_session as an httpOnly, SameSite=Lax cookie.
Secure is false only for localhost HTTP; production requires Secure=true and HTTPS.
The JWT is never returned in JSON and is not read or stored by React. CORS allows
credentials for the exact configured CLIENT_ORIGIN, not a wildcard.
JWTs use HS256, issuer/audience validation, and a one-hour default expiration.
No refresh-token flow is implemented. Reauthenticate when a session expires.
Logout increments User.tokenVersion, invalidating all that user's outstanding JWTs,
and clears the browser session cookie. Thus logout means logout on all devices.

## Authentication endpoints

| Method | Endpoint | Access | JSON body / response |
| --- | --- | --- | --- |
| GET | /auth/csrf | public | `{ data: { csrfToken } }` |
| POST | /auth/register | public, CSRF | `{ name, email, password, role }`; 201 `{ data: { user }, message }` |
| POST | /auth/login | public, CSRF | `{ email, password }`; 200 `{ data: { user }, message }` |
| POST | /auth/logout | signed in, CSRF | `{}`; 200 `{ message }` |
| GET | /auth/me | signed in | 200 `{ data: { user } }` |

Public roles: traveler or guide only. Omitted role defaults to traveler. All other
values, including admin, return 400. Names are trimmed and required, max 100 characters.
Emails are trimmed/lowercased and validated, max 254 characters. Registration passwords
must have at least 8 Unicode characters and at most 72 UTF-8 bytes; passwords are never
trimmed. Unknown body fields are ignored, never mass-assigned. User.password is hashed
with bcrypt cost 12. Duplicate email is 409, wrong credentials 401, validation 400.
Login and registration are limited per IP to 20 and 10 attempts per 15 minutes respectively,
in addition to the general API limiter. Production multi-instance deployments need a
shared limiter store and carefully configured proxy trust.

Public authenticated user fields: _id, name, email, role and guide (null or {_id,status}).
Password/tokenVersion are never exposed. Roles are read from MongoDB on every request.
Error responses use `{ message, errors?: { field: message } }`.

## Roles and approval

| Method | Endpoint | Access |
| --- | --- | --- |
| GET | /dashboard/traveler | traveler only |
| GET | /dashboard/guide | guide only, including pending |
| GET | /dashboard/guide/workspace | approved guide only |
| GET | /dashboard/admin | admin only |
| GET | /admin/guides?status=pending&page=1&limit=10 | admin only |
| PATCH | /admin/guides/:id/approve | admin only, CSRF |

:id is the Guide document ID, not the User ID. New guide accounts receive a Guide
application with pending status and no fabricated languages or experience. Admin approval
records status=approved, approvedAt, approvedBy. Repeating approval is idempotent.
Guide applications are not a full identity-verification workflow. Approved guides get
public profiles and workspace access; actual tour editing is reserved for a future phase.
The pending dashboard can be viewed by its owner, but pending guide profiles and associated
tours are excluded from the public API. Admin accounts are created by the opt-in seed only.

## Discovery endpoints retained from Phase 2

| GET endpoint | Filters |
| --- | --- |
| /health | none; 200 connected / 503 disconnected |
| /tours | search, region, maxPrice, duration, difficulty, guide, featured, sort, page, limit |
| /tours/:id | populated tour |
| /tours/:id/reviews | page, limit |
| /destinations | search, page, limit |
| /destinations/:id | single destination |
| /guides | search, language, page, limit; approved only |
| /guides/:id | approved guide only |

Lists return `{ data: [], pagination: { total, page, limit, pages } }`.
Details return `{ data: {} }`. Amounts are demo USD/person. Duration is maximum days.
Sort values are rating, price-asc, price-desc. Difficulty: Easy, Moderate, Challenging.
page is 1–10000; limit is 1–50, default 8. Search is a case-insensitive literal substring.
Malformed IDs return 400; valid missing or unapproved public resources return 404.
There are still no booking, payment, tour-editing, or review-submission endpoints.


# Final Delivery 1 additions (items 1–2)

## Media

| Method | Path | Access / body |
| --- | --- | --- |
| POST | /api/guide/profile/photo | pending/approved active guide; multipart single field photo |
| DELETE | /api/guide/profile/photo | same; JSON {} |
| GET | /api/guide/media | approved guide; own unattached tour uploads, maximum 24 |
| POST | /api/guide/media | approved guide; multipart single field photo |
| DELETE | /api/guide/media/:id | approved guide; own unattached upload only |
| GET | /uploads/:uuid.webp | public image, strict filename, no directory listing |

All writes retain Origin, signed session-bound CSRF and role checks. Upload routes alone
allow multipart after CSRF validation, before multer. Do not set multipart Content-Type
manually in Axios: allow the browser to add the boundary. Uploads are limited to 2MB,
one file/no extra multipart fields. Four in-flight responses and 30 image changes/15min/IP
are bounded per API process. Production multi-process/WAF limits remain operator work.
Success POST 201 {data:{_id,url},message}; remove 200 {message}. Wrong/invalid content 400,
too large 413, bad session 401, role/CSRF/ownership 403, attached upload 409, rate/busy 429.
Original filename and MIME header are not trusted. Metadata/key/provider stay server-side.

Profile PATCH now accepts coveredDestinations:[destination IDs] and no longer accepts image.
The existing bio/languages/specialties/yearsExperience remain; legacy regionsCovered stays
in storage/API for compatibility but is not the new place-selection control. A photo is
saved/removed independently, immediately. Generic profile Save does not upload bytes.

Tour create/edit still receives ordered images:[URLs]. Uploaded paths are validated against
owned Media records before attachment. Six max; ready own drafts or this tour's existing
assets only. Legacy HTTPS seeded URLs remain compatible, but new UI uses file upload.
An attached file cannot be deleted through the draft endpoint. Removing it in a form only
deletes storage after a successful authorized Tour save. Reassigned tour owners can retain
or remove already-attached assets without receiving access to the previous owner's drafts.

## Guide discovery

GET /api/guides?destination=<id>&language=English&minRating=4&q=Hana&sort=experience&page=1&limit=12

Parameters combine with AND; destination internally matches explicit place OR published
owned-tour destination. One result per guide. minRating 0–5; sort rating/experience/name;
page 1–10000; limit 1–50. q/search are escaped literal substrings of name. Invalid/repeated
or unsupported query fields return 400. Approved active guides and active User required.
Default sort rating; name case-insensitive, ID tie-breaker. All filtering/sorting before
pagination. coveredPlaces:[{_id,name,region}] returns effective union for cards/profile.
GET /api/guides/:id now includes coveredPlaces. Archived tours do not contribute coverage;
explicitly checked places continue to match even when no tour remains published there.
