# Wondu — Phase 3 Authentication and Roles upgrade

This is a complete-file overlay for the Phase 2 project, NOT a new standalone application.
Keep the existing shared/catalog.json, tour pages, components, server models/routes, and
styles.css unless this bundle explicitly replaces them. Copy this bundle's wondu folder
contents over your existing wondu root, preserving unchanged files. Every supplied file
is complete; no snippets or manual code splicing is required. Back up or commit first.

All three package.json files were generated with JSON serialization and validated with
Python json.loads and Node JSON.parse. Scripts with nested quotes are correctly escaped.
Use `node scripts/validate-manifests.mjs` to independently verify them before npm install.

## What's implemented

- POST /api/auth/register, login, logout; GET /api/auth/me and /api/auth/csrf.
- bcrypt cost-12 hashes and a one-hour JWT in an httpOnly cookie, never localStorage.
- Credentialed CORS for http://localhost:5173; sameSite=lax; secure cookies in production.
- Signed session-bound double-submit CSRF tokens plus exact Origin checks for writes.
- Email/name/password validation, email normalization, clear JSON errors, duplicate 409.
- Separate login/register IP rate limiters.
- requireAuth, requireRoles and requireApprovedGuide server middleware.
- Public traveler/guide registration only; pending guide applications and admin approval.
- Demo admin from environment variables via the seed only, no public promotion route.
- Working forms, AuthContext/useAuth, role-aware ProtectedRoute, Navbar, and dashboards.
- Requested auth/role tests plus CSRF, pending approval, and logout-revocation tests.

## Model changes

User already existed; it was extended rather than replaced by a different collection:
1. password minimum changed from 12 to 8; bcrypt save hook retained at cost 12.
2. tokenVersion added (default 0, select:false) to invalidate JWTs on logout.
3. name requires at least one trimmed character (rather than two); email max 254.
4. toJSON removes both password and tokenVersion.

Guide status belongs to the Guide model, not duplicated on User:
- status: pending (default) or approved; approvedAt and approvedBy added.
- Incomplete application profiles now allow empty languages and default bio/location/image.
- No fabricated language, experience, or identity is assigned during registration.
- Auth responses attach a small guide {_id,status} summary to the public user.

Public queries explicitly require approved guides, so pending applications do not leak
into discovery. After upgrading an old Phase 2 DB, run the development seed to mark the
six fixtures approved and create the demo admin. Other existing guide profiles without
status are not auto-approved; they must be deliberately migrated/reviewed. For such old
non-fixture profiles, set status=pending in an admin-managed DB migration so they appear
in the approval queue. No destructive blanket migration is performed by this upgrade.

## Cookie choice and security details

httpOnly prevents JavaScript from reading the JWT, reducing direct token theft through
script access. It does not prevent XSS from issuing requests. Cookies are sent automatically,
so SameSite=Lax is supplemented with signed, session-bound CSRF tokens and Origin checks.
React receives only a CSRF token, not the JWT. Secure=true is required with HTTPS in
production; false is only for local HTTP. No credential is stored in localStorage.
Logout increments tokenVersion, revoking ALL that user's sessions (all devices), then
clears the browser cookie. There is no refresh-token flow. Tokens expire after one hour
by default and login is required again. Roles are loaded from DB, not trusted from a JWT.

## Setup checklist

- [ ] Commit/back up your Phase 2 code and development database.
- [ ] Copy all files in this overlay into the same relative paths in your project.
- [ ] Use Node.js 22.12+ and a working development MongoDB.
- [ ] Run manifest verification before installing:

```sh
node scripts/validate-manifests.mjs
npm install
```

Keep a valid existing package-lock.json; npm install updates it for cookie-parser.
No lockfile is supplied because dependencies were not installed in the delivery environment.
After successful install, commit the resulting package-lock.json and use npm ci thereafter.
If your previous lockfile is itself invalid JSON, back it up and regenerate it with npm install.

- [ ] Merge the new .env.example values into your real .env files; do not overwrite existing secrets.
- [ ] Generate a strong JWT secret:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Set server/.env:

```dotenv
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/wondu
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=paste-the-generated-random-value-here
JWT_EXPIRES_SECONDS=3600
COOKIE_SECURE=false
ALLOW_DEMO_SEED=true
DEMO_ADMIN_NAME=Wondu Demo Admin
DEMO_ADMIN_EMAIL=admin@wondu.example
DEMO_ADMIN_PASSWORD=choose-your-own-strong-demo-password
```

