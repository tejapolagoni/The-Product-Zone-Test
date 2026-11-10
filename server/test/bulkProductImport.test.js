import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, parseCsv } from '../src/controllers/bulkProductController.js';
import { normalizeProduct } from '../src/controllers/productController.js';

const headers = 'productName,brand,category,description,image,price,amazonAffiliateUrl,tags,isFeatured';

function row(index, overrides = {}) {
  const product = {
    productName: `Product ${index}`,
    brand: '',
    category: 'Custom Category',
    description: 'Useful everyday product',
    image: 'https://images.example.com/product.jpg',
    price: '',
    amazonAffiliateUrl: `https://www.amazon.in/dp/B0123456${String(index).padStart(2, '0')}?tag=example-21`,
    tags: 'daily|useful',
    isFeatured: 'yes',
    ...overrides
  };
  return Object.values(product).map(value => `"${String(value).replaceAll('"', '""')}"`).join(',');
}

test('CSV import parser supports 500 products and normalizes optional columns', () => {
  const records = parseCsv(Buffer.from([headers, ...Array.from({ length: 500 }, (_, index) => row(index))].join('\n')));
  assert.equal(records.length, 500);
  assert.equal(records[0].input.productName, 'Product 0');
  assert.equal(records[0].input.tags, 'daily|useful');
});

test('CSV parser handles quoted commas, escaped quotes, and embedded newlines', () => {
  const records = parseCsv(Buffer.from([
    headers,
    '"Desk, compact",Brand,Home,"A ""smart"" product\nfor home",https://images.example.com/a.jpg,,https://www.amazon.in/dp/B012345678?tag=example-21,home|desk,no'
  ].join('\n')));
  assert.equal(records[0].input.productName, 'Desk, compact');
  assert.equal(records[0].input.description, 'A "smart" product\nfor home');
});

test('CSV import plan validates affiliate links, optional price, and featured status', () => {
  const records = parseCsv(Buffer.from([
    headers,
    row(1, { price: '249.50' }),
    row(2, { amazonAffiliateUrl: 'https://www.amazon.in/' }),
    row(3, { price: '-2' }),
    row(4, { isFeatured: 'maybe' })
  ].join('\n')));
  const plan = buildPlan(records, []);
  assert.deepEqual(plan.map(record => record.status), ['ready', 'failed', 'failed', 'failed']);
  assert.equal(plan[0].product.price, 249.5);
  assert.equal(plan[0].product.brand, 'Unspecified');
  assert.deepEqual(plan[0].product.tags, ['daily', 'useful']);
  const normalized = normalizeProduct(plan[0].product);
  assert.equal(normalized.price, 249.5);
  assert.deepEqual(normalized.tags, ['daily', 'useful']);
  assert.match(plan[1].message, /Amazon product URL/);
});

test('CSV import plan skips same Amazon products and name/category duplicates', () => {
  const records = parseCsv(Buffer.from([
    headers,
    row(1),
    row(1, { productName: 'Different title' }),
    row(2, { productName: 'Product 1', amazonAffiliateUrl: 'https://www.amazon.in/dp/B012345699?tag=other-21' })
  ].join('\n')));
  const plan = buildPlan(records, []);
  assert.deepEqual(plan.map(record => record.status), ['ready', 'skipped', 'skipped']);
});

test('CSV import plan skips products that already exist in MongoDB', () => {
  const records = parseCsv(Buffer.from([headers, row(5)].join('\n')));
  const plan = buildPlan(records, [{
    productName: 'An older catalog title',
    category: 'Custom Category',
    amazonAffiliateUrl: 'https://www.amazon.in/dp/B012345605?tag=old-21'
  }]);
  assert.equal(plan[0].status, 'skipped');
});

test('CSV import parser rejects missing headers and more than 5000 rows', () => {
  assert.throws(() => parseCsv(Buffer.from('productName,category\nOne,Books')), /required columns/);
  const csv = [headers, ...Array.from({ length: 5001 }, (_, index) => row(index))].join('\n');
  assert.throws(() => parseCsv(Buffer.from(csv)), /up to 5000/);
});
