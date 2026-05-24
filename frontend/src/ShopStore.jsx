import React, { useEffect, useMemo, useRef, useState } from 'react';
import './shop-store.css';

const API_URL = import.meta.env.VITE_RTBO_API_URL || '/api';
const CART_KEY = 'rtbo-shop-cart';
export const SHOP_INVENTORY_KEY = 'rtbo-shop-inventory-products';
export const SHOP_INVENTORY_UPDATED_EVENT = 'rtbo-shop-inventory-updated';
const WISHLIST_KEY = 'rtbo-shop-wishlist';
const WISHLIST_NAME_KEY = 'rtbo-shop-wishlist-name';

const productImage = name => `/assets/images/${name}`;
const shopFeaturedImage = name => productImage(`shop/featured/${name}`);

export const shopCategories = [
  ['all', 'All Gear'],
  ['apparel', 'Apparel'],
  ['equipment', 'Equipment'],
  ['bags', 'Bags'],
  ['footwear', 'Footwear'],
  ['drinkware', 'Drinkware'],
  ['training', 'Training'],
  ['memberships', 'Memberships']
];
const categories = shopCategories;

const states = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

const shopBannerImages = [
  {
    src: shopFeaturedImage('shop-hero-quarter-zip-orange.jpg'),
    alt: 'RTBO black and orange quarter zip apparel'
  },
  {
    src: shopFeaturedImage('shop-hero-referee-jersey.jpg'),
    alt: 'RTBO referee jersey product mockup'
  },
  {
    src: shopFeaturedImage('shop-hero-backpack-red.jpg'),
    alt: 'RTBO red official backpack'
  },
  {
    src: shopFeaturedImage('shop-hero-whistle-teal.jpg'),
    alt: 'RTBO teal officiating whistle'
  },
  {
    src: shopFeaturedImage('shop-hero-hoodie-white-orange.jpg'),
    alt: 'RTBO white and orange hoodie'
  },
  {
    src: shopFeaturedImage('shop-hero-striped-jerseys.jpg'),
    alt: 'RTBO striped referee jersey set'
  },
  {
    src: shopFeaturedImage('shop-hero-tumbler-teal.jpg'),
    alt: 'RTBO teal travel tumbler'
  },
  {
    src: shopFeaturedImage('shop-hero-hat-green.jpg'),
    alt: 'RTBO green official cap'
  }
];

const shopBannerSlides = [...shopBannerImages, ...shopBannerImages];

export const shopDefaultProducts = [
  {
    sku: 'RTBO-JERSEY-PRO',
    name: 'RTBO Pro Referee Jersey',
    category: 'apparel',
    price: 3999,
    image: shopFeaturedImage('shop-hero-referee-jersey.jpg'),
    description: 'Lightweight black, white, and orange officiating jersey with RTBO styling.',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Black / White / Orange']
  },
  {
    sku: 'RTBO-POLO-PERFORMANCE',
    name: 'RTBO Performance Polo',
    category: 'apparel',
    price: 4499,
    image: shopFeaturedImage('shop-product-polo-orange.jpg'),
    description: 'Professional sideline polo for clinicians, observers, assignors, and staff.',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Black', 'White', 'Charcoal']
  },
  {
    sku: 'RTBO-QZIP-LS-POCKET',
    name: 'Quarter Zip Long Sleeve With Pocket',
    category: 'apparel',
    price: 5499,
    image: shopFeaturedImage('shop-hero-quarter-zip-orange.jpg'),
    description: 'Long sleeve quarter zip built for travel, warmups, and professional event wear.',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Black', 'Graphite']
  },
  {
    sku: 'RTBO-QZIP-SS',
    name: 'Quarter Zip Short Sleeve',
    category: 'apparel',
    price: 4999,
    image: shopFeaturedImage('shop-hero-hoodie-white-orange.jpg'),
    description: 'Short sleeve quarter zip for warmer gyms, camps, and summer school assignments.',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Black', 'White']
  },
  {
    sku: 'RTBO-TSHIRT-TRAIN',
    name: 'RTBO Training T-Shirt',
    category: 'apparel',
    price: 2499,
    image: shopFeaturedImage('shop-product-hoodie-blue.jpg'),
    description: 'Daily training shirt for camp, film lab, classroom, and travel days.',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Black', 'White', 'Orange']
  },
  {
    sku: 'RTBO-WINDBREAKER',
    name: 'RTBO Windbreaker',
    category: 'apparel',
    price: 6999,
    image: shopFeaturedImage('shop-hero-quarter-zip-orange.jpg'),
    description: 'Lightweight outerwear for travel, event arrival, and sideline movement.',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Black']
  },
  {
    sku: 'RTBO-TRACK-SUIT',
    name: 'RTBO Track Suit',
    category: 'apparel',
    price: 10999,
    image: shopFeaturedImage('shop-product-hoodie-blue.jpg'),
    description: 'Two-piece warmup suit designed for officials, trainers, and event staff.',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Black / Orange']
  },
  {
    sku: 'FOX40-CLASSIC-BLACK',
    name: 'Fox 40 Classic Official Whistle',
    category: 'equipment',
    price: 1499,
    image: shopFeaturedImage('shop-hero-whistle-black.jpg'),
    description: 'Classic black Fox 40 whistle for basketball officials.',
    sizes: [],
    colors: ['Black']
  },
  {
    sku: 'FOX40-LANYARD-RTBO',
    name: 'Fox 40 RTBO Lanyard',
    category: 'equipment',
    price: 999,
    image: shopFeaturedImage('shop-product-whistle-gold.jpg'),
    description: 'Durable lanyard for officials who need whistle access without distraction.',
    sizes: [],
    colors: ['Black / Orange']
  },
  {
    sku: 'RTBO-CLIPBOARD',
    name: 'Official Clipboard',
    category: 'equipment',
    price: 1999,
    image: shopFeaturedImage('shop-product-membership-card.jpg'),
    description: 'Coaching and officiating clipboard for camps, evaluations, and game prep.',
    sizes: [],
    colors: ['Black']
  },
  {
    sku: 'RTBO-HAT-FLEXFIT',
    name: 'RTBO Flexfit Hat',
    category: 'apparel',
    price: 2499,
    image: shopFeaturedImage('shop-hero-hat-green.jpg'),
    description: 'Structured RTBO cap with a clean official-development look.',
    sizes: ['S/M', 'L/XL'],
    colors: ['Black']
  },
  {
    sku: 'RTBO-SKULL-CAP',
    name: 'RTBO Skull Cap',
    category: 'apparel',
    price: 1999,
    image: shopFeaturedImage('shop-hero-hat-green.jpg'),
    description: 'Cold-weather skull cap for travel and outdoor event movement.',
    sizes: ['One Size'],
    colors: ['Black']
  },
  {
    sku: 'RTBO-SCARF',
    name: 'RTBO Scarf',
    category: 'apparel',
    price: 2299,
    image: shopFeaturedImage('shop-hero-striped-jerseys.jpg'),
    description: 'Team-style RTBO scarf for fans, staff, and cold-weather arrivals.',
    sizes: ['One Size'],
    colors: ['Black / Orange']
  },
  {
    sku: 'RTBO-BACKPACK',
    name: 'RTBO Official Backpack',
    category: 'bags',
    price: 7499,
    image: shopFeaturedImage('shop-hero-backpack-red.jpg'),
    description: 'Daily backpack with space for shoes, gear, tablet, paperwork, and travel items.',
    sizes: [],
    colors: ['Black']
  },
  {
    sku: 'ATHLETES-R-US-BACKPACK',
    name: 'Athletes Are Us Backpack',
    category: 'bags',
    price: 8499,
    image: shopFeaturedImage('shop-hero-backpack-red.jpg'),
    description: 'Structured training backpack for officials, athletes, and event staff.',
    sizes: [],
    colors: ['Black']
  },
  {
    sku: 'IRONBACKPACK-TRAVEL',
    name: 'IronBackpack Travel Pack',
    category: 'bags',
    price: 8999,
    image: shopFeaturedImage('shop-hero-backpack-red.jpg'),
    description: 'Travel-ready backpack for long event days and overnight assignments.',
    sizes: [],
    colors: ['Black']
  },
  {
    sku: 'RTBO-DUFFLE',
    name: 'RTBO Duffle Bag',
    category: 'bags',
    price: 6499,
    image: shopFeaturedImage('shop-hero-backpack-red.jpg'),
    description: 'Roomy official gear bag for uniforms, shoes, whistles, hydration, and extras.',
    sizes: [],
    colors: ['Black']
  },
  {
    sku: 'RTBO-LUGGAGE',
    name: 'RTBO Travel Luggage',
    category: 'bags',
    price: 13999,
    image: shopFeaturedImage('shop-hero-backpack-red.jpg'),
    description: 'Rolling travel luggage for tournament weekends and multi-day schools.',
    sizes: [],
    colors: ['Black']
  },
  {
    sku: 'RTBO-RUNNING-SHOES',
    name: 'Official Running Shoes',
    category: 'footwear',
    price: 11999,
    image: shopFeaturedImage('shop-hero-referee-jersey.jpg'),
    description: 'Court-ready running shoes selected for training, conditioning, and movement.',
    sizes: ['7', '8', '9', '10', '11', '12', '13', '14'],
    colors: ['Black', 'White']
  },
  {
    sku: 'RTBO-OFFICIAL-SOCKS',
    name: 'RTBO Official Socks',
    category: 'footwear',
    price: 1499,
    image: shopFeaturedImage('shop-hero-striped-jerseys.jpg'),
    description: 'Comfort socks for long days on court and in the classroom.',
    sizes: ['M', 'L', 'XL'],
    colors: ['Black', 'White']
  },
  {
    sku: 'RTBO-COFFEE-MUG',
    name: 'RTBO Coffee Mug',
    category: 'drinkware',
    price: 1799,
    image: shopFeaturedImage('shop-hero-tumbler-teal.jpg'),
    description: 'Ceramic mug for officials, coaches, assignors, and supporters.',
    sizes: [],
    colors: ['Black']
  },
  {
    sku: 'RTBO-TUMBLER',
    name: 'RTBO Tumbler',
    category: 'drinkware',
    price: 2999,
    image: shopFeaturedImage('shop-hero-tumbler-teal.jpg'),
    description: 'Insulated tumbler for travel, school days, and tournament weekends.',
    sizes: ['20 oz', '30 oz'],
    colors: ['Black', 'Stainless']
  },
  {
    sku: 'RTBO-WATER-BOTTLE',
    name: 'RTBO Water Bottle',
    category: 'drinkware',
    price: 2499,
    image: shopFeaturedImage('shop-hero-tumbler-teal.jpg'),
    description: 'Training water bottle designed for gym bags and long court sessions.',
    sizes: ['24 oz'],
    colors: ['Black', 'Clear']
  },
  {
    sku: 'RTBO-HYGIENE-KIT',
    name: 'Official Hygiene Kit',
    category: 'bags',
    price: 2799,
    image: shopFeaturedImage('shop-hero-backpack-red.jpg'),
    description: 'Compact hygiene kit for travel, locker rooms, and tournament assignments.',
    sizes: [],
    colors: ['Black']
  },
  {
    sku: 'RTBO-MEMBERSHIP-ELITE',
    name: 'Elite Official Membership',
    category: 'memberships',
    price: 12999,
    image: shopFeaturedImage('shop-product-membership-card.jpg'),
    description: 'Membership access for official development resources, discounts, and priority updates.',
    sizes: [],
    colors: []
  },
  {
    sku: 'RTBO-FILM-LAB-PASS',
    name: 'Film Lab Training Pass',
    category: 'training',
    price: 5999,
    image: shopFeaturedImage('shop-product-membership-card.jpg'),
    description: 'Digital training pass for film study sessions, notes, and development resources.',
    sizes: [],
    colors: []
  }
];
const products = shopDefaultProducts;

