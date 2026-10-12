const fs = require('fs')
const path = require('path')
const postgres = require('postgres')

const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const match = envContent.match(/DATABASE_URL=(.+)/)
if (!match) {
  console.error('DATABASE_URL not found in .env.local')
  process.exit(1)
}
const databaseUrl = match[1].trim()

const sql = postgres(databaseUrl, { ssl: 'require' })

const INDIAN_TAGS = [
  // Food & Dining
  { name: 'food', color: '#f97316', icon: 'utensils' },
  { name: 'dining', color: '#fb923c', icon: 'coffee' },
  { name: 'delivery', color: '#ea580c', icon: 'bike' },
  // Groceries & Daily Needs
  { name: 'groceries', color: '#84cc16', icon: 'shopping-cart' },
  // Travel & Commute
  { name: 'transport', color: '#06b6d4', icon: 'car' },
  { name: 'cab', color: '#0ea5e9', icon: 'taxi' },
  { name: 'metro', color: '#3b82f6', icon: 'train' },
  { name: 'toll', color: '#6366f1', icon: 'milestone' },
  { name: 'travel', color: '#8b5cf6', icon: 'plane' },
  // Fuel & Auto
  { name: 'fuel', color: '#eab308', icon: 'fuel' },
  { name: 'ev-charging', color: '#10b981', icon: 'zap' },
  // Shopping & Fashion
  { name: 'shopping', color: '#a855f7', icon: 'shopping-bag' },
  { name: 'clothing', color: '#c084fc', icon: 'shirt' },
  { name: 'electronics', color: '#6366f1', icon: 'laptop' },
  { name: 'beauty', color: '#f472b6', icon: 'sparkles' },
  // Health & Fitness
  { name: 'medical', color: '#ef4444', icon: 'cross' },
  { name: 'fitness', color: '#22c55e', icon: 'dumbbell' },
  // Utilities & Bills
  { name: 'utilities', color: '#64748b', icon: 'plug' },
  { name: 'bills', color: '#475569', icon: 'receipt' },
  { name: 'recharge', color: '#0284c7', icon: 'smartphone' },
  { name: 'broadband', color: '#0369a1', icon: 'wifi' },
  { name: 'credit-card', color: '#dc2626', icon: 'credit-card' },
  { name: 'loan', color: '#b91c1c', icon: 'landmark' },
  { name: 'insurance', color: '#0284c7', icon: 'shield' },
  // Entertainment & Media
  { name: 'entertainment', color: '#ec4899', icon: 'film' },
  { name: 'subscription', color: '#d946ef', icon: 'repeat' },
  { name: 'movies', color: '#f43f5e', icon: 'clapperboard' },
  // Wealth & Investments
  { name: 'investment', color: '#10b981', icon: 'trending-up' },
  { name: 'mutual-fund', color: '#059669', icon: 'pie-chart' },
  { name: 'stocks', color: '#047857', icon: 'bar-chart-2' },
  { name: 'gold', color: '#d97706', icon: 'coins' },
  // Housing & Living
  { name: 'rent', color: '#78716c', icon: 'home' },
  { name: 'home-maintenance', color: '#a1a1aa', icon: 'wrench' },
  // Education & Learning
  { name: 'education', color: '#2563eb', icon: 'graduation-cap' },
  // Taxes & Government
  { name: 'tax', color: '#b91c1c', icon: 'landmark' },
  { name: 'government', color: '#991b1b', icon: 'shield' },
  // Income & Banking
  { name: 'salary', color: '#22c55e', icon: 'wallet' },
  { name: 'income', color: '#4ade80', icon: 'dollar-sign' },
  { name: 'interest', color: '#86efac', icon: 'percent' },
  { name: 'dividend', color: '#bbf7d0', icon: 'award' },
  { name: 'transfer', color: '#94a3b8', icon: 'arrow-left-right' },
  { name: 'cash', color: '#a3a3a3', icon: 'banknote' },
  { name: 'atm', color: '#737373', icon: 'credit-card' },
  { name: 'bank-charges', color: '#f87171', icon: 'alert-circle' },
]

