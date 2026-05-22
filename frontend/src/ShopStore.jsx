import React, { useEffect, useMemo, useState } from 'react';
import './shop-store.css';

const API_URL = import.meta.env.VITE_RTBO_API_URL || '/api';
const CART_KEY = 'rtbo-shop-cart';
const WISHLIST_KEY = 'rtbo-shop-wishlist';

const productImage = name => `/assets/images/${name}`;

const categories = [
  ['all', 'All Gear'],
  ['apparel', 'Apparel'],
  ['equipment', 'Equipment'],
  ['bags', 'Bags'],
  ['footwear', 'Footwear'],
  ['drinkware', 'Drinkware'],
  ['training', 'Training'],
  ['memberships', 'Memberships']
];

const states = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

const products = [
  {
    sku: 'RTBO-JERSEY-PRO',
    name: 'RTBO Pro Referee Jersey',
    category: 'apparel',
    price: 3999,
    image: productImage('shop/rtbo-jersey-pro.svg'),
    description: 'Lightweight black, white, and orange officiating jersey with RTBO styling.',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Black / White / Orange']
  },
  {
    sku: 'RTBO-POLO-PERFORMANCE',
    name: 'RTBO Performance Polo',
    category: 'apparel',
    price: 4499,
    image: productImage('shop/rtbo-performance-polo.svg'),
    description: 'Professional sideline polo for clinicians, observers, assignors, and staff.',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Black', 'White', 'Charcoal']
  },
  {
    sku: 'RTBO-QZIP-LS-POCKET',
    name: 'Quarter Zip Long Sleeve With Pocket',
    category: 'apparel',
    price: 5499,
    image: productImage('shop/rtbo-quarterzip-long-pocket.svg'),
    description: 'Long sleeve quarter zip built for travel, warmups, and professional event wear.',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Black', 'Graphite']
  },
  {
    sku: 'RTBO-QZIP-SS',
    name: 'Quarter Zip Short Sleeve',
    category: 'apparel',
    price: 4999,
    image: productImage('shop/rtbo-quarterzip-short.svg'),
    description: 'Short sleeve quarter zip for warmer gyms, camps, and summer school assignments.',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Black', 'White']
  },
  {
    sku: 'RTBO-TSHIRT-TRAIN',
    name: 'RTBO Training T-Shirt',
    category: 'apparel',
    price: 2499,
    image: productImage('shop/rtbo-training-tshirt.svg'),
    description: 'Daily training shirt for camp, film lab, classroom, and travel days.',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Black', 'White', 'Orange']
  },
  {
    sku: 'RTBO-WINDBREAKER',
    name: 'RTBO Windbreaker',
    category: 'apparel',
    price: 6999,
    image: productImage('shop/rtbo-windbreaker.svg'),
    description: 'Lightweight outerwear for travel, event arrival, and sideline movement.',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Black']
  },
  {
    sku: 'RTBO-TRACK-SUIT',
    name: 'RTBO Track Suit',
    category: 'apparel',
    price: 10999,
    image: productImage('shop/rtbo-track-suit.svg'),
    description: 'Two-piece warmup suit designed for officials, trainers, and event staff.',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Black / Orange']
  },
  {
    sku: 'FOX40-CLASSIC-BLACK',
    name: 'Fox 40 Classic Official Whistle',
    category: 'equipment',
    price: 1499,
    image: productImage('shop/fox40-classic-black.svg'),
    description: 'Classic black Fox 40 whistle for basketball officials.',
    sizes: [],
    colors: ['Black']
  },
  {
    sku: 'FOX40-LANYARD-RTBO',
    name: 'Fox 40 RTBO Lanyard',
    category: 'equipment',
    price: 999,
    image: productImage('shop/fox40-rtbo-lanyard.svg'),
    description: 'Durable lanyard for officials who need whistle access without distraction.',
    sizes: [],
    colors: ['Black / Orange']
  },
  {
    sku: 'RTBO-CLIPBOARD',
    name: 'Official Clipboard',
    category: 'equipment',
    price: 1999,
    image: productImage('shop/rtbo-official-clipboard.svg'),
    description: 'Coaching and officiating clipboard for camps, evaluations, and game prep.',
    sizes: [],
    colors: ['Black']
  },
  {
    sku: 'RTBO-HAT-FLEXFIT',
    name: 'RTBO Flexfit Hat',
    category: 'apparel',
    price: 2499,
    image: productImage('shop/rtbo-flexfit-hat.svg'),
    description: 'Structured RTBO cap with a clean official-development look.',
    sizes: ['S/M', 'L/XL'],
    colors: ['Black']
  },
  {
    sku: 'RTBO-SKULL-CAP',
    name: 'RTBO Skull Cap',
    category: 'apparel',
    price: 1999,
    image: productImage('shop/rtbo-skull-cap.svg'),
    description: 'Cold-weather skull cap for travel and outdoor event movement.',
    sizes: ['One Size'],
    colors: ['Black']
  },
  {
    sku: 'RTBO-SCARF',
    name: 'RTBO Scarf',
    category: 'apparel',
    price: 2299,
    image: productImage('shop/rtbo-scarf.svg'),
    description: 'Team-style RTBO scarf for fans, staff, and cold-weather arrivals.',
    sizes: ['One Size'],
    colors: ['Black / Orange']
  },
  {
    sku: 'RTBO-BACKPACK',
    name: 'RTBO Official Backpack',
    category: 'bags',
    price: 7499,
    image: productImage('shop/rtbo-official-backpack.svg'),
    description: 'Daily backpack with space for shoes, gear, tablet, paperwork, and travel items.',
    sizes: [],
    colors: ['Black']
  },
  {
    sku: 'ATHLETES-R-US-BACKPACK',
    name: 'Athletes Are Us Backpack',
    category: 'bags',
    price: 8499,
    image: productImage('shop/athletes-are-us-backpack.svg'),
    description: 'Structured training backpack for officials, athletes, and event staff.',
    sizes: [],
    colors: ['Black']
  },
  {
    sku: 'IRONBACKPACK-TRAVEL',
    name: 'IronBackpack Travel Pack',
    category: 'bags',
    price: 8999,
    image: productImage('shop/ironbackpack-travel.svg'),
    description: 'Travel-ready backpack for long event days and overnight assignments.',
    sizes: [],
    colors: ['Black']
  },
  {
    sku: 'RTBO-DUFFLE',
    name: 'RTBO Duffle Bag',
    category: 'bags',
    price: 6499,
    image: productImage('shop/rtbo-duffle-bag.svg'),
    description: 'Roomy official gear bag for uniforms, shoes, whistles, hydration, and extras.',
    sizes: [],
    colors: ['Black']
  },
  {
    sku: 'RTBO-LUGGAGE',
    name: 'RTBO Travel Luggage',
    category: 'bags',
    price: 13999,
    image: productImage('shop/rtbo-travel-luggage.svg'),
    description: 'Rolling travel luggage for tournament weekends and multi-day schools.',
    sizes: [],
    colors: ['Black']
  },
  {
    sku: 'RTBO-RUNNING-SHOES',
    name: 'Official Running Shoes',
    category: 'footwear',
    price: 11999,
    image: productImage('shop/official-running-shoes.svg'),
    description: 'Court-ready running shoes selected for training, conditioning, and movement.',
    sizes: ['7', '8', '9', '10', '11', '12', '13', '14'],
    colors: ['Black', 'White']
  },
  {
    sku: 'RTBO-OFFICIAL-SOCKS',
    name: 'RTBO Official Socks',
    category: 'footwear',
    price: 1499,
    image: productImage('shop/rtbo-official-socks.svg'),
    description: 'Comfort socks for long days on court and in the classroom.',
    sizes: ['M', 'L', 'XL'],
    colors: ['Black', 'White']
  },
  {
    sku: 'RTBO-COFFEE-MUG',
    name: 'RTBO Coffee Mug',
    category: 'drinkware',
    price: 1799,
    image: productImage('shop/rtbo-coffee-mug.svg'),
    description: 'Ceramic mug for officials, coaches, assignors, and supporters.',
    sizes: [],
    colors: ['Black']
  },
  {
    sku: 'RTBO-TUMBLER',
    name: 'RTBO Tumbler',
    category: 'drinkware',
    price: 2999,
    image: productImage('shop/rtbo-tumbler.svg'),
    description: 'Insulated tumbler for travel, school days, and tournament weekends.',
    sizes: ['20 oz', '30 oz'],
    colors: ['Black', 'Stainless']
  },
  {
    sku: 'RTBO-WATER-BOTTLE',
    name: 'RTBO Water Bottle',
    category: 'drinkware',
    price: 2499,
    image: productImage('shop/rtbo-water-bottle.svg'),
    description: 'Training water bottle designed for gym bags and long court sessions.',
    sizes: ['24 oz'],
    colors: ['Black', 'Clear']
  },
  {
    sku: 'RTBO-HYGIENE-KIT',
    name: 'Official Hygiene Kit',
    category: 'bags',
    price: 2799,
    image: productImage('shop/rtbo-hygiene-kit.svg'),
    description: 'Compact hygiene kit for travel, locker rooms, and tournament assignments.',
    sizes: [],
    colors: ['Black']
  },
  {
    sku: 'RTBO-MEMBERSHIP-ELITE',
    name: 'Elite Official Membership',
    category: 'memberships',
    price: 12999,
    image: productImage('shop/elite-official-membership.svg'),
    description: 'Membership access for official development resources, discounts, and priority updates.',
    sizes: [],
    colors: []
  },
  {
    sku: 'RTBO-FILM-LAB-PASS',
    name: 'Film Lab Training Pass',
    category: 'training',
    price: 5999,
    image: productImage('shop/film-lab-training-pass.svg'),
    description: 'Digital training pass for film study sessions, notes, and development resources.',
    sizes: [],
    colors: []
  }
];

