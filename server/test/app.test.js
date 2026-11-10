import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import app from '../src/app.js';

async function withServer(run) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('health endpoint reports an unavailable database instead of a false success', async () => {
  await withServer(async origin => {
    const response = await fetch(`${origin}/api/health`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { status: 'unavailable', database: 'disconnected' });
  });
});

test('admin product endpoint denies unauthenticated requests before database access', async () => {
  await withServer(async origin => {
    const response = await fetch(`${origin}/api/products/admin/all`);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).message, 'Please sign in to continue.');
  });
});

test('bulk product import endpoints reject unauthenticated and untrusted requests', async () => {
  await withServer(async origin => {
    const response = await fetch(`${origin}/api/products/admin/import/preview`, {
      method: 'POST',
      body: new FormData()
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).message, 'This request origin is not allowed.');
  });
});

test('admin login rejects requests from an untrusted origin', async () => {
  await withServer(async origin => {
    const response = await fetch(`${origin}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'not-a-real-password' })
    });
    assert.equal(response.status, 403);
  });
});

test('admin login accepts localhost and loopback origins in development', async () => {
  await withServer(async origin => {
    const response = await fetch(`${origin}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://127.0.0.1:5174'
      },
      body: JSON.stringify({ email: 'admin@example.com', password: 'not-a-real-password' })
    });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5174');
  });
});
