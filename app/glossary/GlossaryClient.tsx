'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, Calculator, TrendingUp, TrendingDown, AlertTriangle, ArrowLeftRight, Target, Wallet, PiggyBank, Building2, CreditCard, Search, ArrowRight, ExternalLink } from 'lucide-react'

// ─── Data ──────────────────────────────────────────────────────────────────

const sections = [
  {
    id: 'dashboard',
    icon: Wallet,
    color: '#2563eb',
    title: 'Dashboard Metrics',
    description: 'Every number you see on the main dashboard — what it means and how it\'s calculated.',
    items: [
      {
        term: 'Net Cash Flow',
        formula: 'Total Credits − Total Debits',
        meaning: 'The money left over after accounting for all outflows in your selected time period. A positive number means you earned more than you spent. A negative number means you spent more than you earned.',
        example: 'Credits ₹1,20,000 − Debits ₹95,000 = Net Flow +₹25,000',
        color: '#2563eb',
        tags: ['dashboard', 'key metric'],
      },
      {
        term: 'Total Inflow (Credits)',
        formula: 'SUM of all transactions where type = "credit"',
        meaning: 'All money coming INTO your account: salary, freelance payments, UPI receipts, interest credited, refunds, etc.',
        example: 'Salary ₹80,000 + Freelance ₹20,000 + Refund ₹500 = ₹1,00,500',
        color: '#16a34a',
        tags: ['dashboard', 'income'],
      },
      {
        term: 'Total Outflow (Debits)',
        formula: 'SUM of all transactions where type = "debit"',
        meaning: 'All money going OUT of your account: expenses, EMIs, transfers, UPI payments, ATM withdrawals, etc.',
        example: 'Rent ₹25,000 + Groceries ₹8,000 + EMI ₹15,000 = ₹48,000',
        color: '#dc2626',
        tags: ['dashboard', 'expense'],
      },
      {
        term: 'Savings Rate',
        formula: '(Net Cash Flow / Total Inflow) × 100%',
        meaning: 'What percentage of your income you actually kept. A healthy savings rate is 20%+. Below 10% is a warning sign.',
        example: '(₹25,000 / ₹1,00,000) × 100 = 25% savings rate',
        color: '#7c3aed',
        tags: ['dashboard', 'health'],
        note: 'Target: ≥20% is excellent, 10–20% is moderate, <10% needs attention.',
      },
      {
        term: 'Consolidated Net Worth (All Time)',
        formula: 'SUM of all credits across all accounts − SUM of all debits across all accounts',
        meaning: 'When you select "All Time" with no date filter, the dashboard shows the total net cash that has ever passed through all your linked accounts combined. This is NOT your actual net worth (which includes FDs, investments, property) — it\'s just the bank transaction net. For real net worth, go to the Net Worth page.',
        example: 'All-time credits ₹50,00,000 − All-time debits ₹38,00,000 = ₹12,00,000 net cash through accounts',
        color: '#2563eb',
        tags: ['dashboard', 'all-time'],
      },
      {
        term: 'Category Spend Breakdown',
        formula: 'SUM of debit amounts grouped by tag/category',
        meaning: 'How your outflow is split across categories like Food, Rent, EMI, Shopping etc. Calculated from the tags attached to each transaction by the rules engine or AI.',
        color: '#0891b2',
        tags: ['dashboard', 'categories'],
      },
    ],
  },
  {
    id: 'networth',
    icon: TrendingUp,
    color: '#16a34a',
    title: 'Net Worth Calculations',
    description: 'How every number on the Net Worth page is computed.',
    items: [
      {
        term: 'Net Worth',
        formula: 'Total Assets − Total Liabilities',
        meaning: 'Your true financial position — what you\'d be left with if you sold everything and paid off all debts TODAY.',
        example: 'Assets ₹85,00,000 − Liabilities ₹42,00,000 = Net Worth ₹43,00,000',
        color: '#2563eb',
        tags: ['net worth', 'key metric'],
      },
      {
        term: 'Total Assets',
        formula: 'Bank Balance + FD Current Value + Investment Value + Physical Asset Value',
        meaning: 'Everything you OWN that has monetary value.',
        color: '#16a34a',
        tags: ['net worth', 'assets'],
      },
      {
        term: 'FD Current Value (Compound Interest)',
        formula: 'P × (1 + r/n)^(n×t)',
        meaning: 'How much your Fixed Deposit is worth RIGHT NOW, including all interest accrued since the start date. The app calculates this live — it doesn\'t wait for maturity.',
        example: 'P=₹2,00,000, r=7.1%, n=4 (quarterly), t=1.5 years → ₹2,22,178',
        color: '#16a34a',
        tags: ['net worth', 'FD', 'formula'],
        note: 'P = Principal, r = Annual rate (decimal), n = Compounding periods/year, t = Time in years. For "simple" compounding: P × (1 + r×t).',
      },
      {
        term: 'Loan Outstanding Balance',
        formula: 'EMI × [1 − (1+r)^(−n)] / r',
        meaning: 'What you still OWE on a loan right now — calculated from the EMI, the monthly interest rate, and the number of months remaining. This decreases every month as you pay EMIs.',
        example: 'EMI=₹44,091, r=9%/12=0.75%/mo, remaining=210 months → ~₹43,80,000 outstanding',
        color: '#dc2626',
        tags: ['net worth', 'loans', 'formula'],
        note: 'r = Monthly interest rate (annual rate ÷ 12), n = Remaining months. This is the standard loan amortization formula used by all banks.',
      },
      {
        term: 'Total Liabilities',
        formula: 'Loan Outstanding + Credit Card Dues',
        meaning: 'Everything you OWE. This is subtracted from assets to get your net worth.',
        color: '#dc2626',
        tags: ['net worth', 'liabilities'],
      },
      {
        term: 'Debt-to-Asset Ratio',
        formula: '(Total Liabilities / Total Assets) × 100%',
        meaning: 'What percentage of your assets are financed by debt. Below 40% is considered healthy. Above 60% is a warning sign.',
        example: 'Liabilities ₹42L / Assets ₹85L = 49.4% debt-to-asset ratio',
        color: '#d97706',
        tags: ['net worth', 'health', 'formula'],
        note: 'A home loan is "good debt" (appreciating asset). Credit card debt is "bad debt" (depreciating). Track them separately.',
      },
      {
        term: 'Financial Health Score',
        formula: 'Emergency Fund (25%) + Debt-to-Asset (35%) + Net Worth Growth (20%) + Diversification (20%)',
        meaning: 'A composite score from 0–100 that measures the health of your financial situation across four dimensions.',
        color: '#7c3aed',
        tags: ['net worth', 'health score'],
        note: 'Emergency Fund: How many months of expenses you have in bank / 6 months target. Debt-to-Asset: (1 − debt%) × 100. Net Worth Growth: Positive = 75pts, Negative = 25pts. Diversification: 25 points per asset class tracked (max 100).',
      },
      {
        term: 'Goal Monthly Savings Needed',
        formula: '(Target − Current) / Months Until Target Date',
        meaning: 'How much you need to save EVERY MONTH to reach your goal on time.',
        example: 'Goal ₹5,00,000, Saved ₹1,20,000, 18 months left → need ₹21,111/month',
        color: '#0891b2',
        tags: ['goals', 'formula'],
      },
    ],
  },
  {
    id: 'duplicates',
    icon: AlertTriangle,
    color: '#d97706',
    title: 'Duplicate & Transfer Detection',
    description: 'How the app detects if you\'re importing something you already have, or if two entries are actually the same inter-account transfer.',
    items: [
      {
        term: '🔴 Likely Duplicate (Confidence ≥ 85%)',
        formula: 'Same amount + same ref_no OR same UPI VPA + within 3 days',
        meaning: 'Very high confidence that this imported row already exists in your database. The "auto-skip duplicates" option is turned ON by default — these rows will not be imported again.',
        color: '#dc2626',
        tags: ['import', 'detection'],
        note: 'Reference number (ref_no) is the UTR/IMPS/NEFT reference. If two rows share the same reference number and amount, they are almost certainly the same transaction.',
      },
      {
        term: '🟡 Possible Duplicate (Confidence 60–85%)',
        formula: 'Same amount + within 3 days + narration similarity > 70%',
        meaning: 'Could be a duplicate — same amount around the same date with a similar description. You should review these manually.',
        color: '#d97706',
        tags: ['import', 'detection'],
      },
      {
        term: 'Narration Similarity Score',
        formula: 'Trigram overlap between two normalized narration strings',
        meaning: 'Two descriptions are compared character by character using 3-character sliding windows. "UPI-Swiggy-food" and "UPI-Swiggy-order" share many 3-grams and score high similarity. Random strings score near zero.',
        color: '#d97706',
        tags: ['import', 'detection', 'formula'],
        note: 'Both strings are lowercased and stripped of special characters before comparison. This makes "HDFC UPI 123" and "hdfc-upi/123" match correctly.',
      },
      {
        term: '↔ Internal Transfer',
        formula: 'Debit in Account A = Credit in Account B ± ₹0.01, within 3 days',
        meaning: 'When ₹50,000 leaves your HDFC account and ₹50,000 enters your SBI account within 3 days — the app detects this as an internal transfer. These should NOT count as income or expense, as no money left your household.',
        example: 'HDFC debit ₹50,000 on Oct 1 + SBI credit ₹50,000 on Oct 2 → flagged as Transfer',
        color: '#2563eb',
        tags: ['import', 'transfer', 'detection'],
        note: 'In the future: tag both sides as "Transfer" so they cancel each other out in your Income/Expense totals.',
      },
      {
        term: 'Transaction Fingerprint',
        formula: 'account_id | date | amount | type | ref_no (or first 30 chars of narration)',
        meaning: 'A unique identifier built from the key fields of a transaction. If a fingerprint already exists in the database, the insert is skipped — preventing silent duplicates even if the UI check is bypassed.',
        color: '#64748b',
        tags: ['import', 'database'],
      },
    ],
  },
  {
    id: 'tags',
    icon: Target,
    color: '#7c3aed',
    title: 'Automatic Categorization',
    description: 'How your transactions get categorized automatically.',
    items: [
      {
        term: 'Custom Categorization Rules',
        formula: 'IF description CONTAINS "swiggy" THEN tag = "food"',
        meaning: 'Rules you create that match keywords in the description or UPI ID. When a transaction matches, the tag is applied automatically. You can manage rules in the Tags & Rules page.',
        color: '#7c3aed',
        tags: ['tags', 'categories'],
        note: 'Rules give you complete control over how each merchant or spend type is categorized.',
      },
      {
        term: 'Smart Category Suggestions',
        formula: 'Matches common merchant types to your category list',
        meaning: 'For transactions without a specific rule, the system suggests the most accurate category based on the merchant name and narration.',
        color: '#0891b2',
        tags: ['tags', 'smart-tagging', 'categories'],
      },
      {
        term: 'UPI VPA Parsing',
        formula: 'Regex on description: UPI-<Name>-<VPA>-<Remark>',
        meaning: 'UPI transactions have a structured description format. The app extracts the VPA (e.g. swiggy@icici) and merchant name from it, which improves matching accuracy significantly.',
        example: '"UPI-SWIGGY-swiggy@icici-Order#98765" → VPA: swiggy@icici, Name: SWIGGY',
        color: '#64748b',
        tags: ['tags', 'upi'],
      },
    ],
  },
  {
    id: 'analytics',
    icon: TrendingDown,
    color: '#0891b2',
    title: 'Analytics & Charts',
    description: 'What each chart and analytics metric means.',
    items: [
      {
        term: 'Monthly Income vs Expense Bar Chart',
        formula: 'Monthly SUM of credits (Income) and debits (Expense) grouped by YYYY-MM',
        meaning: 'Shows how your income and spending pattern changed month over month. Bars above zero = income, bars below = expense. Useful for spotting seasonal spikes.',
        color: '#0891b2',
        tags: ['analytics', 'chart'],
      },
      {
        term: 'Cumulative Net Flow Chart',
        formula: 'Running total: this month net + all previous months\' nets',
        meaning: 'The running sum of your net flow. If this line goes up, your bank balance is growing. If it goes down, you\'re spending more than you earn over time.',
        color: '#2563eb',
        tags: ['analytics', 'chart'],
      },
      {
        term: 'Category Distribution (Donut)',
        formula: '(Category spend / Total spend) × 100%',
        meaning: 'Shows what fraction of your total spending went to each category. Helps identify your biggest expense buckets.',
        color: '#7c3aed',
        tags: ['analytics', 'chart'],
      },
    ],
  },
  {
    id: 'accounts',
    icon: Building2,
    color: '#64748b',
    title: 'Account & Balance Concepts',
    description: 'Understanding how account balances work in A-Count.',
    items: [
      {
        term: 'Balance After (Ledger Balance)',
        formula: 'The balance column in your bank statement',
        meaning: 'The account balance as reported by your bank after each transaction. This is what the bank shows you — it includes float (pending cheques, etc.). Imported directly from your statement.',
        color: '#64748b',
        tags: ['accounts', 'balance'],
      },
      {
        term: 'Statement Balance vs. Available Cash',
        formula: 'Statement Balance − Pending Outflows',
        meaning: 'The "ghost balance" problem: your statement says ₹1,00,000 but you wrote a ₹40,000 cheque yesterday that hasn\'t cleared. Your real available cash is ₹60,000. A-Count shows the statement balance as imported — always factor in pending items.',
        color: '#d97706',
        tags: ['accounts', 'balance', 'warning'],
        note: 'Future feature: manual "pending" flag for outflows that haven\'t cleared yet.',
      },
      {
        term: 'Multi-Account Aggregation',
        formula: 'SELECT DISTINCT ON (account_id) balance_after FROM transactions ORDER BY date DESC',
        meaning: 'To get your total bank balance across all accounts, the app takes the LAST known balance from each account\'s statement and adds them together. This only works if you\'ve imported recent statements for all accounts.',
        color: '#64748b',
        tags: ['accounts', 'aggregation'],
      },
    ],
  },
]

