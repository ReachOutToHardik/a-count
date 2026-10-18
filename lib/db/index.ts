import postgres from 'postgres'
import { neon } from '@neondatabase/serverless'
import { Account, Transaction, Tag, TagRule, AccountType } from '@/lib/types'

// Global client cache across hot reloads
const globalForDb = global as unknown as { sqlClient?: any }

export function getDb() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set in environment variables (.env.local)')
  }

  if (url.includes('neon.tech')) {
    return neon(url)
  }

  if (!globalForDb.sqlClient) {
    globalForDb.sqlClient = postgres(url, {
      ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : 'require',
      max: 5,
      idle_timeout: 10,
      connect_timeout: 15,
      prepare: false, // Required for Supabase PgBouncer / Connection Pooler on Serverless
    })
  }

  return globalForDb.sqlClient
}

/**
 * Normalizes a transaction row from PostgreSQL into our TypeScript Transaction interface.
 */
function safeDateString(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0]
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.split('T')[0]
  const d = new Date(val)
  return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
}

function safeIsoString(val: any): string {
  if (!val) return new Date().toISOString()
  const d = new Date(val)
  return !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString()
}

/**
 * Normalizes a transaction row from PostgreSQL into our TypeScript Transaction interface.
 */
function mapTransaction(row: any): Transaction {
  return {
    id: row.id,
    account_id: row.account_id,
    date: safeDateString(row.date),
    description: row.description ?? '',
    amount: parseFloat(row.amount ?? '0'),
    type: row.type as 'credit' | 'debit',
    balance_after: row.balance_after ? parseFloat(row.balance_after) : null,
    upi_vpa: row.upi_vpa ?? null,
    upi_name: row.upi_name ?? null,
    ref_no: row.ref_no ?? null,
    tags: Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : []),
    tag_source: row.tag_source ?? null,
    raw_row: typeof row.raw_row === 'string' ? JSON.parse(row.raw_row || '{}') : (row.raw_row ?? {}),
    created_at: safeIsoString(row.created_at),
    accounts: row.account_name ? {
      name: row.account_name,
      color: row.account_color ?? '#2563eb',
      bank_name: row.account_bank_name ?? '',
    } : undefined,
  }
}

function mapAccount(row: any): Account {
  return {
    id: row.id,
    name: row.name,
    bank_name: row.bank_name ?? '',
    account_type: (row.account_type ?? 'savings') as AccountType,
    currency: row.currency ?? 'INR',
    color: row.color ?? '#2563eb',
    last_imported_at: row.last_imported_at && !isNaN(new Date(row.last_imported_at).getTime())
      ? new Date(row.last_imported_at).toISOString()
      : null,
    created_at: safeIsoString(row.created_at),
  }
}

function mapTag(row: any): Tag {
  return {
    id: row.id,
    name: row.name,
    color: row.color ?? '#2563eb',
    icon: row.icon ?? '',
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  }
}

function mapTagRule(row: any): TagRule {
  return {
    id: row.id,
    name: ruleName(row.name),
    priority: parseInt(row.priority ?? '100', 10),
    conditions: typeof row.conditions === 'string' ? JSON.parse(row.conditions || '[]') : (row.conditions ?? []),
    tags: Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : []),
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  }
}

function ruleName(name: any): string {
  return String(name ?? '')
}

// ─── Query Helpers ────────────────────────────────────────────────────────────

export async function getAccounts(): Promise<Account[]> {
  try {
    const sql = getDb()
    const rows = await sql`SELECT * FROM accounts ORDER BY created_at ASC`
    return rows.map(mapAccount)
  } catch (err: any) {
    console.error('DB getAccounts error:', err.message)
    return []
  }
}

export async function getAccountById(id: string): Promise<Account | null> {
  try {
    const sql = getDb()
    const rows = await sql`SELECT * FROM accounts WHERE id = ${id} LIMIT 1`
    if (rows.length === 0) return null
    return mapAccount(rows[0])
  } catch (err: any) {
    console.error('DB getAccountById error:', err.message)
    return null
  }
}

export async function getTransactions(options?: { accountId?: string; limit?: number }): Promise<Transaction[]> {
  try {
    const sql = getDb()
    const limit = options?.limit ?? 1000
    let rows: any[]

    if (options?.accountId) {
      rows = await sql`
        SELECT t.*, a.name as account_name, a.color as account_color, a.bank_name as account_bank_name
        FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.id
        WHERE t.account_id = ${options.accountId}
        ORDER BY t.date DESC, t.created_at DESC
        LIMIT ${limit}
      `
    } else {
      rows = await sql`
        SELECT t.*, a.name as account_name, a.color as account_color, a.bank_name as account_bank_name
        FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.id
        ORDER BY t.date DESC, t.created_at DESC
        LIMIT ${limit}
      `
    }

    return rows.map(mapTransaction)
  } catch (err: any) {
    console.error('DB getTransactions error:', err.message)
    return []
  }
}

export async function getTags(): Promise<Tag[]> {
  try {
    const sql = getDb()
    const rows = await sql`SELECT * FROM tags ORDER BY name ASC`
    return rows.map(mapTag)
  } catch (err: any) {
    console.error('DB getTags error:', err.message)
    return []
  }
}

export async function getTagRules(): Promise<TagRule[]> {
  try {
    const sql = getDb()
    const rows = await sql`SELECT * FROM tag_rules ORDER BY priority ASC, name ASC`
    return rows.map(mapTagRule)
  } catch (err: any) {
    console.error('DB getTagRules error:', err.message)
    return []
  }
}
