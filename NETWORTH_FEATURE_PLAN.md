# A-Count: Deep Feature Bible — FD, Loans, Assets & Net Worth UI
> Every field, every edge case, every UI detail — written like a real fintech product spec, not generic AI output.
> Design inspiration: **Mercury, CRED, Fi.money, Zerodha Kite, Groww**

---

## PART 1: FIXED DEPOSITS — Full Feature Depth

### Every field we need to track

```
╔══════════════════════════════════════════════════════════════╗
║  FIXED DEPOSIT — Full Data Model                             ║
╠══════════════════════════════════════════════════════════════╣
║  Core Identity                                               ║
║  ─────────────                                               ║
║  Bank Name              HDFC / SBI / ICICI (free text)       ║
║  Branch / IFSC          Optional                             ║
║  FD Account Number      Optional (for reference)             ║
║  Nickname               e.g. "Emergency FD", "Trip FD"       ║
║                                                              ║
║  Financial Terms                                             ║
║  ────────────────                                            ║
║  Principal Amount       ₹2,00,000                            ║
║  Interest Rate          7.10% p.a.                           ║
║  Compounding Frequency  Monthly / Quarterly / Half-Yearly    ║
║  Interest Payout Type   Cumulative (at maturity)             ║
║                         Non-Cumulative (periodic payouts)    ║
║                                                              ║
║  Dates                                                       ║
║  ──────                                                      ║
║  Start Date             01 Jan 2024                          ║
║  Maturity Date          01 Jan 2026  (auto-calc tenure)      ║
║  Tenure                 24 months  (auto-derived)            ║
║  Auto-Renewal?          Yes / No                             ║
║  Renewal Tenor          Same / Custom                        ║
║                                                              ║
║  Tax & Nomination                                            ║
║  ─────────────────                                           ║
║  Is Senior Citizen?     Yes → Rate gets +0.5% bump           ║
║  TDS Applicable?        Yes (if interest > ₹40,000/yr)       ║
║  Form 15G/H Submitted?  Yes / No                             ║
║  Nominee Name           Optional                             ║
║                                                              ║
║  Premature Withdrawal                                        ║
║  ────────────────────                                        ║
║  Penalty Rate           Usually -0.5% to -1%                 ║
║  → App shows: "If you break today, you get ₹X"               ║
║                                                              ║
║  Status                                                      ║
║  ──────                                                      ║
║  active / matured / broken / renewed                         ║
╚══════════════════════════════════════════════════════════════╝
```

### Auto-Calculated Values (what the app computes for you)

| What | How | Example |
|:---|:---|:---|
| **Current Value** | Compound interest formula | ₹2,14,518 |
| **Interest Earned So Far** | Current Value − Principal | ₹14,518 |
| **Days to Maturity** | Maturity Date − Today | 91 days |
| **Annualised Effective Yield** | Effective rate after compounding | 7.31% |
| **TDS Deducted This Year** | 10% of interest if no 15G | ₹1,452 |
| **Break Value (if broken today)** | At penalty rate | ₹2,13,018 |
| **Monthly Interest Accrual** | For non-cumulative FDs | ₹1,183/mo |

### FD Screen Layouts

