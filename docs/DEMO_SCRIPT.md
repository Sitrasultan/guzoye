# Three-minute interview demo — implemented scope

Before starting: seed only a disposable DB, set DEMO_GUIDE_PASSWORD, use separate browser
profiles for traveler/guide/admin, and prepare a logged-in admin. Explain that current
reviews are illustrative, wishlist persistence/verified reviews are still pending, and no
payment is collected. Never display .env or passwords on screen.

## 0:00–0:35 — traveler discovery and request

“Guzoye connects travelers with local Ethiopian guides. The public site shows approved
active guides and published tours. I can choose a future departure and see actual remaining
spots. As a traveler, I send a request with two guests. The server calculates the price
and holds spots transactionally; client-supplied prices are ignored.”
Show My Bookings with pending status, Ethiopia departure time, guests and total.

## 0:35–1:40 — a real guide workspace

Switch to guide1@guzoye.example with the environment-configured demo password.
“This is the guide’s studio, not the traveler dashboard: owned tours, booking counts and
incoming requests. My Profile edits my bio, languages, specialties, regions and photo with
a live public preview. Approved guides create their own tours and own their requests.”
Show the tour editor: destination, price, itinerary add/remove, image URLs and departures.
Open the incoming request and Confirm. Explain Decline returns spots, Completed is terminal,
and that a booked departure cannot be deleted. A pending new guide cannot publish.

## 1:40–2:35 — admin visibility and control

Switch to admin Overview. “These charts show requests by status/month and a completed-booking
revenue estimate—not actual payments. I can approve or reject guides with reasons, archive
tours, and reassign to another approved guide. Booking access follows current tour ownership.”
Show guide approval queue, tour reassignment dialog, booking filter, users and audit tabs.
“Deactivation revokes sessions and is blocked while unresolved work would be stranded.”

## 2:35–3:00 — engineering and honest next work

“The backend independently checks roles/ownership on every management route. Writes retain
httpOnly-cookie sessions and signed CSRF protection. Inventory and audit-sensitive mutations
use MongoDB transactions. Conditional updates and unique indexes defend concurrent bookings.”
Show authored tests and distinguish executed validation tests from DB/browser tests still
to run locally. Close: “Next I would finish completed-booking reviews, persisted wishlists,
discovery filters and the final metadata/accessibility/E2E pass. This demo is not payments-
ready and those unfinished pieces are not represented as completed.”
