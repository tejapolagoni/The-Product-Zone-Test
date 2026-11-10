import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Instagram, Menu, Search, X } from 'lucide-react';

const links = [
  ['Home', '/'], ['All Products', '/products'], ['Electronics', '/products?category=Electronics'],
  ['Mobiles', '/products?category=Mobiles%20%26%20Smartphones'], ['Fashion', '/products?category=Fashion'],
  ['Shoes', '/products?category=Shoes%20%26%20Footwear'], ['Watches', '/products?category=Watches'],
  ['Home & Kitchen', '/products?category=Home%20%26%20Kitchen'], ['Books', '/products?category=Books'],
  ['About us', '/about'], ['Contact', '/contact']
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  function submitSearch(event) {
    event.preventDefault();
    navigate(`/products${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''}`);
    setMenuOpen(false);
  }

  return (
    <header className="site-header">
      <div className="topline">A LITTLE LESS SCROLLING. A LOT MORE GOOD FINDING.</div>
      <div className="nav-wrap">
        <Link className="wordmark" to="/" aria-label="The Product Zone home">
          <span className="brand-symbol">P<span>Z</span></span>
          <span className="brand-name">THE PRODUCT<br />ZONE<span className="brand-dot">.</span></span>
        </Link>
        <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          {links.map(([label, href]) => (
            <NavLink key={label} to={href} onClick={() => setMenuOpen(false)}>{label}</NavLink>
          ))}
        </nav>
        <form className="nav-search" onSubmit={submitSearch} role="search">
          <Search size={16} aria-hidden="true" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find your next favorite" aria-label="Search products" />
          <button type="submit" aria-label="Submit search"><ArrowUpRight size={16} /></button>
        </form>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Link className="wordmark footer-wordmark" to="/">
            <span className="brand-symbol">P<span>Z</span></span>
            <span className="brand-name">THE PRODUCT<br />ZONE<span className="brand-dot">.</span></span>
          </Link>
          <p>Good things, found thoughtfully.<br />Discover. Explore. Shop Smart.</p>
        </div>
        <div className="footer-links"><h3>Explore</h3><Link to="/products">All products</Link><Link to="/about">Our story</Link><Link to="/contact">Get in touch</Link></div>
        <div className="footer-links"><h3>The details</h3><Link to="/privacy">Privacy policy</Link><Link to="/terms">Terms & conditions</Link><a href="https://www.instagram.com/theproduxzone/" target="_blank" rel="noreferrer">@theproduxzone <ArrowUpRight size={13} /></a></div>
        <a className="social-link" href="https://www.instagram.com/theproduxzone/" target="_blank" rel="noreferrer" aria-label="Instagram @theproduxzone"><Instagram size={18} /></a>
      </div>
      <div className="affiliate-disclosure"><span className="disclosure-mark">i</span><p><strong>Affiliate disclosure</strong><br />As an Amazon Associate I earn from qualifying purchases. Some links on this website are affiliate links. If you click one and make a purchase, we may earn a commission at no additional cost to you.</p></div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} The Product Zone</span><span>Made for the curious.</span><Link to="/admin/login">Admin</Link></div>
    </footer>
  );
}

export default function SiteLayout() {
  return <><Header /><main><Outlet /></main><Footer /></>;
}
