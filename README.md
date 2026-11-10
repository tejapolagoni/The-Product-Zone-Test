# THE PRODUCT ZONE

The existing React/Vite + Express + MongoDB project, continued in place. The website is a mobile-first product discovery and affiliate referral site; it does not sell products or handle payments.

## Project map

- `client/` — React public site, search/filter UI, admin dashboard and Vite build.
- `server/src/models/` — MongoDB product and category models.
- `server/src/controllers/` and `server/src/routes/` — public catalogue APIs and protected admin CRUD.
- `server/src/middleware/` — admin JWT-cookie authorization, origin checking and API error handling.
- `server/uploads/` — local product image uploads (ephemeral on free hosting).

## Run locally

Requirements: Node.js 20.19+ and npm, plus MongoDB Atlas or a reachable MongoDB instance.

1. Install dependencies from the project root:

   ```powershell
   npm install
   ```

2. Create the private API environment file:

   ```powershell
   Copy-Item server\.env.example server\.env
   ```

3. Generate an admin password hash locally. Replace the example text with a unique password; do not share the password or hash:

   ```powershell
   node -e "require('bcryptjs').hash('YOUR-UNIQUE-PASSWORD', 12).then(console.log)"
   ```

   Generate a separate JWT signing key:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

4. In `server\.env`, set the Atlas URI, JWT secret, admin email, and password hash. Allow your current IP in Atlas Network Access and create a database user. URL-encode special characters in the database password when placing it in the URI. Keep this file private and never commit it.