Set client/.env:

```dotenv
VITE_DATA_SOURCE=api
VITE_API_URL=http://localhost:5000/api
```

Use localhost consistently in the browser and URLs; do not mix it with 127.0.0.1.
Auth always requires the API, even when discovery is deliberately set to mock mode.

- [ ] Double-check MONGODB_URI points to a disposable development database; seed resets
      deterministic fixture records, hashes random fixture passwords, and updates the
      demo admin's environment-configured password. It never prints passwords, drops the
      database, promotes a conflicting email owner, or creates admins via HTTP.
- [ ] Run `npm run seed`, then set ALLOW_DEMO_SEED=false.
- [ ] Start both applications:

```sh
npm run dev
```

Frontend: http://localhost:5173. API: http://localhost:5000/api.
The root script correctly escapes the nested quotes required by concurrently.

## Automated verification

```sh
node scripts/validate-manifests.mjs
npm test
npm run build
```

Auth integration tests are opt-in and use a UNIQUE disposable database derived from a
base name containing both wondu and test. They drop only that generated database on exit.
Never point tests at a real user database. MongoDB permissions must allow creation/deletion
of the generated test DB. Example:

```sh
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/wondu_auth_test npm test
```

PowerShell:

```powershell
$env:TEST_MONGODB_URI='mongodb://127.0.0.1:27017/wondu_auth_test'
npm test
```

Discovery integration tests now use CATALOG_TEST_MONGODB_URI separately. They read an
already-seeded development database and expect exactly the original fixture counts:

```sh
CATALOG_TEST_MONGODB_URI=mongodb://127.0.0.1:27017/wondu npm test
```

Without those variables, integration suites are explicitly SKIPPED, not falsely passed.
The integration suite covers registration, duplicate email, login, wrong password,
unauthenticated access, traveler-to-admin denial, pending guide restrictions, admin
approval, logout and replay revocation, and CSRF/foreign-origin denial.

## Delivery verification status

All three supplied package.json files passed Python JSON parsing and Node JSON.parse.
All supplied .js/.mjs files passed node --check. Five auth input-validation unit tests
were executed and passed. Packages were NOT installed here. Supertest, MongoDB integration,
Vite build and browser tests have NOT been run; execute the commands above locally.

## Complete file inventory

See docs/PHASE3_CHANGELOG.md for every replacement/new path. docs/API.md describes
request/response shapes, CSRF, role rules, and retained discovery endpoints. The complete
source companion includes every supplied file under its exact relative path.

## Manual test steps

1. Open /dashboard/traveler logged out: expect a redirect to Login. Direct GET
   /api/auth/me without a session returns JSON 401.
2. Register a traveler with a new email and an 8+ character password. Expect automatic
   sign-in, user name/Logout in Navbar, and traveler dashboard. Refresh the page: session persists.
3. Log out, then register the same email with different case: expect 409 and a clear error.
4. Try an invalid email, blank name, or short password: expect field validation. Send
   role=admin through the API with proper CSRF: expect 400. No admin account is created.
5. Log in with the right email but wrong password: expect generic 401. Correct login works.
6. In the traveler session, visit /dashboard/admin: access denied. Direct admin GET/PATCH
   with that same session returns 403, regardless of client-side state.
7. Register a guide in a separate browser/incognito session. Expect pending status;
   the public guide directory omits the profile and /api/dashboard/guide/workspace returns 403.
8. Log in as the environment-seeded admin in another session. Open the admin dashboard,
   find the pending application, and click Approve guide. PATCH uses the Guide ID.
9. Return to the guide session and click Refresh approval status. Expect approved status.
   Workspace check now succeeds. Guide-editing tools themselves are not implemented yet.
10. In browser Storage/Cookies inspect wondu_session: HttpOnly=true, SameSite=Lax,
    Secure=false only locally. There must be no JWT in localStorage or JSON responses.
11. Log out. Navbar returns to Login/Register and protected routes require login again.
    Other sessions for that account are also revoked at their next API request.
12. Submit a write without CSRF or from a foreign Origin: expect 403. Many login attempts
    eventually return 429. Limits use in-memory IP state; restart the dev API to reset them.
13. Stop API and load a protected page: expect retryable session error, not fake login success.
14. Verify keyboard navigation, visible errors/loading states, and mobile navigation.

Stop after Phase 3. Authentication/roles are implemented; booking, payments, password reset,
email verification, guide profile editing and additional admin actions are future work.
