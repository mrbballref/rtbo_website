import React, { useEffect, useMemo, useRef, useState } from 'react';
import './shop-inventory-manager.css';

const API_URL = import.meta.env.VITE_RTBO_API_URL || '/api';
const SHOP_INVENTORY_KEY = 'rtbo-shop-inventory-products';
const SHOP_INVENTORY_UPDATED_EVENT = 'rtbo-shop-inventory-updated';
const dashboardShopCategories = [
  ['all', 'All Gear'],
  ['apparel', 'Apparel'],
  ['equipment', 'Equipment'],
  ['bags', 'Bags'],
  ['footwear', 'Footwear'],
  ['drinkware', 'Drinkware'],
  ['training', 'Training'],
  ['memberships', 'Memberships']
];

function safeLocalStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

async function apiPostJson(endpoint, payload) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const error = new Error(data.message || 'Request failed.');
    error.status = response.status;
    throw error;
  }
  return data;
}

async function apiGet(endpoint) {
  const response = await fetch(`${API_URL}${endpoint}`, { credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const error = new Error(data.message || 'Request failed.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function inventoryMoney(cents) {
  return (Number(cents || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function inventoryCentsFromValue(value, fallback = 0) {
  const numeric = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(numeric)) return fallback;
  if ((typeof value === 'string' && value.includes('.')) || (!Number.isInteger(numeric) && numeric > 0 && numeric < 1000)) {
    return Math.max(0, Math.round(numeric * 100) || fallback);
  }
  return Math.max(0, Math.round(numeric || fallback));
}

function inventoryPriceInput(cents) {
  return ((Number(cents || 0) / 100).toFixed(2));
}

function inventoryListInput(value) {
  return Array.isArray(value) ? value.join(', ') : String(value || '');
}

function normalizeInventoryList(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean);
  }
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeInventorySku(value, fallbackName = 'RTBO Product') {
  const candidate = String(value || '').trim() || fallbackName;
  return candidate
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || `RTBO-${Date.now()}`;
}

function normalizeShopInventoryProduct(product = {}, index = 0) {
  const categoryIds = new Set(dashboardShopCategories.map(([id]) => id));
  const name = String(product.name || `RTBO Product ${index + 1}`).trim();
  const status = ['active', 'draft', 'hidden'].includes(product.status) ? product.status : 'active';
  const stockValue = Number(product.stock);

  return {
    sku: normalizeInventorySku(product.sku, name),
    name,
    category: categoryIds.has(product.category) && product.category !== 'all' ? product.category : 'apparel',
    price: inventoryCentsFromValue(product.price),
    image: String(product.image || '/assets/images/shop/featured/shop-product-membership-card.jpg').trim(),
    description: String(product.description || 'RTBO shop product.').trim(),
    sizes: normalizeInventoryList(product.sizes),
    colors: normalizeInventoryList(product.colors),
    stock: Number.isFinite(stockValue) ? Math.max(0, Math.round(stockValue)) : 8 + (index * 3) % 24,
    status,
    updatedAt: product.updatedAt || product.updated_at || ''
  };
}

function normalizeShopInventoryProducts(productList = []) {
  const seen = new Set();
  return (Array.isArray(productList) ? productList : [])
    .map((product, index) => normalizeShopInventoryProduct(product, index))
    .filter((product) => {
      if (!product.sku || !product.name || seen.has(product.sku)) return false;
      seen.add(product.sku);
      return true;
    });
}

function createInventoryForm(product = {}) {
  return {
    sku: product.sku || '',
    name: product.name || '',
    category: product.category || 'apparel',
    price: inventoryPriceInput(product.price),
    stock: String(product.stock ?? 8),
    status: product.status || 'active',
    image: product.image || '/assets/images/shop/featured/shop-product-membership-card.jpg',
    sizes: inventoryListInput(product.sizes),
    colors: inventoryListInput(product.colors),
    description: product.description || ''
  };
}

function uniqueInventorySku(baseSku, products = []) {
  const existing = new Set(products.map(product => product.sku));
  const base = normalizeInventorySku(baseSku || 'RTBO-PRODUCT-COPY');
  if (!existing.has(base)) return base;

  let index = 2;
  while (existing.has(`${base}-${index}`)) {
    index += 1;
  }

  return `${base}-${index}`;
}

function upsertInventoryProduct(products = [], product, editingSku = '') {
  let found = false;
  const targetSku = editingSku || product.sku;
  const nextProducts = products.map(item => {
    if (item.sku !== targetSku && item.sku !== product.sku) return item;
    found = true;
    return product;
  });

  return normalizeShopInventoryProducts(found ? nextProducts : [product, ...products]);
}

function inventoryFormToProduct(form = {}) {
  return normalizeShopInventoryProducts([{
    sku: form.sku,
    name: form.name,
    category: form.category,
    price: inventoryCentsFromValue(form.price),
    stock: Math.max(0, Math.round(Number(form.stock) || 0)),
    status: form.status,
    image: form.image,
    sizes: form.sizes,
    colors: form.colors,
    description: form.description
  }])[0];
}

function publishShopInventory(products) {
  const normalized = normalizeShopInventoryProducts(products);
  try {
    localStorage.setItem(SHOP_INVENTORY_KEY, JSON.stringify(normalized));
  } catch {
    // Inventory still saves server-side when local storage is blocked.
  }
  window.dispatchEvent(new CustomEvent(SHOP_INVENTORY_UPDATED_EVENT, { detail: { products: normalized } }));
}

export default function ShopInventoryManager({ onStatus = () => {} }) {
  const formRef = useRef(null);
  const [starterProducts, setStarterProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(() => createInventoryForm({}));
  const [editingSku, setEditingSku] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const categoryOptions = useMemo(() => dashboardShopCategories.filter(([id]) => id !== 'all'), []);
  const summary = useMemo(() => {
    const active = products.filter(product => product.status === 'active').length;
    const stock = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
    const value = products.reduce((sum, product) => sum + (Number(product.price || 0) * Number(product.stock || 0)), 0);
    return { active, stock, value };
  }, [products]);
  const visibleProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter(product => {
      const categoryMatch = category === 'all' || product.category === category;
      const queryMatch = !needle || [product.sku, product.name, product.description, product.category]
        .join(' ')
        .toLowerCase()
        .includes(needle);
      return categoryMatch && queryMatch;
    });
  }, [category, products, query]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    async function loadInventory() {
      let defaults = [];
      try {
        const shopModule = await import('./ShopStore.jsx');
        defaults = normalizeShopInventoryProducts(shopModule.shopDefaultProducts || []);
      } catch {
        defaults = [];
      }

      if (!active) return;
      setStarterProducts(defaults);

      try {
        const data = await apiGet('/shop-inventory.php?scope=admin');
        if (!active) return;
        const serverProducts = normalizeShopInventoryProducts(data.products || []);
        const nextProducts = serverProducts.length ? serverProducts : defaults;
        setProducts(nextProducts);
        if (nextProducts[0]) {
          setForm(createInventoryForm(nextProducts[0]));
          setEditingSku(nextProducts[0].sku);
        }
        publishShopInventory(nextProducts);
        setMessage(serverProducts.length ? `Loaded ${serverProducts.length} inventory products.` : 'Starter shop catalog loaded. Save a product to publish inventory management.');
        onStatus('Shop inventory manager loaded.');
      } catch (error) {
        if (!active) return;
        let storedProducts = [];
        try {
          storedProducts = normalizeShopInventoryProducts(JSON.parse(safeLocalStorageGet(SHOP_INVENTORY_KEY) || '[]'));
        } catch {
          storedProducts = [];
        }
        const nextProducts = storedProducts.length ? storedProducts : defaults;
        setProducts(nextProducts);
        if (nextProducts[0]) {
          setForm(createInventoryForm(nextProducts[0]));
          setEditingSku(nextProducts[0].sku);
        }
        setMessage(error.message || 'Inventory is using the local starter catalog until the server is available.');
        onStatus(error.message || 'Shop inventory API could not be reached.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInventory();

    return () => {
      active = false;
    };
  }, [onStatus]);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
  }

  function focusForm() {
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      formRef.current?.querySelector('input[name="name"]')?.focus();
    });
  }

  function startNewProduct() {
    setEditingSku('');
    setForm(createInventoryForm({}));
    setMessage('Create a product, save it, and it will appear on the shop page as an Amazon-style product card.');
    focusForm();
  }

  function startEdit(product) {
    setEditingSku(product.sku);
    setForm(createInventoryForm(product));
    setMessage(`Editing ${product.name}.`);
    focusForm();
  }

  function duplicateProduct(product) {
    const nextSku = uniqueInventorySku(`${product.sku}-COPY`, products);
    const copy = {
      ...product,
      sku: nextSku,
      name: `${product.name} Copy`,
      status: 'draft'
    };
    setEditingSku('');
    setForm(createInventoryForm(copy));
    setMessage('Duplicated product as a draft. Update the details, then save it as a new product.');
    focusForm();
  }

  async function saveProduct(event) {
    event.preventDefault();
    const product = inventoryFormToProduct(form);
    if (!product?.name || product.price <= 0) {
      setMessage('Product name and price are required.');
      return;
    }

    setSaving(true);
    setMessage('');
    const nextLocalProducts = upsertInventoryProduct(products, product, editingSku);
    setProducts(nextLocalProducts);
    publishShopInventory(nextLocalProducts);
    try {
      const data = await apiPostJson('/shop-inventory.php', {
        action: 'replace',
        products: nextLocalProducts
      });
      const nextProducts = normalizeShopInventoryProducts(data.products || nextLocalProducts);
      setProducts(nextProducts);
      publishShopInventory(nextProducts);
      setEditingSku(product.sku);
      setForm(createInventoryForm(product));
      setMessage(data.message || `${product.name} was saved to shop inventory.`);
      onStatus(`${product.name} was saved to shop inventory.`);
    } catch (error) {
      setEditingSku(product.sku);
      setMessage(`${product.name} was saved locally. Server save failed: ${error.message}`);
      onStatus('Shop inventory saved locally because the API was unavailable.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product) {
    setSaving(true);
    const nextLocalProducts = products.filter(item => item.sku !== product.sku);
    setProducts(nextLocalProducts);
    publishShopInventory(nextLocalProducts);
    if (editingSku === product.sku) {
      setEditingSku('');
      setForm(createInventoryForm({}));
    }
    setMessage(`Removing ${product.name} from shop inventory...`);
    try {
      const data = await apiPostJson('/shop-inventory.php', { action: 'replace', products: nextLocalProducts });
      const nextProducts = normalizeShopInventoryProducts(data.products || nextLocalProducts);
      setProducts(nextProducts);
      publishShopInventory(nextProducts);
      setMessage(data.message || `${product.name} was removed from the shop.`);
      onStatus(`${product.name} was removed from the shop.`);
    } catch (error) {
      setProducts(nextLocalProducts);
      publishShopInventory(nextLocalProducts);
      setMessage(`${product.name} was removed locally. Server delete failed: ${error.message}`);
      onStatus('Shop inventory delete used the local fallback because the API was unavailable.');
    } finally {
      setSaving(false);
    }
  }

  async function publishStarterCatalog() {
    setSaving(true);
    setMessage('');
    try {
      const data = await apiPostJson('/shop-inventory.php', {
        action: 'replace',
        products: starterProducts
      });
      const nextProducts = normalizeShopInventoryProducts(data.products || starterProducts);
      setProducts(nextProducts);
      publishShopInventory(nextProducts);
      setMessage('Starter catalog published to managed shop inventory.');
      onStatus('Starter catalog published to managed shop inventory.');
    } catch (error) {
      setMessage(error.message || 'Starter catalog could not be published.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rtbo-dashboard-card rtbo-shop-inventory-page">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">E-Commerce Command Center</p>
          <h3>Shop Inventory</h3>
          <p>Add, update, publish, hide, duplicate, or remove products. Active products automatically use the same shop cards, description pages, cart, wish list, and checkout flow as the current catalog.</p>
        </div>
        <div className="rtbo-form-toolbar">
          <button className="btn secondary dark-btn" type="button" onClick={publishStarterCatalog} disabled={saving}>Publish Starter Catalog</button>
          <button className="btn" type="button" onClick={startNewProduct} disabled={saving}>Add Product</button>
        </div>
      </div>

      <div className="rtbo-inventory-summary">
        <article><span>Total Products</span><strong>{products.length}</strong></article>
        <article><span>Active Products</span><strong>{summary.active}</strong></article>
        <article><span>Total Units</span><strong>{summary.stock}</strong></article>
        <article><span>Inventory Value</span><strong>{inventoryMoney(summary.value)}</strong></article>
      </div>

      <form className="rtbo-inventory-form" ref={formRef} onSubmit={saveProduct}>
        <label>
          <span>Product Name *</span>
          <input name="name" value={form.name} onChange={updateForm} placeholder="RTBO Pro Referee Jersey" required />
        </label>
        <label>
          <span>SKU *</span>
          <input name="sku" value={form.sku} onChange={updateForm} placeholder="RTBO-JERSEY-PRO" disabled={Boolean(editingSku)} required />
        </label>
        <label>
          <span>Category *</span>
          <select name="category" value={form.category} onChange={updateForm} required>
            {categoryOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>Price *</span>
          <input name="price" value={form.price} onChange={updateForm} inputMode="decimal" placeholder="39.99" required />
        </label>
        <label>
          <span>Stock *</span>
          <input name="stock" value={form.stock} onChange={updateForm} inputMode="numeric" placeholder="12" required />
        </label>
        <label>
          <span>Status</span>
          <select name="status" value={form.status} onChange={updateForm}>
            <option value="active">Active on shop</option>
            <option value="draft">Draft</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
        <label className="wide">
          <span>Image URL or Asset Path *</span>
          <input name="image" value={form.image} onChange={updateForm} placeholder="/assets/images/shop/featured/product.jpg" required />
        </label>
        <label>
          <span>Sizes</span>
          <input name="sizes" value={form.sizes} onChange={updateForm} placeholder="S, M, L, XL" />
        </label>
        <label>
          <span>Colors</span>
          <input name="colors" value={form.colors} onChange={updateForm} placeholder="Black, White, Orange" />
        </label>
        <label className="wide full">
          <span>Description *</span>
          <textarea name="description" value={form.description} onChange={updateForm} rows="4" placeholder="Describe this product for the shop detail page." required />
        </label>
        <div className="rtbo-inventory-form-actions">
          <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : editingSku ? 'Update Product' : 'Create Product'}</button>
          <button className="btn secondary dark-btn" type="button" onClick={startNewProduct} disabled={saving}>Clear Form</button>
        </div>
      </form>

      {message && <p className="form-message" role="status">{message}</p>}

      <div className="rtbo-inventory-toolbar">
        <label>
          <span>Search Inventory</span>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, SKU, description, category" />
        </label>
        <label>
          <span>Category</span>
          <select value={category} onChange={event => setCategory(event.target.value)}>
            {dashboardShopCategories.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
      </div>

      <div className="rtbo-inventory-list" aria-live="polite">
        {loading ? <p className="rtbo-empty-state">Loading shop inventory...</p> : null}
        {!loading && visibleProducts.length === 0 ? <p className="rtbo-empty-state">No inventory products match this filter.</p> : null}
        {visibleProducts.map(product => (
          <article className={`rtbo-inventory-item status-${product.status}`} key={product.sku}>
            <img src={product.image} alt="" loading="lazy" decoding="async" />
            <div>
              <span>{product.sku}</span>
              <strong>{product.name}</strong>
              <p>{product.description}</p>
              <small>{product.category} / {product.status} / {product.stock} in stock</small>
            </div>
            <div className="rtbo-inventory-item-meta">
              <strong>{inventoryMoney(product.price)}</strong>
              <small>{inventoryListInput(product.sizes) || 'Standard size'}</small>
              <small>{inventoryListInput(product.colors) || 'Standard color'}</small>
            </div>
            <div className="rtbo-inventory-item-actions">
              <button className="btn secondary dark-btn" type="button" onClick={() => startEdit(product)}>Edit</button>
              <button className="btn secondary dark-btn" type="button" onClick={() => duplicateProduct(product)}>Duplicate</button>
              <button className="btn secondary dark-btn danger-action" type="button" onClick={() => deleteProduct(product)} disabled={saving}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
