import { TagRule } from '@/lib/types'

/**
 * Default seed rules for common Indian merchants/services.
 * These are seeded into the database on first run.
 */
export const SEED_RULES: Omit<TagRule, 'id' | 'created_at'>[] = [
  // Food delivery
  { name: 'Swiggy', priority: 10, conditions: [{ field: 'description', op: 'contains', value: 'swiggy' }], tags: ['food', 'delivery'] },
  { name: 'Zomato', priority: 11, conditions: [{ field: 'description', op: 'contains', value: 'zomato' }], tags: ['food', 'delivery'] },
  { name: 'Blinkit', priority: 12, conditions: [{ field: 'description', op: 'contains', value: 'blinkit' }], tags: ['groceries', 'delivery'] },
  { name: 'Zepto', priority: 13, conditions: [{ field: 'description', op: 'contains', value: 'zepto' }], tags: ['groceries', 'delivery'] },
  { name: 'Dunzo', priority: 14, conditions: [{ field: 'description', op: 'contains', value: 'dunzo' }], tags: ['delivery'] },
  { name: 'BB Daily', priority: 15, conditions: [{ field: 'description', op: 'contains', value: 'bigbasket' }], tags: ['groceries'] },

  // Transport
  { name: 'Ola', priority: 20, conditions: [{ field: 'description', op: 'contains', value: 'ola' }], tags: ['transport', 'cab'] },
  { name: 'Uber', priority: 21, conditions: [{ field: 'description', op: 'contains', value: 'uber' }], tags: ['transport', 'cab'] },
  { name: 'Rapido', priority: 22, conditions: [{ field: 'description', op: 'contains', value: 'rapido' }], tags: ['transport', 'bike'] },
  { name: 'Namma Yatri', priority: 23, conditions: [{ field: 'description', op: 'contains', value: 'namma yatri' }], tags: ['transport', 'cab'] },

  // Fuel
  { name: 'Petrol / Fuel', priority: 30, conditions: [{ field: 'description', op: 'contains', value: 'petrol' }], tags: ['fuel'] },
  { name: 'HP Fuel', priority: 31, conditions: [{ field: 'description', op: 'contains', value: 'hpcl' }], tags: ['fuel'] },
  { name: 'Indian Oil', priority: 32, conditions: [{ field: 'description', op: 'contains', value: 'iocl' }], tags: ['fuel'] },

  // Shopping / E-commerce
  { name: 'Amazon', priority: 40, conditions: [{ field: 'description', op: 'contains', value: 'amazon' }], tags: ['shopping'] },
  { name: 'Flipkart', priority: 41, conditions: [{ field: 'description', op: 'contains', value: 'flipkart' }], tags: ['shopping'] },
  { name: 'Myntra', priority: 42, conditions: [{ field: 'description', op: 'contains', value: 'myntra' }], tags: ['shopping', 'clothing'] },
  { name: 'Meesho', priority: 43, conditions: [{ field: 'description', op: 'contains', value: 'meesho' }], tags: ['shopping'] },
  { name: 'Nykaa', priority: 44, conditions: [{ field: 'description', op: 'contains', value: 'nykaa' }], tags: ['shopping', 'beauty'] },

  // Telecom / Recharges
  { name: 'Jio Recharge', priority: 50, conditions: [{ field: 'description', op: 'contains', value: 'jio' }], tags: ['recharge', 'utilities'] },
  { name: 'Airtel Recharge', priority: 51, conditions: [{ field: 'description', op: 'contains', value: 'airtel' }], tags: ['recharge', 'utilities'] },
  { name: 'BSNL', priority: 52, conditions: [{ field: 'description', op: 'contains', value: 'bsnl' }], tags: ['recharge', 'utilities'] },

  // Streaming / Entertainment
  { name: 'Netflix', priority: 60, conditions: [{ field: 'description', op: 'contains', value: 'netflix' }], tags: ['entertainment', 'subscription'] },
  { name: 'Hotstar / Disney+', priority: 61, conditions: [{ field: 'description', op: 'contains', value: 'hotstar' }], tags: ['entertainment', 'subscription'] },
  { name: 'Prime Video', priority: 62, conditions: [{ field: 'description', op: 'contains', value: 'prime' }], tags: ['entertainment', 'subscription'] },
  { name: 'Spotify', priority: 63, conditions: [{ field: 'description', op: 'contains', value: 'spotify' }], tags: ['entertainment', 'subscription'] },
  { name: 'YouTube Premium', priority: 64, conditions: [{ field: 'description', op: 'contains', value: 'youtube' }], tags: ['entertainment', 'subscription'] },

  // Utilities
  { name: 'Electricity Bill', priority: 70, conditions: [{ field: 'description', op: 'contains', value: 'electricity' }], tags: ['utilities', 'bills'] },
  { name: 'Water Bill', priority: 71, conditions: [{ field: 'description', op: 'contains', value: 'water bill' }], tags: ['utilities', 'bills'] },
  { name: 'Gas Bill', priority: 72, conditions: [{ field: 'description', op: 'contains', value: 'gas' }], tags: ['utilities', 'bills'] },

  // Medical / Healthcare
  { name: 'Pharmacy / Medplus', priority: 80, conditions: [{ field: 'description', op: 'contains', value: 'pharmacy' }], tags: ['medical'] },
  { name: 'Apollo Pharmacy', priority: 81, conditions: [{ field: 'description', op: 'contains', value: 'apollo' }], tags: ['medical'] },
  { name: 'Practo', priority: 82, conditions: [{ field: 'description', op: 'contains', value: 'practo' }], tags: ['medical'] },
  { name: '1mg', priority: 83, conditions: [{ field: 'description', op: 'contains', value: '1mg' }], tags: ['medical'] },

  // Finance / Transfers
  { name: 'Self Transfer', priority: 90, conditions: [{ field: 'description', op: 'contains', value: 'self transfer' }], tags: ['transfer'] },
  { name: 'NEFT Transfer', priority: 91, conditions: [{ field: 'description', op: 'contains', value: 'neft' }], tags: ['transfer'] },
  { name: 'IMPS Transfer', priority: 92, conditions: [{ field: 'description', op: 'contains', value: 'imps' }], tags: ['transfer'] },

  // Income patterns
  { name: 'Salary Credit', priority: 100, conditions: [{ field: 'description', op: 'contains', value: 'salary' }, { field: 'type', op: 'equals', value: 'credit' }], tags: ['salary', 'income'] },
  { name: 'Interest Credit', priority: 101, conditions: [{ field: 'description', op: 'contains', value: 'interest' }, { field: 'type', op: 'equals', value: 'credit' }], tags: ['interest', 'income'] },
  { name: 'Dividend', priority: 102, conditions: [{ field: 'description', op: 'contains', value: 'dividend' }], tags: ['dividend', 'income'] },

  // ATM / Cash
  { name: 'ATM Withdrawal', priority: 110, conditions: [{ field: 'description', op: 'contains', value: 'atm' }], tags: ['cash', 'atm'] },
  { name: 'Cash Deposit', priority: 111, conditions: [{ field: 'description', op: 'contains', value: 'cash deposit' }], tags: ['cash'] },
]

