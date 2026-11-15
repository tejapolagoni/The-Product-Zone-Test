import test from 'node:test';
import assert from 'node:assert/strict';
import Product from '../src/models/Product.js';
import Category from '../src/models/Category.js';
import {
  createProduct, deleteProduct, listProducts, trackAffiliateClick, updateProduct
} from '../src/controllers/productController.js';

const productInput = {
  productName: 'Everyday Sneaker',
  brand: 'Example Brand',
  category: 'Shoes & Footwear',
  description: 'A thoughtfully designed everyday sneaker.',
  features: ['Comfortable fit'],
  image: 'https://images.example.com/sneaker.jpg',
  images: ['https://images.example.com/side.jpg'],
  tags: ['Everyday'],
  amazonAffiliateUrl: 'https://www.amazon.in/dp/B012345678?tag=exact-associates-tag',
  isFeatured: true,
  isTrending: true,
  isRecommended: true,
  isVisible: false
};

function response() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test('createProduct validates category and saves all product fields without changing the affiliate URL', async t => {
  t.mock.method(Category, 'exists', async () => true);
  const create = t.mock.method(Product, 'create', async data => ({ ...data, _id: 'product-id' }));
  const res = response();

  await createProduct({ body: productInput }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(create.mock.calls.length, 1);
  const saved = create.mock.calls[0].arguments[0];
  assert.equal(saved.amazonAffiliateUrl, productInput.amazonAffiliateUrl);
  assert.equal(saved.isFeatured, true);
  assert.equal(saved.isTrending, true);
  assert.equal(saved.isRecommended, true);
  assert.equal(saved.isVisible, false);
  assert.deepEqual(saved.features, productInput.features);
  assert.deepEqual(saved.images, productInput.images);
  assert.deepEqual(saved.tags, productInput.tags);
});

test('createProduct rejects products whose category is not stored', async t => {
  t.mock.method(Category, 'exists', async () => false);
  const create = t.mock.method(Product, 'create', async data => data);
  const res = response();

  await createProduct({ body: productInput }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(create.mock.calls.length, 0);
});

test('updateProduct applies validated fields and preserves the exact affiliate URL', async t => {
  t.mock.method(Category, 'exists', async () => true);
  const update = t.mock.method(Product, 'findByIdAndUpdate', async () => ({ _id: 'product-id', ...productInput }));
  const res = response();

  await updateProduct({ params: { id: 'product-id' }, body: productInput }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(update.mock.calls[0].arguments[0], 'product-id');
  assert.equal(update.mock.calls[0].arguments[1].amazonAffiliateUrl, productInput.amazonAffiliateUrl);
  assert.deepEqual(update.mock.calls[0].arguments[2], { new: true, runValidators: true });
  assert.equal(res.body.product.isVisible, false);
});

test('deleteProduct removes the requested record', async t => {
  const remove = t.mock.method(Product, 'findByIdAndDelete', async id => ({ _id: id }));
  const res = response();

  await deleteProduct({ params: { id: 'product-id' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(remove.mock.calls[0].arguments[0], 'product-id');
  assert.equal(res.body.message, 'Product deleted.');
});

test('public product filters always exclude hidden products and honor all homepage flags', async t => {
  let receivedFilter;
  let selectedFields;
  const query = {
    select(fields) { selectedFields = fields; return this; },
    sort() { return this; },
    limit() { return this; },
    lean: async () => []
  };
  t.mock.method(Product, 'find', filter => {
    receivedFilter = filter;
    return query;
  });
  const res = response();

  await listProducts({
    query: { featured: 'true', trending: 'true', recommended: 'true' }
  }, res);

  assert.deepEqual(receivedFilter, {
    isVisible: true,
    isFeatured: true,
    isTrending: true,
    isRecommended: true
  });
  assert.equal(selectedFields, '-price -affiliateClickCount');
  assert.deepEqual(res.body.products, []);
});

test('affiliate click tracking increments visible products without exposing visitor data', async t => {
  const productId = '507f1f77bcf86cd799439011';
  const update = t.mock.method(Product, 'updateOne', async () => ({ matchedCount: 1, modifiedCount: 1 }));
  const res = response();
  res.end = function end() { this.ended = true; return this; };

  await trackAffiliateClick({ params: { id: productId } }, res);

  assert.equal(res.statusCode, 204);
  assert.equal(res.ended, true);
  assert.deepEqual(update.mock.calls[0].arguments, [
    { _id: productId, isVisible: true },
    { $inc: { affiliateClickCount: 1 } }
  ]);
});

test('affiliate click tracking does not count invalid or hidden products', async t => {
  const update = t.mock.method(Product, 'updateOne', async () => ({ matchedCount: 0, modifiedCount: 0 }));
  const invalidRes = response();
  await trackAffiliateClick({ params: { id: 'invalid-id' } }, invalidRes);
  assert.equal(invalidRes.statusCode, 404);
  assert.equal(update.mock.calls.length, 0);

  const hiddenRes = response();
  await trackAffiliateClick({ params: { id: '507f1f77bcf86cd799439011' } }, hiddenRes);
  assert.equal(hiddenRes.statusCode, 404);
  assert.equal(update.mock.calls.length, 1);
});
