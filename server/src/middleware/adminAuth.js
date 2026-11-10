import jwt from 'jsonwebtoken';
import { isAllowedClientOrigin } from '../config/clientOrigin.js';

export function requireTrustedOrigin(req, res, next) {
  if (!isAllowedClientOrigin(req.get('origin'))) {
    return res.status(403).json({ message: 'This request origin is not allowed.' });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    if (!isAllowedClientOrigin(req.get('origin'))) {
      return res.status(403).json({ message: 'This request origin is not allowed.' });
    }
  }
  const token = req.cookies.admin_token;
  if (!token) return res.status(401).json({ message: 'Please sign in to continue.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ message: 'Administrator access required.' });
    next();
  } catch {
    res.clearCookie('admin_token');
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
}
