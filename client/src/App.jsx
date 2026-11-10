import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import SiteLayout from './components/SiteLayout.jsx';
import HomePage, { AboutPage, ContactPage, LegalPage, NotFoundPage, ProductDetailPage, ProductsPage } from './pages.jsx';
import AdminPage, { AdminLoginPage } from './admin.jsx';

function PageTitle() {
  const location = useLocation();
  useEffect(() => {
    const descriptions = {
      '/': 'Discover thoughtful finds, considered essentials and products worth knowing at The Product Zone.',
      '/products': 'Browse and discover products across popular Amazon India categories, selected for The Product Zone.',
      '/about': 'Learn about The Product Zone: a thoughtful product discovery and Amazon affiliate showcase.',
      '/contact': 'Contact The Product Zone with questions, feedback, or product suggestions.',
      '/privacy': 'Read The Product Zone privacy policy and learn how this affiliate showcase handles information.',
      '/terms': 'Read the terms and conditions for using The Product Zone product discovery website.'
    };
    const page = location.pathname.startsWith('/admin') ? 'Admin' : location.pathname === '/' ? '' : location.pathname.split('/')[1].replace(/-/g, ' ');
    document.title = page ? `${page.charAt(0).toUpperCase()}${page.slice(1)} — THE PRODUCT ZONE` : 'THE PRODUCT ZONE — Discover. Explore. Shop Smart.';
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', descriptions[location.pathname] || descriptions['/products']);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', `${window.location.origin}${location.pathname}`);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', `${window.location.origin}${location.pathname}`);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', document.title);
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute('content', description?.content || '');
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute('content', document.title);
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription) twitterDescription.setAttribute('content', description?.content || '');
  }, [location.pathname]);
  return null;
}

export default function App() {
  return <>
    <PageTitle />
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="privacy" element={<LegalPage type="privacy" />} />
        <Route path="terms" element={<LegalPage type="terms" />} />
        <Route path="not-found" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  </>;
}
