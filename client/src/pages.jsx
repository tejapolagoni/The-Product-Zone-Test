import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Compass, Expand, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ProductCard from './components/ProductCard.jsx';
import { EmptyState, ErrorState, Loading, SectionHeading } from './components/Shared.jsx';
import { api, imageUrl } from './lib/api.js';
import { productCategories } from './constants/productCategories.js';

function usePageData(loader, dependencies = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    loader().then(result => { if (active) { setData(result); setError(''); } })
      .catch(reason => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
  return { data, error, loading, setError };
}

function CategoryCard({ category }) {
  return <Link to={`/products?category=${encodeURIComponent(category.name)}`} className="category-card">
    <img src={category.image?.startsWith('photo-') ? `https://images.unsplash.com/${category.image}?auto=format&fit=crop&w=720&q=82` : imageUrl(category.image)} alt="" loading="lazy" />
    <span className="category-wash" />
    <span className="category-copy"><small>{category.note}</small><strong>{category.name}</strong></span>
    <span className="category-arrow"><ArrowUpRight size={17} /></span>
  </Link>;
}

function ProductGrid({ products }) {
  return <div className="product-grid">{products.map((product, index) => <ProductCard key={product._id} product={product} number={index + 1} />)}</div>;
}

const technicalFieldPattern = /\b(manufacturer|model(?: number)?|dimensions?|weight|material|voltage|wattage|power source|connectivity|compatibility|battery|colou?r|size|capacity|item package quantity|included components|display type|resolution|frequency|mounting type|operating system|wireless|water resistance|screen size)\b/i;
const excludedProductInfoPattern = /\b(asin|mpn|manufacturer part number|reviews?|ratings?)\b/i;
const excludedProductInfoTextPattern = /\b(asin|mpn|manufacturer[\s_-]*part[\s_-]*number|(?:customer\s+)?reviews?|ratings?)\b|\b\d(?:\.\d+)?\s*(?:out of 5|\/5)\s*stars?\b/i;

function normalizedField(value) {
  return value.toLocaleLowerCase('en').replace(/[^a-z0-9]/g, '');
}

function isTechnicalField(value) {
  const key = normalizedField(value);
  return technicalFieldPattern.test(value)
    || /^(manufacturer|model|modelno|modelnumber|dimensions|itemdimensions|weight|itemweight|material|voltage|wattage|powersource|connectivity|compatibility|battery|color|colour|size|capacity|itempackagequantity|includedcomponents|displaytype|resolution|frequency|mountingtype|operatingsystem|wireless|waterresistance|screensize)$/.test(key);
}

function isExcludedProductField(value) {
  return /^(asin|mpn|manufacturerpartnumber|partnumber|customerreview|customerreviews|review|reviews|rating|ratings|starrating|reviewcount)$/.test(normalizedField(value));
}

function displayField(value) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, character => character.toUpperCase());
}

function specificationCategory(name) {
  const field = normalizedField(name);
  if (/dimension|weight|size|fit/.test(field)) return 'Dimensions & Fit';
  if (/material|build|construction|finish/.test(field)) return 'Materials & Build';
  if (/battery|voltage|wattage|power/.test(field)) return 'Power & Battery';
  if (/connectivity|compatibility|wireless|frequency|operatingsystem/.test(field)) return 'Connectivity';
  return 'Product Details';
}

function featureSpecification(name, text) {
  const content = `${name} ${text}`;
  if (/\b(light|lighting|led|illumination)\b/i.test(content)) return 'Lighting';
  if (/\b(comfort|comfortable|ergonomic|cushion|breathable)\b/i.test(content)) return 'Comfort';
  if (/\b(performance|powerful|efficient|speed|output)\b/i.test(content)) return 'Performance';
  if (/\b(build|built|durab|stainless|solid|construction|material)\b/i.test(content)) return 'Build Quality';
  if (/\b(dimension|size|weight|fit)\b/i.test(content)) return 'Dimensions & Fit';
  if (/\b(easy|convenien|portable|quick|simple|one.touch)\b/i.test(content)) return 'Convenience';
  if (/\b(design|style|finish|look|premium)\b/i.test(content)) return 'Design';
  return name && !/^(feature|special feature|product highlight|highlight|details?)$/i.test(name)
    ? displayField(name)
    : 'Product Features';
}

