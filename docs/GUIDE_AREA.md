# Guzoye Guide Area

## Scope

This delivery adds a dedicated `/guide` workspace for approved guides, restricted onboarding for pending or rejected guides, server-side performance scoring and ranking, and enhanced admin guide/request management.

Guides cannot create tours, assign themselves, or edit admin-owned catalog data. Admins assign destinations and tours; guide requests only propose assignments or time off.

## Routes

- `GET /api/guide/overview` — guide KPIs, upcoming groups, charts and activity.
- `GET /api/guide/schedule` — assigned tours, destinations, groups and blocked dates.
- `POST /api/guide/schedule/blocked-dates` — block a date; rejected when a confirmed booking exists.
- `DELETE /api/guide/schedule/blocked-dates` — unblock a date.
- `GET /api/guide/feedback` — explicit unsupported feedback empty state.
- `GET /api/guide/performance` — current guide performance and ranks.
- `GET /api/guides/:id/performance` — public performance for a guide.
- `GET /api/guides/ranking` — public ranking, optionally scoped by destination.
- `GET /api/admin/guides` — enhanced admin guide list with status, destination, suspension and rank filters.
- `PATCH /api/admin/guides/:id/suspend` — suspend with required reason.
- `PATCH /api/admin/guides/:id/reactivate` — reactivate.

All guide mutations require session auth, the `guide` role, approved/active guide status where applicable, CSRF token, validation and rate limits. Admin mutations require session auth, the `admin` role, CSRF token and audit logging.

## Performance formula

Score is 0-100. Weights: rating 40, completion 20, request acceptance 15, response time 10, low cancellation/decline 10, completed-tour experience 5.

- Rating: Bayesian average `(3.8 * 5 + rating * reviewCount) / (5 + reviewCount)`, scaled to 100.
- Completion: `completed / (completed + declined + cancelled) * 100`.
- Acceptance: approved guide requests / decided guide requests * 100.
- Response: 100 at 2 hours or less, linearly to 0 at 72 hours.
- Reliability: `(1 - (cancelled + declined) / decided bookings) * 100`.
- Experience: `min(completed tours / 20, 1) * 100`.

Missing components are excluded and their weights are redistributed proportionally. A guide is ranked after at least one review, three completed tours, or three decided guide requests.

## Feedback

The existing `Review` model is tour-scoped and has no guide reference, sub-ratings, or public guide reply field. The Feedback page therefore displays the friendly empty state rather than fabricating data. Adding guide feedback requires a schema migration and new review endpoints.