```
┌─────────────────────────────────────────────────────────────┐
│  Fixed Deposits                        + New FD    [Filter] │
├─────────────────────────────────────────────────────────────┤
│  Total FD Corpus:  ₹8,00,000    Interest Earned: ₹32,450   │
│  Maturing This Month: ₹2,00,000 ← amber alert badge        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🏦 HDFC Bank FD          "Emergency Fund"     ACTIVE │  │
│  │                                                      │  │
│  │  ₹2,14,518              +₹14,518  (+7.26% eff.)      │  │
│  │  Current Value           Interest so far              │  │
│  │                                                      │  │
│  │  ████████████████████░░░░░░  83% through tenure      │  │
│  │  Start: 01 Jan 2024          Matures: 01 Jan 2026    │  │
│  │                              ⏰ 91 days left          │  │
│  │                                                      │  │
│  │  Rate: 7.1% p.a. Quarterly   Principal: ₹2,00,000    │  │
│  │  [Break FD → ₹2,13,018]               [View Details] │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🏦 SBI FD               "Vacation 2025"      ACTIVE  │  │
│  │  ₹1,08,240              +₹8,240   (+7.10%)           │  │
│  │  ████████████░░░░░░░░░░  52% through tenure          │  │
│  │  Matures: 15 Mar 2025    ⏰ 164 days left             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ──── Maturity Timeline ──────────────────────────────────  │
│  Jan 2025  ▌₹2,00,000 HDFC matures                         │
│  Mar 2025  ▌₹1,00,000 SBI matures                          │
│  Jun 2025  ▌₹5,00,000 ICICI matures                        │
└─────────────────────────────────────────────────────────────┘
```

---

## PART 2: LOANS — Full Feature Depth

### Every field we need to track

```
╔══════════════════════════════════════════════════════════════╗
║  LOAN — Full Data Model                                      ║
╠══════════════════════════════════════════════════════════════╣
║  Identity                                                    ║
║  ────────                                                    ║
║  Loan Type       home | car | personal | education |         ║
║                  business | gold | lap (loan against prop)   ║
║  Lender Name     SBI Home Loans / HDFC Bank                  ║
║  Loan Account No Optional                                    ║
║  Nickname        "Our Home Loan" / "Honda City"              ║
║                                                              ║
║  Core Terms                                                  ║
║  ───────────                                                 ║
║  Loan Amount (Sanctioned)    ₹50,00,000                      ║
║  Disbursed Amount            ₹50,00,000                      ║
║  Disbursement Date           01 Mar 2022                     ║
║  Interest Rate (ROI)         8.75% p.a.                      ║
║  Rate Type                   Fixed / Floating (MCLR/EBLR)   ║
║  Linked Benchmark            EBLR + Spread (for floating)    ║
║  Tenure                      240 months                      ║
║  EMI Amount                  ₹44,091                         ║
║  EMI Day                     5th of every month              ║
║                                                              ║
║  Rate Change History                                         ║
║  ────────────────────                                        ║
║  e.g.  8.40% from Mar 2022                                   ║
║        8.75% from Nov 2022 (RBI hike)                        ║
║        9.00% from Feb 2023 (RBI hike)                        ║
║  → App re-calculates amortization from each change date      ║
║                                                              ║
║  Current Status                                              ║
║  ──────────────                                              ║
║  Outstanding Principal       ₹46,72,000 (auto-calculated)   ║
║  Total Interest Paid so far  ₹4,20,000  (auto-calculated)   ║
║  Total Principal Paid        ₹3,28,000  (auto-calculated)   ║
║  EMIs Paid                   38 of 240  (auto-calculated)   ║
║  Remaining Tenure            202 months  (auto-calculated)  ║
║                                                              ║
║  Insurance (for home/car loans)                              ║
║  ──────────────────────────────                              ║
║  Loan Insurance Linked?  Yes/No                              ║
║  Insurance Premium       ₹15,000/yr                          ║
║                                                              ║
║  Prepayment Planner                                          ║
║  ──────────────────                                          ║
║  Extra Payment Amount    ₹50,000                             ║
║  → Shows: You save ₹X in interest, close N months early      ║
║                                                              ║
║  Status                                                      ║
║  ──────                                                      ║
║  active / closed / foreclosed / sold                         ║
╚══════════════════════════════════════════════════════════════╝
```

### Loan Screen Layouts

