const configuredOrigin = () => process.env.CLIENT_ORIGIN || 'http://localhost:5173';

export function isAllowedClientOrigin(origin) {
  if (origin === configuredOrigin()) return true;
  if (process.env.NODE_ENV === 'production' || !origin) return false;

  try {
    const url = new URL(origin);
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
}