5. Start the existing client and API:

   ```powershell
   npm run dev
   ```

   Browse to `http://localhost:5173`. The API listens on port 5000 and reports database status at `http://localhost:5000/api/health`. If MongoDB is not configured/reachable, public page chrome can still load but product and category API calls will fail.
   During development, the API accepts frontend origins on `localhost` and loopback addresses such as `127.0.0.1` (including Vite's alternate port if 5173 is occupied). Production continues to require the exact `CLIENT_ORIGIN`.

6. Go to `http://localhost:5173/admin/login`. Sign in with the identifier configured in `ADMIN_EMAIL` (it can be an email address or a username such as an Instagram handle) and the unhashed password you used to generate `ADMIN_PASSWORD_HASH`.

The first successful database startup seeds the 30 starter category names. It does not create sample products or affiliate links. Admins can add unlimited products and custom categories. Renaming a category updates its products; deletion is blocked while products still use it.

## Bulk product import

From the admin dashboard, choose **Import products CSV** and download the template. The importer supports up to 5,000 product rows per CSV (and previews row validation before saving). Required columns are `productName`, `category`, `description`, `image`, and `amazonAffiliateUrl`. Optional columns are `brand`, `price`, `tags`, and `isFeatured`. Tags may be separated with `|` or `;`; featured values accept `true`/`false`, `yes`/`no`, `1`/`0`, or `featured`. If brand is omitted, it is stored as “Unspecified”. Missing categories are created automatically. Duplicate product names within a category and matching Amazon product IDs are skipped. The preview and final result report invalid and skipped rows.

The optional imported price is retained in MongoDB for admin reference only and is excluded from public product API responses and the website display. Keep Amazon price and availability policies in mind; do not use this field to publish manually maintained prices.

## API routes

- `GET /api/health` — database readiness (503 when MongoDB is disconnected).
- `GET /api/products` — visible products; supports `q`/`search`, `category`, `brand`, `featured`, `trending`, `recommended`, and `sort`. Supplying `page` enables 24-item pagination (up to 48 per page) and returns matching brands and totals.
- `GET /api/products/:id` — one visible product.
- `GET /api/categories` — stored categories plus any legacy product categories.
- `GET /api/sitemap.xml` — public pages and visible product URLs; requires `SITE_URL`.
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- `GET /api/products/admin/all` — administrator product list, paginated 25 at a time, with total/visible/featured counts.
- `POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id`.
- `POST /api/products/admin/import/preview`, `POST /api/products/admin/import` — administrator-only CSV validation preview and bulk import.
- `POST /api/categories`, `PUT /api/categories/:id`, `DELETE /api/categories/:id`.
- `POST /api/uploads` — admin-only image upload (JPEG, PNG, WebP or GIF, up to 5 MB).

All product and category mutations require the administrator cookie and the configured `CLIENT_ORIGIN`. Product URLs are stored exactly as provided; direct Amazon marketplace product URLs (including Amazon India) and supported Amazon short-link hosts are accepted. Generic Amazon home/search pages and non-Amazon destinations are rejected. Verify each product and tracking tag in Associates Central.

## Amazon affiliate policies

- The public product links open the exact saved affiliate URL in a new tab.
- The site includes the disclosure: “As an Amazon Associate I earn from qualifying purchases.”
- No manually maintained Amazon prices, ratings, reviews, or availability are displayed.
- No cart, checkout, payment processing, or order management is implemented.

## SEO and social preview

The site includes page titles/descriptions, Open Graph/Twitter metadata, a favicon and a share image. When building for production, configure `VITE_SITE_URL` and `VITE_API_URL`; the build emits `robots.txt` with the sitemap endpoint, and the API generates the sitemap dynamically from visible products. Set the API's `SITE_URL` to the canonical public frontend origin. Social crawlers generally need to fetch public assets and metadata without authentication.

## Deploy with Vercel, Render, and MongoDB Atlas

`vercel.json` configures the React/Vite static build, output directory, and SPA route fallback; the fallback deliberately excludes `/api/*` so those requests reach the Vercel function in `api/[...path].js`. That function forwards same-origin API requests to Render so admin cookies remain first-party in browsers that block third-party cookies. `render.yaml` configures the Express API, production start command, health check, and environment-variable slots. The backend uses `process.env.PORT`, connects to the configured MongoDB Atlas URI, and requires the exact HTTPS `CLIENT_ORIGIN` in production.

No Git remote or Vercel/Render account authorization is available in this workspace, so deployment has not been performed. To publish:

1. Sign in to GitHub, create a **private** empty repository, then use VS Code's Source Control **Initialize Repository** and **Publish to GitHub** actions from `E:\Productzone`. Check that `server\.env` is not staged; `.gitignore` excludes it. Do not commit any environment file or secrets.
2. In Render, create a Blueprint from that repository and apply `render.yaml`. In the API service settings, set `MONGODB_URI` to the existing Atlas connection URI, `ADMIN_EMAIL` to `theproduxzone` (or your chosen administrator ID), `ADMIN_PASSWORD_HASH` to a newly generated bcrypt hash, and `SITE_URL` to the final Vercel origin. Render generates `JWT_SECRET`. Do not reuse secrets previously shared in chat.
3. Keep Atlas Network Access configured to permit Render's outbound connections. For deployment, Atlas may require allowing `0.0.0.0/0`; use a database user with a strong unique password and least-privilege access, and never publish the URI.
4. In Vercel, import the same GitHub repository. Set the project **Root Directory** to the repository root, Framework Preset to **Other**, Build Command to `npm run build`, Install Command to `npm ci`, and Output Directory to `client/dist`. The Vercel project will receive its production domain; set `VITE_SITE_URL` to that HTTPS origin and deploy.
5. In Render, set `CLIENT_ORIGIN` and `SITE_URL` to the exact Vercel origin (scheme and hostname only, no path or trailing slash). Render generates `JWT_SECRET`. The production API rejects admin mutations from other origins and requires HTTPS. Wait for the Render API service to become healthy and note its HTTPS origin.
6. In Vercel project settings, add the server-only environment variable `RENDER_API_URL` with the Render API origin (for example `https://the-product-zone-api.onrender.com`), and redeploy. Leave `VITE_API_URL` empty so browser API requests use the same-origin Vercel proxy. The proxy also forwards uploaded-image requests. Do not expose `RENDER_API_URL` as a `VITE_` variable.
7. Test the Render `/api/health`, public categories/products, admin login, create/edit/delete, CSV preview/import, image behavior and an exact Amazon affiliate link. Do not publish the Vercel URL until the checks pass.

Free Render web services can sleep while idle and have ephemeral local storage, so they do not guarantee uninterrupted 24/7 response times. Product image uploads saved there can disappear after restarts/redeploys; use stable external image URLs or configure durable storage. The Vercel same-origin API proxy avoids third-party admin-cookie restrictions. Review hosting limits and costs before choosing paid always-on plans.

## Credential reminder

Previously shared example password material and a JWT secret should be treated as exposed. Generate a fresh unique admin password hash and a new JWT secret; never place either in frontend variables, source files, screenshots, or chat. Environment files are gitignored.
