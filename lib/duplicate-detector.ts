/**
 * Duplicate & Transfer Detection Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Used in two places:
 *   1. CSV Import  → detect if an imported row already exists in the DB
 *   2. Manual Entry → warn if a manually entered tx matches an existing one
 *   3. Internal Transfer → detect when the same amount leaves one account
 *      and enters another within a configurable time window
 */

export interface TxLike {
  id?: string
  account_id: string
  date: string          // ISO date YYYY-MM-DD
  amount: number
  type: 'credit' | 'debit'
  description: string
  ref_no?: string | null
  upi_vpa?: string | null
}

export interface DuplicateMatch {
  existingId: string
  existingDate: string
  existingAmount: number
  existingDescription: string
  existingAccountId: string
  matchType: 'exact' | 'fuzzy_date' | 'fuzzy_narration'
  confidence: number      // 0–1
  daysDiff: number
}

export interface TransferMatch {
  debitId: string
  creditId: string
  debitAccountId: string
  creditAccountId: string
  amount: number
  debitDate: string
  creditDate: string
  daysDiff: number
}

// ─── Config ─────────────────────────────────────────────────────────────────

const EXACT_MATCH_WINDOW_DAYS = 3     // within 3 days = possible exact duplicate
const FUZZY_MATCH_WINDOW_DAYS = 7     // within 7 days = fuzzy duplicate warning
const TRANSFER_WINDOW_DAYS    = 3     // internal transfer detection window
const AMOUNT_TOLERANCE        = 0.01  // ±1 paisa tolerance for floating point

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysDiff(a: string, b: string): number {
  const da = new Date(a).getTime()
  const db = new Date(b).getTime()
  return Math.abs(Math.round((da - db) / 86400000))
}

function amountMatch(a: number, b: number): boolean {
  return Math.abs(Number(a) - Number(b)) <= AMOUNT_TOLERANCE
}

function normNarration(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '').trim()
}

function narrationSimilarity(a: string, b: string): number {
  const na = normNarration(a)
  const nb = normNarration(b)
  if (na === nb) return 1
  // Check substring containment
  if (na.includes(nb) || nb.includes(na)) return 0.8
  // Count matching 3-grams
  const trigramsA = new Set<string>()
  const trigramsB = new Set<string>()
  for (let i = 0; i < na.length - 2; i++) trigramsA.add(na.slice(i, i + 3))
  for (let i = 0; i < nb.length - 2; i++) trigramsB.add(nb.slice(i, i + 3))
  let shared = 0
  for (const t of trigramsA) { if (trigramsB.has(t)) shared++ }
  const total = trigramsA.size + trigramsB.size - shared
  return total === 0 ? 0 : shared / total
}

// ─── Core: Check if a single incoming tx matches anything in existing list ──

export function findDuplicates(
  incoming: TxLike,
  existing: TxLike[],
  options?: { sameAccountOnly?: boolean }
): DuplicateMatch[] {
  const results: DuplicateMatch[] = []
  const sameOnly = options?.sameAccountOnly ?? true

  for (const ex of existing) {
    // Skip same record
    if (incoming.id && ex.id === incoming.id) continue
    // Optionally restrict to same account
    if (sameOnly && ex.account_id !== incoming.account_id) continue
    // Must be same type (credit/debit)
    if (ex.type !== incoming.type) continue
    // Must be same amount (within tolerance)
    if (!amountMatch(incoming.amount, ex.amount)) continue

    const days = daysDiff(incoming.date, ex.date)

    // EXACT: same amount + same ref_no → strongest signal
    if (
      incoming.ref_no && ex.ref_no &&
      incoming.ref_no === ex.ref_no &&
      days <= EXACT_MATCH_WINDOW_DAYS
    ) {
      results.push({
        existingId: ex.id!,
        existingDate: ex.date,
        existingAmount: ex.amount,
        existingDescription: ex.description,
        existingAccountId: ex.account_id,
        matchType: 'exact',
        confidence: 0.99,
        daysDiff: days,
      })
      continue
    }

    // EXACT: same amount + same UPI VPA
    if (
      incoming.upi_vpa && ex.upi_vpa &&
      incoming.upi_vpa === ex.upi_vpa &&
      days <= EXACT_MATCH_WINDOW_DAYS
    ) {
      results.push({
        existingId: ex.id!,
        existingDate: ex.date,
        existingAmount: ex.amount,
        existingDescription: ex.description,
        existingAccountId: ex.account_id,
        matchType: 'exact',
        confidence: 0.97,
        daysDiff: days,
      })
      continue
    }

    // FUZZY DATE: same amount + date within window
    if (days <= EXACT_MATCH_WINDOW_DAYS) {
      const narSim = narrationSimilarity(incoming.description, ex.description)
      const confidence = 0.7 + (narSim * 0.2) - (days * 0.05)
      if (confidence > 0.6) {
        results.push({
          existingId: ex.id!,
          existingDate: ex.date,
          existingAmount: ex.amount,
          existingDescription: ex.description,
          existingAccountId: ex.account_id,
          matchType: 'fuzzy_date',
          confidence: Math.min(0.95, confidence),
          daysDiff: days,
        })
      }
      continue
    }

    // FUZZY NARRATION: same amount + high narration match + wider date window
    if (days <= FUZZY_MATCH_WINDOW_DAYS) {
      const narSim = narrationSimilarity(incoming.description, ex.description)
      if (narSim >= 0.75) {
        results.push({
          existingId: ex.id!,
          existingDate: ex.date,
          existingAmount: ex.amount,
          existingDescription: ex.description,
          existingAccountId: ex.account_id,
          matchType: 'fuzzy_narration',
          confidence: narSim * 0.7,
          daysDiff: days,
        })
      }
    }
  }

  // Sort by confidence descending
  return results.sort((a, b) => b.confidence - a.confidence)
}

