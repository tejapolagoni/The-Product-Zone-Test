import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, Download, Eye, EyeOff, FileSpreadsheet, ImagePlus, Layers3, LogOut, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, imageUrl } from './lib/api.js';
import { EmptyState, Loading } from './components/Shared.jsx';

const blankProduct = {
  productName: '', brand: '', category: '', description: '', features: [],
  image: '', images: [], tags: [], amazonAffiliateUrl: '', isFeatured: false, isTrending: false,
  isRecommended: false, isVisible: true
};

function downloadCsvTemplate() {
  const content = 'productName,brand,category,description,image,price,amazonAffiliateUrl,tags,isFeatured\r\n';
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'product-zone-import-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function ProductImport({ onComplete, onClose }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [phase, setPhase] = useState('');

  async function inspectFile(event) {
    const selected = event.target.files?.[0];
    setFile(selected || null);
    setPreview(null);
    setResult(null);
    setError('');
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith('.csv')) {
      setError('Choose a .csv file.');
      return;
    }
    setWorking(true);
    setPhase('preview');
    try {
      const response = await api.previewProductImport(selected);
      setPreview(response.summary);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setWorking(false);
      setPhase('');
    }
  }

  async function importFile() {
    if (!file || !preview?.ready) return;
    setWorking(true);
    setPhase('import');
    setError('');
    try {
      const response = await api.importProducts(file);
      setResult(response);
      await onComplete(response);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setWorking(false);
      setPhase('');
    }
  }

  return <section className="bulk-import-panel" aria-labelledby="bulk-import-title">
    <div className="editor-heading"><div><span className="eyebrow">CATALOGUE TOOLS</span><h2 id="bulk-import-title">Import products from CSV</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close CSV import"><X size={18} /></button></div>
    <p className="bulk-import-help">Import up to 5,000 rows per file. Required columns: productName, category, description, image, amazonAffiliateUrl. Optional: brand, price, tags (separate with |), isFeatured.</p>
    <div className="bulk-import-actions">
      <label className="button button-outline bulk-file-picker"><Upload size={15} />{file ? file.name : 'Choose CSV'}<input type="file" accept=".csv,text/csv" onChange={inspectFile} disabled={working} /></label>
      <button type="button" className="button button-outline" onClick={downloadCsvTemplate}><Download size={15} /> Download template</button>
    </div>
    {working && <p className="bulk-import-status" role="status">{phase === 'import' ? 'Importing products…' : 'Checking CSV rows…'}</p>}
    {error && <div className="form-error" role="alert">{error}</div>}
    {preview && <div className="bulk-import-preview">
      <div className="bulk-import-counts"><span><strong>{preview.ready}</strong> ready</span><span><strong>{preview.skipped}</strong> duplicates</span><span><strong>{preview.failed}</strong> invalid</span><span>{preview.total} rows</span></div>
      <div className="bulk-preview-list" role="table" aria-label="CSV row preview">
        {preview.preview.map(row => <div className="bulk-preview-row" role="row" key={row.rowNumber}><span>Row {row.rowNumber}</span><strong>{row.productName || 'Unnamed product'}</strong><span className={`import-row-status ${row.status}`}>{row.status}</span>{row.message && <small>{row.message}</small>}</div>)}
      </div>
      {!result && <button type="button" className="button button-dark" onClick={importFile} disabled={working || preview.ready === 0}><FileSpreadsheet size={16} /> Import {preview.ready} products</button>}
    </div>}
    {result && <div className="bulk-import-result" role="status">
      <strong>{result.imported} products imported</strong><span>{result.skipped} duplicates skipped · {result.failed} failed</span>
      <div className="bulk-import-failures">{result.results.filter(row => row.status === 'failed').map(row => <small key={row.rowNumber}>Row {row.rowNumber}: {row.message}</small>)}</div>
    </div>}
  </section>;
}
export function AdminLoginPage() {
  const [values, setValues] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.login(values);
      navigate('/admin', { replace: true });
    } catch (reason) {
      setError(reason.message);
    } finally {
      setLoading(false);
    }
  }

  return <div className="admin-login-page">
    <Link className="admin-back-home" to="/"><ArrowLeft size={15} /> Back to the site</Link>
    <div className="admin-login-card">
      <Link className="wordmark" to="/"><span className="brand-symbol">P<span>Z</span></span><span className="brand-name">THE PRODUCT<br />ZONE<span className="brand-dot">.</span></span></Link>
      <span className="eyebrow">THE BACK ROOM</span><h1>Good to have<br />you <em>back.</em></h1><p>Sign in to manage your product discoveries.</p>
      <form onSubmit={submit}>
        <label>Admin email or Instagram ID<input type="text" autoComplete="username" placeholder="theproduxzone" required value={values.email} onChange={event => setValues({ ...values, email: event.target.value })} /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={values.password} onChange={event => setValues({ ...values, password: event.target.value })} /></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="button button-dark admin-submit" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'} <ArrowUpRight size={16} /></button>
      </form>
      <p className="login-footnote">Administrator access only. New accounts are not created here.</p>
    </div>
  </div>;
}

