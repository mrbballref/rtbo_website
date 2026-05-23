import React, { useEffect, useMemo, useState } from 'react';
import './shop-store.css';

const API_URL = import.meta.env.VITE_RTBO_API_URL || '/api';
const CART_KEY = 'rtbo-shop-cart';
const WISHLIST_KEY = 'rtbo-shop-wishlist';

const productImage = name => `/assets/images/${name}`;
const shopFeaturedImage = name => productImage(`shop/featured/${name}`);

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

const products = [
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

function productIndex(product) {
  return Math.max(0, products.findIndex(entry => entry.sku === product.sku));
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

function productGallery(product) {
  const relatedImages = products
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

function readShopRouteProduct() {
  const route = readShopRoute();
  const match = route.match(/^shop\/product\/([^/]+)$/);
  if (!match) return null;

  try {
    const sku = decodeURIComponent(match[1]);
    return products.find(product => product.sku === sku) || null;
  } catch {
    return null;
  }
}

function shopProductHash(product) {
  return `#shop/product/${encodeURIComponent(product.sku)}`;
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

function similarProducts(product) {
  const sameCategory = products.filter(entry => entry.category === product.category && entry.sku !== product.sku);
  const otherGear = products.filter(entry => entry.category !== product.category && entry.sku !== product.sku);
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
  const relatedProducts = similarProducts(product);

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
  const gallery = productGallery(product);

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
  const initialRouteProduct = readShopRouteProduct();
  const initialProduct = initialRouteProduct || products[0];
  const [query, setQuery] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('featured');
  const [cart, setCart] = useState(() => readStoredJson(CART_KEY, []));
  const [wishlist, setWishlist] = useState(() => readStoredJson(WISHLIST_KEY, []));
  const [selectedProduct, setSelectedProduct] = useState(initialProduct);
  const [selectedOptions, setSelectedOptions] = useState({
    size: initialProduct.sizes[0] || '',
    color: initialProduct.colors[0] || ''
  });
  const [detailOpen, setDetailOpen] = useState(Boolean(initialRouteProduct));
  const [quantity, setQuantity] = useState(1);
  const [galleryImage, setGalleryImage] = useState(initialProduct.image);
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

  useEffect(() => {
    function syncProductRoute() {
      const product = readShopRouteProduct();
      if (product) {
        selectProduct(product);
        setDetailOpen(true);
        return;
      }

      if (readShopRoute() === 'shop') {
        setDetailOpen(false);
      }
    }

    window.addEventListener('hashchange', syncProductRoute);
    syncProductRoute();
    return () => window.removeEventListener('hashchange', syncProductRoute);
  }, []);

  useEffect(() => {
    if (!checkoutOpen) return undefined;

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setCheckoutOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [checkoutOpen]);

  function selectProduct(product) {
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
    if (isShopProductRoute()) {
      window.location.hash = '#shop';
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
    setCheckoutOpen(true);
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

  const favoriteProducts = useMemo(() => wishlist
    .map(sku => products.find(product => product.sku === sku))
    .filter(Boolean), [wishlist]);
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
          {favoriteProducts.length > 0 && (
            <div className="rtbo-shop-favorites-card" aria-label="Favorite products">
              <div className="rtbo-shop-favorites-head">
                <strong>Favorites</strong>
                <small>{favoriteProducts.length}</small>
              </div>
              <div className="rtbo-shop-favorites-list">
                {favoriteProducts.map(product => (
                  <button key={product.sku} type="button" onClick={() => openProduct(product)}>
                    <img src={product.image} alt="" loading="lazy" decoding="async" />
                    <span>
                      <strong>{product.name}</strong>
                      <small>{money(product.price)}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
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
        </aside>

        <div className="rtbo-shop-main">
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

          <div className="rtbo-shop-content-grid">
            {detailOpen ? (
              <ProductDetailPage
                product={selectedProduct}
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
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.sku}
                    product={product}
                    isSaved={wishlist.includes(product.sku)}
                    onOpen={() => openProduct(product)}
                    onAdd={() => addToCart(product, { size: product.sizes[0] || '', color: product.colors[0] || '' })}
                    onBuy={() => addToCart(product, { size: product.sizes[0] || '', color: product.colors[0] || '' })}
                    onToggleWishlist={() => toggleWishlist(product.sku)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={`rtbo-shop-checkout ${checkoutOpen ? 'is-open' : ''} ${cartLines.length ? 'has-items' : 'is-empty'}`}
        data-cart-lines={cartLines.length}
        style={cartSizing}
        onMouseDown={event => {
          if (checkoutOpen && event.target === event.currentTarget) {
            setCheckoutOpen(false);
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
	            <button className="btn" type="button" onClick={() => setCheckoutOpen(false)}>Close</button>
	          </div>

	          <div className="rtbo-shop-cart-rail-head" aria-label="Cart subtotal">
	            <span>Subtotal</span>
	            <strong>{money(totals.subtotal)}</strong>
	            <button className="btn" type="button" onClick={() => setCheckoutOpen(true)}>Go to Cart</button>
	          </div>

	          {errors.cart ? <p className="rtbo-shop-error">{errors.cart}</p> : null}
	          <div className="rtbo-shop-cart-lines">
	            {cartLines.length ? cartLines.map((item, index) => (
	              <CartProductCard
	                key={item.key}
	                item={item}
	                isSaved={wishlist.includes(item.sku)}
	                showCompare={index === 0}
	                onDecrease={() => updateQuantity(item.key, -1)}
	                onIncrease={() => updateQuantity(item.key, 1)}
	                onBuyNow={() => setCheckoutOpen(true)}
	                onAddSimilar={product => addToCart(product, { size: product.sizes[0] || '', color: product.colors[0] || '' })}
	                onOpenProduct={(product = item.product) => openProduct(product)}
	                onToggleWishlist={() => toggleWishlist(item.sku)}
	              />
	            )) : <p className="rtbo-shop-empty">Your cart is ready for official gear.</p>}
	          </div>

          <dl className="rtbo-shop-totals">
            <div><dt>Subtotal</dt><dd>{money(totals.subtotal)}</dd></div>
            <div><dt>Shipping</dt><dd>{totals.shipping ? money(totals.shipping) : 'Free'}</dd></div>
            <div><dt>Estimated Tax</dt><dd>{money(totals.tax)}</dd></div>
            <div className="total"><dt>Total</dt><dd>{money(totals.total)}</dd></div>
          </dl>

	          <button className="btn rtbo-shop-proceed" type="button" onClick={() => setCheckoutOpen(true)}>Go to Cart</button>

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
