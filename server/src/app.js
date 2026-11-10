import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import path from 'node:path';
import productRoutes from './routes/productRoutes.js';
import authRoutes from './routes/authRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { isAllowedClientOrigin } from './config/clientOrigin.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || isAllowedClientOrigin(origin)),
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.resolve('uploads'), { maxAge: '1d', immutable: true }));
app.get('/api/health', (req, res) => {
  const database = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(database === 'connected' ? 200 : 503).json({ status: database === 'connected' ? 'ok' : 'unavailable', database });
});
app.get('/api/sitemap.xml', async (req, res, next) => {
  try {
    const siteUrl = process.env.SITE_URL?.replace(/\/$/, '');
    if (!siteUrl) return res.status(503).type('text').send('SITE_URL is not configured.');
    const products = await mongoose.model('Product').find({ isVisible: true }).select('_id createdAt').lean();
    const fixedPaths = ['', '/products', '/about', '/contact', '/privacy', '/terms'];
    const xmlEscape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    const urls = fixedPaths.map(route => `<url><loc>${xmlEscape(siteUrl + route)}</loc></url>`);
    for (const product of products) {
      const lastModified = new Date(product.createdAt || Date.now()).toISOString();
      urls.push(`<url><loc>${xmlEscape(`${siteUrl}/products/${product._id}`)}</loc><lastmod>${lastModified}</lastmod></url>`);
    }
    res.set('Cache-Control', 'public, max-age=300');
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`);
  } catch (error) {
    next(error);
  }
});
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/uploads', uploadRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
