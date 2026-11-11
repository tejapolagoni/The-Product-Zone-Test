import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { Readable, Writable } from 'node:stream';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { isSupportedImage } from '../src/routes/uploadRoutes.js';

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

async function withGridFsMock(run) {
  const files = new Map();
  const previousDb = Object.getOwnPropertyDescriptor(mongoose.connection, 'db');
  const previousBucket = Object.getOwnPropertyDescriptor(mongoose.mongo, 'GridFSBucket');
  const previousSecret = process.env.JWT_SECRET;
  const testSecret = 'test-gridfs-upload-secret-at-least-32-characters';

  class MockGridFSBucket {
    constructor(db, options) {
      assert.equal(db, mongoose.connection.db);
      assert.equal(options.bucketName, 'productImages');
    }

    find(filter) {
      return {
        limit: () => ({
          toArray: async () => {
            const file = files.get(filter._id.toString());
            return file ? [{ _id: filter._id, metadata: file.metadata }] : [];
          }
        })
      };
    }

    openUploadStream(filename, options) {
      const id = new mongoose.mongo.ObjectId();
      const chunks = [];
      const stream = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(Buffer.from(chunk));
          callback();
        },
        final(callback) {
          files.set(id.toString(), {
            filename,
            metadata: options.metadata,
            buffer: Buffer.concat(chunks)
          });
          callback();
        }
      });
      stream.id = id;
      return stream;
    }

    openDownloadStream(id) {
      return Readable.from([files.get(id.toString()).buffer]);
    }
  }

  Object.defineProperty(mongoose.connection, 'db', { configurable: true, value: {} });
  Object.defineProperty(mongoose.mongo, 'GridFSBucket', { configurable: true, value: MockGridFSBucket });
  process.env.JWT_SECRET = testSecret;
  try {
    await run({ files, token: jwt.sign({ role: 'admin' }, testSecret) });
  } finally {
    if (previousDb) Object.defineProperty(mongoose.connection, 'db', previousDb);
    else delete mongoose.connection.db;
    if (previousBucket) Object.defineProperty(mongoose.mongo, 'GridFSBucket', previousBucket);
    else delete mongoose.mongo.GridFSBucket;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
}

test('image upload accepts supported image signatures and rejects mismatched content', () => {
  const cases = [
    ['image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0x00])],
    ['image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ['image/webp', Buffer.from('RIFF0000WEBP')],
    ['image/gif', Buffer.from('GIF89a')]
  ];

  for (const [mimetype, buffer] of cases) assert.equal(isSupportedImage({ mimetype, buffer }), true);
  assert.equal(isSupportedImage({ mimetype: 'image/png', buffer: Buffer.from('not an image') }), false);
  assert.equal(isSupportedImage({ mimetype: 'text/plain', buffer: Buffer.from('GIF89a') }), false);
});

test('authenticated image upload persists bytes and serves them from GridFS', async () => {
  await withGridFsMock(async ({ files, token }) => {
    await withServer(async origin => {
      const form = new FormData();
      form.append('image', new Blob([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
      ], { type: 'image/png' }), 'product.png');
      const uploadResponse = await fetch(`${origin}/api/uploads`, {
        method: 'POST',
        headers: {
          Cookie: `admin_token=${token}`,
          Origin: 'http://localhost:5173'
        },
        body: form
      });

      assert.equal(uploadResponse.status, 201);
      const { image } = await uploadResponse.json();
      assert.match(image, /^\/uploads\/[a-f\d]{24}$/i);
      assert.equal(files.size, 1);

      const imageResponse = await fetch(`${origin}${image}`);
      assert.equal(imageResponse.status, 200);
      assert.equal(imageResponse.headers.get('content-type'), 'image/png');
      assert.deepEqual(Buffer.from(await imageResponse.arrayBuffer()), files.values().next().value.buffer);
    });
  });
});

test('GridFS image route returns not found for invalid file identifiers', async () => {
  await withServer(async origin => {
    const response = await fetch(`${origin}/uploads/not-an-object-id`);
    assert.equal(response.status, 404);
  });
});

test('image upload endpoint remains protected by admin authentication', async () => {
  await withServer(async origin => {
    const response = await fetch(`${origin}/api/uploads`, {
      method: 'POST',
      headers: { Origin: 'http://localhost:5173' },
      body: new FormData()
    });
    assert.equal(response.status, 401);
    assert.equal((await response.json()).message, 'Please sign in to continue.');
  });
});