function getProductPresentation(product) {
  const rows = [];
  const seenSpecifications = new Set();
  const seenFeatureDetails = new Set();
  const featureGroups = new Map();
  const excludedFields = new Set(['productname', 'brand', 'category', 'description', 'image', 'images', 'tags', 'price', 'createdat', 'updatedat', 'id', '_id', 'v', '__v', 'isfeatured', 'istrending', 'isrecommended', 'isvisible', 'amazonaffiliateurl']);

  function addSpecification(name, rawValue) {
    let key = normalizedField(name).replace(/^item/, '');
    if (key === 'modelno' || key === 'modelnumber') key = 'model';
    if (key === 'dimension') key = 'dimensions';
    if (key === 'colour') key = 'color';
    if (!key || excludedFields.has(key) || isExcludedProductField(name) || excludedProductInfoPattern.test(name)) return;
    const value = Array.isArray(rawValue) ? rawValue.filter(item => item !== null && item !== undefined).join(', ') : rawValue;
    if (value === null || value === undefined || typeof value === 'object') return;
    const text = String(value).trim();
    if (!text) return;
    if (seenSpecifications.has(key)) return;
    seenSpecifications.add(key);
    rows.push({ category: specificationCategory(name), specification: displayField(name), details: text });
  }

  function addFeature(name, rawValue) {
    if (excludedFields.has(normalizedField(name)) || isExcludedProductField(name) || excludedProductInfoTextPattern.test(String(rawValue))) return;
    const text = String(rawValue ?? '').trim();
    if (!text) return;
    const detailKey = normalizedField(text);
    if (seenFeatureDetails.has(detailKey)) return;
    seenFeatureDetails.add(detailKey);
    const specification = featureSpecification(name, text);
    const key = normalizedField(specification);
    const existing = featureGroups.get(key);
    if (existing) {
      if (!existing.values.some(value => normalizedField(value) === normalizedField(text))) existing.values.push(text);
      return;
    }
    featureGroups.set(key, { category: 'Key Features', specification, values: [text] });
  }

  function consumeFeature(feature) {
    if (feature && typeof feature === 'object' && !Array.isArray(feature)) {
      const name = feature.name || feature.key || feature.label;
      const value = feature.value ?? feature.description;
      if (typeof name === 'string' && value !== undefined) {
        if (excludedFields.has(normalizedField(name)) || isExcludedProductField(name) || excludedProductInfoPattern.test(name)) return;
        if (isTechnicalField(name)) addSpecification(name, value);
        else addFeature(name, value);
        return;
      }
    }
    if (typeof feature !== 'string' || !feature.trim()) return;
    const match = feature.match(/^([^:：]{2,60})\s*[:：]\s*(.+)$/);
    if (match) {
      const [, name, value] = match;
      if (excludedFields.has(normalizedField(name))) return;
      if (isExcludedProductField(name) || excludedProductInfoPattern.test(name)) return;
      if (/^(brand|product name)$/i.test(name.trim())) return;
      if (isTechnicalField(name)) addSpecification(name, value);
      else addFeature(name, value);
      return;
    }
    addFeature('', feature);
  }

  for (const [name, value] of Object.entries(product)) {
    if (isTechnicalField(name) && value !== undefined) addSpecification(name, value);
  }
  for (const feature of product.features || []) consumeFeature(feature);
  for (const source of [product.technicalSpecifications, product.specifications, product.attributes]) {
    if (Array.isArray(source)) source.forEach(consumeFeature);
    else if (source && typeof source === 'object') {
      Object.entries(source).forEach(([name, value]) => {
        if (isTechnicalField(name)) addSpecification(name, value);
        else consumeFeature({ name, value });
      });
    }
  }

  for (const group of featureGroups.values()) rows.unshift({
    category: group.category,
    specification: group.specification,
    details: group.values.join(' · ')
  });
  return rows;
}

