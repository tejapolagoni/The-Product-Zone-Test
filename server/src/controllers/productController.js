import Product from '../models/Product.js';
import Category from '../models/Category.js';

export async function listProducts(req, res) {
  const { brand, featured, trending, recommended, sort = 'newest', limit, page, pageSize } = req.query;
  const search = req.query.search ?? req.query.q;
  for (const [field, value] of Object.entries({ search, category: req.query.category, brand, featured, trending, recommended, sort, limit, page, pageSize })) {
    if (value !== undefined && typeof value !== 'string') {
      return res.status(400).json({ message: `The ${field} filter must be a single value.` });
    }
  }
  const category = req.query.category;
  if (search?.length > 100) return res.status(400).json({ message: 'Search must be 100 characters or fewer.' });
  if (category?.length > 80) return res.status(400).json({ message: 'Category must be 80 characters or fewer.' });
  if (brand?.length > 100) return res.status(400).json({ message: 'Brand must be 100 characters or fewer.' });
  if (!['newest', 'oldest', 'name'].includes(sort)) return res.status(400).json({ message: 'Choose a supported sort order.' });
  if (limit !== undefined && (!/^[1-9]\d*$/.test(limit) || !Number.isSafeInteger(Number(limit)))) {
    return res.status(400).json({ message: 'Limit must be a positive integer.' });
  }
  if (featured && !['true', 'false'].includes(featured)) return res.status(400).json({ message: 'Featured must be true or false.' });
  if (trending && !['true', 'false'].includes(trending)) return res.status(400).json({ message: 'Trending must be true or false.' });
  if (recommended && !['true', 'false'].includes(recommended)) return res.status(400).json({ message: 'Recommended must be true or false.' });
  const pageNumber = page === undefined ? 1 : Number(page);
  const pageSizeNumber = pageSize === undefined ? 24 : Number(pageSize);
  if ((page !== undefined && (!/^[1-9]\d*$/.test(page) || !Number.isSafeInteger(pageNumber)))
    || (pageSize !== undefined && (!/^[1-9]\d*$/.test(pageSize) || !Number.isSafeInteger(pageSizeNumber) || pageSizeNumber > 48))) {
    return res.status(400).json({ message: 'Page must be a positive integer and pageSize must be between 1 and 48.' });
  }
  const filter = { isVisible: true };
  if (category) filter.category = category;
  if (brand) filter.brand = brand;
  if (featured === 'true') filter.isFeatured = true;
  if (trending === 'true') filter.isTrending = true;
  if (recommended === 'true') filter.isRecommended = true;
  if (search?.trim()) {
    const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = ['productName', 'brand', 'category'].map(field => ({ [field]: { $regex: safeSearch, $options: 'i' } }));
  }

  const sortBy = sort === 'oldest' ? { createdAt: 1 } : sort === 'name' ? { productName: 1 } : { createdAt: -1 };
  const paginated = page !== undefined || pageSize !== undefined;
  const query = Product.find(filter).select('-price').sort(sortBy);
  if (!paginated) {
    if (limit !== undefined) query.limit(Math.min(Number(limit), 100));
    return res.json({ products: await query.lean() });
  }
  const brandFilter = { ...filter };
  delete brandFilter.brand;
  const [total, brands] = await Promise.all([
    Product.countDocuments(filter),
    Product.distinct('brand', brandFilter)
  ]);
  const totalPages = Math.ceil(total / pageSizeNumber);
  const products = pageNumber > totalPages ? [] : await query.skip((pageNumber - 1) * pageSizeNumber).limit(pageSizeNumber).lean();
  res.json({
    products,
    brands: brands.sort((left, right) => left.localeCompare(right)),
    pagination: { page: pageNumber, pageSize: pageSizeNumber, total, totalPages }
  });
}

export async function getProduct(req, res) {
  const product = await Product.findOne({ _id: req.params.id, isVisible: true }).select('-price').lean();
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  res.json({ product });
}

export async function listAdminProducts(req, res) {
  for (const [field, value] of Object.entries({ page: req.query.page, pageSize: req.query.pageSize })) {
    if (value !== undefined && typeof value !== 'string') {
      return res.status(400).json({ message: `${field} must be a single value.` });
    }
  }
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const pageSize = req.query.pageSize === undefined ? 25 : Number(req.query.pageSize);
  if ((req.query.page !== undefined && (!/^[1-9]\d*$/.test(req.query.page) || !Number.isSafeInteger(page)))
    || (req.query.pageSize !== undefined && (!/^[1-9]\d*$/.test(req.query.pageSize) || !Number.isSafeInteger(pageSize) || pageSize > 50))) {
    return res.status(400).json({ message: 'Page must be a positive integer and pageSize must be between 1 and 50.' });
  }
  const [total, visible, featured] = await Promise.all([
    Product.countDocuments(),
    Product.countDocuments({ isVisible: true }),
    Product.countDocuments({ isFeatured: true })
  ]);
  const totalPages = Math.ceil(total / pageSize);
  const products = page > totalPages ? [] : await Product.find().sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean();
  res.json({
    products,
    stats: { total, visible, featured },
    pagination: { page, pageSize, total, totalPages }
  });
}

