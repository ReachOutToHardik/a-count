export type AccountType = 'savings' | 'current' | 'credit' | 'wallet'
export type TransactionType = 'credit' | 'debit'
export type TagSource = 'rule' | 'ai' | 'manual' | 'untagged'

export interface Account {
  id: string
  name: string
  bank_name: string
  account_type: AccountType
  currency: string
  color: string
  last_imported_at: string | null
  created_at: string
}

export interface Transaction {
  id: string
  account_id: string
  date: string
  description: string
  amount: number
  type: TransactionType
  balance_after: number | null
  upi_vpa: string | null
  upi_name: string | null
  ref_no: string | null
  tags: string[]
  tag_source: TagSource | null
  raw_row: Record<string, unknown>
  created_at: string
  accounts?: { name: string; color: string; bank_name?: string } | Account
}

export interface TagRule {
  id: string
  name: string
  priority: number
  conditions: RuleCondition[]
  tags: string[]
  created_at: string
}

export type RuleField = 'upi_vpa' | 'description' | 'amount' | 'type' | 'upi_name'
export type RuleOp = 'contains' | 'starts_with' | 'ends_with' | 'equals' | 'gt' | 'lt'

export interface RuleCondition {
  field: RuleField
  op: RuleOp
  value: string
}

export interface Tag {
  id: string
  name: string
  color: string
  icon: string
  created_at: string
}

export interface ImportSession {
  id: string
  account_id: string
  filename: string
  row_count: number
  tagged_count: number
  ai_tagged_count: number
  column_map: Record<string, string>
  created_at: string
}

export interface ColumnMapField {
  key: string
  label: string
  required: boolean
  description: string
}

export const COLUMN_MAP_FIELDS: ColumnMapField[] = [
  { key: 'date', label: 'Date', required: true, description: 'Transaction date' },
  { key: 'description', label: 'Description / Narration', required: true, description: 'Transaction description or narration' },
  { key: 'amount', label: 'Amount', required: true, description: 'Transaction amount (absolute value)' },
  { key: 'type', label: 'Type (Dr/Cr)', required: false, description: 'Debit or Credit indicator' },
  { key: 'debit', label: 'Debit Amount', required: false, description: 'Debit amount column (if separate from credit)' },
  { key: 'credit', label: 'Credit Amount', required: false, description: 'Credit amount column (if separate from debit)' },
  { key: 'balance', label: 'Balance After', required: false, description: 'Running balance after transaction' },
  { key: 'ref_no', label: 'Reference / Cheque No', required: false, description: 'Reference or cheque number' },
]

export interface ParsedRow {
  date: string
  description: string
  amount: number
  type: TransactionType
  balance_after: number | null
  upi_vpa: string | null
  upi_name: string | null
  ref_no: string | null
  raw_row: Record<string, unknown>
}

export interface MonthlyStats {
  month: string
  income: number
  expense: number
  net: number
}

export interface CategoryStat {
  tag: string
  amount: number
  count: number
  color: string
}