// ─── Batch: check a list of incoming rows against existing ──────────────────

export interface BatchDuplicateResult {
  incoming: TxLike
  matches: DuplicateMatch[]
  isDuplicate: boolean      // true if any match with confidence >= 0.85
  isSuspect: boolean        // true if any match with confidence 0.6–0.85
}

export function batchFindDuplicates(
  incoming: TxLike[],
  existing: TxLike[],
  options?: { sameAccountOnly?: boolean }
): BatchDuplicateResult[] {
  return incoming.map(tx => {
    const matches = findDuplicates(tx, existing, options)
    return {
      incoming: tx,
      matches,
      isDuplicate: matches.some(m => m.confidence >= 0.85),
      isSuspect: matches.some(m => m.confidence >= 0.6 && m.confidence < 0.85),
    }
  })
}

// ─── Internal Transfer Detection ────────────────────────────────────────────
// Finds pairs where money leaves one account and enters another account
// at the same amount within the time window → marks both as internal transfer

export function detectInternalTransfers(
  transactions: TxLike[]
): TransferMatch[] {
  const debits  = transactions.filter(t => t.type === 'debit')
  const credits = transactions.filter(t => t.type === 'credit')
  const matches: TransferMatch[] = []
  const usedDebitIds  = new Set<string>()
  const usedCreditIds = new Set<string>()

  for (const debit of debits) {
    if (!debit.id || usedDebitIds.has(debit.id)) continue

    for (const credit of credits) {
      if (!credit.id || usedCreditIds.has(credit.id)) continue
      // Must be different accounts
      if (debit.account_id === credit.account_id) continue
      // Must match amount
      if (!amountMatch(debit.amount, credit.amount)) continue
      // Must be within transfer window
      const days = daysDiff(debit.date, credit.date)
      if (days > TRANSFER_WINDOW_DAYS) continue

      matches.push({
        debitId:          debit.id,
        creditId:         credit.id,
        debitAccountId:   debit.account_id,
        creditAccountId:  credit.account_id,
        amount:           debit.amount,
        debitDate:        debit.date,
        creditDate:       credit.date,
        daysDiff:         days,
      })

      usedDebitIds.add(debit.id)
      usedCreditIds.add(credit.id)
      break  // one debit matches at most one credit
    }
  }

  return matches
}

// ─── Fingerprint: unique hash for deduplication at DB insert time ──────────
// Build this hash before inserting — if hash already exists in DB, skip.

export function buildTxFingerprint(tx: Pick<TxLike, 'account_id' | 'date' | 'amount' | 'type' | 'ref_no' | 'description'>): string {
  // Normalize: round amount to 2dp, date to YYYY-MM-DD
  const amount = Number(tx.amount).toFixed(2)
  const date   = tx.date.slice(0, 10)
  const ref    = (tx.ref_no || '').trim().toLowerCase()
  const desc   = normNarration(tx.description).slice(0, 30)
  return `${tx.account_id}|${date}|${amount}|${tx.type}|${ref || desc}`
}
