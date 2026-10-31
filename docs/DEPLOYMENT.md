# Deployment guide — current guide/admin scope

No deployment has been executed. This guide covers the current Phase 4 + Parts A/C source,
not the missing reviews/wishlist/discovery features. Complete docs/STATUS.md before presenting
it as the requested finished application. Do not deploy a demo password publicly.

## Recommended topology

Use HTTPS subdomains of one domain you control:

- Frontend: https://app.your-domain.example on Vercel or Netlify.
- Backend: https://api.your-domain.example on Render or Railway.
- Database: MongoDB Atlas transaction-capable deployment.

These URLs are EXAMPLES to replace, not actual deployed services. With same-site subdomains,
existing SameSite=Lax host-only cookies work while CORS still needs the exact frontend origin
and credentials. COOKIE_SECURE=true in production. Keep JWT and CSRF cookies host-only, do
not add an unnecessary parent-domain cookie.

## Atlas

1. Create a transaction-capable Atlas deployment; multi-document transactions are required.
2. Create a dedicated database user with minimum application permissions.
3. Restrict network access appropriately; avoid leaving unrestricted network rules open.
4. Store URI credentials only as backend environment secrets. Test connection and transaction
   behavior in staging. Enable backups and verify recovery before launch.
5. Ensure required booking unique indexes exist. Run the existing checkBookingDB.js in a
   controlled staging/admin job (it creates/verifies indexes), not from a public HTTP route.
6. Never run the development fixture reset against a real user database.

## Backend on Render or Railway

This is an npm-workspaces monorepo. Install from the repository root, not a copied server-only
folder, so root/shared/catalog.json and workspace resolution remain available.

- Build/install: npm ci (after committing a valid package-lock.json).
- Start: npm run start -w server.
- Health path: /api/health.
- Runtime: Node.js 22.12+; bind on provider-supplied PORT (existing app.listen does).
- Attach the custom HTTPS api subdomain.
- Keep one API instance until you introduce shared rate-limit storage/proxy-aware hardening.
- Configure trusted proxy hops for the actual provider before relying on per-IP enforcement;
  this overlay deliberately does not guess a deployment's proxy trust topology.

Backend runtime environment (all already existed):

```dotenv
NODE_ENV=production
MONGODB_URI=your-secret-atlas-uri
CLIENT_ORIGIN=https://app.your-domain.example
JWT_SECRET=your-long-random-production-secret
JWT_EXPIRES_SECONDS=3600
COOKIE_SECURE=true
ALLOW_DEMO_SEED=false
```

PORT is supplied by the host; do not assume port 5000. DEMO_ADMIN_NAME/EMAIL/PASSWORD and
DEMO_GUIDE_PASSWORD are development seed inputs, not production runtime requirements.
The seed intentionally refuses NODE_ENV=production. A secure audited one-time production
admin-provisioning process is NOT included; implement it separately. Do not disable the
production seed guard or set development mode against a live database to work around it.

## Frontend on Vercel or Netlify

Build from the repo root to retain shared/catalog.json used by the existing mock adapter.
Use npm ci, then npm run build -w client. Publish client/dist. Set build-time variables:

```dotenv
VITE_DATA_SOURCE=api
VITE_API_URL=https://api.your-domain.example/api
```

No private secrets go in VITE variables. Configure the custom HTTPS app subdomain. Configure
SPA rewrites so /dashboard/guide and /tours/:id return index.html, not host 404 errors:

- Vercel: project rewrite from /(.*) to /index.html in the deployed SPA configuration.
- Netlify: publish a _redirects rule /* /index.html 200.

Use hosting settings/config for your deployment; no untested platform config is included.
Rebuild after changing VITE_API_URL. Backend CLIENT_ORIGIN must exactly match the final
frontend origin without trailing slash. Preview-host domains are not auto-allowlisted.

## Different registrable domains and cookies

Default vercel.app/netlify.app and onrender.com/railway-hosted domains are cross-site.
The current code uses SameSite=Lax on BOTH session and CSRF cookies; it is not configured
for cross-site cookies merely by setting withCredentials. Do not claim that setup works
unchanged. Recommended solution: use same-site custom subdomains as above.

If you deliberately deploy on unrelated sites, BOTH server/src/services/session.js and
server/src/middleware/csrf.js cookie settings need SameSite=None AND Secure=true over HTTPS.
Retain exact credentialed CORS, existing signed CSRF protection and Origin validation.
Login/register/logout must use consistent cookie attributes so deletion works. Test major
browsers because third-party-cookie blocking may still prevent sessions. This optional
cross-site patch is NOT included in this delivery; no new environment toggle was added.
A same-origin reverse proxy is another option but needs deliberate route/proxy deployment
configuration and exact origin handling, not blind cookie changes.

## Production checklist

- [ ] Finish missing Part B and final Part D QA before calling the requested project complete.
- [ ] Implement audited production admin provisioning; no public registration promotion.
- [ ] Commit lockfile; run npm ci, npm audit, all tests and production frontend build.
- [ ] Verify replica-set transactions and unique active-booking index in staging.
- [ ] Use HTTPS, secure cookies, exact origins and strong environment-managed secrets.
- [ ] Verify CSRF denial, roles, ownership, rejected guides and deactivated sessions.
- [ ] Verify login refresh/logout, tour creation, reassignment and booking races in browsers.
- [ ] Configure SPA rewrites, approved image policy, monitoring, logs and backups.
- [ ] Resolve proxy trust and shared IP rate-limit storage before scaling.
- [ ] Do not expose demo passwords/seed endpoints; no payment is collected by this app.
