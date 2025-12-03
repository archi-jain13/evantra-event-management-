# Event Management System

## Issues Fixed

### 1. File Path Issues
- ✅ **Fixed route imports**: Updated `server.js` to point to correct route files in `./event-management/routes/`
- ✅ **Fixed static files path**: Updated to point to `event-management/public`
- ✅ **Fixed views path**: Added proper views directory configuration
- ✅ **Fixed database imports**: Updated all route files to use `../../db` instead of `../db`

### 2. Database Configuration
- ✅ **Fixed MySQL library compatibility**: Changed from `mysql2/promise` to `mysql` with promisify
- ✅ **Fixed query syntax**: Updated all database queries to work with `mysql` library (removed array destructuring)
- ✅ **Simplified transactions**: Updated register.js to work without transaction support

### 3. Folder Structure
- ✅ **Fixed partials folder**: Moved from `views/views/partial/` to proper `views/partials/`
- ✅ **Fixed static assets**: Moved JS files from `public/css/js/` to proper `public/js/`
- ✅ **Removed duplicate folders**: Cleaned up nested directory structure

### 4. Dependencies
- ✅ **Added bcryptjs**: Added to root package.json for create_admin.js
- ✅ **Fixed MySQL dependency**: Ensured consistency between root and event-management packages

### 5. Missing Files
- ✅ **Created create_admin.js**: Script to create admin user for the system
- ✅ **Created schema.sql**: Database schema with sample data

## Project Structure (Final)
```
dbms peoject/
├── server.js                 # Main server file
├── db.js                     # Database connection
├── create_admin.js           # Admin user creation script
├── schema.sql               # Database schema
├── package.json             # Root dependencies
└── event-management/
    ├── middleware/
    │   └── authMiddleware.js
    ├── public/
    │   ├── css/
    │   │   └── styles.css
    │   └── js/
    │       └── theme.js
    ├── routes/
    │   ├── admin.js
    │   ├── auth.js
    │   ├── events.js
    │   └── register.js
    └── views/
        ├── partials/
        │   ├── header.ejs
        │   └── footer.ejs
        ├── admin_dashboard.ejs
        ├── create_event.ejs
        ├── event_details.ejs
        ├── index.ejs
        ├── login.ejs
        ├── my_events.ejs
        ├── participants.ejs
        └── register.ejs
```

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Database**
   - Import `schema.sql` into your MySQL database
   - Update database credentials in `db.js`

3. **Create Admin User**
   ```bash
   node create_admin.js
   ```

4. **Start Server**
   ```bash
   npm start
   ```

## Default Admin Credentials
- **Email**: admin@example.com
- **Password**: admin123

## Features Working
- ✅ User registration and login
- ✅ Event listing and details
- ✅ Event registration with ticket booking
- ✅ Admin panel for event management
- ✅ Payment tracking (simulated)
- ✅ Dark mode toggle
- ✅ Responsive design

All major issues have been resolved and the application should now run without errors.