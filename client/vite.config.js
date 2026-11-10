import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = (env.VITE_SITE_URL || '').replace(/\/$/, '');
  const apiUrl = (env.VITE_API_URL || '').replace(/\/$/, '');

  return {
    plugins: [
      react(),
      {
        name: 'product-zone-seo-assets',
        transformIndexHtml(html) {
          return html.replaceAll('__SITE_URL__', siteUrl);
        },
        generateBundle() {
          const sitemapUrl = `${apiUrl || siteUrl}/api/sitemap.xml`;
          const sitemapLine = siteUrl ? `\nSitemap: ${sitemapUrl}` : '';
          this.emitFile({
            type: 'asset',
            fileName: 'robots.txt',
            source: `User-agent: *\nAllow: /\n${sitemapLine ? `${sitemapLine}\n` : ''}`
          });
        }
      }
    ],
    server: {
      proxy: {
        '/api': 'http://localhost:5000',
        '/uploads': 'http://localhost:5000'
      }
    }
  };
});
