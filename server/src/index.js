import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/db.js';
import Category from './models/Category.js';
import Product from './models/Product.js';
import { productCategories } from './constants/productCategories.js';

const required = ['MONGODB_URI', 'JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD_HASH'];
if (process.env.NODE_ENV === 'production') required.push('CLIENT_ORIGIN');
const missing = required.filter(key => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters long.');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production') {
  try {
    const origin = new URL(process.env.CLIENT_ORIGIN);
    if (origin.protocol !== 'https:' || origin.origin !== process.env.CLIENT_ORIGIN) {
      throw new Error();
    }
  } catch {
    console.error('CLIENT_ORIGIN must be the exact HTTPS origin of the production frontend.');
    process.exit(1);
  }
}

const port = Number(process.env.PORT || 5000);
await connectDatabase();
if (await Category.countDocuments() === 0) {
  const existingProductCategories = await Product.distinct('category');
  const names = new Map(
    [...productCategories, ...existingProductCategories].map(name => [name.toLocaleLowerCase('en'), name])
  );
  await Category.insertMany([...names.values()].map(name => ({
    name,
    nameKey: name.toLocaleLowerCase('en')
  })));
}
app.listen(port, () => console.log(`Product Zone API listening on port ${port}`));