```
┌─────────────────────────────────────────────────────────────┐
│  Loans & Liabilities                       + Add Loan       │
├─────────────────────────────────────────────────────────────┤
│  Total Outstanding: ₹52,00,000   EMI This Month: ₹56,341   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🏠 Home Loan — SBI       "Our Home"           ACTIVE │  │
│  │                                                      │  │
│  │  ₹46,72,000 outstanding       38/240 EMIs paid       │  │
│  │                                                      │  │
│  │  Principal ████░░░░░░░░░░░░░░░░░░  16% repaid        │  │
│  │                                                      │  │
│  │  EMI: ₹44,091   Rate: 9.00% (Floating/EBLR)         │  │
│  │  Next EMI: 05 Oct 2024    ← 3 days away badge        │  │
│  │                                                      │  │
│  │  Interest paid so far: ₹4,20,000                     │  │
│  │  Principal paid so far: ₹3,28,000                    │  │
│  │                                                      │  │
│  │  [Prepayment Calculator]  [Amortization Table]       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ── Amortization Chart (first 3 years shown) ────────────  │
│                                                             │
│  100%│████████████████████████  ← Interest portion         │
│   75%│                                                     │
│   50%│                                                     │
│   25%│░░░░░░░░░░░░░░░░░░░░░░░░  ← Principal portion        │
│    0%└────────────────────────────────                     │
│       Yr1   Yr2   Yr3  ...  Yr20                           │
│                                                             │
│  (Principal grows, Interest shrinks over time)              │
└─────────────────────────────────────────────────────────────┘
```

### Prepayment Calculator (Super Useful Feature)

```
┌──────────────────────────────────────────────────────┐
│  💡 Prepayment Planner — Home Loan (SBI)             │
│                                                      │
│  Extra amount to pay now:  [₹ 1,00,000         ]    │
│                                                      │
│  Before Prepayment          After Prepayment         │
│  ─────────────────          ─────────────            │
│  Remaining: 202 months  →   191 months               │
│  Close by: Jan 2041     →   Feb 2040                 │
│  Interest left: ₹64.2L  →   ₹59.8L                  │
│                                                      │
│  ✅ You SAVE ₹4,40,000 in interest                   │
│  ✅ You close 11 months EARLY                        │
│                                                      │
│  [Make Prepayment]                                   │
└──────────────────────────────────────────────────────┘
```

---

## PART 3: FULL ASSET UNIVERSE — Beyond Just FDs

### Every asset type India actually uses

```
CATEGORY 1: BANK & CASH
  ✅ Savings Account        (already in app)
  ✅ Current Account        (already in app)
  🆕 Fixed Deposit (FD)
  🆕 Recurring Deposit (RD)  ← monthly deposits, grows over time
  🆕 Liquid Funds            ← better-than-savings returns

CATEGORY 2: INVESTMENTS
  🆕 Mutual Funds
      - Equity (large cap, mid cap, small cap, ELSS)
      - Debt (liquid, ultra short, gilt)
      - Hybrid
      Track: Units, NAV, Invested, Current Value, XIRR
  🆕 Direct Stocks / Shares
      - BSE/NSE listed
      Track: Quantity, Avg Buy Price, CMP, P&L %
  🆕 US Stocks / ETFs
      - Via Vested/IndMoney
      Track: Amount in USD, current value, FX rate effect

CATEGORY 3: GOVERNMENT SCHEMES (HUGE for India)
  🆕 PPF (Public Provident Fund)
      - ₹1.5L max per year, 15-year lock
      - Interest rate announced quarterly
  🆕 EPF (Employee Provident Fund)
      - Auto-deducted from salary
      - Track: Employee contribution, Employer contribution, Balance
  🆕 NPS (National Pension System)
      - Tier 1 (pension) + Tier 2 (flexible)
  🆕 SSY (Sukanya Samriddhi Yojana)
      - For girl child, excellent interest rate
  🆕 NSC (National Savings Certificate)
      - Like an FD but from post office

CATEGORY 4: GOLD & PRECIOUS METALS
  🆕 Physical Gold / Jewellery
      - Weight in grams, purity (22K/24K)
      - Current value = grams × MCX rate (manual/API)
  🆕 Sovereign Gold Bonds (SGBs)
      - Government bonds, 8-year tenure
      - Extra 2.5% interest + capital gain exemption
  🆕 Digital Gold (via Groww, PhonePe)
  🆕 Gold ETFs / Gold Funds

CATEGORY 5: REAL ESTATE & PHYSICAL ASSETS
  🆕 Property / Flat / Plot
      - Market value (user-entered, periodic update)
      - Linked EMI if under loan
  🆕 Vehicle
      - Car, Bike, Commercial Vehicle
      - Market value depreciates ~15% per year
      - Linked EMI if under loan
  🆕 REITs (Real Estate Investment Trusts)
      - Listed on NSE, liquid like stocks

CATEGORY 6: ALTERNATIVE / OTHERS
  🆕 Startup Investments / Angel
  🆕 Crypto (Bitcoin, ETH etc.)
      - Manual entry or Coingecko price
  🆕 Unlisted Shares / ESOP
  🆕 Loans Given (money you lent to others)
      - Track: Who, Amount, Expected Return Date
```