function ProductForm({ product, categories, onSave, onCancel, saving, error, setError }) {
  const [form, setForm] = useState(() => ({
    ...blankProduct, ...product,
    features: product?.features || [],
    images: product?.images || [],
    tags: product?.tags || []
  }));
  const [featureText, setFeatureText] = useState((product?.features || []).join('\n'));
  const [imageText, setImageText] = useState((product?.images || []).join('\n'));
  const [tagText, setTagText] = useState((product?.tags || []).join('\n'));
  const [uploading, setUploading] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  function update(key, value) {
    if (key === 'image') setPreviewFailed(false);
    setForm(current => ({ ...current, [key]: value }));
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const result = await api.upload(file);
      update('image', result.image);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  function submit(event) {
    event.preventDefault();
    onSave({
      ...form,
      features: featureText.split('\n').map(item => item.trim()).filter(Boolean),
      images: imageText.split('\n').map(item => item.trim()).filter(Boolean),
      tags: tagText.split('\n').map(item => item.trim()).filter(Boolean)
    });
  }

  return <form className="product-editor" onSubmit={submit}>
    <div className="editor-heading"><div><span className="eyebrow">{product?._id ? 'UPDATE YOUR FIND' : 'ADD TO THE EDIT'}</span><h2>{product?._id ? 'Edit product' : 'New product'}</h2></div><button type="button" className="icon-button" onClick={onCancel} aria-label="Close editor"><X size={18} /></button></div>
    <div className="editor-grid">
      <label>Product name *<input maxLength="160" required value={form.productName} onChange={event => update('productName', event.target.value)} placeholder="The product name" /></label>
      <label>Brand *<input maxLength="100" required value={form.brand} onChange={event => update('brand', event.target.value)} placeholder="Brand name" /></label>
      <label>Category *<select required value={form.category} onChange={event => update('category', event.target.value)}><option value="" disabled>Choose a category</option>{categories.map(category => <option key={category._id || category.name} value={category.name}>{category.name}</option>)}</select></label>
      <div className="image-field"><label htmlFor="product-image-url">Main image URL *</label><div className="image-input-row"><input id="product-image-url" required maxLength="2048" value={form.image} onChange={event => update('image', event.target.value)} placeholder="https://…" /><label className="upload-button" title="Upload a product image"><ImagePlus size={16} />{uploading ? 'Uploading…' : 'Upload'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadImage} disabled={uploading} /></label></div></div>
      <label className="editor-wide">Description *<textarea required maxLength="4000" rows="4" value={form.description} onChange={event => update('description', event.target.value)} placeholder="What makes this worth discovering?" /></label>
      <label className="editor-wide">Features <span className="input-hint">One feature per line</span><textarea rows="4" value={featureText} onChange={event => setFeatureText(event.target.value)} placeholder={'Thoughtful design\nMade for everyday use'} /></label>
      <label className="editor-wide">Additional image URLs <span className="input-hint">Optional, one URL per line</span><textarea rows="2" value={imageText} onChange={event => setImageText(event.target.value)} placeholder="https://…" /></label>
      <label className="editor-wide">Product tags <span className="input-hint">Optional, one tag per line</span><textarea rows="2" value={tagText} onChange={event => setTagText(event.target.value)} placeholder={'Everyday\nGift idea'} /></label>
      <label className="editor-wide">Amazon affiliate URL *<input required maxLength="2048" type="url" value={form.amazonAffiliateUrl} onChange={event => update('amazonAffiliateUrl', event.target.value)} placeholder="Paste your exact Amazon Associates link" /><span className="input-hint">Stored exactly as entered. Please verify it is the product’s correct affiliate link.</span></label>
    </div>
    <div className="editor-toggles">
      <label className="check-option"><input type="checkbox" checked={form.isFeatured} onChange={event => update('isFeatured', event.target.checked)} /><span><strong>Featured product</strong><small>Include in the homepage featured edit</small></span></label>
      <label className="check-option"><input type="checkbox" checked={form.isTrending} onChange={event => update('isTrending', event.target.checked)} /><span><strong>Trending product</strong><small>Include in the trending edit</small></span></label>
      <label className="check-option"><input type="checkbox" checked={form.isRecommended} onChange={event => update('isRecommended', event.target.checked)} /><span><strong>Recommended product</strong><small>Include in recommendations</small></span></label>
      <label className="check-option"><input type="checkbox" checked={form.isVisible} onChange={event => update('isVisible', event.target.checked)} /><span><strong>Visible on website</strong><small>Hidden products remain in your dashboard</small></span></label>
    </div>
    {form.image && <div className="image-preview">{previewFailed ? <span role="alert">Image preview could not load. Check the URL or upload the image again.</span> : <img src={imageUrl(form.image)} alt="Product image preview" onError={() => setPreviewFailed(true)} />}<span>Image preview</span></div>}
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="editor-actions"><button type="button" className="button button-outline" onClick={onCancel}>Cancel</button><button type="submit" className="button button-dark" disabled={saving || uploading}>{saving ? 'Saving…' : <><Save size={16} /> Save product</>}</button></div>
  </form>;
}

function CategoryManager({ categories, onSave, onDelete, saving, error }) {
  const [form, setForm] = useState({ name: '', image: '', note: '' });
  const [editingId, setEditingId] = useState('');
  const [showForm, setShowForm] = useState(false);

  function startEdit(category) {
    if (!category._id) return;
    setEditingId(category._id);
    setForm({ name: category.name, image: category.image || '', note: category.note || '' });
    setShowForm(true);
  }

  function closeForm() {
    setForm({ name: '', image: '', note: '' });
    setEditingId('');
    setShowForm(false);
  }

  async function submit(event) {
    event.preventDefault();
    const success = await onSave(form, editingId);
    if (success) closeForm();
  }

  return <section className="category-manager" aria-labelledby="category-manager-title">
    <div className="category-manager-heading"><div><span className="eyebrow">YOUR TAXONOMY</span><h2 id="category-manager-title">Manage categories <span>({categories.length})</span></h2></div><button className="button button-outline" onClick={() => { setEditingId(''); setForm({ name: '', image: '', note: '' }); setShowForm(!showForm); }}><Plus size={15} /> Add category</button></div>
    {error && !showForm && <div className="form-error category-manager-error" role="alert">{error}</div>}
    {showForm && <form className="category-editor" onSubmit={submit}>
      <label>Category name *<input maxLength="80" required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="e.g. Kitchen Appliances" /></label>
      <label>Image URL<input type="url" maxLength="2048" value={form.image} onChange={event => setForm({ ...form, image: event.target.value })} placeholder="Optional image for the homepage card" /></label>
      <label>Short note<input maxLength="120" value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} placeholder="Optional subtitle" /></label>
      {error && <div className="form-error editor-wide" role="alert">{error}</div>}
      <div className="category-editor-actions"><button type="button" className="button button-outline" onClick={closeForm}>Cancel</button><button type="submit" className="button button-dark" disabled={saving}>{saving ? 'Saving…' : <><Save size={15} /> {editingId ? 'Save changes' : 'Create category'}</>}</button></div>
    </form>}
    <div className="category-manager-list">{categories.map(category => <div className="category-manager-row" key={category._id || category.name}><span>{category.name}</span><div>{category._id ? <><button onClick={() => startEdit(category)}>Edit</button><button className="delete-action" onClick={() => onDelete(category)}>Delete</button></> : <small>Product category</small>}</div></div>)}</div>
  </section>;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(null);
  const [products, setProducts] = useState([]);
  const [productStats, setProductStats] = useState({ total: 0, visible: 0, featured: 0 });
  const [productPagination, setProductPagination] = useState(null);
  const [adminPage, setAdminPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editorProduct, setEditorProduct] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();

  async function loadProducts(page = adminPage) {
    setLoading(true);
    try {
      const result = await api.adminProducts({ page, pageSize: 25 });
      setProducts(result.products);
      setProductStats(result.stats);
      setProductPagination(result.pagination);
      setAdminPage(result.pagination.page);
      setError('');
      return true;
    } catch (reason) {
      setError(reason.message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const result = await api.categories();
      setCategories(result.categories);
      setCategoryError('');
    } catch (reason) {
      setCategoryError(reason.message);
    }
  }

  useEffect(() => {
    let active = true;
    api.me().then(() => { if (active) { setAuthenticated(true); } })
      .catch(() => { if (active) setAuthenticated(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadProducts();
      loadCategories();
    }
  }, [authenticated]);

  async function saveProduct(data) {
    setSaving(true);
    setError('');
    try {
      if (editorProduct?._id) await api.updateProduct(editorProduct._id, data);
      else await api.createProduct(data);
      setShowEditor(false);
      setEditorProduct(null);
      const refreshed = await loadProducts(editorProduct?._id ? adminPage : 1);
      setNotice(refreshed
        ? editorProduct?._id ? 'Product updated.' : 'Product added to your collection.'
        : 'Product saved, but the dashboard could not refresh. Try loading products again.');
      window.setTimeout(() => setNotice(''), 3500);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(product) {
    if (!window.confirm(`Delete “${product.productName}”? This cannot be undone.`)) return;
    setError('');
    try {
      await api.deleteProduct(product._id);
      const page = products.length === 1 && adminPage > 1 ? adminPage - 1 : adminPage;
      const refreshed = await loadProducts(page);
      setNotice(refreshed ? 'Product deleted.' : 'Product deleted, but the dashboard could not refresh. Try loading products again.');
      window.setTimeout(() => setNotice(''), 3500);
    } catch (reason) {
      setError(reason.message);
    }
  }

  async function saveCategory(data, id) {
    setSavingCategory(true);
    setCategoryError('');
    try {
      if (id) await api.updateCategory(id, data);
      else await api.createCategory(data);
      await Promise.all([loadCategories(), loadProducts()]);
      setNotice(id ? 'Category updated.' : 'Category created.');
      window.setTimeout(() => setNotice(''), 3500);
      return true;
    } catch (reason) {
      setCategoryError(reason.message);
      return false;
    } finally {
      setSavingCategory(false);
    }
  }

  async function removeCategory(category) {
    if (!window.confirm(`Delete the “${category.name}” category?`)) return;
    setCategoryError('');
    try {
      await api.deleteCategory(category._id);
      await loadCategories();
      setNotice('Category deleted.');
      window.setTimeout(() => setNotice(''), 3500);
    } catch (reason) {
      setCategoryError(reason.message);
    }
  }

  async function logout() {
    try { await api.logout(); } finally { navigate('/admin/login', { replace: true }); }
  }

  if (authenticated === null) return <div className="admin-loading"><Loading label="Checking your access" /></div>;
  if (!authenticated) return <Navigate to="/admin/login" replace />;

  return <div className="admin-dashboard">
    <header className="admin-topbar"><Link className="wordmark" to="/"><span className="brand-symbol">P<span>Z</span></span><span className="brand-name">THE PRODUCT<br />ZONE<span className="brand-dot">.</span></span></Link><div><span className="admin-role"><span /> ADMIN</span><button className="logout-button" onClick={logout}>Sign out <LogOut size={15} /></button></div></header>
    <main className="admin-content">
      <div className="admin-page-heading"><div><span className="eyebrow">THE PRODUCT ZONE / CONTROL ROOM</span><h1>Your <em>collection.</em></h1><p>Thoughtful finds, managed by you.</p></div><div className="admin-heading-actions"><button className="button button-outline" onClick={() => setShowCategories(!showCategories)}><Layers3 size={16} /> Categories</button><button className="button button-outline" onClick={() => { setShowImport(!showImport); setShowEditor(false); }}><FileSpreadsheet size={16} /> Import products CSV</button><button className="button button-dark" onClick={() => { setError(''); setShowEditor(true); setShowImport(false); setEditorProduct(null); }}><Plus size={17} /> Add a product</button></div></div>
      {notice && <div className="admin-notice"><Check size={17} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15} /></button></div>}
      {error && !showEditor && <div className="form-error admin-error" role="alert">{error}<button onClick={loadProducts}>Try again</button></div>}
      <div className="admin-stats"><div><span>TOTAL PRODUCTS</span><strong>{productStats.total.toString().padStart(2, '0')}</strong></div><div><span>VISIBLE</span><strong>{productStats.visible.toString().padStart(2, '0')}</strong></div><div><span>FEATURED</span><strong>{productStats.featured.toString().padStart(2, '0')}</strong></div></div>
      {showCategories && <CategoryManager categories={categories} onSave={saveCategory} onDelete={removeCategory} saving={savingCategory} error={categoryError} />}
      {showImport && <ProductImport onClose={() => setShowImport(false)} onComplete={async result => {
        await Promise.all([loadProducts(1), loadCategories()]);
        setNotice(`${result.imported} products imported. ${result.skipped} duplicates skipped; ${result.failed} failed.`);
        window.setTimeout(() => setNotice(''), 5000);
      }} />}
      {showEditor && <ProductForm key={editorProduct?._id || 'new'} product={editorProduct} categories={categories} onSave={saveProduct} onCancel={() => { setShowEditor(false); setError(''); }} saving={saving} error={error} setError={setError} />}
      <div className="admin-list-heading"><div><span className="eyebrow">YOUR EDIT</span><h2>Products <span>({productStats.total})</span></h2></div><Link to="/products" target="_blank" className="text-link">View the website <ArrowUpRight size={14} /></Link></div>
      {loading ? <Loading label="Loading your products" /> : products.length === 0 ? <EmptyState title="Your edit starts here" message="Add your first product to see it in this dashboard and on the website." /> :
        <div className="admin-product-list">{products.map(product => <article className={`admin-product-row ${!product.isVisible ? 'is-hidden' : ''}`} key={product._id}>
          <div className="admin-product-thumb">{product.image && <img src={imageUrl(product.image)} alt="" />}</div><div className="admin-product-info"><span>{product.category} · {product.brand}</span><h3>{product.productName}</h3><div className="admin-product-tags">{product.isFeatured && <span>FEATURED</span>}{product.isTrending && <span>TRENDING</span>}{product.isRecommended && <span>RECOMMENDED</span>}<span className={product.isVisible ? 'visible-tag' : 'hidden-tag'}>{product.isVisible ? <><Eye size={12} /> LIVE</> : <><EyeOff size={12} /> HIDDEN</>}</span></div></div>
          <div className="admin-row-actions"><a href={product.amazonAffiliateUrl} target="_blank" rel="noreferrer" aria-label="Open product affiliate link"><ArrowUpRight size={16} /></a><button onClick={() => { setError(''); setEditorProduct(product); setShowEditor(true); }} aria-label={`Edit ${product.productName}`}>Edit</button><button className="delete-action" onClick={() => removeProduct(product)} aria-label={`Delete ${product.productName}`}><Trash2 size={16} /></button></div>
        </article>)}</div>}
      {!loading && productPagination?.totalPages > 1 && <nav className="pagination admin-pagination" aria-label="Admin product pages">
        <button className="button button-outline" disabled={adminPage <= 1} onClick={() => loadProducts(adminPage - 1)}>Previous</button>
        <span>PAGE {adminPage} OF {productPagination.totalPages}</span>
        <button className="button button-outline" disabled={adminPage >= productPagination.totalPages} onClick={() => loadProducts(adminPage + 1)}>Next</button>
      </nav>}
    </main>
    <footer className="admin-footer"><span>THE PRODUCT ZONE · ADMIN</span><Link to="/">Back to website</Link></footer>
  </div>;
}
