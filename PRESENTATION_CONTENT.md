# Evantra - Event Management System
## Presentation Content (10-12 Slides)

---

## Slide 1: Title Slide
**Evantra**
**Event Management System**

*A comprehensive web-based platform for seamless event organization and management*

Presented by: [Your Name]
Date: December 3, 2025

---

## Slide 2: Introduction & Problem Statement
**What is Evantra?**
A full-stack web application connecting event organizers, participants, and administrators.

**Challenges Solved:**
- ❌ Scattered event information across multiple platforms
- ❌ Manual registration processes prone to errors
- ❌ Lack of real-time capacity tracking
- ❌ Limited user engagement and feedback

**Solution:** A unified digital platform for end-to-end event management.

---

## Slide 3: Technology Stack
**Architecture:**
- **Frontend:** EJS Templates, Modern CSS (Gradients, Animations, Dark Mode)
- **Backend:** Node.js + Express.js + Session Authentication
- **Database:** MySQL with 7 relational tables
- **Security:** bcryptjs password hashing, token-based reset

**Highlights:**
- RESTful API design
- Connection pooling for performance
- Responsive design for all devices

---

## Slide 4: Database Design
**7 Core Tables:**

| Table | Purpose |
|-------|---------|
| users | User accounts with role-based access |
| events | Event details and metadata |
| registrations | User event bookings |
| payments | Payment tracking |
| event_submissions | Community-submitted events |
| reviews | Ratings and feedback |
| password_reset_tokens | Secure password recovery |

**Features:** Foreign key constraints, cascading deletes, unique constraints

---

## Slide 5: Core Features - Authentication
**User Management:**
- ✅ Secure registration with password hashing
- ✅ Login with "Remember Me" (30-day sessions)
- ✅ Password reset with token verification
- ✅ Role-based access (User/Admin)

**Security Measures:**
- HTTP-only cookies
- SQL injection prevention
- Session management with rolling expiration

---

## Slide 6: Core Features - Event Management
**For Users:**
- 🔍 Smart filtering by category and price
- 📊 Real-time availability tracking
- 🎟️ One-click registration with capacity checks
- 📝 Submit events for community
- ⭐ Rate and review attended events

**For Admins:**
- Create events directly
- Approve/reject user submissions
- View system-wide statistics

---

## Slide 7: Key Functionalities
**Event Discovery:**
- Advanced filtering (6 categories, 4 price ranges)
- Modern card-based grid layout
- Real-time filter statistics

**Registration System:**
- Duplicate prevention with smart ticket updates
- Automatic payment record generation
- "My Events" dashboard

**Review System:**
- 5-star ratings with written comments
- One review per user per event
- Average rating calculation

---

## Slide 8: Design & User Experience
**Modern UI/UX:**
- 🎨 Cyan-Blue gradient theme with custom logo
- 🌙 Dark mode toggle
- ✨ Glassmorphism effects and smooth animations
- 📱 Fully responsive design

**Visual Elements:**
- CSS variables for consistent design system
- Gradient navbar with sticky positioning
- Card hover effects and shadows
- Custom SVG logo

---

## Slide 9: Technical Highlights & Challenges
**Code Quality:**
- Modular route organization (6 route modules)
- Middleware-based authentication
- Async/await for clean code
- Reusable EJS partials

**Challenges Solved:**
1. **Duplicate Registrations:** Unique constraint + update logic
2. **Session Persistence:** Rolling sessions + explicit save
3. **Dark Mode:** Comprehensive CSS overrides
4. **Capacity Management:** Transactional seat checking

---

## Slide 10: System Statistics & Analytics
**Platform Metrics (Real-time):**
- 📊 Total Users
- 🎟️ Total Registrations
- ⭐ Average Rating
- 💬 Review Count

**Project Stats:**
- 📁 7 Database Tables
- 🛣️ 6 Route Modules
- 👁️ 15+ EJS Views
- 🎨 1400+ Lines of CSS

---

## Slide 11: Live Demonstration
**Demo Flow:**

1. **User Journey:**
   - Register/Login with Remember Me
   - Browse and filter events
   - Book tickets (capacity checking)
   - Leave review

2. **Event Submission:**
   - Submit new event
   - Track approval status

3. **Admin Panel:**
   - Review submissions
   - Approve events
   - View analytics

4. **UI Features:**
   - Dark mode toggle
   - Responsive design

---

## Slide 12: Conclusion & Future Enhancements
**Achievements:**
✅ Complete event management ecosystem
✅ Secure authentication & authorization
✅ Modern, intuitive user interface
✅ Robust database architecture
✅ Production-ready application

**Future Plans:**
- 📧 Email notifications
- 💳 Payment gateway integration
- 📅 Calendar export (iCal/Google)
- ⭐ Visual star ratings on cards
- ♿ Enhanced accessibility

**Thank You!** | Questions?

---

## Presentation Tips:

**Timing:** 10-12 minutes total
- Slides 1-3: 2 min (intro)
- Slides 4-6: 3 min (tech & features)
- Slides 7-10: 3 min (functionality & design)
- Slide 11: 3 min (live demo)
- Slide 12: 1 min (conclusion)

**Demo Preparation:**
- Have server running at localhost:3000
- Prepare demo user accounts (user + admin)
- Load sample events in database
- Test all flows beforehand
- Keep screenshots as backup
