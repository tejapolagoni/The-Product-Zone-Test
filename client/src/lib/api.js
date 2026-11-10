const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path.startsWith('/api') ? path : `/api${path}`}`, {
    credentials: 'include',
    ...options,
    headers: options.body instanceof FormData
      ? options.headers
      : { 'Content-Type': 'application/json', ...options.headers }
  });
  const result = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = response.status >= 500
      ? 'The product service is unavailable. Check that the API is running and MongoDB is connected.'
      : result.message || 'The request could not be completed.';
    throw new Error(message);
  }
  return result;
}

export const api = {
  products: params => {
    const query = params ? new URLSearchParams(params) : null;
    if (query?.has('q')) {
      query.set('search', query.get('q'));
      query.delete('q');
    }
    return request(`/products${query?.size ? `?${query}` : ''}`);
  },
  product: id => request(`/products/${encodeURIComponent(id)}`),
  categories: () => request('/categories'),
  adminProducts: params => request(`/products/admin/all${params ? `?${new URLSearchParams(params)}` : ''}`),
  previewProductImport: file => {
    const form = new FormData();
    form.append('file', file);
    return request('/products/admin/import/preview', { method: 'POST', body: form });
  },
  importProducts: file => {
    const form = new FormData();
    form.append('file', file);
    return request('/products/admin/import', { method: 'POST', body: form });
  },
  createProduct: data => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: id => request(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  createCategory: data => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/categories/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: id => request(`/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  login: data => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/auth/logout', { method: 'POST', body: '{}' }),
  me: () => request('/auth/me'),
  upload: file => {
    const form = new FormData();
    form.append('image', file);
    return request('/uploads', { method: 'POST', body: form });
  }
};

export function imageUrl(image) {
  if (!image?.startsWith('/uploads/')) return image;
  if (import.meta.env.PROD && !apiBase) return `/api${image}`;
  return `${apiBase}${image}`;
}