function centsFromValue(value, fallback = 0) {
  const numeric = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(numeric)) return fallback;
  if ((typeof value === 'string' && value.includes('.')) || (!Number.isInteger(numeric) && numeric > 0 && numeric < 1000)) {
    return Math.max(0, Math.round(numeric * 100) || fallback);
  }
  return Math.max(0, Math.round(numeric || fallback));
}

function listFromValue(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean);
  }
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function skuFromValue(value, fallbackName = 'RTBO Product') {
  const candidate = String(value || '').trim() || fallbackName;
  return candidate
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || `RTBO-${Date.now()}`;
}

export function normalizeShopInventoryProduct(product = {}, index = 0) {
  const categoryIds = new Set(categories.map(([id]) => id));
  const name = String(product.name || `RTBO Product ${index + 1}`).trim();
  const sku = skuFromValue(product.sku, name);
  const status = ['active', 'draft', 'hidden'].includes(product.status) ? product.status : 'active';
  const stockValue = Number(product.stock);

  return {
    sku,
    name,
    category: categoryIds.has(product.category) && product.category !== 'all' ? product.category : 'apparel',
    price: centsFromValue(product.price, 0),
    image: String(product.image || shopFeaturedImage('shop-product-membership-card.jpg')).trim(),
    description: String(product.description || 'RTBO shop product.').trim(),
    sizes: listFromValue(product.sizes),
    colors: listFromValue(product.colors),
    stock: Number.isFinite(stockValue) ? Math.max(0, Math.round(stockValue)) : 8 + (index * 3) % 24,
    status,
    updatedAt: product.updatedAt || product.updated_at || ''
  };
}

export function normalizeShopInventoryProducts(productList = []) {
  const seen = new Set();
  return (Array.isArray(productList) ? productList : [])
    .map((product, index) => normalizeShopInventoryProduct(product, index))
    .filter((product) => {
      if (!product.sku || !product.name || seen.has(product.sku)) return false;
      seen.add(product.sku);
      return true;
    });
}

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

function readStoredShopInventorySnapshot() {
  let raw = null;
  try {
    raw = localStorage.getItem(SHOP_INVENTORY_KEY);
  } catch {
    raw = null;
  }

  if (raw === null) {
    return { managed: false, products: normalizeShopInventoryProducts(shopDefaultProducts) };
  }

  try {
    const stored = normalizeShopInventoryProducts(JSON.parse(raw || '[]'));
    return {
      managed: true,
      products: stored.filter(product => product.status === 'active')
    };
  } catch {
    return { managed: false, products: normalizeShopInventoryProducts(shopDefaultProducts) };
  }
}

function readStoredShopInventoryProducts() {
  return readStoredShopInventorySnapshot().products;
}

