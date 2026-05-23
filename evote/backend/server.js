/**
 * E-Vote India — Main Server Entry Point
 * ----------------------------------------
 * Sets up Express, middleware, routes, and connects to MongoDB.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ─── Security Middleware ───────────────────────────────
app.use(helmet()); // Sets security HTTP headers

// ─── CORS ─────────────────────────────────────────────
app.use(cors({
  origin:"https://e-vote-voting-system-git-main-divyanshs-projects-b81ac839.vercel.app",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body Parsing ─────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ──────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Global Rate Limiting ─────────────────────────────
const globalLimiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// ─── Strict Rate Limiting for Auth Routes ─────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes.' },
});

// ─── API Routes ───────────────────────────────────────
app.use('/api/auth',       authLimiter, require('./routes/auth'));
app.use('/api/elections',  require('./routes/elections'));
app.use('/api/candidates', require('./routes/candidates'));
app.use('/api/votes',      require('./routes/votes'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/audit',      require('./routes/audit'));

// ─── Health Check ─────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'E-Vote API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── 404 Handler ──────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────
app.use((err, req, res, next) => {
  console.error('Global Error:', err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ success: false, message: `${field} already exists.` });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ─── Start Server ─────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n🗳️  E-Vote Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`📡  API: http://localhost:${PORT}/api/health\n`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});

module.exports = app;