### Full Liabilities Universe

```
CATEGORY 1: SECURED LOANS (asset-backed)
  🆕 Home Loan
  🆕 Car / Vehicle Loan
  🆕 Loan Against Property (LAP)
  🆕 Gold Loan

CATEGORY 2: UNSECURED LOANS
  🆕 Personal Loan
  🆕 Education Loan
  🆕 Business / MSME Loan

CATEGORY 3: REVOLVING CREDIT
  🆕 Credit Card Outstanding
      - Card limit, current used, minimum due, due date
      - Utilization % (keep below 30%)
  🆕 Overdraft Facility
      - OD limit, used amount

CATEGORY 4: INFORMAL
  🆕 Money Borrowed from Friends/Family
      - Who, amount, agreed return date
  🆕 BNPL / Buy Now Pay Later
      - Simpl, LazyPay, Amazon Pay Later, ZestMoney

CATEGORY 5: TAX LIABILITIES
  🆕 Advance Tax Due
  🆕 TDS Outstanding
  🆕 GST Payable (for business users)
```

---

## PART 4: UI DESIGN SYSTEM — What Makes it Feel Real, Not "AI"

> These are design principles from real fintech products (Mercury, CRED, Fi.money).
> The goal: every screen feels intentional, every number has purpose, zero decorative elements.

### Design Principle 1: The Number is the Hero

Every card starts with ONE big number. Everything else is supporting context.

```
GOOD (Mercury-style):                 BAD (AI-style):
──────────────────────                ─────────────────
  ₹38,72,450                         ┌──────────────────┐
  Net Worth                           │  💰 Net Worth    │
  ▲ +₹1.2L this month                 │  ─────────────── │
                                      │  Your total net  │
                                      │  worth is:       │
                                      │  ₹38,72,450      │
                                      └──────────────────┘
```

### Design Principle 2: Color Has Meaning, Not Decoration

```css
/* Only 5 colors used across the whole app */
--positive:    #16a34a;   /* green  — things growing, gains, credits */
--negative:    #dc2626;   /* red    — losses, debts, overdue */
--warning:     #d97706;   /* amber  — approaching limit, maturing soon */
--neutral:     #64748b;   /* slate  — transfers, informational */
--accent:      #2563eb;   /* blue   — primary actions, interactive elements */

/* Everything else is greyscale */
```

### Design Principle 3: Cards Have Consistent Anatomy

Every data card follows exactly this structure — no exceptions:

```
┌────────────────────────────────────────────┐
│ LABEL / CONTEXT                  [badge]   │  ← 11px, --text-muted, uppercase
│                                            │
│ ₹ XX,XX,XXX                                │  ← 28px, --text-primary, JetBrains Mono
│                                            │
│ ── Sub-metric 1    ── Sub-metric 2         │  ← 12px supporting data
│                                            │
│ [Primary Action]              [Secondary]  │  ← always at the bottom
└────────────────────────────────────────────┘
```