async function fetchShopInventoryProducts() {
  const response = await fetch(`${API_URL}/shop-inventory.php`, { credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Shop inventory could not be loaded.');
  }
  return {
    managed: Boolean(data.managed || data.updated_at),
    products: normalizeShopInventoryProducts(data.products || []).filter(product => product.status === 'active')
  };
}

function readStoredWishlist() {
  const stored = readStoredJson(WISHLIST_KEY, []);
  if (Array.isArray(stored)) return stored;
  if (Array.isArray(stored?.items)) return stored.items;
  return [];
}

function readStoredWishlistName() {
  const name = localStorage.getItem(WISHLIST_NAME_KEY);
  if (name) return name;
  return readStoredWishlist().length ? 'Wish list' : '';
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

function productIndex(product, productList = products) {
  return Math.max(0, productList.findIndex(entry => entry.sku === product.sku));
}

function productRating(product) {
  return Math.min(4.9, 4.4 + (productIndex(product) % 5) * 0.1).toFixed(1);
}

function productReviewCount(product) {
  return 84 + (productIndex(product) * 37) % 900;
}

function productBadge(product) {
  if (product.category === 'memberships' || product.category === 'training') return 'Digital delivery';
  if (product.price >= 7000) return 'RTBO premium pick';
  if (product.category === 'equipment') return 'Official essential';
  return 'RTBO choice';
}

function productDelivery(product) {
  if (product.category === 'memberships' || product.category === 'training') return 'Instant access after checkout';
  if (product.price >= 10000) return 'Free delivery included';
  return 'Free delivery on $100+ orders';
}

function productStock(product) {
  if (Number.isFinite(Number(product.stock))) return Math.max(0, Math.round(Number(product.stock)));
  return 8 + (productIndex(product) * 3) % 24;
}

function productBullets(product) {
  const sizeCopy = product.sizes.length ? `Available sizes: ${product.sizes.join(', ')}.` : 'Standard ready-to-ship item.';
  const colorCopy = product.colors.length ? `Color options: ${product.colors.join(', ')}.` : 'Built for RTBO training and event use.';

  return [
    product.description,
    sizeCopy,
    colorCopy,
    `${productDelivery(product)} with secure RTBO checkout.`,
    'Designed for officials, trainers, observers, and game-day professionals.'
  ];
}

function productGallery(product, productList = products) {
  const relatedImages = productList
    .filter(entry => entry.category === product.category)
    .map(entry => entry.image);
  return [...new Set([product.image, ...relatedImages])].slice(0, 5);
}

function readShopRoute() {
  if (typeof window === 'undefined') return '';
  return String(window.location.hash || '').replace(/^#\/?/, '').split('?')[0];
}

function isShopProductRoute() {
  return readShopRoute().startsWith('shop/product/');
}

function isShopWishlistRoute() {
  return readShopRoute() === 'shop/wishlist';
}

function isShopCartRoute() {
  return readShopRoute() === 'shop/cart';
}

function isShopCheckoutRoute() {
  return readShopRoute() === 'shop/checkout';
}

function readShopRouteProduct(productList = products) {
  const route = readShopRoute();
  const match = route.match(/^shop\/product\/([^/]+)$/);
  if (!match) return null;

  try {
    const sku = decodeURIComponent(match[1]);
    return productList.find(product => product.sku === sku) || null;
  } catch {
    return null;
  }
}

function shopProductHash(product) {
  return `#shop/product/${encodeURIComponent(product.sku)}`;
}

function shopWishlistHash() {
  return '#shop/wishlist';
}

function shopCartHash() {
  return '#shop/cart';
}

function shopCheckoutHash() {
  return '#shop/checkout';
}

function cartSizingForLines(lineCount) {
  const count = Math.max(1, Number(lineCount) || 1);
  return {
    '--rtbo-cart-line-count': count,
    '--rtbo-cart-image-size': `${Math.max(92, 240 - ((count - 1) * 38))}px`,
    '--rtbo-cart-preview-image-size': `${Math.max(40, 108 - ((count - 1) * 13))}px`,
    '--rtbo-cart-line-padding': `${Math.max(8, 14 - (count - 1))}px`,
    '--rtbo-cart-line-gap': `${Math.max(8, 14 - ((count - 1) * 0.9))}px`
  };
}

function priceParts(cents) {
  const dollars = Math.floor((Number(cents) || 0) / 100);
  const centsPart = String((Number(cents) || 0) % 100).padStart(2, '0');
  return { dollars, cents: centsPart };
}

function RatingSummary({ product }) {
  return (
    <div className="rtbo-shop-rating" aria-label={`${productRating(product)} out of 5 stars from ${productReviewCount(product)} reviews`}>
      <span aria-hidden="true">★★★★★</span>
      <strong>{productRating(product)}</strong>
      <button type="button">{productReviewCount(product)} ratings</button>
    </div>
  );
}

function AmazonPrice({ product }) {
  const price = priceParts(product.price);
  return (
    <div className="rtbo-shop-amazon-price" aria-label={`Price ${money(product.price)}`}>
      <span>$</span>
      <strong>{price.dollars}</strong>
      <sup>{price.cents}</sup>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 12H7.7L7 9Zm3 2v8h2v-8h-2Zm4 0v8h2v-8h-2Z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M12 21s-7.4-4.5-9.7-9.1C.5 8.2 2.5 4 6.5 4c2 0 3.5 1.1 4.4 2.4C11.8 5.1 13.3 4 15.3 4c4 0 6 4.2 4.2 7.9C17.4 16.5 12 21 12 21Zm0-2.5c2-1.4 5-4.2 6-7.4.9-2.7-.5-5.1-2.8-5.1-1.6 0-2.7 1-3.2 2.2h-2C9.5 7 8.3 6 6.7 6 4.3 6 3 8.4 4 11.1c1.1 3.2 4.4 6.1 8 7.4Z" />
    </svg>
  );
}

function HideIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="m3.3 2 18.4 18.4-1.4 1.4-3.1-3.1A11.4 11.4 0 0 1 12 20C5 20 1.4 13 1.2 12.7L.9 12l.3-.7a16.8 16.8 0 0 1 4.2-5.1L1.9 3.4 3.3 2Zm4 6.1A13.6 13.6 0 0 0 3.3 12c.9 1.5 3.9 6 8.7 6 1.3 0 2.5-.3 3.6-.9l-2-2A4.4 4.4 0 0 1 7.1 8.1Zm3.1 3.1a2 2 0 0 0 2.4 2.4l-2.4-2.4ZM12 4c7 0 10.6 7 10.8 7.3l.3.7-.3.7a15.6 15.6 0 0 1-2.9 4l-1.4-1.4A13.7 13.7 0 0 0 20.7 12c-.9-1.5-3.9-6-8.7-6-1 0-2 .2-2.8.6L7.7 5.1A10.4 10.4 0 0 1 12 4Zm0 3.6A4.4 4.4 0 0 1 16.4 12c0 .5-.1 1-.2 1.5l-5.7-5.7c.5-.1 1-.2 1.5-.2Z" />
    </svg>
  );
}

function ShopPaymentLogo({ brand }) {
  if (brand === 'stripe') {
    return (
      <span className="rtbo-shop-payment-logo is-stripe" aria-hidden="true">
        <svg viewBox="0 0 180 48" focusable="false">
          <rect width="180" height="48" rx="9" fill="#635bff" />
          <text x="24" y="31" fill="#ffffff" fontFamily="Arial Black, Arial, Helvetica, sans-serif" fontSize="27" fontWeight="900" letterSpacing="-1">stripe</text>
          <text x="112" y="31" fill="#ffffff" fontFamily="Arial, Helvetica, sans-serif" fontSize="12" fontWeight="800">checkout</text>
        </svg>
      </span>
    );
  }

  if (brand === 'paypal') {
    return (
      <span className="rtbo-shop-payment-logo is-paypal" aria-hidden="true">
        <svg viewBox="0 0 180 48" focusable="false">
          <rect width="180" height="48" rx="9" fill="#ffffff" />
          <path fill="#003087" d="M31.2 10.4h16.4c5.5 0 9 2.9 8.3 8.5-.9 6.5-5.5 10.1-11.9 10.1h-5.1l-1.7 10.1H27L31.2 10.4Z" />
          <path fill="#009cde" d="M40 19.8h6.4c2.4 0 3.8 1.1 3.4 3.4-.4 2.8-2.4 4.1-5 4.1h-5.7l.9-7.5Z" />
          <text x="66" y="31" fill="#003087" fontFamily="Arial Black, Arial, Helvetica, sans-serif" fontSize="24" fontWeight="900">Pay</text>
          <text x="111" y="31" fill="#009cde" fontFamily="Arial Black, Arial, Helvetica, sans-serif" fontSize="24" fontWeight="900">Pal</text>
        </svg>
      </span>
    );
  }

  if (brand === 'affirm') {
    return (
      <span className="rtbo-shop-payment-logo is-affirm" aria-hidden="true">
        <svg viewBox="0 0 180 48" focusable="false">
          <rect width="180" height="48" rx="9" fill="#ffffff" />
          <text x="38" y="31" fill="#111827" fontFamily="Arial Black, Arial, Helvetica, sans-serif" fontSize="27" fontWeight="900" letterSpacing="-1">affirm</text>
          <circle cx="139" cy="16" r="5" fill="#00a0df" />
          <path fill="#00a0df" d="M128 33c2.3-7.1 8.1-11.2 15.5-11.2 4.8 0 8.1 1.9 9.5 5.3h-6.6c-.8-.8-1.9-1.2-3.4-1.2-4 0-7 2.4-8.6 7.1H128Z" />
        </svg>
      </span>
    );
  }

  return (
    <span className="rtbo-shop-payment-logo is-klarna" aria-hidden="true">
      <svg viewBox="0 0 180 48" focusable="false">
        <rect width="180" height="48" rx="9" fill="#ffb3c7" />
        <text x="36" y="31" fill="#111827" fontFamily="Arial Black, Arial, Helvetica, sans-serif" fontSize="27" fontWeight="900" letterSpacing="-1">Klarna</text>
        <circle cx="136" cy="30" r="3.2" fill="#111827" />
      </svg>
    </span>
  );
}

function similarProducts(product, productList = products) {
  const sameCategory = productList.filter(entry => entry.category === product.category && entry.sku !== product.sku);
  const otherGear = productList.filter(entry => entry.category !== product.category && entry.sku !== product.sku);
  return [...sameCategory, ...otherGear].slice(0, 3);
}

function ProductCard({ product, isSaved, onOpen, onAdd, onBuy, onToggleWishlist }) {
  return (
    <article className="rtbo-shop-product-card" key={product.sku}>
      <button
        className={`rtbo-shop-wishlist ${isSaved ? 'is-favorite' : ''}`}
        type="button"
        aria-label={isSaved ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites`}
        onClick={onToggleWishlist}
      >
        {isSaved ? 'Favorited' : 'Favorites'}
      </button>
      <button className="rtbo-shop-product-image" type="button" onClick={onOpen}>
        <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
      </button>
      <div className="rtbo-shop-product-body">
        <span>{productBadge(product)}</span>
        <button className="rtbo-shop-product-title" type="button" onClick={onOpen}>{product.name}</button>
        <RatingSummary product={product} />
        <AmazonPrice product={product} />
        <p>{productDelivery(product)}</p>
        <small>{productStock(product)} in stock</small>
        <div className="rtbo-shop-product-actions">
          <button className="btn" type="button" onClick={onAdd}>Add to Cart</button>
          <button className="btn secondary dark-btn" type="button" onClick={onBuy}>Buy Now</button>
        </div>
      </div>
    </article>
  );
}

function CartProductCard({
  item,
  products: productList = products,
  isSaved,
  showCompare,
  onDecrease,
  onIncrease,
  onBuyNow,
  onAddSimilar,
  onOpenProduct,
  onToggleWishlist
}) {
  const product = item.product;
  const selectedVariant = [item.size, item.color].filter(Boolean).join(' / ') || 'Standard';
  const memberPrice = Math.round(product.price * 0.9);
  const relatedProducts = similarProducts(product, productList);

  return (
    <article className="rtbo-shop-cart-line">
      <div className="rtbo-shop-cart-compact">
        <button className="rtbo-shop-cart-thumb" type="button" onClick={() => onOpenProduct()} aria-label={`View ${product.name}`}>
          <img src={product.image} alt="" loading="lazy" decoding="async" />
          <span>{product.name}</span>
        </button>
        <strong className="rtbo-shop-cart-compact-price">{money(product.price)}</strong>
        <div className="rtbo-shop-qty rtbo-shop-cart-rail-qty">
          <button type="button" onClick={onDecrease} aria-label={`Remove one ${product.name}`}>
            <TrashIcon />
          </button>
          <span>{item.quantity}</span>
          <button type="button" onClick={onIncrease} aria-label={`Add one more ${product.name}`}>+</button>
        </div>
      </div>

      <div className="rtbo-shop-cart-amazon">
        <header className="rtbo-shop-cart-product-head">
          <div>
            <h4>{product.name}</h4>
            <p>Last selected for checkout</p>
          </div>
          <div className="rtbo-shop-cart-icon-actions">
            <button type="button" onClick={onToggleWishlist} aria-label={isSaved ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites`}>
              <HeartIcon />
            </button>
            <button type="button" onClick={onDecrease} aria-label={`Hide one ${product.name} from cart`}>
              <HideIcon />
            </button>
          </div>
        </header>

        <RatingSummary product={product} />

        <button className="rtbo-shop-cart-image-card" type="button" onClick={() => onOpenProduct()} aria-label={`View ${product.name} details`}>
          <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
        </button>

        <div className="rtbo-shop-cart-buy-method">
          <span>Ways to buy:</span>
          <strong>One-time purchase</strong>
        </div>

        <div className="rtbo-shop-cart-purchase-options" aria-label={`${product.name} purchase options`}>
          <button className="is-selected" type="button">
            <strong>One-time purchase</strong>
            <span>{money(product.price)}</span>
          </button>
          <button type="button">
            <strong>Subscribe & Save</strong>
            <span>{money(memberPrice)}</span>
          </button>
        </div>

        <div className="rtbo-shop-cart-price-row">
          <AmazonPrice product={product} />
          <small>Qty {item.quantity}</small>
        </div>

        <p className="rtbo-shop-cart-savings">Up to 10% off if you qualify</p>
        <p className="rtbo-shop-cart-delivery"><strong>prime</strong> FREE delivery with RTBO Priority</p>

        <div className="rtbo-shop-cart-seller-grid">
          <span>Ships from</span>
          <strong>RTBO Store</strong>
          <span>Sold by</span>
          <strong>Raising The Bar Officiating</strong>
          <span>Selected</span>
          <strong>{selectedVariant}</strong>
        </div>

        <div className="rtbo-shop-cart-action-row">
          <button className="btn rtbo-shop-cart-buy-now" type="button" onClick={onBuyNow}>Buy now</button>
          <button className="btn rtbo-shop-cart-add-more" type="button" onClick={onIncrease}>Add to cart</button>
        </div>

        <div className="rtbo-shop-cart-quantity-row">
          <span>Quantity</span>
          <div className="rtbo-shop-qty">
            <button type="button" onClick={onDecrease}>-</button>
            <span>{item.quantity}</span>
            <button type="button" onClick={onIncrease}>+</button>
          </div>
        </div>

        {showCompare && relatedProducts.length > 0 && (
          <section className="rtbo-shop-cart-compare" aria-label={`Compare items similar to ${product.name}`}>
            <div className="rtbo-shop-cart-compare-head">
              <strong>Compare with similar items</strong>
              <span>Page 1 of 1</span>
            </div>
            <div className="rtbo-shop-cart-similar-grid">
              {relatedProducts.map(related => (
                <article key={related.sku}>
                  <button className="rtbo-shop-cart-similar-image" type="button" onClick={() => onOpenProduct(related)}>
                    <img src={related.image} alt={related.name} loading="lazy" decoding="async" />
                  </button>
                  <button className="btn" type="button" onClick={() => onAddSimilar(related)}>Add to cart</button>
                  <strong>{related.name}</strong>
                  <RatingSummary product={related} />
                  <span>{money(related.price)}</span>
                  <small>{productDelivery(related)}</small>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}

function WishlistChooserModal({
  listName,
  product,
  isSaved,
  onAddToList,
  onCreateList,
  onClose
}) {
  return (
    <div
      className="rtbo-shop-list-layer is-light"
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="rtbo-shop-list-chooser" role="dialog" aria-modal="true" aria-label="Add item to wish list">
        <button className="rtbo-shop-list-close" type="button" onClick={onClose} aria-label="Close list chooser">×</button>
        <div className="rtbo-shop-list-options">
          {listName ? (
            <button className="rtbo-shop-list-option is-selected" type="button" onClick={onAddToList}>
              <span className="rtbo-shop-list-thumb"><img src={product.image} alt="" loading="lazy" decoding="async" /></span>
              <span>
                <strong>{listName}</strong>
                <small>{isSaved ? 'Already added' : 'Private'}</small>
              </span>
            </button>
          ) : (
            <div className="rtbo-shop-list-option is-empty">
              <span className="rtbo-shop-list-thumb" aria-hidden="true">□</span>
              <span>
                <strong>No list created</strong>
                <small>Private</small>
              </span>
            </div>
          )}
        </div>
        <button className="rtbo-shop-create-list-link" type="button" onClick={onCreateList}>
          <span aria-hidden="true">+</span>
          <strong>Create a list</strong>
        </button>
      </div>
    </div>
  );
}

function CreateWishlistModal({
  listNameDraft,
  listNameError,
  onChange,
  onCancel,
  onSubmit
}) {
  return (
    <div
      className="rtbo-shop-list-layer is-dimmed"
      onClick={event => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <form className="rtbo-shop-create-list-modal" role="dialog" aria-modal="true" aria-label="Create a new list or registry" onSubmit={onSubmit} noValidate>
        <header>
          <h3>Create a new list or registry</h3>
          <button type="button" onClick={onCancel} aria-label="Close create list dialog">×</button>
        </header>
        <div className="rtbo-shop-create-list-body">
          <label>
            <span>List name (required)</span>
            <input
              value={listNameDraft}
              onChange={event => onChange(event.target.value)}
              required
              aria-invalid={Boolean(listNameError)}
              autoFocus
            />
          </label>
          {listNameError ? <p className="rtbo-shop-list-error">{listNameError}</p> : null}
          <p>Use lists to save items for later. All lists are private unless you share them with others.</p>
        </div>
        <footer>
          <div>
            <strong>Celebrating an occasion?</strong>
            <a href="#shop/wishlist" onClick={event => event.preventDefault()}>Create a Registry or Gift List</a>
          </div>
          <div className="rtbo-shop-create-actions">
            <button className="rtbo-shop-create-cancel" type="button" onClick={onCancel}>Cancel</button>
            <button className="rtbo-shop-create-submit" type="submit">Create</button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function WishlistPage({
  listName,
  favoriteProducts,
  wishlistSearch,
  setWishlistSearch,
  onOpenProduct,
  onRemove,
  onAddToCart
}) {
  const needle = wishlistSearch.trim().toLowerCase();
  const visibleProducts = favoriteProducts.filter(product => !needle || [product.name, product.description, product.category, product.sku]
    .join(' ')
    .toLowerCase()
    .includes(needle));

  return (
    <section className="rtbo-shop-wishlist-page" aria-label={`${listName || 'Wish list'} page`}>
      <aside className="rtbo-shop-wishlist-page-nav" aria-label="Saved lists">
        <button type="button">
          <span>Shopping List</span>
          <small>Default List</small>
        </button>
        <button type="button">
          <span>Alexa List</span>
          <small>Private</small>
        </button>
        <button className="is-active" type="button">
          <span>{listName || 'Wish list'}</span>
          <small>Private</small>
        </button>
      </aside>

      <div className="rtbo-shop-wishlist-main">
        <header className="rtbo-shop-wishlist-titlebar">
          <div>
            <h3>{listName || 'Wish list'} <span>Private</span></h3>
            <div className="rtbo-shop-wishlist-invite">
              <span aria-hidden="true">RT</span>
              <button type="button">+ Invite</button>
            </div>
          </div>
          <div className="rtbo-shop-wishlist-actions">
            <button type="button">Add item</button>
            <button type="button" aria-label="Share list">⇧</button>
            <button type="button" aria-label="More wish list options">•••</button>
          </div>
        </header>

        <div className="rtbo-shop-wishlist-tools">
          <div className="rtbo-shop-wishlist-view-toggle" aria-hidden="true">
            <span>▦</span>
            <span className="is-active">☰</span>
          </div>
          <label>
            <span>Search this list</span>
            <input value={wishlistSearch} onChange={event => setWishlistSearch(event.target.value)} placeholder="Search this list" />
          </label>
          <select aria-label="Show wish list items" defaultValue="unpurchased">
            <option value="unpurchased">Show: Unpurchased</option>
            <option value="all">Show: All</option>
          </select>
          <select aria-label="Sort wish list items" defaultValue="recent">
            <option value="recent">Sort by: Most recently added</option>
            <option value="price-low">Sort by: Price low to high</option>
            <option value="price-high">Sort by: Price high to low</option>
          </select>
        </div>

        <div className="rtbo-shop-wishlist-items">
          {visibleProducts.length ? visibleProducts.map(product => (
            <article className="rtbo-shop-wishlist-item" key={product.sku}>
              <button className="rtbo-shop-wishlist-item-image" type="button" onClick={() => onOpenProduct(product)}>
                <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
              </button>
              <div className="rtbo-shop-wishlist-item-copy">
                <button className="rtbo-shop-wishlist-item-title" type="button" onClick={() => onOpenProduct(product)}>{product.name}</button>
                <span>by Raising The Bar Officiating</span>
                <RatingSummary product={product} />
                <p>Item added May 23, 2026</p>
                <div className="rtbo-shop-wishlist-item-actions">
                  <button type="button" onClick={() => onOpenProduct(product)}>See all buying options</button>
                  <button type="button">Add a note</button>
                  <button type="button">Move⌄</button>
                  <button type="button" aria-label={`Share ${product.name}`}>⇧</button>
                  <button type="button" onClick={() => onRemove(product.sku)} aria-label={`Remove ${product.name} from wish list`}>
                    <TrashIcon />
                  </button>
                </div>
              </div>
              <div className="rtbo-shop-wishlist-item-side">
                <AmazonPrice product={product} />
                <button className="btn" type="button" onClick={() => onAddToCart(product)}>Add to Cart</button>
              </div>
            </article>
          )) : (
            <div className="rtbo-shop-wishlist-empty">
              <strong>End of list</strong>
              <p>{favoriteProducts.length ? 'No saved items match that search.' : 'Create a list and add products from the shop.'}</p>
            </div>
          )}
          <div className="rtbo-shop-wishlist-end"><span>End of list</span></div>
        </div>
      </div>
    </section>
  );
}

function CartPage({
  cartLines,
  products: productList = products,
  totals,
  favoriteProducts,
  selectedCartKeys,
  allCartSelected,
  cartStatus,
  cartGiftOptions,
  orderGift,
  onToggleItemSelected,
  onToggleAll,
  onToggleGift,
  onDecrease,
  onIncrease,
  onRemove,
  onSaveForLater,
  onOpenProduct,
  onAddProduct,
  onCompare,
  onShare,
  onSelectPlan,
  onProceed
}) {
  const suggestions = productList.filter(product => !cartLines.some(item => item.sku === product.sku)).slice(0, 5);

  return (
    <section className="rtbo-shop-cart-page" aria-label="Shopping Cart">
      <div className="rtbo-shop-cart-alert"><strong>i</strong><span>Add protection for eligible items.</span></div>
      <div className="rtbo-shop-cart-page-grid">
        <div className="rtbo-shop-cart-page-main">
          <section className="rtbo-shop-cart-page-card">
            <header className="rtbo-shop-cart-page-head">
              <div>
                <h3>Shopping Cart</h3>
                <button type="button" onClick={onToggleAll}>{allCartSelected ? 'Deselect all items' : 'Select all items'}</button>
              </div>
              <span>Price</span>
            </header>
            {cartStatus ? <p className="rtbo-shop-cart-page-status">{cartStatus}</p> : null}
            {cartLines.length ? cartLines.map(item => (
              <article className="rtbo-shop-cart-page-row" key={item.key}>
                <input
                  type="checkbox"
                  checked={selectedCartKeys.includes(item.key)}
                  onChange={event => onToggleItemSelected(item.key, event.target.checked)}
                  aria-label={`Select ${item.product.name}`}
                />
                <button className="rtbo-shop-cart-page-image" type="button" onClick={() => onOpenProduct(item.product)}>
                  <img src={item.product.image} alt={item.product.name} loading="lazy" decoding="async" />
                </button>
                <div className="rtbo-shop-cart-page-copy">
                  <button type="button" onClick={() => onOpenProduct(item.product)}>{item.product.name}</button>
                  <small>In Stock</small>
                  <p><strong>prime</strong> {productDelivery(item.product)}</p>
                  <label><input type="checkbox" checked={Boolean(cartGiftOptions[item.key])} onChange={event => onToggleGift(item.key, event.target.checked)} /> This is a gift <span>Learn more</span></label>
                  {[item.color, item.size].filter(Boolean).length ? <p>{[item.color, item.size].filter(Boolean).join(' / ')}</p> : null}
                  <div className="rtbo-shop-cart-page-actions">
                    <div className="rtbo-shop-qty">
                      <button type="button" onClick={() => onDecrease(item.key)} aria-label={`Remove one ${item.product.name}`}><TrashIcon /></button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => onIncrease(item.key)} aria-label={`Add one ${item.product.name}`}>+</button>
                    </div>
                    <button type="button" onClick={() => onRemove(item.key)}>Delete</button>
                    <button type="button" onClick={() => onSaveForLater(item)}>Save for later</button>
                    <button type="button" onClick={() => onCompare(item.product)}>Compare with similar items</button>
                    <button type="button" onClick={() => onShare(item.product)}>Share</button>
                  </div>
                </div>
                <strong className="rtbo-shop-cart-page-price">{money(item.product.price)}</strong>
              </article>
            )) : <p className="rtbo-shop-cart-page-empty">Your shopping cart is empty.</p>}
            <footer>Subtotal ({totals.count} {totals.count === 1 ? 'item' : 'items'}): <strong>{money(totals.subtotal)}</strong></footer>
          </section>

          <section className="rtbo-shop-cart-saved" aria-label="Your saved items">
            <h3>Your Items</h3>
            <div className="rtbo-shop-cart-tabs"><button className="is-active" type="button">Saved for later ({favoriteProducts.length} item)</button><button type="button">Buy it again</button></div>
            <div className="rtbo-shop-cart-saved-grid">
              {favoriteProducts.slice(0, 3).map(product => (
                <button key={product.sku} type="button" onClick={() => onOpenProduct(product)}>
                  <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
                  <span>{product.name}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="rtbo-shop-cart-page-side" aria-label="Cart summary">
          <section>
            <div className="rtbo-shop-cart-free-bar"><span /></div>
            <p>You are getting FREE Same-Day delivery on eligible items!</p>
            <h4>Subtotal ({totals.count} {totals.count === 1 ? 'item' : 'items'}): <strong>{money(totals.subtotal)}</strong></h4>
            <label><input type="checkbox" checked={orderGift} onChange={event => onToggleGift('order', event.target.checked)} /> This order contains a gift</label>
            <button className="btn" type="button" onClick={onProceed}>Proceed to checkout</button>
            <p>Or <strong>{money(Math.round(totals.total / 24))}</strong> /mo (24 mo). <button type="button" onClick={onSelectPlan}>Select plan</button></p>
          </section>

          <section>
            <h4>Complete your basket with these items</h4>
            <div className="rtbo-shop-cart-rec-list">
              {suggestions.map(product => (
                <article key={product.sku}>
                  <img src={product.image} alt="" loading="lazy" decoding="async" />
                  <div>
                    <button type="button" onClick={() => onOpenProduct(product)}>{product.name}</button>
                    <RatingSummary product={product} />
                    <strong>{money(product.price)}</strong>
                    <button type="button" onClick={() => onAddProduct(product)}>Add to cart</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function SecureCheckoutPage({
  cartLines,
  totals,
  checkout,
  checkoutStatus,
  onBackToCart,
  onDecrease,
  onIncrease,
  onPlaceOrder
}) {
  const deliveryName = [checkout.firstName, checkout.lastName].filter(Boolean).join(' ') || 'Montrel Simmons';
  const deliveryAddress = [checkout.address, checkout.city, checkout.state, checkout.zip].filter(Boolean).join(', ') || 'Add delivery address';

  return (
    <section className="rtbo-shop-secure-page" aria-label="Secure checkout">
      <header><h3>Secure checkout <span>⌄</span></h3></header>
      <div className="rtbo-shop-secure-grid">
        <div className="rtbo-shop-secure-main">
          <section className="rtbo-shop-secure-strip">
            <div>
              <h4>Delivering to {deliveryName}</h4>
              <p>{deliveryAddress}</p>
              <button type="button">Add delivery instructions</button>
              <button type="button">FREE pickup available nearby⌄</button>
            </div>
            <button type="button">Change</button>
          </section>

          <section className="rtbo-shop-secure-strip">
            <div>
              <h4>Paying with Visa 7664</h4>
              <p>{money(Math.max(0, 13033 - totals.total))} gift card balance</p>
              <button type="button">Select a payment plan</button>
              <button type="button">Use a gift card, voucher, or promo code</button>
            </div>
            <button type="button">Change</button>
          </section>

          {cartLines.map((item, index) => (
            <section className="rtbo-shop-secure-delivery" key={item.key}>
              <h4>{index === 0 ? 'Arriving Today 5 PM - 10 PM' : 'Arriving May 25, 2026'}</h4>
              <div className="rtbo-shop-secure-delivery-grid">
                <article>
                  <img src={item.product.image} alt={item.product.name} loading="lazy" decoding="async" />
                  <div>
                    <strong>{item.product.name}</strong>
                    <p>{productStock(item.product)} bought in past month</p>
                    <AmazonPrice product={item.product} />
                    <p><strong>prime</strong> Ships from RTBO Store</p>
                  </div>
                  <div className="rtbo-shop-qty">
                    <button type="button" onClick={() => onDecrease(item.key)}><TrashIcon /></button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => onIncrease(item.key)}>+</button>
                  </div>
                  <button type="button">Add gift options</button>
                </article>
                <div className="rtbo-shop-secure-options">
                  <label><input type="radio" name={`delivery-${item.key}`} defaultChecked /> <span>Fastest Today 5 PM - 10 PM</span><strong>FREE</strong></label>
                  <div className="rtbo-shop-secure-slots"><button type="button">Today<br />5 PM - 10 PM</button><button type="button">Tomorrow<br />4 AM - 8 AM</button></div>
                  <button type="button">See more delivery slots</button>
                  <label><input type="radio" name={`delivery-${item.key}`} /> <span>Fewer trips Monday, May 25</span><strong>FREE</strong></label>
                  <label><input type="radio" name={`delivery-${item.key}`} /> <span>Amazon Day Tuesday, May 26</span><strong>FREE</strong></label>
                </div>
              </div>
            </section>
          ))}

          <section className="rtbo-shop-secure-placebar">
            <button className="btn" type="button" onClick={onPlaceOrder}>Place your order</button>
            <div><strong>Order total: {money(totals.total)}</strong><p>By placing your order, you agree to RTBO's privacy notice and conditions of use.</p></div>
          </section>
          {checkoutStatus.message ? <p className={`rtbo-shop-status is-${checkoutStatus.type}`}>{checkoutStatus.message}</p> : null}
          <section className="rtbo-shop-secure-legal">
            <p>Why has sales tax been applied? See tax and seller information.</p>
            <p>Do you need help? Explore our Help pages or contact us.</p>
            <button type="button" onClick={onBackToCart}>Back to cart</button>
          </section>
        </div>

        <aside className="rtbo-shop-secure-summary">
          <button className="btn" type="button" onClick={onPlaceOrder}>Place your order</button>
          <p>By placing your order, you agree to RTBO's privacy notice and conditions of use.</p>
          <dl>
            <div><dt>Items ({totals.count})</dt><dd>{money(totals.subtotal)}</dd></div>
            <div><dt>Shipping & handling</dt><dd>{money(totals.shipping)}</dd></div>
            <div><dt>Free Shipping</dt><dd>-{money(totals.shipping)}</dd></div>
            <div><dt>Estimated tax to be collected</dt><dd>{money(totals.tax)}</dd></div>
            <div className="total"><dt>Order total:</dt><dd>{money(totals.total)}</dd></div>
          </dl>
        </aside>
      </div>
    </section>
  );
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

function ProductDetailPage({
  product,
  products: productList = products,
  selectedOptions,
  setSelectedOptions,
  quantity,
  setQuantity,
  galleryImage,
  setGalleryImage,
  onBack,
  onAdd,
  onBuy
}) {
  const gallery = productGallery(product, productList);

  return (
    <section className="rtbo-shop-product-page" aria-label={`${product.name} product details`}>
      <button className="rtbo-shop-back" type="button" onClick={onBack}>Back to results</button>

      <div className="rtbo-shop-product-page-grid">
        <div className="rtbo-shop-gallery" aria-label={`${product.name} image gallery`}>
          <div className="rtbo-shop-gallery-thumbs">
            {gallery.map(src => (
              <button
                key={src}
                type="button"
                className={galleryImage === src ? 'is-active' : ''}
                onClick={() => setGalleryImage(src)}
                onFocus={() => setGalleryImage(src)}
                onMouseEnter={() => setGalleryImage(src)}
                onMouseOver={() => setGalleryImage(src)}
                aria-label={`View ${product.name} image`}
              >
                <img src={src} alt="" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
          <div className="rtbo-shop-gallery-main">
            <img src={galleryImage || product.image} alt={product.name} />
          </div>
        </div>

        <div className="rtbo-shop-product-copy">
          <p className="eyebrow">{categoryLabel(product.category)}</p>
          <h3>{product.name}</h3>
          <RatingSummary product={product} />
          <AmazonPrice product={product} />
          <p>{product.description}</p>
          <ul>
            {productBullets(product).map(item => <li key={item}>{item}</li>)}
          </ul>
          <div className="rtbo-shop-product-meta">
            <div><span>Brand</span><strong>Raising The Bar Officiating</strong></div>
            <div><span>SKU</span><strong>{product.sku}</strong></div>
            <div><span>Availability</span><strong>{productStock(product)} in stock</strong></div>
          </div>
        </div>

        <aside className="rtbo-shop-buy-box" aria-label={`Buy ${product.name}`}>
          <AmazonPrice product={product} />
          <strong>{productDelivery(product)}</strong>
          <span className="rtbo-shop-stock">In Stock</span>
          <ProductOptions product={product} selectedOptions={selectedOptions} setSelectedOptions={setSelectedOptions} />
          <label className="rtbo-shop-quantity">
            <span>Quantity</span>
            <div>
              <button type="button" onClick={() => setQuantity(current => Math.max(1, current - 1))}>-</button>
              <output>{quantity}</output>
              <button type="button" onClick={() => setQuantity(current => Math.min(20, current + 1))}>+</button>
            </div>
          </label>
          <button className="btn" type="button" onClick={onAdd}>Add to Cart</button>
          <button className="btn secondary dark-btn" type="button" onClick={onBuy}>Buy Now</button>
          <small>Secure checkout with order review before payment.</small>
        </aside>
      </div>

      <section className="rtbo-shop-description-panel" aria-label={`${product.name} description`}>
        <h3>Product Description</h3>
        <p>{product.description}</p>
        <div className="rtbo-shop-description-grid">
          {productBullets(product).slice(1).map(item => (
            <article key={item}>
              <strong>{item.split(':')[0]}</strong>
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

export default function ShopStore() {
  const initialProducts = readStoredShopInventoryProducts();
  const initialRouteProduct = readShopRouteProduct(initialProducts);
  const initialProduct = initialRouteProduct || initialProducts[0] || products[0];
  const checkoutCloseTimerRef = useRef(null);
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('featured');
  const [cart, setCart] = useState(() => readStoredJson(CART_KEY, []));
  const [wishlist, setWishlist] = useState(() => readStoredWishlist());
  const [wishlistName, setWishlistName] = useState(() => readStoredWishlistName());
  const [wishlistOpen, setWishlistOpen] = useState(() => isShopWishlistRoute());
  const [cartPageOpen, setCartPageOpen] = useState(() => isShopCartRoute());
  const [secureCheckoutOpen, setSecureCheckoutOpen] = useState(() => isShopCheckoutRoute());
  const [wishlistSearch, setWishlistSearch] = useState('');
  const [pendingWishlistSku, setPendingWishlistSku] = useState('');
  const [listChooserOpen, setListChooserOpen] = useState(false);
  const [createListOpen, setCreateListOpen] = useState(false);
  const [listNameDraft, setListNameDraft] = useState(() => readStoredWishlistName() || 'Wish list');
  const [listNameError, setListNameError] = useState('');
  const [selectedCartKeys, setSelectedCartKeys] = useState([]);
  const [cartGiftOptions, setCartGiftOptions] = useState({});
  const [cartStatus, setCartStatus] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(initialProduct);
  const [selectedOptions, setSelectedOptions] = useState({
    size: initialProduct.sizes[0] || '',
    color: initialProduct.colors[0] || ''
  });
  const [detailOpen, setDetailOpen] = useState(Boolean(initialRouteProduct));
  const [quantity, setQuantity] = useState(1);
  const [galleryImage, setGalleryImage] = useState(initialProduct.image);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutClosing, setCheckoutClosing] = useState(false);
  const [checkout, setCheckout] = useState(defaultCheckout);
  const [errors, setErrors] = useState({});
  const [checkoutStatus, setCheckoutStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    let active = true;

    async function refreshInventory(event) {
      try {
        const hasEventProducts = Array.isArray(event?.detail?.products);
        const eventProducts = normalizeShopInventoryProducts(event?.detail?.products || []);
        const inventory = hasEventProducts
          ? { managed: true, products: eventProducts.filter(product => product.status === 'active') }
          : await fetchShopInventoryProducts();
        const nextProducts = inventory.products;
        if (!active || (!inventory.managed && !nextProducts.length)) return;

        setProducts(nextProducts);

        if (!nextProducts.length) {
          setDetailOpen(false);
          return;
        }

        setSelectedProduct(current => {
          const routeProduct = readShopRouteProduct(nextProducts);
          const updated = routeProduct || nextProducts.find(product => product.sku === current?.sku) || nextProducts[0];
          if (!updated) return current;
          setSelectedOptions({
            size: updated.sizes[0] || '',
            color: updated.colors[0] || ''
          });
          setGalleryImage(updated.image);
          if (routeProduct) {
            setDetailOpen(true);
          }
          return updated;
        });
      } catch {
        if (active) {
          const stored = readStoredShopInventorySnapshot();
          if (stored.products.length || stored.managed) setProducts(stored.products);
        }
      }
    }

    function syncStoredInventory(event) {
      if (event.key !== SHOP_INVENTORY_KEY) return;
      const stored = readStoredShopInventorySnapshot();
      if (stored.products.length || stored.managed) setProducts(stored.products);
    }

    refreshInventory();
    window.addEventListener(SHOP_INVENTORY_UPDATED_EVENT, refreshInventory);
    window.addEventListener('storage', syncStoredInventory);
    return () => {
      active = false;
      window.removeEventListener(SHOP_INVENTORY_UPDATED_EVENT, refreshInventory);
      window.removeEventListener('storage', syncStoredInventory);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    if (wishlistName) {
      localStorage.setItem(WISHLIST_NAME_KEY, wishlistName);
    } else {
      localStorage.removeItem(WISHLIST_NAME_KEY);
    }
  }, [wishlistName]);

  useEffect(() => {
    function syncProductRoute() {
      const product = readShopRouteProduct(products);
      if (product) {
        selectProduct(product);
        setDetailOpen(true);
        setWishlistOpen(false);
        setCartPageOpen(false);
        setSecureCheckoutOpen(false);
        return;
      }

      if (isShopWishlistRoute()) {
        setDetailOpen(false);
        setWishlistOpen(true);
        setCartPageOpen(false);
        setSecureCheckoutOpen(false);
        closeCheckoutSidebar({ immediate: true });
        return;
      }

      if (isShopCartRoute()) {
        setDetailOpen(false);
        setWishlistOpen(false);
        setCartPageOpen(true);
        setSecureCheckoutOpen(false);
        closeCheckoutSidebar({ immediate: true });
        return;
      }

      if (isShopCheckoutRoute()) {
        setDetailOpen(false);
        setWishlistOpen(false);
        setCartPageOpen(false);
        setSecureCheckoutOpen(true);
        closeCheckoutSidebar({ immediate: true });
        return;
      }

      if (readShopRoute() === 'shop') {
        setDetailOpen(false);
        setWishlistOpen(false);
        setCartPageOpen(false);
        setSecureCheckoutOpen(false);
      }
    }

    window.addEventListener('hashchange', syncProductRoute);
    syncProductRoute();
    return () => window.removeEventListener('hashchange', syncProductRoute);
  }, [products]);

  useEffect(() => {
    if (!checkoutOpen || checkoutClosing) return undefined;

    function handleEscape(event) {
      if (event.key === 'Escape') {
        closeCheckoutSidebar();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [checkoutClosing, checkoutOpen]);

  useEffect(() => () => {
    if (checkoutCloseTimerRef.current) {
      window.clearTimeout(checkoutCloseTimerRef.current);
    }
  }, []);

  function clearCheckoutCloseTimer() {
    if (!checkoutCloseTimerRef.current) return;
    window.clearTimeout(checkoutCloseTimerRef.current);
    checkoutCloseTimerRef.current = null;
  }

  function openCheckoutSidebar() {
    clearCheckoutCloseTimer();
    setCheckoutClosing(false);
    setCheckoutOpen(true);
  }

  function closeCheckoutSidebar({ immediate = false } = {}) {
    clearCheckoutCloseTimer();
    if (immediate) {
      setCheckoutClosing(false);
      setCheckoutOpen(false);
      return;
    }

    setCheckoutClosing(true);
    checkoutCloseTimerRef.current = window.setTimeout(() => {
      setCheckoutOpen(false);
      setCheckoutClosing(false);
      checkoutCloseTimerRef.current = null;
    }, 500);
  }

  function selectProduct(product) {
    setWishlistOpen(false);
    setCartPageOpen(false);
    setSecureCheckoutOpen(false);
    setSelectedProduct(product);
    setSelectedOptions({
      size: product.sizes[0] || '',
      color: product.colors[0] || ''
    });
    setQuantity(1);
    setGalleryImage(product.image);
    setDetailOpen(true);
  }

  function openProduct(product) {
    selectProduct(product);
    const nextHash = shopProductHash(product);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }

  function closeProductDetail() {
    setDetailOpen(false);
    setWishlistOpen(false);
    setCartPageOpen(false);
    setSecureCheckoutOpen(false);
    if (isShopProductRoute() || isShopWishlistRoute() || isShopCartRoute() || isShopCheckoutRoute()) {
      window.location.hash = '#shop';
    }
  }

  function openWishlistPage() {
    setDetailOpen(false);
    setWishlistOpen(true);
    setCartPageOpen(false);
    setSecureCheckoutOpen(false);
    closeCheckoutSidebar({ immediate: true });
    const nextHash = shopWishlistHash();
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }

  function openCartPage() {
    setDetailOpen(false);
    setWishlistOpen(false);
    setCartPageOpen(true);
    setSecureCheckoutOpen(false);
    closeCheckoutSidebar({ immediate: true });
    const nextHash = shopCartHash();
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }

  function openSecureCheckoutPage() {
    if (!cartLines.length) {
      setCheckoutStatus({ type: 'error', message: 'Add at least one item to the cart before checkout.' });
      return;
    }
    setDetailOpen(false);
    setWishlistOpen(false);
    setCartPageOpen(false);
    setSecureCheckoutOpen(true);
    closeCheckoutSidebar({ immediate: true });
    setCheckoutStatus({ type: '', message: '' });
    const nextHash = shopCheckoutHash();
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }

  function addToCart(product = selectedProduct, options = selectedOptions, amount = 1) {
    const size = product.sizes.length ? (options.size || product.sizes[0]) : '';
    const color = product.colors.length ? (options.color || product.colors[0]) : '';
    const key = productKey(product.sku, size, color);
    const quantityToAdd = Math.max(1, Number(amount) || 1);

    setCart(current => {
      const existing = current.find(item => item.key === key);
      if (existing) {
        return current.map(item => item.key === key ? { ...item, quantity: item.quantity + quantityToAdd } : item);
      }
      return [...current, { key, sku: product.sku, size, color, quantity: quantityToAdd }];
    });
    openCheckoutSidebar();
    setCheckoutStatus({ type: 'success', message: `${product.name} was added to your cart.` });
  }

  function updateQuantity(key, delta) {
    setCart(current => current
      .map(item => item.key === key ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item)
      .filter(item => item.quantity > 0));
    setCartStatus(delta > 0 ? 'Quantity increased.' : 'Quantity updated.');
  }

  function removeCartItem(key) {
    setCart(current => current.filter(item => item.key !== key));
    setCartStatus('Item removed from your cart.');
  }

  function saveCartItemForLater(item) {
    setPendingWishlistSku(item.sku);
    if (wishlistName) {
      addSkuToWishlist(item.sku, wishlistName);
    } else {
      openCreateWishlist();
    }
    removeCartItem(item.key);
    setCartStatus(`${item.product.name} was saved for later.`);
  }

  function toggleCartItemSelected(key, checked) {
    setSelectedCartKeys(current => checked ? [...new Set([...current, key])] : current.filter(item => item !== key));
    setCartStatus(checked ? 'Item selected for checkout.' : 'Item deselected from checkout.');
  }

  function toggleAllCartItems() {
    const keys = cartLines.map(item => item.key);
    const allSelected = keys.length > 0 && keys.every(key => selectedCartKeys.includes(key));
    setSelectedCartKeys(allSelected ? [] : keys);
    setCartStatus(allSelected ? 'All items deselected.' : 'All items selected.');
  }

  function toggleCartGift(key, checked) {
    setCartGiftOptions(current => ({ ...current, [key]: checked }));
    setCartStatus(checked ? 'Gift option selected.' : 'Gift option removed.');
  }

  function compareCartProduct(product) {
    setCategory(product.category);
    setQuery('');
    setSearchDraft('');
    setCartStatus(`Showing similar ${categoryLabel(product.category).toLowerCase()} in basket recommendations.`);
  }

  async function shareCartProduct(product) {
    const shareUrl = `${window.location.origin}${window.location.pathname}${shopProductHash(product)}`;
    try {
      await navigator.clipboard?.writeText(shareUrl);
      setCartStatus(`Share link copied for ${product.name}.`);
    } catch {
      setCartStatus(`Share link ready: ${shareUrl}`);
    }
  }

  function selectPaymentPlan() {
    setCartStatus('Payment plan selected for checkout review.');
  }

  function proceedFromCart() {
    if (!selectedCartLines.length) {
      setCartStatus('Select at least one item before proceeding to checkout.');
      return;
    }
    openSecureCheckoutPage();
  }

  function buyCartLineNow(key) {
    setSelectedCartKeys(current => current.includes(key) ? current : [...current, key]);
    setCartStatus('Continuing to secure checkout.');
    openSecureCheckoutPage();
  }

  function addSkuToWishlist(sku = pendingWishlistSku, nextName = wishlistName) {
    if (!sku) return;
    if (nextName) {
      setWishlistName(nextName);
    }
    setWishlist(current => current.includes(sku) ? current : [...current, sku]);
    setListChooserOpen(false);
    setCreateListOpen(false);
    setPendingWishlistSku('');
    setListNameError('');
  }

  function requestWishlist(sku) {
    setPendingWishlistSku(sku);
    setListNameDraft(wishlistName || 'Wish list');
    setListNameError('');
    setCreateListOpen(false);
    setListChooserOpen(true);
  }

  function openCreateWishlist() {
    setListNameDraft(wishlistName || 'Wish list');
    setListNameError('');
    setListChooserOpen(false);
    setCreateListOpen(true);
  }

  function submitWishlistName(event) {
    event.preventDefault();
    const nextName = listNameDraft.trim();
    if (!nextName) {
      setListNameError('List name is required.');
      return;
    }
    addSkuToWishlist(pendingWishlistSku, nextName);
  }

  function closeWishlistModals() {
    setListChooserOpen(false);
    setCreateListOpen(false);
    setPendingWishlistSku('');
    setListNameError('');
  }

  function removeWishlistItem(sku) {
    setWishlist(current => current.filter(item => item !== sku));
  }

  function handleWishlistToggle(sku) {
    if (wishlist.includes(sku)) {
      removeWishlistItem(sku);
      return;
    }
    requestWishlist(sku);
  }

  function submitSearch(event) {
    event.preventDefault();
    setQuery(searchDraft.trim());
    closeProductDetail();
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
  }, [category, products, query, sort]);

  const cartLines = useMemo(() => cart.map(item => {
    const product = products.find(entry => entry.sku === item.sku);
    return product ? { ...item, product, lineTotal: product.price * item.quantity } : null;
  }).filter(Boolean), [cart, products]);

  const totals = useMemo(() => {
    const subtotal = cartLines.reduce((sum, item) => sum + item.lineTotal, 0);
    const shipping = subtotal === 0 || subtotal >= 10000 ? 0 : 895;
    const tax = Math.round(subtotal * 0.085);
    return { subtotal, shipping, tax, total: subtotal + shipping + tax, count: cartLines.reduce((sum, item) => sum + item.quantity, 0) };
  }, [cartLines]);

  useEffect(() => {
    const keys = cartLines.map(item => item.key);
    setSelectedCartKeys(current => {
      const kept = current.filter(key => keys.includes(key));
      const added = keys.filter(key => !current.includes(key));
      return [...kept, ...added];
    });
  }, [cartLines]);

  const selectedCartLines = useMemo(() => cartLines.filter(item => selectedCartKeys.includes(item.key)), [cartLines, selectedCartKeys]);
  const selectedTotals = useMemo(() => {
    const subtotal = selectedCartLines.reduce((sum, item) => sum + item.lineTotal, 0);
    const shipping = subtotal === 0 || subtotal >= 10000 ? 0 : 895;
    const tax = Math.round(subtotal * 0.085);
    return { subtotal, shipping, tax, total: subtotal + shipping + tax, count: selectedCartLines.reduce((sum, item) => sum + item.quantity, 0) };
  }, [selectedCartLines]);

  const favoriteProducts = useMemo(() => wishlist
    .map(sku => products.find(product => product.sku === sku))
    .filter(Boolean), [products, wishlist]);
  const pendingWishlistProduct = useMemo(() => products.find(product => product.sku === pendingWishlistSku) || selectedProduct, [pendingWishlistSku, products, selectedProduct]);
  const cartSizing = useMemo(() => cartSizingForLines(cartLines.length), [cartLines.length]);

  useEffect(() => {
    if (!detailOpen) return undefined;
    const previousTitle = document.title;
    document.title = `${selectedProduct.name} | RTBO Shop`;
    return () => {
      document.title = previousTitle;
    };
  }, [detailOpen, selectedProduct]);

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
    <section className={`rtbo-shop-store ${cartLines.length && !checkoutOpen ? 'has-compact-cart' : ''}`} aria-labelledby="rtbo-shop-title">
      <section className="page-hero page-hero-shop rtbo-shop-banner">
        <div className="rtbo-shop-banner-copy">
          <p className="eyebrow">RTBO Shop</p>
          <h1 id="rtbo-shop-title">Premium Officiating Gear</h1>
          <h2>Officials. Train Hard. Get Rewarded.</h2>
          <p>Shop RTBO apparel, whistles, lanyards, bags, drinkware, training passes, and official-ready gear from one responsive checkout workspace.</p>
          <form className="rtbo-shop-search" role="search" onSubmit={submitSearch}>
            <label htmlFor="rtbo-shop-search-input">Search products</label>
            <div className="rtbo-shop-search-controls">
              <input
                id="rtbo-shop-search-input"
                value={searchDraft}
                onChange={event => setSearchDraft(event.target.value)}
                type="search"
                placeholder="Search products, training, and gear"
              />
              <button className="btn rtbo-shop-search-button" type="submit">Search</button>
            </div>
          </form>
        </div>
        <div className="hero-carousel rtbo-shop-banner-slider" aria-label="RTBO shop product image slider">
          <div className="hero-carousel-track carousel-content">
            {shopBannerSlides.map((image, index) => (
              <img
                key={`${image.src}-${index}`}
                src={image.src}
                alt={image.alt}
                loading={index < shopBannerImages.length ? 'eager' : 'lazy'}
                decoding="async"
              />
            ))}
          </div>
        </div>
      </section>

      <div className="rtbo-shop-layout">
        <aside className="rtbo-shop-sidebar" aria-label="Shop categories">
          <div className="rtbo-shop-brand-card">
            <img src={productImage('logo.png')} alt="Raising The Bar Officiating logo" />
            <strong>Elite Official Gear</strong>
            <span>Secure checkout, RTBO training gear, and official essentials.</span>
          </div>
          <div className="rtbo-shop-category-list">
            {categories.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={category === id ? 'is-active' : ''}
                onClick={() => {
                  setCategory(id);
                  closeProductDetail();
                }}
              >
                <span>{label}</span>
                <small>{id === 'all' ? products.length : products.filter(product => product.category === id).length}</small>
              </button>
            ))}
          </div>
          {(wishlistName || favoriteProducts.length > 0) && (
            <div className="rtbo-shop-favorites-card" aria-label="Wish list products">
              <button
                className={`rtbo-shop-favorites-open ${wishlistOpen ? 'is-active' : ''}`}
                type="button"
                onClick={openWishlistPage}
              >
                <span>
                  <strong>{wishlistName || 'Wish list'}</strong>
                  <small>Private</small>
                </span>
                <em>{favoriteProducts.length}</em>
              </button>
              {favoriteProducts.length > 0 && (
                <div className="rtbo-shop-favorites-list">
                  {favoriteProducts.slice(0, 3).map(product => (
                    <button key={product.sku} type="button" onClick={() => openProduct(product)}>
                      <img src={product.image} alt="" loading="lazy" decoding="async" />
                      <span>
                        <strong>{product.name}</strong>
                        <small>{money(product.price)}</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>

        <div className="rtbo-shop-main">
          {!wishlistOpen && !cartPageOpen && !secureCheckoutOpen && (
            <div className="rtbo-shop-toolbar">
              <div>
                <p className="eyebrow">{categoryLabel(category)}</p>
                <h3>{detailOpen ? selectedProduct.name : `${filteredProducts.length} products available`}</h3>
              </div>
              <label>
                <span>Sort</span>
                <select
                  value={sort}
                  onChange={event => {
                    setSort(event.target.value);
                    closeProductDetail();
                  }}
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name">Name</option>
                </select>
              </label>
            </div>
          )}

          <div className="rtbo-shop-content-grid">
            {secureCheckoutOpen ? (
              <SecureCheckoutPage
                cartLines={selectedCartLines.length ? selectedCartLines : cartLines}
                totals={selectedCartLines.length ? selectedTotals : totals}
                checkout={checkout}
                checkoutStatus={checkoutStatus}
                onBackToCart={openCartPage}
                onDecrease={key => updateQuantity(key, -1)}
                onIncrease={key => updateQuantity(key, 1)}
                onPlaceOrder={() => beginCheckout('stripe')}
              />
            ) : cartPageOpen ? (
              <CartPage
                cartLines={cartLines}
                products={products}
                totals={selectedTotals}
                favoriteProducts={favoriteProducts}
                selectedCartKeys={selectedCartKeys}
                allCartSelected={cartLines.length > 0 && cartLines.every(item => selectedCartKeys.includes(item.key))}
                cartStatus={cartStatus}
                cartGiftOptions={cartGiftOptions}
                orderGift={Boolean(cartGiftOptions.order)}
                onToggleItemSelected={toggleCartItemSelected}
                onToggleAll={toggleAllCartItems}
                onToggleGift={toggleCartGift}
                onDecrease={key => updateQuantity(key, -1)}
                onIncrease={key => updateQuantity(key, 1)}
                onRemove={removeCartItem}
                onSaveForLater={saveCartItemForLater}
                onOpenProduct={openProduct}
                onAddProduct={product => addToCart(product, { size: product.sizes[0] || '', color: product.colors[0] || '' })}
                onCompare={compareCartProduct}
                onShare={shareCartProduct}
                onSelectPlan={selectPaymentPlan}
                onProceed={proceedFromCart}
              />
            ) : wishlistOpen ? (
              <WishlistPage
                listName={wishlistName || 'Wish list'}
                favoriteProducts={favoriteProducts}
                wishlistSearch={wishlistSearch}
                setWishlistSearch={setWishlistSearch}
                onOpenProduct={openProduct}
                onRemove={removeWishlistItem}
                onAddToCart={product => addToCart(product, { size: product.sizes[0] || '', color: product.colors[0] || '' })}
              />
            ) : detailOpen ? (
              <ProductDetailPage
                product={selectedProduct}
                products={products}
                selectedOptions={selectedOptions}
                setSelectedOptions={setSelectedOptions}
                quantity={quantity}
                setQuantity={setQuantity}
                galleryImage={galleryImage}
                setGalleryImage={setGalleryImage}
                onBack={closeProductDetail}
                onAdd={() => addToCart(selectedProduct, selectedOptions, quantity)}
                onBuy={() => addToCart(selectedProduct, selectedOptions, quantity)}
              />
            ) : (
              <div className="rtbo-shop-products">
                {filteredProducts.length === 0 && (
                  <p className="rtbo-shop-empty rtbo-shop-empty-products">No active products match this shop view. Add or activate products in the command center inventory manager.</p>
                )}
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.sku}
                    product={product}
                    isSaved={wishlist.includes(product.sku)}
                    onOpen={() => openProduct(product)}
                    onAdd={() => addToCart(product, { size: product.sizes[0] || '', color: product.colors[0] || '' })}
                    onBuy={() => addToCart(product, { size: product.sizes[0] || '', color: product.colors[0] || '' })}
                    onToggleWishlist={() => handleWishlistToggle(product.sku)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={`rtbo-shop-checkout ${checkoutOpen ? 'is-open' : ''} ${checkoutClosing ? 'is-closing' : ''} ${cartLines.length ? 'has-items' : 'is-empty'}`}
        data-cart-lines={cartLines.length}
        style={cartSizing}
        onMouseDown={event => {
          if (checkoutOpen && event.target === event.currentTarget) {
            closeCheckoutSidebar();
          }
        }}
      >
        <div
          className="rtbo-shop-checkout-panel"
          role={checkoutOpen ? 'dialog' : 'complementary'}
          aria-modal={checkoutOpen ? 'true' : undefined}
          aria-label="RTBO store checkout"
	        >
	          <div className="rtbo-shop-checkout-head">
	            <div>
	              <p className="eyebrow">Secure Checkout</p>
	              <h3>Your Cart</h3>
	            </div>
	            <button className="btn" type="button" onClick={() => closeCheckoutSidebar()}>Close</button>
	          </div>

	          <div className="rtbo-shop-cart-rail-head" aria-label="Cart subtotal">
	            <span>Subtotal</span>
	            <strong>{money(totals.subtotal)}</strong>
	            <button className="btn" type="button" onClick={openCartPage}>Go to Cart</button>
	          </div>

	          {errors.cart ? <p className="rtbo-shop-error">{errors.cart}</p> : null}
	          <div className="rtbo-shop-cart-lines">
	            {cartLines.length ? cartLines.map((item, index) => (
	              <CartProductCard
	                key={item.key}
	                item={item}
	                isSaved={wishlist.includes(item.sku)}
	                products={products}
	                showCompare={index === 0}
	                onDecrease={() => updateQuantity(item.key, -1)}
	                onIncrease={() => updateQuantity(item.key, 1)}
	                onBuyNow={() => buyCartLineNow(item.key)}
	                onAddSimilar={product => addToCart(product, { size: product.sizes[0] || '', color: product.colors[0] || '' })}
	                onOpenProduct={(product = item.product) => openProduct(product)}
	                onToggleWishlist={() => handleWishlistToggle(item.sku)}
	              />
	            )) : <p className="rtbo-shop-empty">Your cart is ready for official gear.</p>}
	          </div>

          <dl className="rtbo-shop-totals">
            <div><dt>Subtotal</dt><dd>{money(totals.subtotal)}</dd></div>
            <div><dt>Shipping</dt><dd>{totals.shipping ? money(totals.shipping) : 'Free'}</dd></div>
            <div><dt>Estimated Tax</dt><dd>{money(totals.tax)}</dd></div>
            <div className="total"><dt>Total</dt><dd>{money(totals.total)}</dd></div>
          </dl>

	          <button className="btn rtbo-shop-proceed" type="button" onClick={openSecureCheckoutPage}>Proceed to checkout</button>

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
            <button className="btn rtbo-shop-payment-button is-stripe" type="button" onClick={() => beginCheckout('stripe')} aria-label="Stripe Checkout">
              <ShopPaymentLogo brand="stripe" />
            </button>
            <button className="btn rtbo-shop-payment-button is-paypal" type="button" onClick={() => beginCheckout('paypal')} aria-label="PayPal">
              <ShopPaymentLogo brand="paypal" />
            </button>
            <button className="btn rtbo-shop-payment-button is-affirm" type="button" onClick={() => beginCheckout('affirm')} aria-label="Affirm">
              <ShopPaymentLogo brand="affirm" />
            </button>
            <button className="btn rtbo-shop-payment-button is-klarna" type="button" onClick={() => beginCheckout('klarna')} aria-label="Klarna">
              <ShopPaymentLogo brand="klarna" />
            </button>
          </div>
          <p className="rtbo-shop-payment-note">{paymentNotice}</p>
          {checkoutStatus.message ? <p className={`rtbo-shop-status is-${checkoutStatus.type}`}>{checkoutStatus.message}</p> : null}
          <button className="rtbo-shop-clear" type="button" onClick={() => setCart([])}>Clear Cart</button>
        </div>
      </div>
      {listChooserOpen && (
        <WishlistChooserModal
          listName={wishlistName}
          product={pendingWishlistProduct}
          isSaved={wishlist.includes(pendingWishlistProduct.sku)}
          onAddToList={() => addSkuToWishlist(pendingWishlistProduct.sku)}
          onCreateList={openCreateWishlist}
          onClose={closeWishlistModals}
        />
      )}
      {createListOpen && (
        <CreateWishlistModal
          listNameDraft={listNameDraft}
          listNameError={listNameError}
          onChange={value => {
            setListNameDraft(value);
            setListNameError('');
          }}
          onCancel={closeWishlistModals}
          onSubmit={submitWishlistName}
        />
      )}
    </section>
  );
}