const allTags = Array.from(new Set(sections.flatMap(s => s.items.flatMap(i => i.tags)))).sort()

// ─── Component ──────────────────────────────────────────────────────────────

export default function GlossaryClient() {
  const [search, setSearch] = useState('')
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const filtered = sections.map(section => ({
    ...section,
    items: section.items.filter(item => {
      const matchesSearch = !search || [item.term, item.meaning, item.formula || ''].some(s => s.toLowerCase().includes(search.toLowerCase()))
      const matchesSection = !activeSection || section.id === activeSection
      const matchesTag = !activeTag || item.tags.includes(activeTag)
      return matchesSearch && matchesSection && matchesTag
    }),
  })).filter(s => s.items.length > 0)

  const totalShowing = filtered.reduce((s, sec) => s + sec.items.length, 0)

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Glossary & Calculations</h1>
          <p className="page-subtitle">Every metric, formula, and data point in A-Count — explained simply.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          <BookOpen size={13} />
          {sections.reduce((s, sec) => s + sec.items.length, 0)} terms explained
        </div>
      </div>

      {/* Search + Filters */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              style={{ paddingLeft: 30, height: 34, fontSize: 12 }}
              placeholder="Search terms, formulas…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {/* Section filters */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button className={`filter-chip ${!activeSection ? 'active' : ''}`} onClick={() => setActiveSection(null)}>All</button>
            {sections.map(s => (
              <button key={s.id} className={`filter-chip ${activeSection === s.id ? 'active' : ''}`} onClick={() => setActiveSection(activeSection === s.id ? null : s.id)}>
                {s.title.split(' ')[0]}
              </button>
            ))}
          </div>
          {(search || activeSection || activeTag) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setActiveSection(null); setActiveTag(null) }} style={{ fontSize: 11 }}>
              Clear
            </button>
          )}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
          Showing <strong style={{ color: 'var(--text-primary)' }}>{totalShowing}</strong> terms
        </div>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filtered.map(section => {
          const SectionIcon = section.icon
          return (
            <div key={section.id} className="table-container">
              {/* Section Header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#fcfdfe' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 'var(--radius)', background: `${section.color}14`, color: section.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SectionIcon size={15} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{section.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>{section.description}</div>
                  </div>
                </div>
                <div>
                  <Link
                    href={
                      section.id === 'dashboard' ? '/' :
                      section.id === 'networth' || section.id === 'fds' || section.id === 'loans' ? '/networth' :
                      section.id === 'tags' || section.id === 'rules' ? '/tags' :
                      section.id === 'statements' ? '/import' : '/transactions'
                    }
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 11 }}
                  >
                    Open App Feature <ArrowRight size={11} />
                  </Link>
                </div>
              </div>

              {/* Terms */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {section.items.map((item, i) => (
                  <div key={i} style={{
                    padding: '16px 20px',
                    borderBottom: i < section.items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    borderLeft: `3px solid ${item.color}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Term name */}
                        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6, color: 'var(--text-primary)' }}>{item.term}</div>

                        {/* Formula box */}
                        {item.formula && (
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', marginBottom: 8, color: item.color, fontWeight: 600, overflowX: 'auto', whiteSpace: 'nowrap' }}>
                            <Calculator size={11} style={{ marginRight: 5, verticalAlign: 'middle', opacity: 0.7 }} />
                            {item.formula}
                          </div>
                        )}

                        {/* Plain English meaning */}
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: item.example || item.note ? 8 : 0 }}>
                          {item.meaning}
                        </div>

                        {/* Example */}
                        {item.example && (
                          <div style={{ fontSize: 11.5, background: 'var(--green-subtle)', border: '1px solid var(--green-border)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', marginBottom: 8, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
                            Example: {item.example}
                          </div>
                        )}

                        {/* CFO note */}
                        {item.note && (
                          <div style={{ fontSize: 11.5, background: 'var(--accent-subtle)', border: '1px solid var(--accent-dim)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', color: 'var(--accent)', lineHeight: 1.5 }}>
                            💡 {item.note}
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                        {item.tags.map(tag => (
                          <button
                            key={tag}
                            className={`tag-pill ${activeTag === tag ? 'active' : ''}`}
                            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                            style={{ cursor: 'pointer', fontSize: 10 }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          <BookOpen size={28} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <div style={{ fontWeight: 600 }}>No terms found</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Try a different search term</div>
        </div>
      )}
    </div>
  )
}