### Design Principle 4: Micro-interactions (what makes it feel alive)

```
1. Number Roll Animation:
   When a page loads or data refreshes, numbers count up from 0 to their final
   value over 600ms. Like a slot machine landing on the right number.
   → Effect: Feels dynamic, not static.

2. Progress Bar Fill:
   Loan repaid % bars animate from 0% → actual % on mount.
   FD tenure bars do the same.
   → Duration: 800ms, ease-out-cubic.

3. Card Hover Lift:
   transform: translateY(-2px) + shadow-md on hover.
   → Makes cards feel like physical objects you can pick up.

4. Status Badge Pulse:
   "Maturing in 7 days" badge has a subtle amber pulse animation.
   "EMI Due Tomorrow" badge pulses red.
   → Draws the eye without being annoying.

5. Net Worth Change Arrow:
   ▲ +₹1,24,500  — Green with upward slide-in on load.
   ▼ -₹22,000    — Red with downward slide-in on load.
```

### Design Principle 5: Data Density Levels (3 views for every screen)

```
COMPACT VIEW (default on mobile):
  FD Card = 1 row, just name + current value + maturity date

STANDARD VIEW (default on desktop):
  FD Card = Full card with progress bar + key metrics

DETAIL VIEW (click to expand):
  Full breakdown: amortization table, interest calendar, tax computation
```

### Design Principle 6: Empty States Are Useful, Not Sad

```
GOOD Empty State (Fi.money approach):
─────────────────────────────────────
  No FDs tracked yet.

  Indian households hold ~₹80L crore in FDs.
  Start tracking yours to see maturity timelines
  and tax implications.

  [+ Add your first FD]   [Import from DigiLocker]

BAD Empty State (AI approach):
──────────────────────────────
  🏦  No data found.
  Click here to add Fixed Deposits.
```

---

## PART 5: THE NET WORTH COCKPIT — Full Layout Design

This is the flagship page. Every number lives here.

