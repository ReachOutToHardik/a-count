# A-Count — Personal Finance & Net Worth Tracker

A self-hosted personal finance app. You import bank statements, transactions get categorized automatically, and you can see cash flow, spending, and your total net worth (assets minus debts) in one place.

**Stack:** Next.js 16 (App Router), React 19, Neon serverless PostgreSQL, Recharts, PapaParse + SheetJS, Lucide icons.

---

## 1. Setup

```bash
git clone https://github.com/ReachOutToHardik/a-count.git
cd a-count
npm install
```

Create `.env.local` in the project root:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
APP_PASSPHRASE=your-secret-passphrase
GEMINI_API_KEY=            # optional, for AI categorization (see Known Issues)
```

Set up the database in the Neon SQL editor ([console.neon.tech](https://console.neon.tech)):

1. Run [`neon/schema.sql`](./neon/schema.sql). This creates accounts, transactions, tags, and rules.
2. Run [`neon/networth_schema.sql`](./neon/networth_schema.sql). This creates the FDs, loans, investments, assets, goals, money lent, and snapshot tables. The Net Worth API also creates these tables automatically if they're missing.
3. Optional: run [`neon/seed_test_data.sql`](./neon/seed_test_data.sql) to load demo data.

Start the app:

```bash
npm run dev
```

Open http://localhost:3000 and log in with your `APP_PASSPHRASE`.

---

## 2. How the app fits together

```mermaid
flowchart LR
  A["Accounts<br/>(create bank account)"] --> B["Import<br/>(upload CSV/XLSX or manual entry)"]
  B --> C["Rules engine<br/>(Tags & Rules)"]
  C --> D["Transactions<br/>(ledger)"]
  D --> E["Dashboard"]
  D --> F["Analytics"]
  D --> G["Net Worth<br/>(bank cash = latest balance)"]
  H["Net Worth tabs<br/>(FDs, loans, investments,<br/>assets, goals, lent)"] --> G
