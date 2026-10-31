# Wondu — design and architecture through Phase 3

## Visual system
Existing Phase 2 styles.css remains unchanged. Phase 3 auth.css imports after it and
reuses --cream, --surface, --green, --gold, --terracotta, --line, --radius, and --shadow.
Editorial headings, rounded cards, gentle motion, mobile navigation, responsive grids,
and reduced-motion support remain. Stock imagery and original tour/guide fixtures are
illustrative; sample rating counts are not computed from seeded reviews.

## Authentication flow
AuthProvider checks /auth/me on startup and keeps only the public user in memory.
AuthContext/useAuth expose login, register, logout, refresh, loading, and sessionError.
A revision counter prevents stale session requests from overwriting newer authentication
state. ProtectedRoute waits for session loading, offers retry on a network failure,
redirects guests to login, and checks supported roles for dashboard routes. These client
checks are UX only: server middleware always independently enforces authentication,
current DB role, and approved guide status.

Axios uses withCredentials. A fresh signed CSRF token is fetched before writes. JWTs
are httpOnly cookies, never JSON fields or localStorage entries. Passwords stay in form
state only while needed; successful submission clears them. Login/register errors use
JSON field messages, accessible alerts, loading states, and disabled duplicate submission.
Auth pages and protected requests use no-store responses on the server.

## Role UX
Logged out: Login/Register. Logged in: name, role-based dashboard link, Logout.
Traveler dashboard links to discovery. Guide dashboard shows pending/approved status
and can refresh it. Pending guides cannot enter approved-only server workspace routes.
Admin dashboard paginates pending applications and approves Guide IDs.
My Bookings is now protected but remains an honest empty state: reservation handling
has not been implemented. The existing tour booking panel remains only an estimate
and local preview. No payments, actual bookings, or guide tour-management features exist.

## Deployment boundaries
Local development uses localhost:5173 + localhost:5000. Use HTTPS and secure cookies
in production. SameSite=Lax assumes same-site web/API deployment; unrelated-site domains
need a deliberately redesigned cookie/CSRF setup, not an arbitrary SameSite=None edit.
Use a long random JWT secret, exact CORS origin, environment-managed demo credentials,
shared rate-limit storage for multiple API processes, HTTPS termination, correct proxy
trust, audit logs and monitoring. Do not deploy a demo admin credential publicly.

## Known limitations
No email verification, password reset, MFA, refresh tokens, application rejection,
profile editing, or real identity verification. Guide registration uses compensating
cleanup rather than a multi-document transaction so standalone MongoDB works; a process
crash between User and Guide writes can leave an orphan requiring administrative cleanup.
The seed is development-only and non-transactional. Existing seeded profiles are approved
by the seed; preexisting non-fixture profiles require explicit admin approval.

## QA
Run README setup, automated tests, and manual role checks. Browser accessibility,
responsive screenshots, end-to-end UI tests, dependency audit, and production deployment
checks remain required before launch.
