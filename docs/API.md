# Wondu Phase 2 API

Base URL: `http://localhost:5000/api`. All exposed routes are GET-only.
Amounts are demo USD per person. Duration is measured in days. IDs are MongoDB ObjectIds.

| Endpoint | Query parameters | Result |
| --- | --- | --- |
| `/health` | none | 200 if database connected, 503 otherwise |
| `/tours` | search, region, maxPrice, duration, difficulty, guide, featured, sort, page, limit | paginated tours |
| `/tours/:id` | none | single populated tour |
| `/tours/:id/reviews` | page, limit | paginated sample reviews |
| `/destinations` | search, page, limit | paginated destinations |
| `/destinations/:id` | none | single destination |
| `/guides` | search, language, page, limit | paginated guides |
| `/guides/:id` | none | single populated guide |

List shape: `{ "data": [], "pagination": { "total": 8, "page": 1, "limit": 8, "pages": 1 } }`.
Detail shape: `{ "data": {} }`. Errors: `{ "message": "..." }` with an appropriate HTTP status.

- `search`: case-insensitive literal substring. Tours search title, description, and destination name. Guides search user name. Destinations search name.
- `region`: exact destination region, for example `Amhara` or `South Ethiopia`.
- `maxPrice`: inclusive maximum USD price, from 0 through 1000000.
- `duration`: inclusive maximum days, integer 1–365 (not an exact duration).
- `difficulty`: `Easy`, `Moderate`, or `Challenging`.
- `language`: exact language name, for example `French`.
- `guide`: guide ObjectId; used by guide profile pages.
- `featured`: `true` or `false`.
- `sort`: `rating` (default), `price-asc`, or `price-desc`. ID breaks ties.
- `page`: integer 1–10000. `limit`: integer 1–50, default 8.
- Out-of-range pages return an empty data array, not a 404.
- Malformed IDs and invalid filters return 400; valid missing IDs return 404.
- Query values must be plain strings, at most 200 characters. MongoDB operators are never accepted as filters.
- Unknown query keys are ignored; supported filters are allowlisted in the controllers.
- Tour data populates destination and guide, including only the guide user's public name and role.
- Review data exposes the review author's name, not email or password.

Examples:

```sh
curl http://localhost:5000/api/health
curl 'http://localhost:5000/api/tours?search=Lalibela'
curl 'http://localhost:5000/api/tours?region=Amhara&maxPrice=300&difficulty=Easy&limit=6&page=1'
curl 'http://localhost:5000/api/guides?language=French'
curl http://localhost:5000/api/tours/000000000000000000000191
curl http://localhost:5000/api/tours/000000000000000000000191/reviews
```

No POST, PATCH, PUT, or DELETE route exists. There is no login, token issuing,
booking creation, review submission, payment, or admin route in Phase 2.
JWT is installed for the next phase but is deliberately not used yet.
CORS is an origin policy, not authorization. The API must remain read-only until
real authentication, ownership checks, and role enforcement are implemented.