const INDIAN_RULES = [
  // ── 1. Food Delivery & Cloud Kitchens (Priority 10-19) ──────────────────────
  { name: 'Swiggy Food Delivery', priority: 10, conditions: [{ field: 'description', op: 'contains', value: 'swiggy' }], tags: ['food', 'delivery'] },
  { name: 'Bundl Technologies (Swiggy)', priority: 11, conditions: [{ field: 'description', op: 'contains', value: 'bundl' }], tags: ['food', 'delivery'] },
  { name: 'Zomato Food Delivery', priority: 12, conditions: [{ field: 'description', op: 'contains', value: 'zomato' }], tags: ['food', 'delivery'] },
  { name: 'EatClub / Box8', priority: 13, conditions: [{ field: 'description', op: 'contains', value: 'eatclub' }], tags: ['food', 'delivery'] },
  { name: 'Box8 Meals', priority: 14, conditions: [{ field: 'description', op: 'contains', value: 'box8' }], tags: ['food', 'delivery'] },
  { name: 'Behrouz Biryani', priority: 15, conditions: [{ field: 'description', op: 'contains', value: 'behrouz' }], tags: ['food', 'delivery'] },
  { name: 'Faasos / Rebel Foods', priority: 16, conditions: [{ field: 'description', op: 'contains', value: 'faasos' }], tags: ['food', 'delivery'] },
  { name: 'Rebel Foods', priority: 17, conditions: [{ field: 'description', op: 'contains', value: 'rebel foods' }], tags: ['food', 'delivery'] },

  // ── 2. Dining, Restaurants & Cafes (Priority 20-35) ─────────────────────────
  { name: 'Starbucks Coffee India', priority: 20, conditions: [{ field: 'description', op: 'contains', value: 'starbucks' }], tags: ['food', 'dining'] },
  { name: 'Blue Tokai Coffee Roasters', priority: 21, conditions: [{ field: 'description', op: 'contains', value: 'blue tokai' }], tags: ['food', 'dining'] },
  { name: 'Third Wave Coffee', priority: 22, conditions: [{ field: 'description', op: 'contains', value: 'third wave' }], tags: ['food', 'dining'] },
  { name: 'Chaayos Tea', priority: 23, conditions: [{ field: 'description', op: 'contains', value: 'chaayos' }], tags: ['food', 'dining'] },
  { name: 'Chai Point', priority: 24, conditions: [{ field: 'description', op: 'contains', value: 'chai point' }], tags: ['food', 'dining'] },
  { name: 'Dominos Pizza', priority: 25, conditions: [{ field: 'description', op: 'contains', value: 'domino' }], tags: ['food', 'dining'] },
  { name: 'Jubilant FoodWorks', priority: 26, conditions: [{ field: 'description', op: 'contains', value: 'jubilant' }], tags: ['food', 'dining'] },
  { name: 'Pizza Hut India', priority: 27, conditions: [{ field: 'description', op: 'contains', value: 'pizza hut' }], tags: ['food', 'dining'] },
  { name: 'McDonalds / Hardcastle', priority: 28, conditions: [{ field: 'description', op: 'contains', value: 'mcdonald' }], tags: ['food', 'dining'] },
  { name: 'Hardcastle Restaurants', priority: 29, conditions: [{ field: 'description', op: 'contains', value: 'hardcastle' }], tags: ['food', 'dining'] },
  { name: 'KFC India', priority: 30, conditions: [{ field: 'description', op: 'contains', value: 'kfc' }], tags: ['food', 'dining'] },
  { name: 'Burger King India', priority: 31, conditions: [{ field: 'description', op: 'contains', value: 'burger king' }], tags: ['food', 'dining'] },
  { name: 'Subway India', priority: 32, conditions: [{ field: 'description', op: 'contains', value: 'subway' }], tags: ['food', 'dining'] },
  { name: 'Haldirams Sweets & Dining', priority: 33, conditions: [{ field: 'description', op: 'contains', value: 'haldiram' }], tags: ['food', 'dining'] },
  { name: 'Bikanervala Sweets & Snacks', priority: 34, conditions: [{ field: 'description', op: 'contains', value: 'bikanervala' }], tags: ['food', 'dining'] },
  { name: 'Barbeque Nation', priority: 35, conditions: [{ field: 'description', op: 'contains', value: 'barbeque nation' }], tags: ['food', 'dining'] },

  // ── 3. Quick Commerce & Groceries (Priority 36-50) ──────────────────────────
  { name: 'Blinkit Quick Groceries', priority: 36, conditions: [{ field: 'description', op: 'contains', value: 'blinkit' }], tags: ['groceries', 'delivery'] },
  { name: 'Grofers India', priority: 37, conditions: [{ field: 'description', op: 'contains', value: 'grofers' }], tags: ['groceries', 'delivery'] },
  { name: 'Zepto Instant Delivery', priority: 38, conditions: [{ field: 'description', op: 'contains', value: 'zepto' }], tags: ['groceries', 'delivery'] },
  { name: 'Swiggy Instamart', priority: 39, conditions: [{ field: 'description', op: 'contains', value: 'instamart' }], tags: ['groceries', 'delivery'] },
  { name: 'BigBasket Online Grocery', priority: 40, conditions: [{ field: 'description', op: 'contains', value: 'bigbasket' }], tags: ['groceries', 'delivery'] },
  { name: 'BB Daily Morning Milk', priority: 41, conditions: [{ field: 'description', op: 'contains', value: 'bb daily' }], tags: ['groceries', 'delivery'] },
  { name: 'Country Delight Milk & Veggies', priority: 42, conditions: [{ field: 'description', op: 'contains', value: 'country delight' }], tags: ['groceries', 'delivery'] },
  { name: 'Milkbasket Daily Needs', priority: 43, conditions: [{ field: 'description', op: 'contains', value: 'milkbasket' }], tags: ['groceries', 'delivery'] },
  { name: 'Dunzo Daily', priority: 44, conditions: [{ field: 'description', op: 'contains', value: 'dunzo' }], tags: ['groceries', 'delivery'] },
  { name: 'DMart Supermarket', priority: 45, conditions: [{ field: 'description', op: 'contains', value: 'dmart' }], tags: ['groceries'] },
  { name: 'Avenue Supermarts (DMart)', priority: 46, conditions: [{ field: 'description', op: 'contains', value: 'avenue supermarts' }], tags: ['groceries'] },
  { name: 'JioMart Online Grocery', priority: 47, conditions: [{ field: 'description', op: 'contains', value: 'jiomart' }], tags: ['groceries', 'delivery'] },
  { name: 'Reliance Smart / Fresh', priority: 48, conditions: [{ field: 'description', op: 'contains', value: 'reliance smart' }], tags: ['groceries'] },
  { name: 'Reliance Fresh Supermarket', priority: 49, conditions: [{ field: 'description', op: 'contains', value: 'reliance fresh' }], tags: ['groceries'] },
  { name: 'Natures Basket Gourmet', priority: 50, conditions: [{ field: 'description', op: 'contains', value: 'nature basket' }], tags: ['groceries'] },

  // ── 4. Cabs, Autos & Daily Commute (Priority 51-65) ─────────────────────────
  { name: 'Uber India Rides', priority: 51, conditions: [{ field: 'description', op: 'contains', value: 'uber' }], tags: ['transport', 'cab'] },
  { name: 'Ola Cabs & Autos', priority: 52, conditions: [{ field: 'description', op: 'contains', value: 'ola' }], tags: ['transport', 'cab'] },
  { name: 'ANI Technologies (Ola)', priority: 53, conditions: [{ field: 'description', op: 'contains', value: 'ani technologies' }], tags: ['transport', 'cab'] },
  { name: 'Rapido Bike & Auto', priority: 54, conditions: [{ field: 'description', op: 'contains', value: 'rapido' }], tags: ['transport', 'cab'] },
  { name: 'Roppen Transportation (Rapido)', priority: 55, conditions: [{ field: 'description', op: 'contains', value: 'roppen' }], tags: ['transport', 'cab'] },
  { name: 'Namma Yatri Auto Ride', priority: 56, conditions: [{ field: 'description', op: 'contains', value: 'namma yatri' }], tags: ['transport', 'cab'] },
  { name: 'BluSmart EV Cabs', priority: 57, conditions: [{ field: 'description', op: 'contains', value: 'blusmart' }], tags: ['transport', 'cab'] },
  { name: 'Fastag Toll Recharge', priority: 58, conditions: [{ field: 'description', op: 'contains', value: 'fastag' }], tags: ['transport', 'toll'] },
  { name: 'NETC National Toll', priority: 59, conditions: [{ field: 'description', op: 'contains', value: 'netc' }], tags: ['transport', 'toll'] },
  { name: 'IHMCL Fastag Toll', priority: 60, conditions: [{ field: 'description', op: 'contains', value: 'ihmcl' }], tags: ['transport', 'toll'] },
  { name: 'Delhi Metro (DMRC)', priority: 61, conditions: [{ field: 'description', op: 'contains', value: 'dmrc' }], tags: ['transport', 'metro'] },
  { name: 'Bangalore Metro (BMRCL)', priority: 62, conditions: [{ field: 'description', op: 'contains', value: 'bmrcl' }], tags: ['transport', 'metro'] },
  { name: 'Mumbai Metro', priority: 63, conditions: [{ field: 'description', op: 'contains', value: 'mumbai metro' }], tags: ['transport', 'metro'] },
  { name: 'Maha Metro Nagpur/Pune', priority: 64, conditions: [{ field: 'description', op: 'contains', value: 'maha metro' }], tags: ['transport', 'metro'] },
  { name: 'Chennai Metro (CMRL)', priority: 65, conditions: [{ field: 'description', op: 'contains', value: 'cmrl' }], tags: ['transport', 'metro'] },

  // ── 5. Rail, Flights & Long Travel (Priority 66-80) ─────────────────────────
  { name: 'IRCTC Train Ticket Booking', priority: 66, conditions: [{ field: 'description', op: 'contains', value: 'irctc' }], tags: ['travel', 'transport'] },
  { name: 'Indian Railways Ticket', priority: 67, conditions: [{ field: 'description', op: 'contains', value: 'indian railway' }], tags: ['travel', 'transport'] },
  { name: 'redBus Intercity Bus', priority: 68, conditions: [{ field: 'description', op: 'contains', value: 'redbus' }], tags: ['travel', 'transport'] },
  { name: 'AbhiBus Booking', priority: 69, conditions: [{ field: 'description', op: 'contains', value: 'abhibus' }], tags: ['travel', 'transport'] },
  { name: 'MakeMyTrip Flights & Hotels', priority: 70, conditions: [{ field: 'description', op: 'contains', value: 'makemytrip' }], tags: ['travel'] },
  { name: 'Goibibo Travel Booking', priority: 71, conditions: [{ field: 'description', op: 'contains', value: 'goibibo' }], tags: ['travel'] },
  { name: 'ClearTrip Flights', priority: 72, conditions: [{ field: 'description', op: 'contains', value: 'cleartrip' }], tags: ['travel'] },
  { name: 'EaseMyTrip Flights', priority: 73, conditions: [{ field: 'description', op: 'contains', value: 'easemytrip' }], tags: ['travel'] },
  { name: 'Ixigo Travel Booking', priority: 74, conditions: [{ field: 'description', op: 'contains', value: 'ixigo' }], tags: ['travel'] },
  { name: 'IndiGo Airlines (InterGlobe)', priority: 75, conditions: [{ field: 'description', op: 'contains', value: 'indigo' }], tags: ['travel'] },
  { name: 'InterGlobe Aviation', priority: 76, conditions: [{ field: 'description', op: 'contains', value: 'interglobe' }], tags: ['travel'] },
  { name: 'Air India Flights', priority: 77, conditions: [{ field: 'description', op: 'contains', value: 'air india' }], tags: ['travel'] },
  { name: 'Akasa Air Flight', priority: 78, conditions: [{ field: 'description', op: 'contains', value: 'akasa' }], tags: ['travel'] },
  { name: 'SpiceJet Flight Booking', priority: 79, conditions: [{ field: 'description', op: 'contains', value: 'spicejet' }], tags: ['travel'] },
  { name: 'Vistara Airlines', priority: 80, conditions: [{ field: 'description', op: 'contains', value: 'vistara' }], tags: ['travel'] },

  // ── 6. Fuel, Petrol & EV Charging (Priority 81-92) ──────────────────────────
  { name: 'HPCL Petrol Pump', priority: 81, conditions: [{ field: 'description', op: 'contains', value: 'hpcl' }], tags: ['fuel'] },
  { name: 'Hindustan Petroleum', priority: 82, conditions: [{ field: 'description', op: 'contains', value: 'hindustan petroleum' }], tags: ['fuel'] },
  { name: 'BPCL Petrol Pump', priority: 83, conditions: [{ field: 'description', op: 'contains', value: 'bpcl' }], tags: ['fuel'] },
  { name: 'Bharat Petroleum', priority: 84, conditions: [{ field: 'description', op: 'contains', value: 'bharat petroleum' }], tags: ['fuel'] },
  { name: 'Indian Oil IOCL Station', priority: 85, conditions: [{ field: 'description', op: 'contains', value: 'iocl' }], tags: ['fuel'] },
  { name: 'Indian Oil Corporation', priority: 86, conditions: [{ field: 'description', op: 'contains', value: 'indian oil' }], tags: ['fuel'] },
  { name: 'Shell Petrol Station', priority: 87, conditions: [{ field: 'description', op: 'contains', value: 'shell' }], tags: ['fuel'] },
  { name: 'Jio-bp Fuel Pump', priority: 88, conditions: [{ field: 'description', op: 'contains', value: 'jio-bp' }], tags: ['fuel'] },
  { name: 'Nayara Energy Fuel', priority: 89, conditions: [{ field: 'description', op: 'contains', value: 'nayara' }], tags: ['fuel'] },
  { name: 'Tata Power EV Charging', priority: 90, conditions: [{ field: 'description', op: 'contains', value: 'tata power ev' }], tags: ['fuel', 'ev-charging'] },
  { name: 'Ather Grid EV Charging', priority: 91, conditions: [{ field: 'description', op: 'contains', value: 'ather' }], tags: ['fuel', 'ev-charging'] },
  { name: 'Statiq / Bolt EV Charging', priority: 92, conditions: [{ field: 'description', op: 'contains', value: 'statiq' }], tags: ['fuel', 'ev-charging'] },

  // ── 7. Shopping, Fashion & Electronics (Priority 93-115) ────────────────────
  { name: 'Amazon India Shopping', priority: 93, conditions: [{ field: 'description', op: 'contains', value: 'amazon' }], tags: ['shopping'] },
  { name: 'Amazon Pay Balance / UPI', priority: 94, conditions: [{ field: 'description', op: 'contains', value: 'amazon pay' }], tags: ['shopping'] },
  { name: 'Flipkart Online Shopping', priority: 95, conditions: [{ field: 'description', op: 'contains', value: 'flipkart' }], tags: ['shopping'] },
  { name: 'Myntra Fashion App', priority: 96, conditions: [{ field: 'description', op: 'contains', value: 'myntra' }], tags: ['shopping', 'clothing'] },
  { name: 'Ajio Online Fashion', priority: 97, conditions: [{ field: 'description', op: 'contains', value: 'ajio' }], tags: ['shopping', 'clothing'] },
  { name: 'Meesho Wholesale & Retail', priority: 98, conditions: [{ field: 'description', op: 'contains', value: 'meesho' }], tags: ['shopping'] },
  { name: 'Tata Neu Super App', priority: 99, conditions: [{ field: 'description', op: 'contains', value: 'tata neu' }], tags: ['shopping'] },
  { name: 'Tata CLiQ Luxury & Fashion', priority: 100, conditions: [{ field: 'description', op: 'contains', value: 'tatacliq' }], tags: ['shopping', 'clothing'] },
  { name: 'Nykaa Beauty & Cosmetics', priority: 101, conditions: [{ field: 'description', op: 'contains', value: 'nykaa' }], tags: ['shopping', 'beauty'] },
  { name: 'FSN E-Commerce (Nykaa)', priority: 102, conditions: [{ field: 'description', op: 'contains', value: 'fsn e-commerce' }], tags: ['shopping', 'beauty'] },
  { name: 'Tira Beauty', priority: 103, conditions: [{ field: 'description', op: 'contains', value: 'tira' }], tags: ['shopping', 'beauty'] },
  { name: 'Purplle Cosmetics', priority: 104, conditions: [{ field: 'description', op: 'contains', value: 'purplle' }], tags: ['shopping', 'beauty'] },
  { name: 'Lenskart Eyewear & Glasses', priority: 105, conditions: [{ field: 'description', op: 'contains', value: 'lenskart' }], tags: ['shopping'] },
  { name: 'Croma Electronics', priority: 106, conditions: [{ field: 'description', op: 'contains', value: 'croma' }], tags: ['shopping', 'electronics'] },
  { name: 'Infiniti Retail (Croma)', priority: 107, conditions: [{ field: 'description', op: 'contains', value: 'infiniti retail' }], tags: ['shopping', 'electronics'] },
  { name: 'Reliance Digital', priority: 108, conditions: [{ field: 'description', op: 'contains', value: 'reliance digital' }], tags: ['shopping', 'electronics'] },
  { name: 'Decathlon Sports & Gear', priority: 109, conditions: [{ field: 'description', op: 'contains', value: 'decathlon' }], tags: ['shopping', 'fitness'] },
  { name: 'Zudio Fashion Retail', priority: 110, conditions: [{ field: 'description', op: 'contains', value: 'zudio' }], tags: ['shopping', 'clothing'] },
  { name: 'Zara Clothing Store', priority: 111, conditions: [{ field: 'description', op: 'contains', value: 'zara' }], tags: ['shopping', 'clothing'] },
  { name: 'H&M Fashion Store', priority: 112, conditions: [{ field: 'description', op: 'contains', value: 'h&m' }], tags: ['shopping', 'clothing'] },
  { name: 'Uniqlo India Retail', priority: 113, conditions: [{ field: 'description', op: 'contains', value: 'uniqlo' }], tags: ['shopping', 'clothing'] },
  { name: 'Westside Fashion (Trent)', priority: 114, conditions: [{ field: 'description', op: 'contains', value: 'westside' }], tags: ['shopping', 'clothing'] },
  { name: 'IKEA Furniture & Home', priority: 115, conditions: [{ field: 'description', op: 'contains', value: 'ikea' }], tags: ['shopping', 'home-maintenance'] },

  // ── 8. OTT, Media & Subscriptions (Priority 116-130) ─────────────────────────
  { name: 'Netflix Subscription', priority: 116, conditions: [{ field: 'description', op: 'contains', value: 'netflix' }], tags: ['entertainment', 'subscription'] },
  { name: 'Hotstar / Disney+ Hotstar', priority: 117, conditions: [{ field: 'description', op: 'contains', value: 'hotstar' }], tags: ['entertainment', 'subscription'] },
  { name: 'Prime Video Subscription', priority: 118, conditions: [{ field: 'description', op: 'contains', value: 'prime video' }], tags: ['entertainment', 'subscription'] },
  { name: 'JioCinema Premium', priority: 119, conditions: [{ field: 'description', op: 'contains', value: 'jiocinema' }], tags: ['entertainment', 'subscription'] },
  { name: 'Spotify Premium Music', priority: 120, conditions: [{ field: 'description', op: 'contains', value: 'spotify' }], tags: ['entertainment', 'subscription'] },
  { name: 'YouTube Premium Membership', priority: 121, conditions: [{ field: 'description', op: 'contains', value: 'youtube' }], tags: ['entertainment', 'subscription'] },
  { name: 'Apple Services (iCloud/Music)', priority: 122, conditions: [{ field: 'description', op: 'contains', value: 'apple.com' }], tags: ['entertainment', 'subscription'] },
  { name: 'SonyLIV Subscription', priority: 123, conditions: [{ field: 'description', op: 'contains', value: 'sonyliv' }], tags: ['entertainment', 'subscription'] },
  { name: 'Zee5 Subscription', priority: 124, conditions: [{ field: 'description', op: 'contains', value: 'zee5' }], tags: ['entertainment', 'subscription'] },
  { name: 'BookMyShow Movie Tickets', priority: 125, conditions: [{ field: 'description', op: 'contains', value: 'bookmyshow' }], tags: ['entertainment', 'movies'] },
  { name: 'Bigtree Entertainment (BMS)', priority: 126, conditions: [{ field: 'description', op: 'contains', value: 'bigtree' }], tags: ['entertainment', 'movies'] },
  { name: 'PVR Cinemas Ticket', priority: 127, conditions: [{ field: 'description', op: 'contains', value: 'pvr' }], tags: ['entertainment', 'movies'] },
  { name: 'INOX Leisure Cinemas', priority: 128, conditions: [{ field: 'description', op: 'contains', value: 'inox' }], tags: ['entertainment', 'movies'] },
  { name: 'Cinepolis India Cinemas', priority: 129, conditions: [{ field: 'description', op: 'contains', value: 'cinepolis' }], tags: ['entertainment', 'movies'] },
  { name: 'Audible Audiobooks', priority: 130, conditions: [{ field: 'description', op: 'contains', value: 'audible' }], tags: ['entertainment', 'subscription'] },

  // ── 9. Telecom, Broadband & Utilities (Priority 131-153) ───────────────────
  { name: 'Jio Mobile Recharge / Fiber', priority: 131, conditions: [{ field: 'description', op: 'contains', value: 'jio' }], tags: ['recharge', 'utilities'] },
  { name: 'Airtel Mobile / DTH / Fiber', priority: 132, conditions: [{ field: 'description', op: 'contains', value: 'airtel' }], tags: ['recharge', 'utilities'] },
  { name: 'Bharti Airtel Telecom', priority: 133, conditions: [{ field: 'description', op: 'contains', value: 'bharti airtel' }], tags: ['recharge', 'utilities'] },
  { name: 'Vodafone Idea / Vi Recharge', priority: 134, conditions: [{ field: 'description', op: 'contains', value: 'vodafone' }], tags: ['recharge', 'utilities'] },
  { name: 'Vi Prepaid / Postpaid Recharge', priority: 135, conditions: [{ field: 'description', op: 'contains', value: 'vi recharge' }], tags: ['recharge', 'utilities'] },
  { name: 'BSNL Mobile Recharge / Landline', priority: 136, conditions: [{ field: 'description', op: 'contains', value: 'bsnl' }], tags: ['recharge', 'utilities'] },
  { name: 'ACT Fibernet Broadband', priority: 137, conditions: [{ field: 'description', op: 'contains', value: 'act fibernet' }], tags: ['broadband', 'utilities'] },
  { name: 'Hathway Broadband Internet', priority: 138, conditions: [{ field: 'description', op: 'contains', value: 'hathway' }], tags: ['broadband', 'utilities'] },
  { name: 'Tata Play DTH & Fiber', priority: 139, conditions: [{ field: 'description', op: 'contains', value: 'tata play' }], tags: ['utilities', 'bills'] },
  { name: 'Tata Sky DTH Recharge', priority: 140, conditions: [{ field: 'description', op: 'contains', value: 'tatasky' }], tags: ['utilities', 'bills'] },
  { name: 'BESCOM Electricity Bangalore', priority: 141, conditions: [{ field: 'description', op: 'contains', value: 'bescom' }], tags: ['utilities', 'bills'] },
  { name: 'Tata Power Electricity Bill', priority: 142, conditions: [{ field: 'description', op: 'contains', value: 'tata power' }], tags: ['utilities', 'bills'] },
  { name: 'Adani Electricity Mumbai', priority: 143, conditions: [{ field: 'description', op: 'contains', value: 'adani electricity' }], tags: ['utilities', 'bills'] },
  { name: 'BSES Rajdhani / Yamuna Delhi', priority: 144, conditions: [{ field: 'description', op: 'contains', value: 'bses' }], tags: ['utilities', 'bills'] },
  { name: 'MSEDCL / Mahavitaran Maharashtra', priority: 145, conditions: [{ field: 'description', op: 'contains', value: 'msedcl' }], tags: ['utilities', 'bills'] },
  { name: 'CESC Kolkata Electricity', priority: 146, conditions: [{ field: 'description', op: 'contains', value: 'cesc' }], tags: ['utilities', 'bills'] },
  { name: 'UPPCL Uttar Pradesh Power', priority: 147, conditions: [{ field: 'description', op: 'contains', value: 'uppcl' }], tags: ['utilities', 'bills'] },
  { name: 'TSSPDCL Telangana Power', priority: 148, conditions: [{ field: 'description', op: 'contains', value: 'tsspdcl' }], tags: ['utilities', 'bills'] },
  { name: 'IGL Indraprastha Gas Bill', priority: 149, conditions: [{ field: 'description', op: 'contains', value: 'igl' }], tags: ['utilities', 'bills'] },
  { name: 'MGL Mahanagar Gas Bill', priority: 150, conditions: [{ field: 'description', op: 'contains', value: 'mgl' }], tags: ['utilities', 'bills'] },
  { name: 'Indane / Bharat Gas / HP Gas LPG', priority: 151, conditions: [{ field: 'description', op: 'contains', value: 'gas cylinder' }], tags: ['utilities', 'bills'] },
  { name: 'BWSSB Bangalore Water', priority: 152, conditions: [{ field: 'description', op: 'contains', value: 'bwssb' }], tags: ['utilities', 'bills'] },
  { name: 'Delhi Jal Board Water Bill', priority: 153, conditions: [{ field: 'description', op: 'contains', value: 'jal board' }], tags: ['utilities', 'bills'] },

  // ── 10. Medical, Pharmacy & Fitness (Priority 154-165) ─────────────────────
  { name: 'Apollo Pharmacy Medicines', priority: 154, conditions: [{ field: 'description', op: 'contains', value: 'apollo' }], tags: ['medical'] },
  { name: 'Tata 1mg Pharmacy', priority: 155, conditions: [{ field: 'description', op: 'contains', value: '1mg' }], tags: ['medical'] },
  { name: 'PharmEasy Medicine Order', priority: 156, conditions: [{ field: 'description', op: 'contains', value: 'pharmeasy' }], tags: ['medical'] },
  { name: 'MedPlus Pharmacy', priority: 157, conditions: [{ field: 'description', op: 'contains', value: 'medplus' }], tags: ['medical'] },
  { name: 'Netmeds Pharmacy', priority: 158, conditions: [{ field: 'description', op: 'contains', value: 'netmeds' }], tags: ['medical'] },
  { name: 'Practo Consultation & Lab', priority: 159, conditions: [{ field: 'description', op: 'contains', value: 'practo' }], tags: ['medical'] },
  { name: 'Dr Lal PathLabs Diagnostics', priority: 160, conditions: [{ field: 'description', op: 'contains', value: 'lal path' }], tags: ['medical'] },
  { name: 'Metropolis Healthcare Labs', priority: 161, conditions: [{ field: 'description', op: 'contains', value: 'metropolis' }], tags: ['medical'] },
  { name: 'Thyrocare Technologies', priority: 162, conditions: [{ field: 'description', op: 'contains', value: 'thyrocare' }], tags: ['medical'] },
  { name: 'Cult.fit Fitness & Gym Pass', priority: 163, conditions: [{ field: 'description', op: 'contains', value: 'cult.fit' }], tags: ['fitness'] },
  { name: 'Curefit Healthcare', priority: 164, conditions: [{ field: 'description', op: 'contains', value: 'curefit' }], tags: ['fitness'] },
  { name: 'Gold Gym Membership', priority: 165, conditions: [{ field: 'description', op: 'contains', value: 'gold gym' }], tags: ['fitness'] },

  // ── 11. Credit Cards, Loans & Insurance (Priority 166-180) ──────────────────
  { name: 'CRED Credit Card Bill Pay', priority: 166, conditions: [{ field: 'description', op: 'contains', value: 'cred' }], tags: ['credit-card', 'bills'] },
  { name: 'Dreamplug Technologies (CRED)', priority: 167, conditions: [{ field: 'description', op: 'contains', value: 'dreamplug' }], tags: ['credit-card', 'bills'] },
  { name: 'CheQ Bill Payment', priority: 168, conditions: [{ field: 'description', op: 'contains', value: 'cheq' }], tags: ['credit-card', 'bills'] },
  { name: 'OneCard Bill Payment', priority: 169, conditions: [{ field: 'description', op: 'contains', value: 'onecard' }], tags: ['credit-card', 'bills'] },
  { name: 'Slice SuperCard Repayment', priority: 170, conditions: [{ field: 'description', op: 'contains', value: 'slice' }], tags: ['credit-card', 'bills'] },
  { name: 'Credit Card Bill Autodebit', priority: 171, conditions: [{ field: 'description', op: 'contains', value: 'credit card' }], tags: ['credit-card', 'bills'] },
  { name: 'Credit Card Payment', priority: 172, conditions: [{ field: 'description', op: 'contains', value: 'cc payment' }], tags: ['credit-card', 'bills'] },
  { name: 'Bajaj Finance EMI Loan', priority: 173, conditions: [{ field: 'description', op: 'contains', value: 'bajaj finance' }], tags: ['loan', 'bills'] },
  { name: 'Bajaj Finserv EMI', priority: 174, conditions: [{ field: 'description', op: 'contains', value: 'bajaj finserv' }], tags: ['loan', 'bills'] },
  { name: 'Loan EMI Auto-Debit', priority: 175, conditions: [{ field: 'description', op: 'contains', value: 'emi' }], tags: ['loan', 'bills'] },
  { name: 'LIC Life Insurance Premium', priority: 176, conditions: [{ field: 'description', op: 'contains', value: 'lic' }], tags: ['insurance'] },
  { name: 'HDFC Life Insurance', priority: 177, conditions: [{ field: 'description', op: 'contains', value: 'hdfc life' }], tags: ['insurance'] },
  { name: 'ICICI Prudential Life', priority: 178, conditions: [{ field: 'description', op: 'contains', value: 'icici pru' }], tags: ['insurance'] },
  { name: 'Star Health Insurance', priority: 179, conditions: [{ field: 'description', op: 'contains', value: 'star health' }], tags: ['insurance'] },
  { name: 'Acko Insurance Premium', priority: 180, conditions: [{ field: 'description', op: 'contains', value: 'acko' }], tags: ['insurance'] },

  // ── 12. Wealth, Investments & Stocks (Priority 181-195) ─────────────────────
  { name: 'Zerodha Broking / Kite / Coin', priority: 181, conditions: [{ field: 'description', op: 'contains', value: 'zerodha' }], tags: ['investment', 'stocks'] },
  { name: 'Groww Mutual Funds & Stocks', priority: 182, conditions: [{ field: 'description', op: 'contains', value: 'groww' }], tags: ['investment', 'mutual-fund'] },
  { name: 'Nextbillion Technology (Groww)', priority: 183, conditions: [{ field: 'description', op: 'contains', value: 'nextbillion' }], tags: ['investment', 'mutual-fund'] },
  { name: 'Angel One Broking', priority: 184, conditions: [{ field: 'description', op: 'contains', value: 'angel one' }], tags: ['investment', 'stocks'] },
  { name: 'Upstox Securities (RKSV)', priority: 185, conditions: [{ field: 'description', op: 'contains', value: 'upstox' }], tags: ['investment', 'stocks'] },
  { name: 'INDmoney US Stocks & MF', priority: 186, conditions: [{ field: 'description', op: 'contains', value: 'indmoney' }], tags: ['investment'] },
  { name: 'Kuvera Wealth Mutual Funds', priority: 187, conditions: [{ field: 'description', op: 'contains', value: 'kuvera' }], tags: ['investment', 'mutual-fund'] },
  { name: 'Smallcase Technologies', priority: 188, conditions: [{ field: 'description', op: 'contains', value: 'smallcase' }], tags: ['investment', 'stocks'] },
  { name: 'CAMS Online MF SIP', priority: 189, conditions: [{ field: 'description', op: 'contains', value: 'cams' }], tags: ['investment', 'mutual-fund'] },
  { name: 'KFintech Mutual Fund SIP', priority: 190, conditions: [{ field: 'description', op: 'contains', value: 'kfintech' }], tags: ['investment', 'mutual-fund'] },
  { name: 'NPS National Pension System', priority: 191, conditions: [{ field: 'description', op: 'contains', value: 'nps' }], tags: ['investment'] },
  { name: 'Public Provident Fund (PPF)', priority: 192, conditions: [{ field: 'description', op: 'contains', value: 'ppf' }], tags: ['investment'] },
  { name: 'Mutual Fund SIP Auto-Debit', priority: 193, conditions: [{ field: 'description', op: 'contains', value: 'mutual fund' }], tags: ['investment', 'mutual-fund'] },
  { name: 'Digital Gold / Sovereign Gold Bond', priority: 194, conditions: [{ field: 'description', op: 'contains', value: 'gold bond' }], tags: ['gold', 'investment'] },
  { name: 'Tanishq Jewellers', priority: 195, conditions: [{ field: 'description', op: 'contains', value: 'tanishq' }], tags: ['gold', 'shopping'] },

  // ── 13. Housing, Rent & Society (Priority 196-205) ──────────────────────────
  { name: 'Urban Company Home Services', priority: 196, conditions: [{ field: 'description', op: 'contains', value: 'urban company' }], tags: ['home-maintenance'] },
  { name: 'UrbanClap Technologies', priority: 197, conditions: [{ field: 'description', op: 'contains', value: 'urbanclap' }], tags: ['home-maintenance'] },
  { name: 'MyGate Society Maintenance', priority: 198, conditions: [{ field: 'description', op: 'contains', value: 'mygate' }], tags: ['rent', 'home-maintenance'] },
  { name: 'NoBroker Rent / Deposit', priority: 199, conditions: [{ field: 'description', op: 'contains', value: 'nobroker' }], tags: ['rent'] },
  { name: 'House Rent Payment', priority: 200, conditions: [{ field: 'description', op: 'contains', value: 'rent' }], tags: ['rent'] },
  { name: 'Society Maintenance Charge', priority: 201, conditions: [{ field: 'description', op: 'contains', value: 'society' }], tags: ['home-maintenance'] },

  // ── 14. Taxes, Challans & Government (Priority 206-215) ─────────────────────
  { name: 'Income Tax Payment NSDL / ITD', priority: 206, conditions: [{ field: 'description', op: 'contains', value: 'income tax' }], tags: ['tax', 'government'] },
  { name: 'Protean / NSDL Tax Challan', priority: 207, conditions: [{ field: 'description', op: 'contains', value: 'nsdl' }], tags: ['tax', 'government'] },
  { name: 'GST Tax Challan Payment', priority: 208, conditions: [{ field: 'description', op: 'contains', value: 'gst' }], tags: ['tax', 'government'] },
  { name: 'Parivahan Traffic Challan', priority: 209, conditions: [{ field: 'description', op: 'contains', value: 'parivahan' }], tags: ['government'] },
  { name: 'Traffic Police Challan', priority: 210, conditions: [{ field: 'description', op: 'contains', value: 'challan' }], tags: ['government'] },
  { name: 'Passport Seva Government Fee', priority: 211, conditions: [{ field: 'description', op: 'contains', value: 'passport seva' }], tags: ['government'] },
  { name: 'UIDAI Aadhaar Services', priority: 212, conditions: [{ field: 'description', op: 'contains', value: 'uidai' }], tags: ['government'] },

  // ── 15. Banking Operations, Salary & Dividends (Priority 216-240) ───────────
  { name: 'Monthly Salary Credit', priority: 216, conditions: [{ field: 'description', op: 'contains', value: 'salary' }, { field: 'type', op: 'equals', value: 'credit' }], tags: ['salary', 'income'] },
  { name: 'Payroll Credit', priority: 217, conditions: [{ field: 'description', op: 'contains', value: 'payroll' }, { field: 'type', op: 'equals', value: 'credit' }], tags: ['salary', 'income'] },
  { name: 'ACH Salary / CMS Credit', priority: 218, conditions: [{ field: 'description', op: 'contains', value: 'ach cr' }], tags: ['income'] },
  { name: 'Corporate CMS Credit', priority: 219, conditions: [{ field: 'description', op: 'contains', value: 'cms cr' }], tags: ['income'] },
  { name: 'Quarterly Bank Savings Interest', priority: 220, conditions: [{ field: 'description', op: 'contains', value: 'interest' }, { field: 'type', op: 'equals', value: 'credit' }], tags: ['interest', 'income'] },
  { name: 'Interest Paid On Balance', priority: 221, conditions: [{ field: 'description', op: 'contains', value: 'int.pd' }, { field: 'type', op: 'equals', value: 'credit' }], tags: ['interest', 'income'] },
  { name: 'Stock / MF Dividend Credit', priority: 222, conditions: [{ field: 'description', op: 'contains', value: 'dividend' }, { field: 'type', op: 'equals', value: 'credit' }], tags: ['dividend', 'income'] },
  { name: 'ATM Cash Withdrawal', priority: 223, conditions: [{ field: 'description', op: 'contains', value: 'atm' }], tags: ['cash', 'atm'] },
  { name: 'Cash Withdrawal at Branch', priority: 224, conditions: [{ field: 'description', op: 'contains', value: 'cash wdl' }], tags: ['cash'] },
  { name: 'NFS ATM Withdrawal', priority: 225, conditions: [{ field: 'description', op: 'contains', value: 'nfs atm' }], tags: ['cash', 'atm'] },
  { name: 'Bank SMS / Alert Charges', priority: 226, conditions: [{ field: 'description', op: 'contains', value: 'sms chg' }], tags: ['bank-charges'] },
  { name: 'Minimum Balance Charges', priority: 227, conditions: [{ field: 'description', op: 'contains', value: 'min bal' }], tags: ['bank-charges'] },
  { name: 'Consolidated Bank Service Charges', priority: 228, conditions: [{ field: 'description', op: 'contains', value: 'charges' }], tags: ['bank-charges'] },
  { name: 'Debit Card Annual Fee', priority: 229, conditions: [{ field: 'description', op: 'contains', value: 'annual fee' }], tags: ['bank-charges'] },
  { name: 'NEFT Online Bank Transfer', priority: 230, conditions: [{ field: 'description', op: 'contains', value: 'neft' }], tags: ['transfer'] },
  { name: 'IMPS Quick Money Transfer', priority: 231, conditions: [{ field: 'description', op: 'contains', value: 'imps' }], tags: ['transfer'] },
  { name: 'RTGS High-Value Bank Transfer', priority: 232, conditions: [{ field: 'description', op: 'contains', value: 'rtgs' }], tags: ['transfer'] },
]

