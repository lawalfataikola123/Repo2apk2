/**
 * Auth Routes - JWT Authentication
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// In-memory user store (replace with DB in production)
const users = new Map();

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'dev-secret-change-in-prod', {
    expiresIn: '7d'
  });
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  if (users.has(email)) {
    return res.status(409).json({ success: false, error: 'Email already registered' });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const userId = require('uuid').v4();

  users.set(email, {
    id: userId,
    email,
    password: hashedPassword,
    createdAt: new Date().toISOString(),
    apiKey: require('uuid').v4()
  });

  const token = generateToken(userId);

  res.status(201).json({
    success: true,
    token,
    user: { id: userId, email }
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;
  const user = users.get(email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const token = generateToken(user.id);

  res.json({
    success: true,
    token,
    user: { id: user.id, email: user.email, apiKey: user.apiKey }
  });
});

module.exports = router;