export const SEED_TAGS = [
  { name: 'food', color: '#f97316', icon: '' },
  { name: 'delivery', color: '#fb923c', icon: '' },
  { name: 'groceries', color: '#84cc16', icon: '' },
  { name: 'transport', color: '#06b6d4', icon: '' },
  { name: 'cab', color: '#0ea5e9', icon: '' },
  { name: 'bike', color: '#38bdf8', icon: '' },
  { name: 'fuel', color: '#eab308', icon: '' },
  { name: 'shopping', color: '#a855f7', icon: '' },
  { name: 'clothing', color: '#c084fc', icon: '' },
  { name: 'beauty', color: '#f472b6', icon: '' },
  { name: 'recharge', color: '#6366f1', icon: '' },
  { name: 'utilities', color: '#64748b', icon: '' },
  { name: 'bills', color: '#475569', icon: '' },
  { name: 'entertainment', color: '#ec4899', icon: '' },
  { name: 'subscription', color: '#d946ef', icon: '' },
  { name: 'medical', color: '#ef4444', icon: '' },
  { name: 'transfer', color: '#94a3b8', icon: '' },
  { name: 'salary', color: '#22c55e', icon: '' },
  { name: 'income', color: '#4ade80', icon: '' },
  { name: 'interest', color: '#86efac', icon: '' },
  { name: 'dividend', color: '#bbf7d0', icon: '' },
  { name: 'cash', color: '#a3a3a3', icon: '' },
  { name: 'atm', color: '#737373', icon: '' },
  { name: 'rent', color: '#78716c', icon: '' },
]
