import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProduct, validateProduct } from '../src/controllers/productController.js';
import { productCategories } from '../src/constants/productCategories.js';
import { categoryFields, validateCategory } from '../src/controllers/categoryController.js';

const validProduct = {
  productName: 'Everyday Sneaker',
  brand: 'Example Brand',
  category: 'Shoes & Footwear',
  description: 'A thoughtfully designed everyday sneaker.',
  features: ['Comfortable fit'],
  image: 'https://images.example.com/sneaker.jpg',
  images: [],
  amazonAffiliateUrl: 'https://www.amazon.com/dp/B012345678?tag=sample-20',
  isFeatured: true,
  isTrending: false,
  isRecommended: true,
  isVisible: true
};

test('accepts a direct Amazon product URL and stores the affiliate URL exactly', () => {
  assert.equal(validateProduct(validProduct), null);
  assert.equal(normalizeProduct(validProduct).amazonAffiliateUrl, validProduct.amazonAffiliateUrl);
});

test('rejects generic Amazon homepages and non-Amazon destinations', () => {
  assert.match(validateProduct({ ...validProduct, amazonAffiliateUrl: 'https://www.amazon.com/' }), /direct Amazon product URL/);
  assert.match(validateProduct({ ...validProduct, amazonAffiliateUrl: 'https://www.amazon.in/s?k=shoes' }), /direct Amazon product URL/);
  assert.match(validateProduct({ ...validProduct, amazonAffiliateUrl: 'https://example.com/product/1' }), /direct Amazon product URL/);
});

test('rejects invalid images and malformed product bodies', () => {
  assert.match(validateProduct({ ...validProduct, image: 'javascript:alert(1)' }), /Main image must be/);
  assert.match(validateProduct(null), /must be an object/);
});

test('exposes all 30 requested product categories in order', () => {
  assert.equal(productCategories.length, 30);
  assert.equal(productCategories[0], 'Electronics');
  assert.equal(productCategories[29], 'Movies & Entertainment');
});

test('accepts custom categories without restricting them to the starter categories', () => {
  const category = { name: 'Board Game Accessories', image: '', note: 'For game night' };
  assert.equal(validateCategory(category), null);
  assert.equal(categoryFields(category).nameKey, 'board game accessories');
  assert.equal(validateProduct({ ...validProduct, category: category.name }), null);
});

test('validates category length and image URLs', () => {
  assert.match(validateCategory({ name: 'x'.repeat(81) }), /80 characters/);
  assert.match(validateCategory({ name: 'Custom', image: 'javascript:alert(1)' }), /HTTP or HTTPS/);
});

test('accepts Amazon India affiliate product URLs and rejects generic homepages', () => {
  assert.equal(validateProduct({ ...validProduct, amazonAffiliateUrl: 'https://www.amazon.in/dp/B012345678?tag=example-21' }), null);
  assert.match(validateProduct({ ...validProduct, amazonAffiliateUrl: 'https://www.amazon.in/?tag=example-21' }), /direct Amazon product URL/);
});