function escapeSql(str) {
  return "'" + str.replace(/'/g, "''") + "'"
}

async function addIndianRules() {
  console.log('🇮🇳 Enhancing Tags & Categorization Rules for India...')

  // 1. Bulk Upsert Tags
  console.log(`📌 Upserting ${INDIAN_TAGS.length} curated categories & tags...`)
  const tagRows = INDIAN_TAGS.map(t =>
    `(${escapeSql(t.name)}, ${escapeSql(t.color)}, ${escapeSql(t.icon)})`
  ).join(',\n')

  await sql.unsafe(`
    INSERT INTO tags (name, color, icon) VALUES
    ${tagRows}
    ON CONFLICT (name) DO UPDATE SET
      color = EXCLUDED.color,
      icon = EXCLUDED.icon;
  `)

  // 2. Clear old tag_rules and Bulk Insert New Rules
  console.log(`⚡ Bulk inserting ${INDIAN_RULES.length} automated Indian categorization rules...`)
  await sql`DELETE FROM tag_rules`

  const ruleRows = INDIAN_RULES.map(r => {
    const condJson = escapeSql(JSON.stringify(r.conditions))
    const tagsArr = 'ARRAY[' + r.tags.map(t => escapeSql(t)).join(',') + ']'
    return `(${escapeSql(r.name)}, ${r.priority}, ${condJson}, ${tagsArr})`
  }).join(',\n')

  await sql.unsafe(`
    INSERT INTO tag_rules (name, priority, conditions, tags) VALUES
    ${ruleRows};
  `)

  // 3. Count in database to verify
  const [{ tagCount }] = await sql`SELECT count(*)::int as "tagCount" FROM tags`
  const [{ ruleCount }] = await sql`SELECT count(*)::int as "ruleCount" FROM tag_rules`

  console.log('\n✅ Successfully registered in Supabase:')
  console.log(`   - ${tagCount} total tags & categories in database`)
  console.log(`   - ${ruleCount} active Indian rules in database`)

  await sql.end()
}

addIndianRules().catch(err => {
  console.error('❌ Failed to add rules:', err)
  process.exit(1)
})