export default function HomePage() {
  const { data: featuredData, error: featuredError, loading: featuredLoading } = usePageData(() => api.products({ featured: 'true', limit: 4 }), []);
  const { data: trendingData, error: trendingError, loading: trendingLoading } = usePageData(() => api.products({ trending: 'true', limit: 4 }), []);
  const { data: latestData, error: latestError, loading: latestLoading } = usePageData(() => api.products({ sort: 'newest', limit: 4 }), []);
  const { data: recommendedData, error: recommendedError, loading: recommendedLoading } = usePageData(() => api.products({ recommended: 'true', limit: 4 }), []);
  const { data: categoryData } = usePageData(() => api.categories(), []);
  const categories = categoryData?.categories?.map(category => {
    const defaults = productCategories.find(item => item.name.toLocaleLowerCase('en') === category.name.toLocaleLowerCase('en'));
    return { ...defaults, ...category, image: category.image || defaults?.image || 'photo-1498049794561-7780e7231661', note: category.note || defaults?.note || 'A good thing, found' };
  }) || productCategories;
  const featured = featuredData?.products || [];
  const trending = trendingData?.products || [];
  const latest = latestData?.products || [];
  const recommended = recommendedData?.products || [];

  return <div className="home-page">
    <section className="hero">
      <img className="hero-image" src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2200&q=88" alt="" />
      <div className="hero-shade" />
      <div className="hero-content">
        <span className="hero-overline"><span /> THE GOOD FIND EDITION — NO. 01</span>
        <h1>Discover products<br />worth <em>buying.</em></h1>
        <p>Explore trending fashion, accessories, gadgets<br className="desktop-break" /> and everyday essentials.</p>
        <Link className="button button-lime" to="/products">Explore products <ArrowUpRight size={17} /></Link>
        <span className="hero-footnote">THOUGHTFUL FINDS. ZERO NOISE.</span>
      </div>
      <div className="hero-side-note">A BETTER WAY TO FIND YOUR NEXT FAVORITE</div>
      <a href="#discover" className="hero-scroll"><ArrowDown size={16} /> SCROLL TO EXPLORE</a>
      <div className="hero-count">01 <span>—</span> 30</div>
    </section>

    <section className="intro-strip" id="discover">
      <div className="intro-mark"><Compass size={21} /></div>
      <p>Not a store. Your shortcut to <em>really good stuff.</em></p>
      <Link to="/about" className="text-link">Get to know us <ArrowUpRight size={14} /></Link>
    </section>

    <section className="section-block categories-section">
      <SectionHeading eyebrow="POPULAR CATEGORIES" title={<>Find your <em>kind of thing.</em></>} action="All categories" />
      <div className="category-grid">{categories.map(category => <CategoryCard key={category._id || category.name} category={category} />)}</div>
    </section>

    <section className="section-block featured-section">
      <SectionHeading eyebrow="HAND-PICKED, NOT HYPED" title={<>The ones we're <em>into.</em></>} action="Explore all finds" />
      {featuredLoading ? <Loading /> : featuredError ? <ErrorState message={featuredError} /> : featured.length ? <ProductGrid products={featured} /> : <EmptyState title="Our picks are on the way" message="We’re adding thoughtful finds here soon. In the meantime, explore the categories above." />}
    </section>

    <section className="section-block trending-section">
      <SectionHeading eyebrow="ON OUR RADAR" title={<>Worth a closer <em>look.</em></>} action="Browse the collection" />
      {trendingLoading ? <Loading /> : trendingError ? <ErrorState message={trendingError} /> : trending.length ? <ProductGrid products={trending} /> : <EmptyState title="The next big find is out there" message="Our trending edit will show up here as soon as we add products." />}
    </section>

    <section className="quote-band">
      <span className="quote-kicker">A NOTE FROM THE EDITORS</span>
      <p>“Good shopping starts with<br /><em>knowing what’s worth your time.”</em></p>
      <span className="quote-stamp">TPZ<br /><small>EST. 2024</small></span>
    </section>

    <section className="section-block latest-section">
      <SectionHeading eyebrow="FRESH OFF THE FIND LIST" title={<>New around <em>here.</em></>} action="See all products" />
      {latestLoading ? <Loading /> : latestError ? <ErrorState message={latestError} /> : latest.length ? <ProductGrid products={latest} /> : <EmptyState title="A fresh edit is coming" message="Check back soon for new products picked with care." />}
    </section>

    <section className="section-block recommended-section">
      <SectionHeading eyebrow="A FEW MORE GOOD THINGS" title={<>Picked for <em>you.</em></>} action="Discover more" />
      {recommendedLoading ? <Loading /> : recommendedError ? <ErrorState message={recommendedError} /> : recommended.length ? <ProductGrid products={recommended} /> : <EmptyState title="A little something for later" message="Our recommendations will be waiting here when they’re ready." />}
    </section>

    <section className="newsletter-band">
      <div><span className="eyebrow">YOUR NEXT GOOD FIND</span><h2>Less endless scrolling.<br /><em>More “where did you find that?”</em></h2></div>
      <Link className="button button-dark" to="/products">Start exploring <ArrowRight size={17} /></Link>
      <span className="newsletter-orbit">GOOD<br />FINDS<br />ONLY</span>
    </section>
  </div>;
}

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: categoryData } = usePageData(() => api.categories(), []);
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const { data, error, loading } = usePageData(
    () => api.products({ ...Object.fromEntries(searchParams.entries()), page: searchParams.get('page') || '1', pageSize: '24' }),
    [searchParams.toString()]
  );
  const products = data?.products || [];
  const brands = useMemo(() => data?.brands || [...new Set(products.map(product => product.brand))].sort(), [data, products]);
  const pagination = data?.pagination;

  function setFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  }

  return <div className="page-shell listing-page">
    <div className="page-kicker"><span>THE PRODUCT INDEX</span><span>GOOD THINGS, FOUND THOUGHTFULLY</span></div>
    <div className="listing-title-row"><div><span className="eyebrow">A GROWING COLLECTION</span><h1>All the <em>good finds.</em></h1><p>Considered picks for your wardrobe, your everyday and everything in between.</p></div><div className="result-count">{loading ? '—' : String(pagination?.total ?? products.length).padStart(2, '0')} <span>FINDS</span></div></div>
    <form className="listing-search" onSubmit={event => event.preventDefault()}>
      <Search size={19} /><input value={query} onChange={event => setFilter('q', event.target.value)} placeholder="Search a product, brand or category..." aria-label="Search a product, brand or category" />
      {query && <button type="button" onClick={() => setFilter('q', '')}>Clear</button>}
    </form>
    <div className="filter-row">
      <div className="filter-label">FILTER THE FINDS <span>↓</span></div>
      <label><span>Category</span><select value={category} onChange={event => setFilter('category', event.target.value)}><option value="">All categories</option>{(categoryData?.categories || productCategories).map(item => <option key={item._id || item.name} value={item.name}>{item.name}</option>)}</select></label>
      <label><span>Brand</span><select value={searchParams.get('brand') || ''} onChange={event => setFilter('brand', event.target.value)}><option value="">All brands</option>{brands.map(brand => <option key={brand}>{brand}</option>)}</select></label>
      <label><span>Show</span><select value={searchParams.get('featured') || ''} onChange={event => setFilter('featured', event.target.value)}><option value="">Everything</option><option value="true">Featured only</option></select></label>
      <label><span>Sort by</span><select value={searchParams.get('sort') || 'newest'} onChange={event => setFilter('sort', event.target.value)}><option value="newest">Recently added</option><option value="oldest">Oldest first</option><option value="name">Name A–Z</option></select></label>
    </div>
    {loading ? <Loading /> : error ? <ErrorState message={error} /> : products.length ? <ProductGrid products={products} /> : <EmptyState title={query ? `No finds for “${query}”` : 'No products in this collection yet'} message="Try a different search or filter, or check back as we add new finds." />}
    {!loading && !error && pagination?.totalPages > 1 && <nav className="pagination" aria-label="Product pages">
      <button className="button button-outline" disabled={pagination.page <= 1} onClick={() => setFilter('page', String(pagination.page - 1))}>Previous</button>
      <span>PAGE {pagination.page} OF {pagination.totalPages}</span>
      <button className="button button-outline" disabled={pagination.page >= pagination.totalPages} onClick={() => setFilter('page', String(pagination.page + 1))}>Next</button>
    </nav>}
    <div className="affiliate-note-inline"><span>i</span><p>Some links are affiliate links. As an Amazon Associate I earn from qualifying purchases.</p></div>
  </div>;
}