```
┌─────────────────────────────────────────────────────────────────┐
│ NET WORTH                                    As of 02 Oct 2024  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                  ₹ 38,72,450                                    │
│                  ▲ +₹1,24,500 since last month (+3.3%)          │
│                                                                 │
│         ₹85,72,450 ASSETS    −    ₹47,00,000 LIABILITIES        │
│                                                                 │
├────────────────────────────┬────────────────────────────────────┤
│ ASSET ALLOCATION           │ LIABILITY BREAKDOWN                │
│                            │                                    │
│ ██████████ Real Estate 70% │ ████████████████ Home Loan    99%  │
│ ████░░░░░░ MF & Stocks 14% │ ░░░░░░░░░░░░░░░░ Credit Card   1%  │
│ ██░░░░░░░░ FDs          7% │                                    │
│ █░░░░░░░░░ Gold         5% │                                    │
│ █░░░░░░░░░ Bank         4% │                                    │
│                            │                                    │
├────────────────────────────┴────────────────────────────────────┤
│ NET WORTH HISTORY                              [1M 3M 6M 1Y All]│
│                                                                 │
│  40L│                                              ●───────●   │
│  38L│                              ●───────●                    │
│  35L│              ●───────●                                    │
│  30L│  ●───────●                                                │
│     └──────────────────────────────────────────────────────     │
│      Apr    May    Jun    Jul    Aug    Sep    Oct              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ UPCOMING EVENTS (next 30 days)                                  │
│                                                                 │
│  📅 05 Oct  EMI Due        Home Loan SBI       ₹44,091          │
│  📅 10 Oct  EMI Due        Car Loan HDFC       ₹12,250          │
│  ⏰ 01 Jan  FD Matures     HDFC FD             ₹2,14,518        │
│  🎯 Goal    Emergency Fund  Progress: 64%      ₹1,80,000 left   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ FINANCIAL HEALTH SCORE                                          │
│                                                                 │
│  ████████████████████████░░░░░░░   72 / 100    GOOD            │
│                                                                 │
│  ✅ Emergency Fund: 4.2 months covered  (target: 6)            │
│  ✅ Savings Rate: 34%                   (target: 20%+)         │
│  ⚠️  Debt-to-Asset: 55%                 (target: below 50%)    │
│  ✅ Investments: Diversified across 4 classes                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## PART 6: NEW DATABASE SCHEMA (Complete)

Run this in Neon Console → SQL Editor after your existing schema:

```sql
-- ─── Recurring Deposits ───────────────────────────────────────────
CREATE TABLE fixed_deposits (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname           TEXT,
  bank_name          TEXT NOT NULL,
  account_number     TEXT,
  principal          NUMERIC(14,2) NOT NULL,
  rate               NUMERIC(6,3) NOT NULL,
  compounding        TEXT NOT NULL DEFAULT 'quarterly'
                     CHECK (compounding IN ('monthly','quarterly','half_yearly','annually','simple')),
  payout_type        TEXT NOT NULL DEFAULT 'cumulative'
                     CHECK (payout_type IN ('cumulative','monthly','quarterly')),
  start_date         DATE NOT NULL,
  maturity_date      DATE NOT NULL,
  is_senior_citizen  BOOLEAN DEFAULT false,
  penalty_rate       NUMERIC(5,3) DEFAULT 0.5,
  form_15g_submitted BOOLEAN DEFAULT false,
  auto_renewal       BOOLEAN DEFAULT false,
  renewal_tenor_months INT,
  linked_account_id  UUID REFERENCES accounts(id),
  notes              TEXT,
  status             TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','matured','broken','renewed')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Loans ────────────────────────────────────────────────────────
CREATE TABLE loans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname            TEXT,
  loan_type           TEXT NOT NULL
                      CHECK (loan_type IN ('home','car','personal','education','business','gold','lap','other')),
  lender_name         TEXT NOT NULL,
  loan_account_no     TEXT,
  original_amount     NUMERIC(14,2) NOT NULL,
  disbursement_date   DATE NOT NULL,
  roi                 NUMERIC(6,3) NOT NULL,
  rate_type           TEXT NOT NULL DEFAULT 'fixed'
                      CHECK (rate_type IN ('fixed','floating')),
  tenure_months       INT NOT NULL,
  emi_amount          NUMERIC(14,2) NOT NULL,
  emi_day             INT CHECK (emi_day BETWEEN 1 AND 31),
  linked_account_id   UUID REFERENCES accounts(id),
  insurance_linked    BOOLEAN DEFAULT false,
  insurance_premium   NUMERIC(14,2),
  notes               TEXT,
  status              TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','closed','foreclosed')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Loan Rate Change History ──────────────────────────────────────
CREATE TABLE loan_rate_changes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id    UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  new_roi    NUMERIC(6,3) NOT NULL,
  new_emi    NUMERIC(14,2),
  effective_from DATE NOT NULL,
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Investments ──────────────────────────────────────────────────
CREATE TABLE investments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  type             TEXT NOT NULL
                   CHECK (type IN (
                     'mutual_fund','stock','us_stock','gold_physical',
                     'sgb','gold_etf','digital_gold','ppf','epf','nps',
                     'ssy','nsc','reit','crypto','unlisted','angel','other'
                   )),
  folio_or_account TEXT,
  units            NUMERIC(18,6),
  avg_buy_price    NUMERIC(14,4),
  invested_amount  NUMERIC(14,2) NOT NULL,
  current_value    NUMERIC(14,2) NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'INR',
  exchange_rate    NUMERIC(10,4) DEFAULT 1,
  notes            TEXT,
  last_updated_at  TIMESTAMPTZ DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Physical Assets (Real Estate, Vehicles) ──────────────────────
CREATE TABLE physical_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  type            TEXT NOT NULL
                  CHECK (type IN ('property','vehicle','jewellery','other')),
  purchase_value  NUMERIC(14,2) NOT NULL,
  purchase_date   DATE,
  current_value   NUMERIC(14,2) NOT NULL,
  depreciation_rate NUMERIC(5,2) DEFAULT 0,
  linked_loan_id  UUID REFERENCES loans(id),
  notes           TEXT,
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Gold Holdings ─────────────────────────────────────────────────
CREATE TABLE gold_holdings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('physical','sgb','etf','digital')),
  weight_grams NUMERIC(10,3),
  purity      TEXT DEFAULT '24K',
  purchase_price_per_gram NUMERIC(10,2),
  current_price_per_gram  NUMERIC(10,2),
  purchase_date DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Money Lent to Others ──────────────────────────────────────────