export function validateProduct(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'Product details must be an object.';
  const fields = ['productName', 'brand', 'category', 'description', 'image', 'amazonAffiliateUrl'];
  for (const field of fields) {
    if (typeof input[field] !== 'string' || !input[field].trim()) {
      return `${field} is required.`;
    }
  }
  if (input.productName.trim().length > 160) return 'Product name must be 160 characters or fewer.';
  if (input.brand.trim().length > 100) return 'Brand must be 100 characters or fewer.';
  if (input.category.trim().length > 80) return 'Category must be 80 characters or fewer.';
  if (input.description.trim().length > 4000) return 'Description must be 4000 characters or fewer.';
  if (input.image.length > 2048 || input.amazonAffiliateUrl.length > 2048) return 'Product image and affiliate URLs must be 2048 characters or fewer.';
  try {
    const url = new URL(input.amazonAffiliateUrl);
    const hostname = url.hostname.toLowerCase();
    const amazonHost = /^(?:(?:www|m)\.)?amazon\.(?:in|com|co\.in|co\.uk|de|fr|it|es|ca|co\.jp|com\.au|com\.br|com\.mx|ae|sa|sg|nl|se|pl|eg|com\.tr)$/.test(hostname)
      || ['link.amazon', 'amzn.to', 'amzn.in', 'amzn.eu', 'amzn.asia', 'amzn.co.uk', 'amzn.com.au', 'amzn.de'].includes(hostname);
    const shortLinkHost = ['link.amazon', 'amzn.to', 'amzn.in', 'amzn.eu', 'amzn.asia', 'amzn.co.uk', 'amzn.com.au', 'amzn.de'].includes(hostname);
    const productPath = /\/(?:dp|gp\/product|gp\/aw\/d|gp\/offer-listing)\/[a-z0-9]{10}(?:[/?]|$)/i.test(url.pathname);
    if (!['http:', 'https:'].includes(url.protocol) || !amazonHost || url.pathname === '/' || (!shortLinkHost && !productPath)) {
      return 'Enter a direct Amazon product URL or an Amazon product short link.';
    }
  } catch {
    return 'Enter a valid Amazon product affiliate URL.';
  }
  const validImage = value => {
    if (value.startsWith('/uploads/')) return true;
    try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
  };
  if (!validImage(input.image)) return 'Main image must be an HTTP(S) URL or an uploaded image.';
  if (!Array.isArray(input.features) || input.features.some(feature => typeof feature !== 'string')) {
    return 'Features must be a list of text values.';
  }
  if (input.images !== undefined && (!Array.isArray(input.images) || input.images.some(image => typeof image !== 'string'))) {
    return 'Additional images must be a list of image URLs.';
  }
  if ((input.images || []).some(image => image.length > 2048 || !validImage(image))) return 'Additional images must be HTTP(S) URLs or uploaded images no longer than 2048 characters.';
  if (input.features.length > 30 || (input.images || []).length > 10) return 'Add no more than 30 features and 10 additional images.';
  if (input.features.some(feature => feature.length > 500)) return 'Each feature must be 500 characters or fewer.';
  if (input.tags !== undefined && (!Array.isArray(input.tags) || input.tags.some(tag => typeof tag !== 'string' || tag.length > 60))) {
    return 'Tags must be a list of text values, each 60 characters or fewer.';
  }
  if ((input.tags || []).length > 30) return 'Add no more than 30 product tags.';
  if (input.price !== undefined && (typeof input.price !== 'number' || !Number.isFinite(input.price) || input.price < 0)) {
    return 'Price must be a non-negative number.';
  }
  for (const flag of ['isFeatured', 'isTrending', 'isRecommended', 'isVisible']) {
    if (input[flag] !== undefined && typeof input[flag] !== 'boolean') return `${flag} must be true or false.`;
  }
  return null;
}

export function normalizeProduct(input) {
  return {
    productName: input.productName.trim(),
    brand: input.brand.trim(),
    category: input.category.trim(),
    description: input.description.trim(),
    features: input.features.map(feature => feature.trim()).filter(Boolean),
    tags: (input.tags || []).map(tag => tag.trim()).filter(Boolean),
    ...(input.price !== undefined ? { price: input.price } : {}),
    image: input.image.trim(),
    images: (input.images || []).map(image => image.trim()).filter(Boolean),
    amazonAffiliateUrl: input.amazonAffiliateUrl,
    isFeatured: Boolean(input.isFeatured),
    isTrending: Boolean(input.isTrending),
    isRecommended: Boolean(input.isRecommended),
    isVisible: input.isVisible !== false
  };
}

export async function createProduct(req, res) {
  const validationError = validateProduct(req.body);
  if (validationError) return res.status(400).json({ message: validationError });
  if (!await Category.exists({ nameKey: req.body.category.trim().toLocaleLowerCase('en') })) {
    return res.status(400).json({ message: 'Choose an existing category or create it in Manage categories.' });
  }
  const product = await Product.create(normalizeProduct(req.body));
  res.status(201).json({ product });
}

export async function updateProduct(req, res) {
  const validationError = validateProduct(req.body);
  if (validationError) return res.status(400).json({ message: validationError });
  if (!await Category.exists({ nameKey: req.body.category.trim().toLocaleLowerCase('en') })) {
    return res.status(400).json({ message: 'Choose an existing category or create it in Manage categories.' });
  }
  const product = await Product.findByIdAndUpdate(req.params.id, normalizeProduct(req.body), { new: true, runValidators: true });
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  res.json({ product });
}

export async function deleteProduct(req, res) {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  res.json({ message: 'Product deleted.' });
}
