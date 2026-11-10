import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { requireAdmin, requireTrustedOrigin } from '../middleware/adminAuth.js';
import { asyncHandler } from '../middleware/errors.js';

const router = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

router.post('/login', loginLimiter, requireTrustedOrigin, asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const correctEmail = typeof email === 'string' && email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();
  const correctPassword = typeof password === 'string' && process.env.ADMIN_PASSWORD_HASH
    ? await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH)
    : false;

  if (!correctEmail || !correctPassword) return res.status(401).json({ message: 'Admin ID or password is incorrect.' });
  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.cookie('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.ADMIN_COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'strict'),
    maxAge: 8 * 60 * 60 * 1000,
    path: '/'
  });
  res.json({ authenticated: true });
}));

router.post('/logout', requireTrustedOrigin, (req, res) => {
  res.clearCookie('admin_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.ADMIN_COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'strict'),
    path: '/'
  });
  res.json({ authenticated: false });
});

router.get('/me', requireAdmin, (req, res) => res.json({ authenticated: true }));

export default router;