function getRecentlyViewed() {
  try {
    const items = JSON.parse(window.localStorage.getItem('tpz-recent-products') || '[]');
    return Array.isArray(items) ? items.filter(item => item?._id && item.productName && item.image) : [];
  } catch {
    return [];
  }
}

export function ProductDetailPage() {
  const { id } = useParams();
  const [retryKey, setRetryKey] = useState(0);
  const { data, error, loading } = usePageData(() => api.product(id), [id, retryKey]);
  const product = data?.product;
  const { data: relatedData } = usePageData(
    () => product ? api.products({ category: product.category, limit: 8 }) : Promise.resolve({ products: [] }),
    [product?._id, product?.category]
  );
  const [selectedImage, setSelectedImage] = useState(0);
  const [imageOpen, setImageOpen] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState(getRecentlyViewed);
  const imageCloseRef = useRef(null);
  const imageTriggerRef = useRef(null);
  const specificationTableRef = useRef(null);
  const specificationRows = useMemo(() => product ? getProductPresentation(product) : [], [product]);
  const images = useMemo(
    () => [...new Set([product?.image, ...(product?.images || [])].filter(Boolean))],
    [product?.image, product?.images]
  );
  const relatedProducts = (relatedData?.products || []).filter(item => item._id !== product?._id).slice(0, 4);
  const recentProducts = recentlyViewed.filter(item => item._id !== product?._id).slice(0, 4);

  useEffect(() => {
    if (!product) return;
    document.title = `${product.productName} — THE PRODUCT ZONE`;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', product.description.slice(0, 160));
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', document.title);
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute('content', product.description.slice(0, 160));
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.setAttribute('content', imageUrl(product.image));
    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (twitterImage) twitterImage.setAttribute('content', imageUrl(product.image));
    setSelectedImage(0);
    setImageOpen(false);

    const recent = {
      _id: product._id,
      productName: product.productName,
      brand: product.brand,
      category: product.category,
      description: product.description,
      image: product.image,
      amazonAffiliateUrl: product.amazonAffiliateUrl,
      isFeatured: product.isFeatured
    };
    const nextRecent = [recent, ...getRecentlyViewed().filter(item => item._id !== product._id)].slice(0, 5);
    setRecentlyViewed(nextRecent);
    try {
      window.localStorage.setItem('tpz-recent-products', JSON.stringify(nextRecent));
    } catch {
      // Browsing still works when storage is disabled or full.
    }
  }, [product]);

  useEffect(() => {
    if (!imageOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    imageCloseRef.current?.focus();
    function closeOnEscape(event) {
      if (event.key === 'Escape') setImageOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
      imageTriggerRef.current?.focus();
    };
  }, [imageOpen]);

  useEffect(() => {
    const tableRows = specificationTableRef.current?.querySelectorAll('tbody tr');
    if (!tableRows?.length) return undefined;
    if (!('IntersectionObserver' in window)) {
      tableRows.forEach(row => row.classList.add('is-visible'));
      return undefined;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    tableRows.forEach(row => observer.observe(row));
    return () => observer.disconnect();
  }, [specificationRows]);

  if (loading) return <div className="detail-loading"><Loading label="Finding your product" /></div>;
  if (error && error !== 'Product not found.') return <div className="detail-loading"><ErrorState message={error} retry={() => setRetryKey(value => value + 1)} /></div>;
  if (!product) return <NotFoundPage product />;

  const activeImage = images[selectedImage] || product.image;
  const affiliateDisclosure = 'Some links are affiliate links. As an Amazon Associate I earn from qualifying purchases.';
  return <div className="page-shell detail-page">
    <nav className="detail-breadcrumbs" aria-label="Breadcrumb">
      <Link to="/">Home</Link><ChevronRight size={13} /><Link to="/products">Products</Link><ChevronRight size={13} /><Link to={`/products?category=${encodeURIComponent(product.category)}`}>{product.category}</Link><ChevronRight size={13} /><span aria-current="page">{product.productName}</span>
    </nav>
    <div className="detail-layout">
      <section className="detail-gallery" aria-label={`${product.productName} image gallery`}>
        <div className="detail-gallery-topline"><span><span className="detail-status-dot" /> THE PRODUCT ZONE / PRODUCT FILE</span><span>{String(selectedImage + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}</span></div>
        <div className="detail-main-image">
          <img key={activeImage} src={imageUrl(activeImage)} alt={`${product.productName}, image ${selectedImage + 1}`} />
          {product.isFeatured && <span className="detail-featured"><Sparkles size={13} /> EDITOR’S PICK</span>}
          <button ref={imageTriggerRef} type="button" className="detail-expand" onClick={() => setImageOpen(true)} aria-label="View product image full screen"><Expand size={17} /></button>
          {images.length > 1 && <>
            <button type="button" className="detail-image-arrow previous" onClick={() => setSelectedImage(index => (index - 1 + images.length) % images.length)} aria-label="Previous product image"><ChevronLeft size={20} /></button>
            <button type="button" className="detail-image-arrow next" onClick={() => setSelectedImage(index => (index + 1) % images.length)} aria-label="Next product image"><ChevronRight size={20} /></button>
          </>}
        </div>
        {images.length > 1 && <div className="detail-thumbnails" aria-label="Choose a product image">{images.map((image, index) =>
          <button key={`${image}-${index}`} type="button" className={index === selectedImage ? 'is-selected' : ''} onClick={() => setSelectedImage(index)} aria-label={`Show product image ${index + 1}`} aria-pressed={index === selectedImage}>
            <img src={imageUrl(image)} alt="" loading={index === 0 ? 'eager' : 'lazy'} />
          </button>
        )}</div>}
      </section>
      <div className="detail-copy">
        <div className="detail-product-kicker"><span>{product.brand}</span><span className="detail-dot">/</span><span>{product.category}</span></div>
        <h1>{product.productName}</h1>
        <p className="detail-description">{product.description}</p>
        <section className="detail-purchase-card" aria-label="View product on Amazon">
          <div className="purchase-card-top"><span className="purchase-card-mark">PZ</span><span>THE PRODUCT ZONE SELECT</span><ShieldCheck size={17} /></div>
          <p>Interested in this find?</p>
          <span className="purchase-card-note">See current product details directly on Amazon.</span>
          <a className="button detail-amazon" href={product.amazonAffiliateUrl} target="_blank" rel="nofollow sponsored noreferrer">VIEW ON AMAZON <ArrowUpRight size={17} /></a>
          <small>{affiliateDisclosure}</small>
        </section>
        <div className="detail-trust-row"><span><ShieldCheck size={15} /> Product discovery, not checkout</span><span>Retailer handles purchase & delivery</span></div>
      </div>
    </div>
    {specificationRows.length > 0 && <section className="detail-spec-section">
      <div className="detail-section-heading"><span className="eyebrow">A CLOSER LOOK</span><h2>What makes it <em>stand out.</em></h2><p>Product information provided for this listing.</p></div>
      <div className="detail-spec-table-scroll">
        <table className="detail-spec-table" ref={specificationTableRef}>
          <thead><tr><th scope="col">Category</th><th scope="col">Specification</th><th scope="col">Details</th></tr></thead>
          <tbody>{specificationRows.map(({ category, specification, details }, index) =>
            <tr key={`${normalizedField(category)}-${normalizedField(specification)}-${normalizedField(details)}`} style={{ '--spec-row-index': Math.min(index, 8) }}>
              <td data-label="Category">{category}</td>
              <td data-label="Specification">{specification}</td>
              <td data-label="Details">{details}</td>
            </tr>
          )}</tbody>
        </table>
      </div>
    </section>}
    <section className="detail-about-brand">
      <span className="detail-brand-mark">{product.brand?.slice(0, 1)?.toUpperCase() || 'P'}</span>
      <div><span className="eyebrow">BRAND & CATEGORY</span><h2>{product.brand}</h2><p>Explore more finds in <Link to={`/products?category=${encodeURIComponent(product.category)}`}>{product.category}</Link>.</p></div>
      <Link className="button detail-brand-link" to={`/products?category=${encodeURIComponent(product.category)}`}>EXPLORE CATEGORY <ArrowUpRight size={15} /></Link>
    </section>
    {relatedProducts.length > 0 && <section className="detail-related-section">
      <div className="detail-section-heading detail-related-heading"><div><span className="eyebrow">MORE FROM {product.category.toUpperCase()}</span><h2>Related <em>finds.</em></h2></div><Link className="text-link" to={`/products?category=${encodeURIComponent(product.category)}`}>View category <ArrowUpRight size={15} /></Link></div>
      <ProductGrid products={relatedProducts} />
    </section>}
    {recentProducts.length > 0 && <section className="detail-recent-section">
      <div className="detail-section-heading detail-related-heading"><div><span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2>Recently <em>viewed.</em></h2></div></div>
      <ProductGrid products={recentProducts} />
    </section>}
    <div className="detail-affiliate-note"><ShieldCheck size={18} /><p>{affiliateDisclosure} You’ll leave The Product Zone and visit Amazon. Prices, availability, shipping, and returns are handled by the retailer.</p></div>
    <div className="detail-mobile-buy"><span>{product.productName}</span><a href={product.amazonAffiliateUrl} target="_blank" rel="nofollow sponsored noreferrer">VIEW ON AMAZON <ArrowUpRight size={16} /></a></div>
    {imageOpen && <div className="detail-lightbox" role="dialog" aria-modal="true" aria-label={`${product.productName} full-screen image`} onMouseDown={event => { if (event.target === event.currentTarget) setImageOpen(false); }}>
      <button ref={imageCloseRef} type="button" className="detail-lightbox-close" onClick={() => setImageOpen(false)} aria-label="Close full-screen image"><X size={23} /></button>
      {images.length > 1 && <button type="button" className="detail-lightbox-arrow previous" onClick={() => setSelectedImage(index => (index - 1 + images.length) % images.length)} aria-label="Previous product image"><ChevronLeft size={25} /></button>}
      <img src={imageUrl(activeImage)} alt={`${product.productName}, image ${selectedImage + 1}`} />
      {images.length > 1 && <button type="button" className="detail-lightbox-arrow next" onClick={() => setSelectedImage(index => (index + 1) % images.length)} aria-label="Next product image"><ChevronRight size={25} /></button>}
      <span className="detail-lightbox-count">{selectedImage + 1} / {images.length}</span>
    </div>}
  </div>;
}

export function AboutPage() {
  return <div className="page-shell story-page"><div className="page-kicker"><span>OUR STORY</span><span>BUILT FOR BETTER DISCOVERIES</span></div><div className="story-hero"><span className="eyebrow">NOT ANOTHER STORE</span><h1>We believe good<br />things are <em>worth finding.</em></h1><p>The Product Zone is a thoughtfully edited corner of the internet for the things that make everyday life a little better.</p></div><div className="story-columns"><div><span className="eyebrow">THE IDEA</span><h2>A little more intention.<br /><em>A lot less noise.</em></h2></div><div><p>We bring together products across fashion, accessories, gadgets and everyday essentials so you can spend less time searching and more time finding what feels right for you.</p><p>We don’t sell products directly. When something catches your eye, our links take you to the retailer where you can learn more and decide for yourself.</p></div></div><div className="story-disclosure"><span className="eyebrow">TRANSPARENCY MATTERS</span><p>Some links on this website are affiliate links. As an Amazon Associate I earn from qualifying purchases. This never changes the price you pay.</p></div></div>;
}

export function ContactPage() {
  return <div className="page-shell contact-page"><div className="page-kicker"><span>SAY HELLO</span><span>WE’RE ALL EARS</span></div><span className="eyebrow">CONTACT</span><h1>Good things start<br />with <em>a conversation.</em></h1><p>Have a question, a suggestion, or a product you think deserves a closer look? Send us a message on Instagram.</p><a className="button button-dark" href="https://www.instagram.com/theproduxzone/" target="_blank" rel="noreferrer">Message @theproduxzone <ArrowUpRight size={16} /></a><div className="contact-small">Please note: product purchases, shipping and returns are handled by the retailer. We’re unable to access or manage Amazon orders.</div></div>;
}

export function LegalPage({ type }) {
  const privacy = type === 'privacy';
  return <div className="page-shell legal-page"><div className="page-kicker"><span>THE IMPORTANT BITS</span><span>LAST UPDATED: NOVEMBER 2026</span></div><span className="eyebrow">{privacy ? 'YOUR DATA, YOUR BUSINESS' : 'THE FINE PRINT'}</span><h1>{privacy ? <>Privacy <em>policy.</em></> : <>Terms & <em>conditions.</em></>}</h1>
    {privacy ? <><p className="legal-lead">Your privacy matters. This website is a product discovery and affiliate referral site; we do not process purchases or collect payment details.</p><h2>Information we collect</h2><p>We do not require an account to browse. If you contact us through Instagram, we receive the information you choose to share in your message. Instagram may also process information according to its own privacy policy. Our hosting provider may process standard technical logs needed to operate and protect this website.</p><h2>Affiliate links and third parties</h2><p>Some links lead to Amazon or other retailers. When you follow a link, that retailer’s own privacy policy and practices apply. Affiliate tracking may be used by the retailer to attribute a referral.</p><h2>External assets</h2><p>Some website imagery and fonts are loaded from third-party providers. Their servers may receive technical connection data, such as your IP address, when your browser requests those assets. Please review their privacy practices for more information.</p><h2>Cookies and security</h2><p>This public site does not use advertising or analytics cookies by default. The administrator area uses a secure, HTTP-only session cookie to protect access. We take reasonable steps to protect information but cannot guarantee the security of data transmitted over the internet.</p><h2>Contact</h2><p>Questions about this policy? <Link to="/contact">Get in touch</Link>.</p></> : <><p className="legal-lead">By using The Product Zone, you agree to these terms. The website is an informational product showcase and does not sell products directly.</p><h2>Product links and affiliate disclosure</h2><p>Some links are affiliate links. As an Amazon Associate I earn from qualifying purchases. Clicking a link takes you to the retailer’s website. Any purchase, price, availability, shipping, returns or customer service is handled solely by that retailer.</p><h2>Information on this site</h2><p>Product descriptions and images are provided for discovery purposes and may be updated. Retailers control the current product details. We do not display or guarantee prices, ratings, reviews or availability.</p><h2>Use of the website</h2><p>You agree not to misuse this website or interfere with its operation. The site and its content are provided “as is” to the extent permitted by law. These terms may be updated from time to time.</p><h2>Contact</h2><p>Questions? <Link to="/contact">Get in touch</Link>.</p></>}
  </div>;
}

export function NotFoundPage({ product = false }) {
  const navigate = useNavigate();
  return <div className="not-found-page"><div className="not-found-number">404</div><span className="eyebrow">{product ? 'THAT FIND GOT AWAY' : 'OFF THE BEATEN PATH'}</span><h1>{product ? <>This product isn’t <em>here.</em></> : <>Nothing to find <em>here.</em></>}</h1><p>{product ? 'This product may have been removed or is no longer available.' : 'Looks like this page took a little detour. Let’s get you back to the good stuff.'}</p><Link className="button button-dark" to="/products"><ArrowLeft size={16} /> Explore products</Link></div>;
}
