# A-Count — Bank Statement Intelligence & Ledger

> Personal bank statement intelligence, automated merchant categorization, and financial ledger platform designed with high-density Swiss/Mercury fintech aesthetics.

---

## ✨ Features

- **🏦 Multi-Bank Statement Ingestion**: Drag & drop CSV or Excel (`.xlsx`, `.xls`) statements from HDFC, ICICI, SBI, Axis, Kotak, or any custom bank format.
- **⚡ Smart Column Mapping**: Auto-detects and matches date, narration, debit, credit, running balance, and reference columns.
- **🏷️ Deterministic Rule Engine**: Classifies 30+ Indian merchants instantly (Swiggy, Zomato, Blinkit, Uber, Ola, Petrol/HPCL, Amazon, Netflix, Salary, etc.) with priority-ranked matching.
- **🔍 Regex UPI VPA & Merchant Extraction**: Automatically extracts UPI IDs (`merchant@bank`) and clean merchant names from raw bank narrations.
- **📊 Executive Dashboard & Reactive Analytics**:
  - Filter all KPI cards, cash flow trends, and category donut charts by **Period Presets**, **Specific Months**, or **Custom Date Ranges**.
  - Net flow velocity, monthly savings rate, and inflow/outflow breakdown.
- **📱 Responsive & PWA-Ready**: Seamless experience on desktop, tablet, and mobile with bottom navigation and mobile headers.
- **🛡️ Passphrase Security & Privacy**: Self-hosted personal vault with session protection. All data remains in your personal database. Zero external telemetry.
- **⚡ Serverless PostgreSQL Backend**: Powered by free **Neon Serverless PostgreSQL** (`@neondatabase/serverless`) with Next.js 16 (App Router + Turbopack).

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React 19)
- **Database**: [Neon Serverless PostgreSQL](https://neon.tech/) (`@neondatabase/serverless`)
- **Visualizations**: [Recharts](https://recharts.org/)
- **Styling**: Vanilla CSS Design System with Plus Jakarta Sans & JetBrains Mono typography
- **Parsers**: [PapaParse](https://www.papaparse.com/) (CSV) & [SheetJS (xlsx)](https://sheetjs.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/ReachOutToHardik/a-count.git
cd a-count
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Free Neon Serverless PostgreSQL Connection String
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-sample-123456.us-east-2.aws.neon.tech/neondb?sslmode=require

# App Security Passphrase (enter this on the login screen)
APP_PASSPHRASE=choose

# Optional: Google Gemini API key for fallback categorization
GEMINI_API_KEY=
```

### 3. Initialize Database Schema

1. Open your database console at [console.neon.tech](https://console.neon.tech).
2. Go to **SQL Editor**.
3. Copy and run the contents of [`neon/schema.sql`](./neon/schema.sql).
4. *(Optional test data)*: Run [`neon/seed_test_data.sql`](./neon/seed_test_data.sql) if you want instant demo accounts and entries.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Sample Statement Files for Testing

You can use the included sample CSV files to test statement uploads:
- `sample_hdfc_statement.csv`: Personal savings statement with UPI, salary, fuel, and subscriptions.
- `sample_business_statement.csv`: Business current account statement with invoice retainers, AWS, and rent.

---

## 📄 License

MIT License. Built for personal financial intelligence.
