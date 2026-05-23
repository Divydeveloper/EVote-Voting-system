# 🗳️ E-Vote India — Secure Online Voting System

A full-stack, production-grade online voting platform built with React, Node.js, Express, and MongoDB.

---

## 📁 Folder Structure

```
evote/
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── middleware/
│   │   └── auth.js                # JWT + role-based auth middleware
│   ├── models/
│   │   ├── User.js                # Voter & Admin schema
│   │   ├── Election.js            # Election schema
│   │   ├── Candidate.js           # Candidate schema
│   │   ├── Vote.js                # Tamper-evident vote schema
│   │   └── AuditLog.js            # Security audit log schema
│   ├── routes/
│   │   ├── auth.js                # Register, login, OTP, reset
│   │   ├── elections.js           # CRUD elections
│   │   ├── candidates.js          # CRUD candidates
│   │   ├── votes.js               # Cast & verify votes
│   │   ├── admin.js               # Admin dashboard & voter management
│   │   └── audit.js               # Audit log queries
│   ├── utils/
│   │   ├── email.js               # Nodemailer email templates
│   │   └── seeder.js              # Demo data seeder
│   ├── .env.example
│   ├── package.json
│   └── server.js                  # Express app entry point
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/shared/
    │   │   ├── AppLayout.js       # Sidebar + Header wrapper
    │   │   ├── Sidebar.js         # Navigation sidebar
    │   │   ├── Header.js          # Top header bar
    │   │   └── ProtectedRoute.js  # Role-based route guard
    │   ├── context/
    │   │   ├── AuthContext.js     # Global auth state
    │   │   └── ThemeContext.js    # Dark/light mode
    │   ├── pages/
    │   │   ├── Login.js
    │   │   ├── Register.js        # + OTP verification step
    │   │   ├── ForgotPassword.js
    │   │   ├── ResetPassword.js
    │   │   ├── voter/
    │   │   │   ├── VoterDashboard.js
    │   │   │   ├── Elections.js
    │   │   │   ├── ElectionDetail.js  # Vote casting UI
    │   │   │   ├── VoterProfile.js
    │   │   │   ├── MyVotes.js
    │   │   │   └── VerifyVote.js
    │   │   └── admin/
    │   │       ├── AdminDashboard.js  # Charts & stats
    │   │       ├── AdminElections.js  # Create/manage elections
    │   │       ├── AdminCandidates.js # Add/edit candidates
    │   │       ├── AdminVoters.js     # Voter management
    │   │       ├── AdminAnalytics.js  # Live vote charts
    │   │       └── AuditLogs.js       # Security audit trail
    │   ├── styles/
    │   │   └── global.css         # Design system
    │   ├── utils/
    │   │   └── api.js             # Axios instance
    │   ├── App.js                 # Routes
    │   └── index.js
    └── package.json
```

---

## ⚡ Quick Setup (Local Development)

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (free tier) OR local MongoDB
- Gmail account (for emails) OR skip email config

---

### Step 1 — Clone & Install

```bash
# Install backend dependencies
cd evote/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

### Step 2 — Configure Backend

```bash
cd evote/backend
cp .env.example .env
```

Edit `.env`:
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/evote
JWT_SECRET=your_random_secret_at_least_32_characters_long
JWT_REFRESH_SECRET=another_random_secret_for_refresh_tokens
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_gmail_app_password
FRONTEND_URL=http://localhost:3000
```

> **Gmail App Password:** Go to Google Account → Security → 2-Step Verification → App Passwords → Generate

---

### Step 3 — Seed Demo Data

```bash
cd evote/backend
npm run seed
```

This creates:
- `superadmin@evote.gov.in` / `Admin@123`
- `admin@evote.gov.in` / `Admin@123`
- `rahul@example.com` / `Voter@123`
- 2 elections with 4 candidates each

---

### Step 4 — Run Development Servers

**Terminal 1 — Backend:**
```bash
cd evote/backend
npm run dev
# Runs on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd evote/frontend
npm start
# Runs on http://localhost:3000
```

---

## 🔑 Default Login Credentials

| Role       | Email                      | Password    |
|------------|---------------------------|-------------|
| Superadmin | superadmin@evote.gov.in   | Admin@123   |
| Admin      | admin@evote.gov.in        | Admin@123   |
| Voter      | rahul@example.com         | Voter@123   |
| Voter      | priya@example.com         | Voter@123   |

---

## 🌐 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new voter |
| POST | /api/auth/login | Login (voter/admin) |
| POST | /api/auth/verify-otp | Verify email OTP |
| POST | /api/auth/resend-otp | Resend OTP |
| POST | /api/auth/forgot-password | Request reset link |
| POST | /api/auth/reset-password/:token | Set new password |
| GET  | /api/auth/me | Get current user |
| POST | /api/auth/logout | Logout |

### Elections
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET  | /api/elections | Any | List elections |
| GET  | /api/elections/:id | Any | Election details |
| POST | /api/elections | Admin | Create election |
| PUT  | /api/elections/:id | Admin | Update election |
| PATCH| /api/elections/:id/status | Admin | Change status |
| DELETE| /api/elections/:id | Admin | Delete election |
| GET  | /api/elections/:id/results | Any | Results |

### Votes
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/votes/cast | Voter | Cast vote |
| GET  | /api/votes/status/:electionId | Voter | Check if voted |
| GET  | /api/votes/verify/:hash | Public | Verify vote hash |
| GET  | /api/votes/live/:electionId | Admin | Live vote counts |

### Admin
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET  | /api/admin/dashboard | Admin | Analytics overview |
| GET  | /api/admin/voters | Admin | List voters |
| GET  | /api/admin/voters/:id | Admin | Voter detail |
| PATCH| /api/admin/voters/:id/status | Admin | Toggle active |
| GET  | /api/admin/export/election/:id | Admin | Export results |

---

## 🚀 Deployment Guide

### Frontend → Vercel

```bash
# Install Vercel CLI
npm i -g vercel

cd evote/frontend
# Create .env.production
echo "REACT_APP_API_URL=https://your-backend.onrender.com/api" > .env.production

# Deploy
vercel --prod
```

### Backend → Render

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Add Environment Variables (from your `.env`)
6. Deploy → copy the URL

### Database → MongoDB Atlas

1. [cloud.mongodb.com](https://cloud.mongodb.com) → Create free cluster
2. Database Access → Add user
3. Network Access → Allow `0.0.0.0/0`
4. Connect → Copy connection string
5. Paste into `MONGO_URI` in your backend env

---

## 🔐 Security Features

- ✅ JWT authentication (access + refresh tokens)
- ✅ bcrypt password hashing (cost factor 12)
- ✅ Email OTP verification
- ✅ Role-based access control (voter/admin/superadmin)
- ✅ Rate limiting on all API routes
- ✅ Helmet.js security headers
- ✅ Account lockout after 5 failed logins (30 min)
- ✅ Tamper-evident vote hashing (SHA-256)
- ✅ Duplicate vote prevention (two-layer check)
- ✅ Complete audit logging with severity levels
- ✅ Anonymous voting (secret ballot)
- ✅ Input validation on all endpoints
- ✅ CORS protection
- ✅ Auto-expiring audit logs (2 years)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Chart.js |
| Styling | Custom CSS (government design system) |
| HTTP Client | Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Email | Nodemailer |
| Validation | express-validator |
| Security | Helmet, express-rate-limit |
| PDF Export | jsPDF |

---

## 📧 Support

For issues, open a GitHub issue or contact the system administrator.

**E-Vote India** — Empowering Democracy Through Technology 🇮🇳
