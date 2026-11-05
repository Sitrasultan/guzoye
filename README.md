# Guzoye — Discover Ethiopia Through Local Eyes

### Extraordinary places. Local knowledge. Meaningful journeys.

Guzoye is a travel discovery and booking platform that connects travelers with locally led experiences across Ethiopia. From ancient heritage sites and vibrant cities to dramatic highlands and natural wonders, Guzoye brings destinations, tours, guides, and trip planning into one connected experience.

Built around three dedicated workspaces—Traveler, Guide, and Admin—the platform supports a coordinated journey from discovery and booking requests to guide assignments and departure management.

> Development status: Active development. Features and interfaces are being refined, and some workflows require further integration testing before production use.

---

## The Guzoye Experience

Travel is more than reaching a destination. It is understanding the place, meeting its people, and returning with a story worth sharing.

Guzoye aims to make that experience easier through:

- Image-led destination and tour discovery.
- Local guide profiles and performance insights.
- Departure-based booking with guide selection.
- Dedicated workspaces for travelers, guides, and administrators.
- A responsive interface designed for desktop and mobile use.

---

## Platform Workspaces

### Traveler Experience

Discover journeys and manage travel plans through a dedicated account area.

The traveler experience includes or is being developed around:

- Tour and destination discovery.
- Tour details and departure selection.
- Booking requests with guide choice.
- Upcoming and past trip views.
- A personalized dashboard.
- Wishlist and feedback workflows.
- Profile, account settings, and appearance preferences.

Availability varies by the current development branch. Some traveler workflows remain under integration and review.

### Guide Workspace

A focused workspace for managing assigned journeys and traveler requests.

Guide functionality includes:

- Application status and profile management.
- Assigned tours and destinations.
- Booking request management.
- Departure schedules and per-guide groups.
- Availability and blocked dates.
- Requests to administrators for assignments or time off.
- Performance and ranking views.
- Feedback-related interfaces.

Guides do not create tours or assign themselves. Administrators manage the catalog and approve assignments.

### Admin Workspace

A dedicated administration area for coordinating platform operations.

Admin functionality includes:

- Tour and destination management.
- Guide application review and management.
- Tour and destination assignments.
- Guide request review.
- Departure and group management.
- Booking oversight.
- Analytics, exports, and audit-related tools.

---

## Design Direction

Guzoye combines an image-led travel experience with clear, task-focused workspaces.

The traveler and public interface is evolving toward:

- Navy navigation and soft backgrounds.
- Rounded cards and spacious layouts.
- Pastel dashboard highlights.
- Destination photography and welcoming travel banners.
- Responsive navigation and mobile drawers.

Guide and administrator workspaces retain their own role-focused layouts and established styling.

---

## Technology Stack

### Frontend

- React
- Vite
- React Router
- Axios
- Recharts
- Lucide React
- CSS

### Backend

- Node.js
- Express
- MongoDB
- Mongoose

### Authentication and Request Protection

- Cookie-based authentication
- Role-based authorization
- CSRF protection
- Request validation
- Rate limiting
- Security headers

### Image Processing

- Multer
- Sharp
- Image validation and processing utilities

---

## Booking and Assignment Model

Guzoye organizes bookings around tours, departures, and assigned guides.

1. An administrator creates a tour and its departures.
2. Approved guides are assigned to the tour.
3. Departures can contain separate guide groups.
4. A traveler selects a departure and an available guide.
5. The booking request enters the guide workflow.
6. Booking status and availability are updated through the server.

Assignment and booking operations use MongoDB transactions where implemented. A MongoDB replica set or compatible Atlas deployment is therefore required for those workflows.

---

## Project Structure

