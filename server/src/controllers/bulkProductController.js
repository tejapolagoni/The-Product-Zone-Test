import { parse } from 'csv-parse/sync';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { normalizeProduct, validateProduct } from './productController.js';

const MAX_IMPORT_ROWS = 5000;

const headerAliases = new Map([
  ['productname', 'productName'],
  ['name', 'productName'],
  ['brand', 'brand'],
  ['category', 'category'],
  ['description', 'description'],
  ['productimageurl', 'image'],
  ['imageurl', 'image'],
  ['productimage', 'image'],
  ['image', 'image'],
  ['price', 'price'],
  ['amazonassociatesaffiliateurl', 'amazonAffiliateUrl'],
  ['amazonaffiliateurl', 'amazonAffiliateUrl'],
  ['affiliateurl', 'amazonAffiliateUrl'],
  ['amazonurl', 'amazonAffiliateUrl'],
  ['producttags', 'tags'],
  ['tags', 'tags'],
  ['featuredstatus', 'isFeatured'],
  ['isfeatured', 'isFeatured'],
  ['featured', 'isFeatured']
]);

const requiredColumns = ['productName', 'category', 'description', 'image', 'amazonAffiliateUrl'];

function normalizeHeader(value) {
  return value.trim().toLocaleLowerCase('en').replace(/[^a-z0-9]/g, '');
}

export function parseCsv(buffer) {
  if (!buffer?.length) throw inputError('Choose a non-empty CSV file.');
  let records;
  try {
    records = parse(buffer, { bom: true, skip_empty_lines: true, max_record_size: 20000 });
  } catch (error) {
    throw inputError(`Could not read the CSV file: ${error.message}`);
  }
  if (records.length < 2) throw inputError('The CSV must include a header row and at least one product row.');

  const headers = records[0].map(value => headerAliases.get(normalizeHeader(value)));
  if (headers.some(header => !header)) throw inputError('The CSV contains an unsupported or blank column name.');
  if (new Set(headers).size !== headers.length) throw inputError('The CSV contains duplicate columns.');
  const missing = requiredColumns.filter(field => !headers.includes(field));
  if (missing.length) {
    throw inputError(`Add these required columns to the CSV: ${missing.join(', ')}.`);
  }
  const rows = records.slice(1);
  if (rows.length > MAX_IMPORT_ROWS) throw inputError(`Import up to ${MAX_IMPORT_ROWS} product rows per CSV file.`);
  return rows.map((cells, index) => {
    if (cells.length !== headers.length) {
      return { rowNumber: index + 2, input: null, error: 'The number of CSV values does not match the header columns.' };
    }
    return {
      rowNumber: index + 2,
      input: Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex].trim()]))
    };
  });
}

function inputError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function parseFeatured(value) {
  if (!value) return false;
  const normalized = value.trim().toLocaleLowerCase('en');
  if (['true', 'yes', '1', 'featured'].includes(normalized)) return true;
  if (['false', 'no', '0'].includes(normalized)) return false;
  return null;
}