const defaultCheckout = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  address2: '',
  city: '',
  state: '',
  zip: '',
  notes: ''
};

function money(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((Number(cents) || 0) / 100);
}

function readStoredJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function formatPhone(value) {
  const digits = String(value || '').replace(/\D+/g, '').slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function productKey(sku, size = '', color = '') {
  return [sku, size, color].filter(Boolean).join('::');
}

function categoryLabel(categoryId) {
  return categories.find(([id]) => id === categoryId)?.[1] || 'Gear';
}

async function postCheckout(payload) {
  const response = await fetch(`${API_URL}/store-checkout.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Checkout could not be created.');
  }
  return data;
}

function StoreSelect({ label, value, options, onChange, required = false }) {
  return (
    <label className="rtbo-shop-field">
      <span>{label}{required ? ' *' : ''}</span>
      <select value={value} onChange={event => onChange(event.target.value)} required={required}>
        <option value="">Select {label.toLowerCase()}</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function ProductOptions({ product, selectedOptions, setSelectedOptions }) {
  if (!product.sizes.length && !product.colors.length) return null;

  return (
    <div className="rtbo-shop-product-options">
      {product.sizes.length > 0 && (
        <StoreSelect
          label="Size"
          value={selectedOptions.size || product.sizes[0]}
          options={product.sizes}
          onChange={size => setSelectedOptions(options => ({ ...options, size }))}
          required
        />
      )}
      {product.colors.length > 0 && (
        <StoreSelect
          label="Color"
          value={selectedOptions.color || product.colors[0]}
          options={product.colors}
          onChange={color => setSelectedOptions(options => ({ ...options, color }))}
          required
        />
      )}
    </div>
  );
}

export default function ShopStore() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('featured');
  const [cart, setCart] = useState(() => readStoredJson(CART_KEY, []));
  const [wishlist, setWishlist] = useState(() => readStoredJson(WISHLIST_KEY, []));
  const [selectedProduct, setSelectedProduct] = useState(products[0]);
  const [selectedOptions, setSelectedOptions] = useState({
    size: products[0].sizes[0] || '',
    color: products[0].colors[0] || ''
  });
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkout, setCheckout] = useState(defaultCheckout);
  const [errors, setErrors] = useState({});
  const [checkoutStatus, setCheckoutStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  function openProduct(product) {
    setSelectedProduct(product);
    setSelectedOptions({
      size: product.sizes[0] || '',
      color: product.colors[0] || ''
    });
  }

  function addToCart(product = selectedProduct, options = selectedOptions) {
    const size = product.sizes.length ? (options.size || product.sizes[0]) : '';
    const color = product.colors.length ? (options.color || product.colors[0]) : '';
    const key = productKey(product.sku, size, color);

    setCart(current => {
      const existing = current.find(item => item.key === key);
      if (existing) {
        return current.map(item => item.key === key ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...current, { key, sku: product.sku, size, color, quantity: 1 }];
    });
    setCheckoutStatus({ type: 'success', message: `${product.name} was added to your cart.` });
  }

  function updateQuantity(key, delta) {
    setCart(current => current
      .map(item => item.key === key ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item)
      .filter(item => item.quantity > 0));
  }

  function toggleWishlist(sku) {
    setWishlist(current => current.includes(sku) ? current.filter(item => item !== sku) : [...current, sku]);
  }

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = products.filter(product => {
      const categoryMatches = category === 'all' || product.category === category;
      const queryMatches = !needle || [product.name, product.description, product.category, product.sku]
        .join(' ')
        .toLowerCase()
        .includes(needle);
      return categoryMatches && queryMatches;
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'price-low') return a.price - b.price;
      if (sort === 'price-high') return b.price - a.price;
      if (sort === 'name') return a.name.localeCompare(b.name);
      return products.findIndex(product => product.sku === a.sku) - products.findIndex(product => product.sku === b.sku);
    });
  }, [category, query, sort]);

  const cartLines = useMemo(() => cart.map(item => {
    const product = products.find(entry => entry.sku === item.sku);
    return product ? { ...item, product, lineTotal: product.price * item.quantity } : null;
  }).filter(Boolean), [cart]);

  const totals = useMemo(() => {
    const subtotal = cartLines.reduce((sum, item) => sum + item.lineTotal, 0);
    const shipping = subtotal === 0 || subtotal >= 10000 ? 0 : 895;
    const tax = Math.round(subtotal * 0.085);
    return { subtotal, shipping, tax, total: subtotal + shipping + tax, count: cartLines.reduce((sum, item) => sum + item.quantity, 0) };
  }, [cartLines]);

  function updateCheckout(field, value) {
    setCheckout(current => ({ ...current, [field]: field === 'phone' ? formatPhone(value) : value }));
    setErrors(current => ({ ...current, [field]: '' }));
  }

  function validateCheckout() {
    const nextErrors = {};
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zip'];
    requiredFields.forEach(field => {
      if (!String(checkout[field] || '').trim()) {
        nextErrors[field] = 'This field is required.';
      }
    });
    if (checkout.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkout.email)) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (checkout.phone && !/^\(\d{3}\) \d{3}-\d{4}$/.test(checkout.phone)) {
      nextErrors.phone = 'Use the format (xxx) xxx-xxxx.';
    }
    if (checkout.zip && !/^\d{5}(?:-\d{4})?$/.test(checkout.zip)) {
      nextErrors.zip = 'Enter a valid ZIP code.';
    }
    if (!cartLines.length) {
      nextErrors.cart = 'Add at least one item to the cart before checkout.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function beginCheckout(provider) {
    setCheckoutStatus({ type: '', message: '' });
    if (!validateCheckout()) {
      setCheckoutStatus({ type: 'error', message: 'Please complete the required checkout fields.' });
      return;
    }

    try {
      setCheckoutStatus({ type: 'pending', message: 'Creating secure checkout...' });
      const data = await postCheckout({
        payment_provider: provider,
        customer: checkout,
        items: cartLines.map(item => ({
          sku: item.sku,
          quantity: item.quantity,
          size: item.size,
          color: item.color
        }))
      });

      if (data.checkout_url) {
        window.location.assign(data.checkout_url);
        return;
      }

      setCheckoutStatus({ type: 'error', message: 'The payment gateway did not return a checkout link.' });
    } catch (error) {
      setCheckoutStatus({ type: 'error', message: error.message || 'Checkout could not be created.' });
    }
  }

  const paymentNotice = 'Affirm and Klarna are opened through Stripe Checkout when those payment methods are enabled and the order is eligible.';

  return (
    <section className="rtbo-shop-store" aria-labelledby="rtbo-shop-title">
      <div className="rtbo-shop-hero">
        <div className="rtbo-shop-hero-copy">
          <p className="eyebrow">Official Store</p>
          <h2 id="rtbo-shop-title">Officials. Train Hard. Get Rewarded.</h2>
          <p>Shop RTBO apparel, whistles, lanyards, bags, drinkware, training passes, and official-ready gear from one responsive checkout workspace.</p>
          <div className="rtbo-shop-search-row">
            <label className="rtbo-shop-search">
              <span>Search products</span>
              <input value={query} onChange={event => setQuery(event.target.value)} type="search" placeholder="Search products, training, and gear" />
            </label>
            <button className="btn" type="button" onClick={() => setCheckoutOpen(true)}>Cart ({totals.count})</button>
          </div>
        </div>
        <div className="rtbo-shop-hero-panel" aria-label="Featured shop artwork">
          <img src={productImage('rtbo-product-page-template.jpg')} alt="RTBO product page artwork" />
          <button className="btn" type="button" onClick={() => addToCart(products[0], { size: products[0].sizes[2], color: products[0].colors[0] })}>Shop Now</button>
        </div>
      </div>

      <div className="rtbo-shop-layout">
        <aside className="rtbo-shop-sidebar" aria-label="Shop categories">
          <div className="rtbo-shop-brand-card">
            <img src={productImage('logo.png')} alt="Raising The Bar Officiating logo" />
            <strong>Elite Official Gear</strong>
            <span>Secure checkout, RTBO training gear, and official essentials.</span>
          </div>
          <div className="rtbo-shop-category-list">
            {categories.map(([id, label]) => (
              <button key={id} type="button" className={category === id ? 'is-active' : ''} onClick={() => setCategory(id)}>
                <span>{label}</span>
                <small>{id === 'all' ? products.length : products.filter(product => product.category === id).length}</small>
              </button>
            ))}
          </div>
        </aside>

        <div className="rtbo-shop-main">
          <div className="rtbo-shop-toolbar">
            <div>
              <p className="eyebrow">{categoryLabel(category)}</p>
              <h3>{filteredProducts.length} products available</h3>
            </div>
            <label>
              <span>Sort</span>
              <select value={sort} onChange={event => setSort(event.target.value)}>
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>

          <div className="rtbo-shop-content-grid">
            <div className="rtbo-shop-products">
              {filteredProducts.map(product => (
                <article className="rtbo-shop-product-card" key={product.sku}>
                  <button className="rtbo-shop-wishlist" type="button" aria-label={`Wishlist ${product.name}`} onClick={() => toggleWishlist(product.sku)}>
                    {wishlist.includes(product.sku) ? 'Saved' : 'Save'}
                  </button>
                  <button className="rtbo-shop-product-image" type="button" onClick={() => openProduct(product)}>
                    <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
                  </button>
                  <div className="rtbo-shop-product-body">
                    <span>{categoryLabel(product.category)}</span>
                    <h4>{product.name}</h4>
                    <p>{product.description}</p>
                    <div className="rtbo-shop-product-actions">
                      <strong>{money(product.price)}</strong>
                      <button className="btn" type="button" onClick={() => addToCart(product, { size: product.sizes[0] || '', color: product.colors[0] || '' })}>Add</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <aside className="rtbo-shop-detail" aria-label="Product details">
              <div className="rtbo-shop-detail-media">
                <img src={selectedProduct.image} alt={selectedProduct.name} />
              </div>
              <p className="eyebrow">{categoryLabel(selectedProduct.category)}</p>
              <h3>{selectedProduct.name}</h3>
              <p>{selectedProduct.description}</p>
              <ProductOptions product={selectedProduct} selectedOptions={selectedOptions} setSelectedOptions={setSelectedOptions} />
              <div className="rtbo-shop-detail-footer">
                <strong>{money(selectedProduct.price)}</strong>
                <button className="btn" type="button" onClick={() => addToCart()}>Add to Cart</button>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <div className={`rtbo-shop-checkout ${checkoutOpen ? 'is-open' : ''}`}>
        <div className="rtbo-shop-checkout-panel" role="dialog" aria-modal="true" aria-label="RTBO store checkout">
          <div className="rtbo-shop-checkout-head">
            <div>
              <p className="eyebrow">Secure Checkout</p>
              <h3>Your Cart</h3>
            </div>
            <button className="btn" type="button" onClick={() => setCheckoutOpen(false)}>Close</button>
          </div>

          {errors.cart ? <p className="rtbo-shop-error">{errors.cart}</p> : null}
          <div className="rtbo-shop-cart-lines">
            {cartLines.length ? cartLines.map(item => (
              <article key={item.key} className="rtbo-shop-cart-line">
                <img src={item.product.image} alt="" />
                <div>
                  <strong>{item.product.name}</strong>
                  <span>{[item.size, item.color].filter(Boolean).join(' / ') || 'Standard'}</span>
                  <small>{money(item.product.price)} each</small>
                </div>
                <div className="rtbo-shop-qty">
                  <button type="button" onClick={() => updateQuantity(item.key, -1)}>-</button>
                  <span>{item.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(item.key, 1)}>+</button>
                </div>
              </article>
            )) : <p className="rtbo-shop-empty">Your cart is ready for official gear.</p>}
          </div>

          <dl className="rtbo-shop-totals">
            <div><dt>Subtotal</dt><dd>{money(totals.subtotal)}</dd></div>
            <div><dt>Shipping</dt><dd>{totals.shipping ? money(totals.shipping) : 'Free'}</dd></div>
            <div><dt>Estimated Tax</dt><dd>{money(totals.tax)}</dd></div>
            <div className="total"><dt>Total</dt><dd>{money(totals.total)}</dd></div>
          </dl>

          <form className="rtbo-shop-checkout-form" onSubmit={event => event.preventDefault()}>
            <label className="rtbo-shop-field"><span>First Name *</span><input value={checkout.firstName} onChange={event => updateCheckout('firstName', event.target.value)} required />{errors.firstName ? <small>{errors.firstName}</small> : null}</label>
            <label className="rtbo-shop-field"><span>Last Name *</span><input value={checkout.lastName} onChange={event => updateCheckout('lastName', event.target.value)} required />{errors.lastName ? <small>{errors.lastName}</small> : null}</label>
            <label className="rtbo-shop-field"><span>Email Address *</span><input type="email" value={checkout.email} onChange={event => updateCheckout('email', event.target.value)} required />{errors.email ? <small>{errors.email}</small> : null}</label>
            <label className="rtbo-shop-field"><span>Phone Number *</span><input value={checkout.phone} onChange={event => updateCheckout('phone', event.target.value)} placeholder="(555) 123-4567" required />{errors.phone ? <small>{errors.phone}</small> : null}</label>
            <label className="rtbo-shop-field is-wide"><span>Shipping Address *</span><input value={checkout.address} onChange={event => updateCheckout('address', event.target.value)} required />{errors.address ? <small>{errors.address}</small> : null}</label>
            <label className="rtbo-shop-field is-wide"><span>Address Line 2</span><input value={checkout.address2} onChange={event => updateCheckout('address2', event.target.value)} /></label>
            <label className="rtbo-shop-field"><span>City *</span><input value={checkout.city} onChange={event => updateCheckout('city', event.target.value)} required />{errors.city ? <small>{errors.city}</small> : null}</label>
            <StoreSelect label="State" value={checkout.state} options={states} onChange={state => updateCheckout('state', state)} required />
            {errors.state ? <p className="rtbo-shop-error">{errors.state}</p> : null}
            <label className="rtbo-shop-field"><span>ZIP Code *</span><input value={checkout.zip} onChange={event => updateCheckout('zip', event.target.value)} required />{errors.zip ? <small>{errors.zip}</small> : null}</label>
            <label className="rtbo-shop-field is-wide"><span>Order Notes</span><textarea value={checkout.notes} onChange={event => updateCheckout('notes', event.target.value)} rows="3" /></label>
          </form>

          <div className="rtbo-shop-payment-grid" aria-label="Payment methods">
            <button className="btn" type="button" onClick={() => beginCheckout('stripe')}>Stripe Checkout</button>
            <button className="btn" type="button" onClick={() => beginCheckout('paypal')}>PayPal</button>
            <button className="btn" type="button" onClick={() => beginCheckout('affirm')}>Affirm</button>
            <button className="btn" type="button" onClick={() => beginCheckout('klarna')}>Klarna</button>
          </div>
          <p className="rtbo-shop-payment-note">{paymentNotice}</p>
          {checkoutStatus.message ? <p className={`rtbo-shop-status is-${checkoutStatus.type}`}>{checkoutStatus.message}</p> : null}
          <button className="rtbo-shop-clear" type="button" onClick={() => setCart([])}>Clear Cart</button>
        </div>
      </div>
    </section>
  );
}