CREATE TABLE money_lent (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_name  TEXT NOT NULL,
  amount         NUMERIC(14,2) NOT NULL,
  lent_date      DATE NOT NULL,
  expected_return_date DATE,
  is_interest_bearing BOOLEAN DEFAULT false,
  interest_rate  NUMERIC(5,2),
  status         TEXT DEFAULT 'outstanding'
                 CHECK (status IN ('outstanding','partially_returned','fully_returned')),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Credit Cards ─────────────────────────────────────────────────
CREATE TABLE credit_cards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_name       TEXT NOT NULL,
  bank_name       TEXT NOT NULL,
  card_limit      NUMERIC(14,2) NOT NULL,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  statement_date  INT CHECK (statement_date BETWEEN 1 AND 31),
  due_date_offset INT DEFAULT 20,
  linked_account_id UUID REFERENCES accounts(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Net Worth Snapshots (monthly) ────────────────────────────────
CREATE TABLE networth_snapshots (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date        DATE NOT NULL UNIQUE,
  bank_balance         NUMERIC(14,2) DEFAULT 0,
  fd_value             NUMERIC(14,2) DEFAULT 0,
  investment_value     NUMERIC(14,2) DEFAULT 0,
  gold_value           NUMERIC(14,2) DEFAULT 0,
  real_estate_value    NUMERIC(14,2) DEFAULT 0,
  other_assets         NUMERIC(14,2) DEFAULT 0,
  total_assets         NUMERIC(14,2) NOT NULL,
  loan_outstanding     NUMERIC(14,2) DEFAULT 0,
  credit_card_dues     NUMERIC(14,2) DEFAULT 0,
  other_liabilities    NUMERIC(14,2) DEFAULT 0,
  total_liabilities    NUMERIC(14,2) NOT NULL,
  net_worth            NUMERIC(14,2) NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Goals ────────────────────────────────────────────────────────
CREATE TABLE goals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  target_amount  NUMERIC(14,2) NOT NULL,
  current_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  target_date    DATE,
  color          TEXT DEFAULT '#2563eb',
  icon           TEXT DEFAULT '🎯',
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## PART 7: IMPLEMENTATION PRIORITY

```
PHASE 1  (Build first — highest value/effort ratio)
─────────────────────────────────────────────────────
  🔴  Net Worth Cockpit page  /networth
  🔴  Fixed Deposit CRUD + auto-calculations
  🔴  Loan CRUD + amortization
  🔴  Credit Card tracker (super common)
  🔴  Monthly Net Worth snapshot (auto-save)

PHASE 2  (Makes it comprehensive)
─────────────────────────────────────────────────────
  🟡  Mutual Fund / Stock portfolio
  🟡  Physical Gold tracker
  🟡  Real Estate & Vehicle
  🟡  EPF / PPF / NPS (Government schemes)
  🟡  Goals tracker with progress

PHASE 3  (Makes it exceptional)
─────────────────────────────────────────────────────
  🟢  Prepayment calculator (Loan)
  🟢  FD Break value calculator
  🟢  Financial Health Score
  🟢  Money Lent tracker
  🟢  BNPL / Informal debt tracker
  🟢  SGBs and Digital Gold
```
