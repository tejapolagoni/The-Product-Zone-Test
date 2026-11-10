import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import proxy from '../../api/[...path].js';
import proxyRoute from '../../api/proxy.js';

test('named Vercel proxy route delegates to the existing shared proxy handler', () => {
  assert.equal(proxyRoute, proxy);
});

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

test('Vercel rewrites nested API routes to the named proxy function', () => {
  const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
  const nestedApiRewrite = config.rewrites.find(rewrite => rewrite.destination.startsWith('/api/proxy?'));

  assert.deepEqual(nestedApiRewrite, {
    source: '/api/:prefix/:path*',
    destination: '/api/proxy?__proxy_path=:prefix/:path*'
  });
});

test('Vercel API proxy maps uploaded image reads to the Express static upload route', () => {
  const target = proxy.getTargetUrl('/api/uploads/image-123.webp', 'GET', 'https://api.example.onrender.com');
  assert.equal(target.href, 'https://api.example.onrender.com/uploads/image-123.webp');
});

test('Vercel API proxy restores nested backend paths and preserves query strings', () => {
  const authTarget = proxy.getTargetUrl('/api/proxy?__proxy_path=auth%2Fme&source=admin', 'GET', 'https://api.example.onrender.com');
  const productsTarget = proxy.getTargetUrl('/api/proxy?__proxy_path=products%2Fadmin%2Fall&page=2', 'GET', 'https://api.example.onrender.com');

  assert.equal(authTarget.href, 'https://api.example.onrender.com/api/auth/me?source=admin');
  assert.equal(productsTarget.href, 'https://api.example.onrender.com/api/products/admin/all?page=2');
});

test('Vercel API proxy maps rewritten uploaded-image requests to the Express static route', () => {
  const target = proxy.getTargetUrl('/api/proxy?__proxy_path=uploads%2Fimage-123.webp', 'GET', 'https://api.example.onrender.com');
  assert.equal(target.href, 'https://api.example.onrender.com/uploads/image-123.webp');
});

test('Vercel API proxy rejects invalid rewritten paths', () => {
  assert.throws(() => proxy.getTargetUrl('/api/proxy?__proxy_path=..%2Fauth%2Fme', 'GET', 'https://api.example.onrender.com'), /invalid/);
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
