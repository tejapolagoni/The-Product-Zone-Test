import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import proxy from '../../api/[...path].js';

test('Vercel SPA fallback excludes API routes so the proxy function can handle them', () => {
  const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
  const fallback = config.rewrites.find(rewrite => rewrite.destination === '/index.html');
  const [, pattern] = fallback.source.match(/^\/:path\((.*)\)$/) || [];
  const matchesFallback = new RegExp(`^/${pattern}$`);

  assert.equal(fallback.source, '/:path((?!api/).*)');
  assert.equal(matchesFallback.test('/api/products'), false);
  assert.equal(matchesFallback.test('/api/categories'), false);
  assert.equal(matchesFallback.test('/products'), true);
  assert.equal(matchesFallback.test('/admin/login'), true);
});

test('Vercel API proxy maps uploaded image reads to the Express static upload route', () => {
  const target = proxy.getTargetUrl('/api/uploads/image-123.webp', 'GET', 'https://api.example.onrender.com');
  assert.equal(target.href, 'https://api.example.onrender.com/uploads/image-123.webp');
});

test('Vercel API proxy preserves API routes and query strings', () => {
  const target = proxy.getTargetUrl('/api/products?featured=true&page=2', 'GET', 'https://api.example.onrender.com');
  assert.equal(target.href, 'https://api.example.onrender.com/api/products?featured=true&page=2');
});

test('Vercel API proxy does not rewrite product upload POST requests', () => {
  const target = proxy.getTargetUrl('/api/uploads', 'POST', 'https://api.example.onrender.com');
  assert.equal(target.href, 'https://api.example.onrender.com/api/uploads');
});

test('Vercel API proxy leaves multipart and CSV request bodies unparsed for streaming', () => {
  assert.deepEqual(proxy.config, { api: { bodyParser: false } });
});

test('Vercel API proxy rejects non-HTTPS and off-origin targets', () => {
  assert.throws(() => proxy.getTargetUrl('/api/products', 'GET', 'http://api.example.com'), /HTTPS/);
  assert.throws(() => proxy.getTargetUrl('https://untrusted.example/path', 'GET', 'https://api.example.com'), /configured HTTPS origin/);
});