```

**Two kinds of data:**
| Data | Where it comes from | Where you enter it |
|---|---|---|
| Bank transactions (spending and income) | Bank statement files or manual entry | **Import Statement** page, or the floating **+** button |
| Wealth items (FDs, loans, stocks/MFs, EPF/PPF, gold, property, money lent, goals) | Typed in by you | **Net Worth** page → **Add Entry** dropdown, or each tab's add button |

---

## 3. Page-by-page guide

### Login (`/login`)
- Enter the passphrase from `APP_PASSPHRASE`.
- Your session lasts 30 days. Log out from **Settings**.

### Dashboard (`/`)
**What you see:** a summary of your money for the selected period:
- KPI cards: **Total Inflow**, **Total Outflow**, **Net Flow**, **Savings Rate** (calculated as `(inflow − outflow) / inflow`).
- Monthly Income vs Expense bar chart.
- Category donut chart showing top spending tags.
- Per-account inflow/outflow summary.
- Recent transactions. Click a UPI ID to copy it.

**Controls:**
- Period presets: All Time, This Month, Last Month, 30 Days, 90 Days, the current year, or Custom Range.
- A **Specific Month** dropdown and an **Account** dropdown.
- **Reset** clears all filters.

**Nothing to enter here.** This page is read-only.

### Accounts (`/accounts`)
**What you see:** each bank account as a card with its credits, debits, net ledger, transaction count, and last import date.

**Where to enter:**
- **Add Bank Account** opens a form with a name (e.g. "HDFC Salary"), bank, type (savings / current / credit / wallet), and color.
- Use the pencil icon to edit an account and the trash icon to delete it. ⚠️ Deleting an account also deletes all its transactions.

**Create an account before you import anything.** Every transaction belongs to an account.

### Account Detail (`/accounts/[id]`)
Click any account card to open it. You'll see:
- Ledger balance, total credits, total debits, and transaction count.
- A 12-month inflow/outflow area chart.
- A searchable transaction list with All / Credit / Debit filters.
- Shortcuts: **View in Ledger**, **Account Analytics**, and **Import Statement** (the import shortcut pre-selects this account).

### Import Statement (`/import`)
This is the main way to get data into the app. It has two tabs:

**Tab 1: Upload Statement (CSV / XLSX / XLS)**
1. **Drop the file** and pick the target account.
2. **Map columns.** The app guesses which columns are Date, Description, Amount, Debit, Credit, Balance, and Ref No. Fix any wrong guesses. Date and Description are required, plus either an Amount column or Debit + Credit columns.
3. **Preview.** This step shows the parsed rows plus:
   - **Duplicates:** rows that already exist in that account (checks the last 30 days). Use the "skip duplicates" toggle to leave them out.
   - **Internal transfers:** money that left one of your accounts and arrived in another.
4. **Import.** The rules engine tags each row, and the rows are saved.
5. **Receipt.** You see a summary of total rows, rule-tagged rows, and saved rows, with a link to view them.

You can test this with `sample_hdfc_statement.csv` or `sample_business_statement.csv`.

**Tab 2: Manual Entry.** Add one transaction with account, date, debit/credit, description, amount, and an optional ref number. The app warns you if it looks like a duplicate.

The floating **+** button in the corner works on every page. It offers Upload Statement, Manual Transaction (a quick modal), and New Bank Account.

### Transactions (`/transactions`)
**What you see:** the full ledger across all accounts.
- Search covers description, UPI ID, UPI name, ref number, and tags.
- Filters: account, type (Credit / Debit / **Untagged**), tag, and date preset.
- Click a column header to sort. Results are paginated.
- **Export CSV** downloads the currently filtered rows.

**Tip:** filter by **Untagged** to find transactions your rules missed, then write rules for them on the Tags page.

### Analytics (`/analytics`)
**What you see:**
- KPIs: Cumulative Inflow, Cumulative Outflow, **Avg Monthly Burn**, and Transactions Analyzed.
- Monthly cash-flow trend, spending by category, and top merchants (grouped by UPI name or VPA).
- Controls: account selector and a time window (number of months).
- Most cards and rows are clickable and open the matching transactions in the ledger.

### Net Worth (`/net-worth` → route `/networth`)
This is your balance sheet. Top-right controls:
- **Cash: ₹…** shows bank cash, taken from the latest `balance_after` of each account's transactions.
- **Save Snapshot** records a net-worth checkpoint. The app also saves one automatically every time you open this page.
- **Add Entry ▾** lets you add an Investment / Asset, Fixed Deposit, Loan / EMI, Money Lent, or Financial Goal.

| Tab | What you see | What you enter |
|---|---|---|
| **Overview** | Net worth, gross assets, total debt, debt-to-asset ratio. **"Where is my money?"** treemap: each block's size equals its share, shades show individual holdings, and hovering shows details. Asset class cards, a holdings table, a net-worth-over-time chart, and an allocation donut. | Nothing. Click any block or card to jump to its tab. |
| **Loans & Lending** | Loans with outstanding balance, EMI, repaid %, a **prepayment simulator** (⚡), and an **amortization schedule**. Money lent to friends with recovered %. | **Borrow Loan**: lender, amount, rate, tenure, EMI, start date. **Lend Money**: borrower, amount, date, optional interest. **Record Repayment** on each lent card. |
| **Goals** | Progress bars, amount remaining, and the **monthly SIP needed** to reach each goal on time. | **Create Financial Goal**: name, target, date, color, icon. **Add Funds to Goal** on each card. |
| **Fixed Deposits** | Current accrued value, value at maturity, interest earned, maturity date. | **Add Fixed Deposit**: bank, principal, rate, compounding, start and maturity dates. |
| **Investments & Assets** | Market holdings (stocks, MFs, EPF/PPF/NPS, gold) with returns. Physical assets (property, vehicles, jewellery). | **Add Asset / Investment**: name, type, invested amount, current value. |
| **Calculators** | FIRE, SIP, Loan EMI, and FD calculators. These are what-if tools and save nothing. | Type numbers into the sliders and inputs. |

**How the Overview numbers are calculated:**
- **Assets** = Bank cash + FD accrued value + Investments + Physical assets + Money lent (pending)
- **Liabilities** = Outstanding loan principal + credit card dues
- **Net Worth** = Assets − Liabilities

### Tags & Rules (`/tags`)
- **Rules** tag transactions automatically. A rule has one or more conditions, all of which must match. Conditions can check `description`, `upi_vpa`, `upi_name`, `type`, or `amount`, using contains / starts with / ends with / equals / > / <. Each rule assigns one or more tags and has a **priority**. Lower numbers run first, and the first matching rule wins.
- **Tags** are categories with a name and color. The color is used in the charts.
- Example rule: *description contains "swiggy"* → tags `food, delivery`.
- ⚠️ Rules only run at import time. Old transactions are not re-tagged when you add a rule (see Known Issues).

### Glossary (`/glossary`)
A searchable reference that explains every metric and formula: dashboard metrics, net worth math, duplicate and transfer detection, categorization, charts, and balance concepts.

### Settings (`/settings`)
Shows the passphrase info, rule-engine status, and database info. It also has the **Lock Session & Log Out** button.

---

## 4. Recommended workflow

1. **Accounts** → add each bank account.
2. **Import** → upload last month's statement for each account.
3. **Transactions** → filter by *Untagged* → note which merchants were missed.
4. **Tags & Rules** → add rules for those merchants. They apply to future imports.
5. **Net Worth** → add your FDs, loans, investments, property, and goals once. Update their values every month.
6. Each month: import new statements, then review **Dashboard**, **Analytics**, and **Net Worth**.

---

## 5. Known issues & improvements

These came out of a code review. Each is ranked by impact.

### 🔴 Bugs (fix first)
| # | Issue | Where |
|---|---|---|
| 1 | **AI categorization never runs.** Import calls `/api/tag-ai`, but the route is at `/api/tag`. The batch also uses `description` as the ID, so identical descriptions collide. | `app/import/ImportClient.tsx` → `app/api/tag/route.ts` |
| 2 | **The login cookie can be forged.** The session cookie value is the literal string `"authenticated"`, so anyone who sets that cookie by hand gets in. Use a signed or random token, compare the passphrase in constant time, and rate-limit login attempts. | `app/api/auth/route.ts`, `proxy.ts` |
| 3 | **The net-worth chart stops updating after 24 days.** The snapshot query uses `ORDER BY snapshot_date ASC LIMIT 24`, which returns the *oldest* 24 rows. It should sort DESC and then reverse. | `app/api/networth/route.ts` |
| 4 | **Garbled characters (mojibake).** Some files show `A�` / `�` where `·` / `₹` / `✓` should be. The files need to be re-saved as UTF-8. | `AccountDetailClient.tsx`, `ImportClient.tsx`, `lib/db/index.ts`, `duplicate-detector.ts` |
| 5 | **The `gemini-1.5-flash` model is outdated.** Update the model name. Also, the tag list sent by the client is ignored because the API uses a hardcoded list. | `app/api/tag/route.ts` |
| 6 | **Settings says "zero external telemetry"**, but when `GEMINI_API_KEY` is set, transaction descriptions are sent to Google. Make AI tagging opt-in and say so clearly. | `app/settings/page.tsx` |

### 🟠 Missing features users will hit quickly
- **Edit wealth items.** Investments, FDs, loans, and assets can only be created or deleted. You can't update a stock's current value without deleting and re-adding it. Add `update_*` actions and edit modals.
- **Edit or re-tag transactions in the ledger.** The `PUT /api/transactions` endpoint exists, but no UI uses it. Add inline tag editing, bulk tagging, and delete.
- **Re-run rules on existing transactions.** Add an "Apply rules to all untagged" button on Tags & Rules.
- **Create a rule from a transaction.** In the ledger, add a "Always tag *Swiggy* as food" action.
- **Credit cards.** The `credit_cards` table counts toward liabilities, but there's no UI to add a card.
- **Import history and undo.** The `import_sessions` table exists but nothing writes to it. Logging imports would allow "undo this import".
- **Budgets.** Set a monthly limit per tag and show progress on the Dashboard.
- **Opening balance per account.** Account balances are currently credits minus debits, which is wrong if the statement doesn't start at ₹0.

### 🟡 Performance & data quality
- **Batch import inserts one row at a time** (one sequential `INSERT` per row). Use a multi-row insert or `unnest` to make large statements much faster.
- **The Dashboard loads up to 5,000 transactions and aggregates them in the browser.** Move the totals into SQL (`GROUP BY month, tag`) once data grows.
- **Duplicate checking only looks back 30 days.** Re-importing an older statement can create duplicates. Add a database-level unique key, e.g. on `(account_id, date, amount, ref_no)`.
- **Transfers are detected but not marked.** Internal transfers still count as income and expense, which inflates both. Tag them `transfer` and exclude them from the KPIs.
- **The Net Worth page reads and writes the database on every visit** (it creates tables and upserts a snapshot inside the GET). Move these writes to a POST or a daily job.
- **Net Worth falls back to `localStorage`** when the API fails, so the data shown can differ from the database. Show an error banner instead.

### 🟢 UX polish
- **Mixed styling.** Net Worth tabs 2–6 use Tailwind classes, while the rest of the app uses the CSS design system (`.card`, `.kpi-card`, `.btn`). Pick one for a consistent look.
- `NetworthClient.tsx` is about 3,500 lines. Split it into one component per tab plus a shared modal component.
- Add an empty-state onboarding checklist for new users ("Add account → Import → Add assets").
- Mobile: check that the treemap legend and the 4-column KPI grid wrap well on narrow screens.
- Add dark mode. Some components already have `dark:` classes, but the theme isn't wired up.

---

## 6. Project structure

```
app/
  page.tsx, DashboardClient.tsx   Dashboard
  accounts/                       Accounts list + [id] detail
  import/                         Statement import + manual entry
  transactions/                   Ledger
  analytics/                      Analytics
  networth/                       Net worth (all tabs, modals, calculators)
  tags/                           Tags & rules
  glossary/  settings/  login/
  api/                            accounts, transactions, tags, rules, tag (AI), networth, auth
components/layout/                Sidebar, BottomNav, MobileHeader, QuickActionFab
lib/
  db/        Neon queries + row mappers
  parsers/   CSV/XLSX parsing, column auto-detect
  tagger/    Rules engine, UPI extraction, seed rules
  duplicate-detector.ts           Duplicate & internal-transfer detection
neon/        SQL schemas + seed data
proxy.ts     Auth gate (Next 16 "proxy", formerly middleware)
```

## License
MIT
