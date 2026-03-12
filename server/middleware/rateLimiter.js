/**
 * Rate Limiter Middleware
 */

const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Max 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please wait 15 minutes before trying again.'
  },
  skip: (req) => {
    // Skip rate limit for status/download checks
    return req.path.startsWith('/status/') || req.path.startsWith('/download/');
  }
});

module.exports = rateLimiter;
