# Guzoye Admin A

This delivery adds the dedicated `/admin` shell, interactive Overview, guide-request backend, analytics, admin tour media endpoints, tour status workflow, and CSV exports.

## New dependencies

None. The Overview uses accessible, lightweight SVG/CSS visualizations to avoid adding a chart dependency in this delivery.

## Environment variables

No new environment variables.

## Install and migrate

From `server`:

```bat
npm install
node src/scripts/migrate-guzoye-admin-a.js --dry-run
node src/scripts/migrate-guzoye-admin-a.js
```

The migration sets `Tour.status` to `archived`, `published`, or `draft`. It does not delete records. Use `--dry-run` first.

From `client`:

```bat
npm install
npm run build
```

## API

- `GET /api/admin/overview?range=7|30|90|custom&from=&to=`
- `GET /api/admin/activity`
- `GET /api/admin/guide-requests`
- `PATCH /api/admin/guide-requests/:id/approve`
- `PATCH /api/admin/guide-requests/:id/reject`
- `GET /api/guide/requests`
- `POST /api/guide/requests`
- `DELETE /api/guide/requests/:id`
- `POST /api/admin/tours/:id/images`
- `DELETE /api/admin/media/:mediaId`
- `GET /api/admin/exports/bookings.csv`
- `GET /api/admin/exports/guides.csv`
- `GET /api/admin/exports/tours.csv`

All admin endpoints require an active admin session. Guide request endpoints require an authenticated guide or admin as appropriate. Writes require the existing CSRF flow.
