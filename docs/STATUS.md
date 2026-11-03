# Wondu — Final Delivery 1 status (partial, items 1 and 2)

Built against the supplied wondu-current.zip, not a reconstructed project.

## Implemented in this ZIP

1. Guide photo uploads: picker/drop target, circular preview, real XHR upload progress,
   errors and Remove photo; JPEG/PNG/WebP content signatures + Sharp decoding, 2 MB limit,
   pixel/page bounds, oriented square 400px WebP without retained metadata. Auth/guide role,
   pending-or-approved checks, signed multipart CSRF before multer. Random filenames,
   local serving, optional Cloudinary adapter, tracked replacement/deletion cleanup.
2. Tour images use the same uploader: maximum six, first cover, move earlier/later,
   remove, owned drafts/library, bind to a saved tour, cleanup after successful save.
   Existing booked-tour edit guards and tour ownership remain in effect.
3. Avatar rendering handles uploaded paths and initials in guide cards, public profile,
   tour guide section and Navbar. Navbar updates after photo changes without re-login.
4. Guides page filters by canonical destination, language, min rating, name and sort
   (rating/experience/name), all in URL with pagination. Public guide coverage is the
   union of explicit profile place IDs and published non-archived owned tour destinations.
   Pending/rejected/inactive guides and inactive users are excluded. Cards/profile show
   Covers; Tour Details adds Local guides in <place> and a filtered-directory link.
5. Place checkbox multi-select replaces free-text region editing in My Profile. Legacy
   regionsCovered data is retained, never guessed into specific destination IDs.
6. New validation and integration tests; manifest validation, migration and cleanup scripts;
   API/setup/storage docs and exact changed/new manifest.

## Still missing from Delivery 1

Items 3–6 are NOT implemented in this partial ZIP:
- Completed-booking reviews, per-booking uniqueness, mutations, aggregates, breakdown UI.
- Persisted wishlist and optimistic shared heart state/page.
- Soonest/available-spots TOUR sorting/filtering (guide sorting IS implemented).
- useDocumentTitle, per-route metadata and a new dedicated 404 page. The prior generic
  catch-all page remains, not the requested final custom implementation.
Item 7 is partial: tests exist for uploads/place filtering/permissions, not unwritten
review/wishlist/discovery features. Existing illustrative reviews/local hearts remain.
Delivery 2 redesign, lightbox, lazy routes, full typography/toast/form polish and final
browser/accessibility/performance audit have not started.

## Executed versus not executed

Executed: JSON parsing of all 3 existing/supplied manifests; Node syntax checks for .js/.mjs;
30 dependency-free tests (6 new, 24 existing). Archive inventory/integrity verified.
Not executed: npm install, lockfile regeneration, Sharp decoder tests, HTTP/Supertest,
MongoDB transactions, Cloudinary, Vite JSX/build, browser/mobile/camera/accessibility tests.
Auth/role/CSRF source code is retained or narrowly extended; this is not a penetration test.

## Known boundaries

Upload progress reports transfer; 100% may still be processing/saving. Browser/OS controls
whether the file picker offers gallery/camera; there is no forced capture-only attribute.
The circular preview is not an interactive crop editor; server performs centered crop.
External seeded image URLs remain compatible; the new UI creates images by upload only.
Photo URL updates via generic profile PATCH are intentionally rejected.
Uploads are public image URLs, not private document storage. Legacy externally hosted
images are never deleted from an external account the app does not own.
No automatic cross-provider migration. Provider/DNS outages can delay deletion; cleanup
retries tracked records. Untracked Cloudinary orphan after simultaneous DB+delete failure
requires an operator asset audit; keys are logged. Local untracked files older than 24h
are reconciled by cleanupMedia.js. Concurrent cleanup/upload/deletion needs DB testing.