```text
wondu/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── services/
│   ├── index.html
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── scripts/
│   │   └── services/
│   ├── test/
│   └── package.json
│
├── shared/
├── docs/
├── scripts/
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

Before running Guzoye locally, install:

- Node.js and npm compatible with the project dependencies.
- Git.
- MongoDB configured as a replica set, or access to MongoDB Atlas.

### 1. Clone the Repository

Replace `YOUR-USERNAME` with the repository owner's GitHub username.

```bash
git clone [https://github.com/YOUR-USERNAME/guzoye.git](https://github.com/YOUR-USERNAME/guzoye.git)
cd guzoye
```

### 2. Install Dependencies

From the repository root:

```bash
npm install
```

### 3. Configure Environment Variables

Use the example files included in the project as the starting point.

Windows Command Prompt:

```bat
copy server\.env.example server\.env
copy client\.env.example client\.env
```

macOS or Linux:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Review each example and configure the required values, including:

- MongoDB connection settings.
- Authentication secrets.
- Client origin.
- Client API URL.
- Any optional storage or demo configuration.

Never commit real `.env` files, passwords, authentication secrets, or database credentials.

### 4. Start the Application

From the repository root:

```bash
npm run dev
```

Open the address printed by Vite. The local frontend commonly runs at:

```text
http://localhost:5173
```

Check the server terminal as well as the browser console when testing features.

---

## Useful Commands

Run these from the repository root:

| Command | Purpose |
|---------|---------|
| `npm install` | Install project dependencies |
| `npm run dev` | Start the development environment |
| `npm run build` | Build the frontend for production |
| `npm test` | Run the configured server test suite |

Database-dependent tests may require additional environment configuration. Review the test files and project documentation for the conditions under which integration tests run or are skipped.

A successful frontend build does not replace runtime testing, API testing, or database integration testing.

---

## Main Application Areas

| Route | Area |
|-------|------|
| `/` | Public homepage |
| `/tours` | Tour discovery |
| `/guides` | Guide discovery |
| `/login` | Sign in |
| `/register` | Registration |
| `/account` | Traveler workspace |
| `/guide` | Guide workspace |
| `/admin` | Admin workspace |

Protected areas require the appropriate account role. Available routes can vary while features are under development.

---

## Security and Privacy

Guzoye includes security controls intended to protect user accounts and platform operations:

- Role-based access to protected workflows.
- Ownership checks for user-specific operations.
- CSRF validation for protected writes.
- Server-side validation of submitted data.
- Rate limits on selected endpoints.
- Validation and processing of uploaded images.
- Audit logging for selected administrative actions.

These controls require continued testing and review. The project should not be treated as production-ready solely because the development server starts or the build completes.

Before deployment:

- Use strong, unique secrets.
- Configure HTTPS and secure cookies appropriately.
- Restrict allowed origins.
- Review upload storage and access policies.
- Keep dependencies maintained.
- Verify authorization, transactions, and error handling.
- Confirm private profile information is not exposed.

---

## Development Status

Guzoye is an evolving project.

Current work focuses on:

- Refining the traveler dashboard and public interface.
- Completing traveler profile and settings workflows.
- Improving wishlist and feedback integration.
- Strengthening readable identifiers and canonical links.
- Validating guide performance and ranking behavior.
- Expanding automated and manual test coverage.
- Improving accessibility and responsive behavior.

Some screens, endpoints, and tests are still being integrated. Consult the current source code and the `docs/` directory for implementation details rather than assuming every planned feature is complete.

---

## Contributing

Suggestions, bug reports, and thoughtful improvements are welcome.

Before submitting a change:

1. Keep changes focused and clearly described.
2. Preserve role, ownership, and CSRF protections.
3. Avoid adding dependencies unless necessary.
4. Check imports, exported functions, and API route alignment.
5. Run the build and relevant tests.
6. Test affected pages in the browser.
7. Document limitations and any required migrations.
8. Keep credentials and private data out of commits.

---

## Vision

To make exploring Ethiopia more personal, accessible, and connected to the people who know it best.

### Guzoye — Your next great story starts with a local.