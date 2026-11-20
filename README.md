# Evantra - Enterprise Digital Event Discovery & Ticketing Platform

[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-v5.1-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Database Architecture](https://img.shields.io/badge/Engine-Hybrid%20SQLite%20%2F%20MySQL-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Data Visualization](https://img.shields.io/badge/Analytics-Chart.js-FF6384?logo=chart.js&logoColor=white)](https://www.chartjs.org/)
[![Interface](https://img.shields.io/badge/Design-Glassmorphic%20UI-0284c7)](#interface--design-system)
[![Status](https://img.shields.io/badge/Production-Ready-10b981)](#quick-start)

Evantra is an enterprise-grade, full-stack event discovery, seat reservation, and digital ticketing platform. Built on modern web standards, it handles high-concurrency ticket reservations, scannable digital passes, real-time seat inventory, and comprehensive organizer analytics.

---

## Key Platform Capabilities

### 1. Digital Admission Passes & Calendar Synchronization
* **Printable E-Ticket Passes**: Generates formatted digital passes featuring live scannable QR verification codes, simulated door-scanner barcodes, and print-optimized stylesheets (`@media print`).
* **Universal Calendar Integration**: One-click `.ics` calendar exports compatible with Google Calendar, Apple Calendar, and Microsoft Outlook.
* **Security Void Watermarks**: Cancelled or refunded passes are automatically stamped with diagonal void watermarks and flagged at door check-in.

### 2. High-Concurrency Transaction Engine
* **Atomic Seat Reservations**: Ticket purchases are wrapped inside atomic database transactions (`BEGIN IMMEDIATE TRANSACTION` ... `COMMIT` ... `ROLLBACK`).
* **Overbooking Protection**: Strict write-lock concurrency safeguards guarantee that when multiple attendees attempt to book the final available seat simultaneously, exactly one transaction succeeds while competing requests receive a graceful, rollback-protected notification.
* **Self-Service Ticket Cancellation**: Attendees can release tickets with instant seat restoration back to the available inventory pool and automated refund status tracking.

### 3. Visual Analytics & Reporting Dashboard
* **Revenue & Booking Velocity**: Dual-axis Chart.js line charts tracking daily gross revenue settlements (INR) and ticket transaction volume over time.
* **Category Inventory Distribution**: Doughnut visualization categorizing active inventory across Technology & AI, Music & Festivals, Business Summits, Sports & Fitness, and Creative Arts.
* **Top Bestsellers Ranking**: Horizontal bar chart identifying premier events ranked by confirmed attendee allocations.
* **One-Click Attendee Roster Exports**: Dedicated CSV export endpoints for downloading check-in participant lists and master catalogs.

### 4. Hybrid Relational Data Engine
* **Zero-Configuration Embedded SQLite**: Automatically provisions and manages `event_db.sqlite` with comprehensive relational tables, foreign key constraints, indexes, and full seed data.
* **Automatic Cloud MySQL Detection**: Seamlessly switches to production MySQL/MariaDB instances when environment variables are detected in `.env`.
* **Dynamic Date Synchronization**: Automatically keeps past catalog dates current, rolling events into upcoming schedules relative to the current timestamp.

### 5. Glassmorphic User Interface
* **Aesthetic Design Language**: Frosted glass containers (`backdrop-filter: blur(20px)`), ambient gradient meshes, and balanced edge gutters (`clamp(1.5rem, 4vw, 3.5rem)`).
* **System-Wide Dark Mode**: Persistent theme switching with adaptive contrast across cards, data tables, and modal dialogs.
* **Professional Vector Icons**: Universal SVG vector icon system across all navigation, metric pills, categories, and controls.

---

## Quick Start Guide

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/your-username/evantra.git
cd evantra
npm install
```

### 2. Launch the Application
Start the server using Node.js:
```bash
node server.js
```
*(Alternatively, run `npm start`)*

### 3. Access the Platform
Navigate to **[http://localhost:3000](http://localhost:3000)** in your web browser.

---

## Default Access Credentials

The platform comes pre-seeded with designated credentials for administrative and standard attendee workflows:

| Account Type | Email Address | Password | Role & Permissions |
| :--- | :--- | :--- | :--- |
| **Platform Administrator** | `admin@example.com` | `admin123` | Analytics dashboard, roster exports, event curation, submission moderation |
| **Attendee Demo** | `user@example.com` | `user123` | Event discovery, ticket booking, pass viewing, cancellations, community reviews |

> [!NOTE]
> Public registration is open; new users can create personalized accounts via the **Sign Up** interface.

---

## Architecture & Directory Layout

```
├── server.js                      # Application bootstrap, routing configuration & middleware
├── db.js                          # Hybrid relational database driver (SQLite / MySQL) with transaction support
├── event_db.sqlite                # Embedded SQLite database (1,500+ curated records)
├── package.json                   # Dependency definitions and scripts
│
└── event-management/
    ├── middleware/
    │   └── authMiddleware.js      # Session-based route guards and role-based access control
    ├── public/
    │   ├── css/
    │   │   └── styles.css         # Glassmorphism design system, dark mode & print layouts
    │   └── js/
    │       ├── event-filters.js   # Dynamic category and price filtration
    │       ├── live-events.js     # Timezone-aware date calculations and relative counters
    │       └── theme.js           # Theme persistence controller
    ├── routes/
    │   ├── admin.js               # Analytics aggregations, attendee rosters & CSV exports
    │   ├── auth.js                # Authentication, password resets, and session lifecycles
    │   ├── events.js              # Event listings, search queries, and details
    │   ├── register.js            # Atomic ticket reservations, cancellations & passes
    │   ├── reviews.js             # Attendee ratings and feedback submissions
    │   └── user-events.js         # Community event proposal management
    └── views/
        ├── partials/
        │   ├── header.ejs         # Glassmorphic top navigation & profile bar
        │   └── footer.ejs         # Footer navigation, categories & live metric stats
        ├── admin_dashboard.ejs    # Chart.js analytics & platform administration
        ├── admin_submissions.ejs  # Proposal review & moderation workflow
        ├── create_event.ejs       # Administrative event publishing form
        ├── event_details.ejs      # Event overview, venue information & reservation widget
        ├── index.ejs              # Discovery catalog, search filters & category navigation
        ├── my_events.ejs          # Attendee booking portal & self-service cancellation
        ├── participants.ejs       # Attendee roster view with CSV export capability
        ├── submit_event.ejs       # Community event submission portal
        └── ticket_pass.ejs        # Printable digital boarding pass with QR & calendar sync
```

---

## Database Configuration

### Embedded SQLite Mode (Default)
By default, the platform runs in embedded mode with zero external dependencies. SQLite database initialization, foreign key activation (`PRAGMA foreign_keys = ON;`), and schema migrations run automatically on startup.

### External MySQL / MariaDB Mode (Optional)
To connect to an external MySQL server, provide an environment configuration file:

Create `.env` in the project root:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=event_db
```

The database driver automatically tests the connection; if MySQL is reachable, it mounts the connection pool; otherwise, it falls back seamlessly to embedded SQLite.

---

## Production Security & Concurrency Design

* **Session Integrity**: Session cookies configured with `httpOnly`, rolling expiration, and dynamic `secure` flags in production environments.
* **SQL Injection Prevention**: All database interactions utilize parameterized prepared queries (`?` parameterization).
* **Cryptographic Passwords**: User credentials secured using salted Bcrypt hashes (`bcryptjs` with salt round cost factor 10).
* **Audit Trail**: High-impact platform actions (`TICKET_BOOKED`, `TICKET_CANCELLED`, `TICKET_REBOOKED`, `EVENT_SUBMITTED`) are persisted to `audit_logs` with actor details and timestamps.

---

## License

This project is licensed under the [ISC License](LICENSE).