function amazonProductKey(value) {
  try {
    const url = new URL(value);
    const asin = url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d|gp\/offer-listing)\/([a-z0-9]{10})(?:[/?]|$)/i)?.[1];
    if (asin) return `asin:${asin.toUpperCase()}`;
    return `short:${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return '';
  }
}

function productNameKey(input) {
  return `${input.productName.trim().toLocaleLowerCase('en')}|${input.category.trim().toLocaleLowerCase('en')}`;
}

function toProductInput(input) {
  const featured = parseFeatured(input.isFeatured || '');
  if (featured === null) return { error: 'Featured status must be true/false, yes/no, 1/0, or featured.' };

  let price;
  if (input.price) {
    if (!/^\d+(?:\.\d{1,2})?$/.test(input.price) || !Number.isFinite(Number(input.price))) {
      return { error: 'Price must be a non-negative number with up to 2 decimal places.' };
    }
    price = Number(input.price);
  }

  const tags = input.tags ? input.tags.split(/[|;]/).map(tag => tag.trim()).filter(Boolean) : [];
  if (tags.length > 30 || tags.some(tag => tag.length > 60)) {
    return { error: 'Add no more than 30 tags, each 60 characters or fewer.' };
  }

  const product = {
    productName: input.productName,
    brand: input.brand || 'Unspecified',
    category: input.category,
    description: input.description,
    image: input.image,
    amazonAffiliateUrl: input.amazonAffiliateUrl,
    features: [],
    images: [],
    tags,
    isFeatured: featured,
    isTrending: false,
    isRecommended: false,
    isVisible: true,
    ...(price !== undefined ? { price } : {})
  };
  const error = validateProduct(product);
  return error ? { error } : { product };
}

export function buildPlan(rows, existingProducts) {
  const seenAsins = new Set(existingProducts.map(product => amazonProductKey(product.amazonAffiliateUrl)).filter(Boolean));
  const seenNames = new Set(existingProducts.map(productNameKey));
  const seenShortLinks = new Set(existingProducts.map(product => amazonProductKey(product.amazonAffiliateUrl)).filter(key => key.startsWith('short:')));
  const rowsWithStatus = rows.map(row => {
    if (row.error) return { ...row, status: 'failed', message: row.error };
    const parsed = toProductInput(row.input);
    if (parsed.error) return { ...row, status: 'failed', message: parsed.error };

    const product = parsed.product;
    const asinKey = amazonProductKey(product.amazonAffiliateUrl);
    const nameKey = productNameKey(product);
    if (seenNames.has(nameKey) || (asinKey.startsWith('asin:') ? seenAsins.has(asinKey) : seenShortLinks.has(asinKey))) {
      return { ...row, status: 'skipped', message: 'A matching product is already in the catalogue or this CSV.' };
    }
    seenNames.add(nameKey);
    if (asinKey.startsWith('asin:')) seenAsins.add(asinKey);
    else seenShortLinks.add(asinKey);
    return { ...row, status: 'ready', product };
  });
  return rowsWithStatus;
}

async function prepareImport(req) {
  if (!req.file || !req.file.originalname.toLocaleLowerCase('en').endsWith('.csv')) {
    throw inputError('Choose a CSV file to continue.');
  }
  const rows = parseCsv(req.file.buffer);
  const existingProducts = await Product.find()
    .select('productName category amazonAffiliateUrl')
    .lean();
  return buildPlan(rows, existingProducts);
}

function summarize(rows) {
  const counts = rows.reduce((result, row) => {
    result[row.status] += 1;
    return result;
  }, { ready: 0, skipped: 0, failed: 0 });
  return {
    total: rows.length,
    ready: counts.ready,
    skipped: counts.skipped,
    failed: counts.failed,
    preview: rows.map(({ rowNumber, status, message, input }) => ({
      rowNumber,
      status,
      message: message || '',
      productName: input?.productName || ''
    }))
  };
}

export async function previewProductImport(req, res) {
  const rows = await prepareImport(req);
  res.json({ summary: summarize(rows) });
}

export async function importProducts(req, res) {
  const rows = await prepareImport(req);
  const readyRows = rows.filter(row => row.status === 'ready');
  if (!readyRows.length) {
    const summary = summarize(rows);
    return res.json({
      imported: 0,
      skipped: summary.skipped,
      failed: summary.failed,
      results: rows.map(({ rowNumber, status, message }) => ({ rowNumber, status, message }))
    });
  }

  const categories = [...new Map(readyRows.map(({ product }) => {
    const name = product.category.trim();
    return [name.toLocaleLowerCase('en'), name];
  })).values()];
  await Category.bulkWrite(categories.map(name => ({
    updateOne: {
      filter: { nameKey: name.toLocaleLowerCase('en') },
      update: { $setOnInsert: { name, nameKey: name.toLocaleLowerCase('en') } },
      upsert: true
    }
  })), { ordered: false });

  const products = readyRows.map(({ product }) => normalizeProduct(product));
  const importErrors = new Map();
  let imported = 0;
  try {
    const inserted = await Product.insertMany(products, { ordered: false });
    imported = inserted.length;
  } catch (error) {
    if (!Array.isArray(error.writeErrors)) throw error;
    imported = products.length - error.writeErrors.length;
    for (const writeError of error.writeErrors) {
      importErrors.set(writeError.index, writeError.errmsg || 'The product could not be saved.');
    }
  }

  let readyIndex = 0;
  const results = rows.map(row => {
    if (row.status !== 'ready') {
      return { rowNumber: row.rowNumber, status: row.status, message: row.message || '' };
    }
    const message = importErrors.get(readyIndex);
    readyIndex += 1;
    return { rowNumber: row.rowNumber, status: message ? 'failed' : 'imported', message: message || '' };
  });
  res.status(200).json({
    imported,
    skipped: results.filter(row => row.status === 'skipped').length,
    failed: results.filter(row => row.status === 'failed').length,
    results
  });
}

export const csvTemplate = [
  'productName,brand,category,description,image,price,amazonAffiliateUrl,tags,isFeatured'
].join('\r\n');
