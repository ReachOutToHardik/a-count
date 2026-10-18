import { ParsedRow } from '@/lib/types'
import { extractUpiInfo } from '@/lib/tagger/engine'

type ColumnMap = Record<string, string> // fieldKey -> csvHeader

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  january: '01', february: '02', march: '03', april: '04',
  june: '06', july: '07', august: '08', september: '09',
  october: '10', november: '11', december: '12',
}

/**
 * Intelligently parses dates from Indian & international bank statements.
 * Supports:
 * - DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (with or without time e.g. 01/09/2026 14:30:00)
 * - DD-MMM-YYYY, DD-MMM-YY (e.g. 01-Sep-2026, 01-SEP-26, 1-Sep-24)
 * - MMM DD, YYYY (e.g. Sep 01, 2026)
 * - YYYY-MM-DD (ISO)
 * - Excel serial date numbers (e.g. 45535)
 * - 2-digit years (e.g. 01/09/26 -> 2026-09-01)
 */
export function parseDate(val: any): string {
  if (val === null || val === undefined || val === '') {
    return new Date().toISOString().split('T')[0]
  }

  // 1. If it's already a Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0]
  }

  const str = String(val).trim()
  if (!str) return new Date().toISOString().split('T')[0]

  // 2. Excel numeric serial date (e.g. 45123 or 45123.5)
  if (/^\d{5}(\.\d+)?$/.test(str) || (typeof val === 'number' && val > 30000 && val < 70000)) {
    const num = typeof val === 'number' ? val : parseFloat(str)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    const jsDate = new Date(excelEpoch.getTime() + num * 86400000)
    if (!isNaN(jsDate.getTime())) {
      return jsDate.toISOString().split('T')[0]
    }
  }

  // 3. YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD (ISO format)
  const ymdMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/)
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // 4. DD-MMM-YYYY or DD-MMM-YY or DD MMM YYYY (e.g. 01-Sep-2026, 1-SEP-26, 01 Sep 2026)
  const dMmmYMatch = str.match(/^(\d{1,2})[\s\/\-\.]([a-zA-Z]{3,9})[\s\/\-\.](\d{2,4})/)
  if (dMmmYMatch) {
    const [, d, mStr, yRaw] = dMmmYMatch
    const m = MONTH_MAP[mStr.toLowerCase()]
    if (m) {
      const y = yRaw.length === 2 ? `20${yRaw}` : yRaw
      return `${y}-${m}-${d.padStart(2, '0')}`
    }
  }

  // 5. MMM DD, YYYY or MMM DD YYYY (e.g. Sep 01, 2026, September 1 2026)
  const mmmDYMatch = str.match(/^([a-zA-Z]{3,9})[\s\/\-\.](\d{1,2}),?[\s\/\-\.](\d{2,4})/)
  if (mmmDYMatch) {
    const [, mStr, d, yRaw] = mmmDYMatch
    const m = MONTH_MAP[mStr.toLowerCase()]
    if (m) {
      const y = yRaw.length === 2 ? `20${yRaw}` : yRaw
      return `${y}-${m}-${d.padStart(2, '0')}`
    }
  }

  // 6. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (standard Indian bank format, with optional time)
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/)
  if (dmyMatch) {
    let [, dStr, mStr, yRaw] = dmyMatch
    let d = parseInt(dStr, 10)
    let m = parseInt(mStr, 10)
    const y = yRaw.length === 2 ? `20${yRaw}` : yRaw

    // If month is > 12 and day <= 12, it was probably MM/DD/YYYY
    if (m > 12 && d <= 12) {
      const temp = d
      d = m
      m = temp
    }

    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }

  // 7. Compact 8-digit: YYYYMMDD (e.g. 20260901)
  const yyyymmdd = str.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (yyyymmdd) {
    const [, y, m, d] = yyyymmdd
    const mNum = parseInt(m, 10)
    const dNum = parseInt(d, 10)
    if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
      return `${y}-${m}-${d}`
    }
  }

  // 8. Fallback standard Date parse
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0]
  }

  // Safe fallback to current date so postgres DATE column never throws 'Invalid time value'
  return new Date().toISOString().split('T')[0]
}

/**
 * Parses amount from string, handling commas and currency symbols.
 */
function parseAmount(val: string): number {
  if (!val && val !== '0') return 0
  const cleaned = val.toString().replace(/[₹$,\s]/g, '').trim()
  return Math.abs(parseFloat(cleaned) || 0)
}

/**
 * Determines transaction type from a type string column.
 */
function parseType(val: string): 'credit' | 'debit' {
  const v = val.toString().toLowerCase().trim()
  if (v.includes('cr') || v === 'credit' || v === 'c' || v === 'in') return 'credit'
  return 'debit'
}

/**
 * Parses raw rows from CSV/Excel using a column map.
 * columnMap maps our field keys to actual CSV header names.
 */
export function parseRows(
  rawRows: Record<string, string>[],
  columnMap: ColumnMap
): ParsedRow[] {
  const results: ParsedRow[] = []

  for (const row of rawRows) {
    try {
      // Skip completely empty rows
      if (Object.values(row).every(v => !v || v.toString().trim() === '')) continue

      const dateRaw = columnMap.date ? row[columnMap.date] : ''
      const descRaw = columnMap.description ? row[columnMap.description] : ''
      const typeRaw = columnMap.type ? row[columnMap.type] : ''
      const balRaw = columnMap.balance ? row[columnMap.balance] : ''
      const refRaw = columnMap.ref_no ? row[columnMap.ref_no] : ''

      let amount = 0
      let type: 'credit' | 'debit' = 'debit'

      if (columnMap.debit && columnMap.credit) {
        // Separate debit/credit columns
        const debitAmt = parseAmount(row[columnMap.debit] || '0')
        const creditAmt = parseAmount(row[columnMap.credit] || '0')
        if (creditAmt > 0) {
          amount = creditAmt
          type = 'credit'
        } else {
          amount = debitAmt
          type = 'debit'
        }
      } else if (columnMap.amount) {
        amount = parseAmount(row[columnMap.amount])
        type = typeRaw ? parseType(typeRaw) : 'debit'
      }

      if (amount === 0) continue // Skip zero-amount rows
      if (!dateRaw && !descRaw) continue // Skip rows without date or description

      const description = descRaw?.toString().trim() || ''
      // Skip statement summary/total rows
      if (/^(total|closing balance|opening balance|summary|brought forward|b\/f|c\/f|carried forward|page \d+)/i.test(description) && amount === 0) {
        continue
      }

      const { upi_vpa, upi_name } = extractUpiInfo(description)

      results.push({
        date: parseDate(dateRaw?.toString() || ''),
        description,
        amount,
        type,
        balance_after: balRaw ? parseAmount(balRaw.toString()) : null,
        upi_vpa,
        upi_name,
        ref_no: refRaw?.toString().trim() || null,
        raw_row: row,
      })
    } catch {
      // Skip malformed rows
      continue
    }
  }

  return results
}

/**
 * Finds the header row index in a 2D matrix of strings by matching financial keywords.
 */
function findHeaderRowIndex(grid: string[][]): number {
  const HEADER_KEYWORDS = [
    /date/i, /txn date/i, /value date/i,
    /narration/i, /description/i, /particulars/i, /details/i, /remarks/i,
    /amount/i, /debit/i, /credit/i, /withdrawal/i, /deposit/i, /balance/i,
    /chq/i, /cheque/i, /ref/i
  ]

  let bestIdx = 0
  let maxScore = 0

  for (let i = 0; i < Math.min(grid.length, 30); i++) {
    const row = grid[i]
    if (!row || row.length === 0) continue
    let score = 0
    for (const cell of row) {
      const s = String(cell || '').trim()
      if (s && HEADER_KEYWORDS.some(rx => rx.test(s))) {
        score++
      }
    }
    if (score > maxScore && score >= 2) {
      maxScore = score
      bestIdx = i
    }
  }

  return bestIdx
}

/**
 * Reads an XLSX file buffer and returns array of arrays (rows).
 * Dynamically imports xlsx to avoid SSR issues and auto-detects header row offset.
 */
export async function parseXlsx(
  buffer: ArrayBuffer
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const grid: any[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: false,
    defval: '',
  })

  if (!grid || grid.length === 0) {
    return { headers: [], rows: [] }
  }

  const headerIdx = findHeaderRowIndex(grid.map(r => r.map(c => String(c ?? ''))))
  const rawHeaders = (grid[headerIdx] || []).map(h => String(h ?? '').trim())
  // Filter and deduplicate non-empty headers
  const headers = rawHeaders.map((h, i) => h || `Column_${i + 1}`)

  const rows: Record<string, string>[] = []
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const rawRow = grid[i]
    if (!rawRow || rawRow.every(c => !c || String(c).trim() === '')) continue
    const rowObj: Record<string, string> = {}
    headers.forEach((headerName, colIdx) => {
      rowObj[headerName] = String(rawRow[colIdx] ?? '').trim()
    })
    rows.push(rowObj)
  }

  return { headers, rows }
}

/**
 * Parses a CSV string and returns headers + rows with smart header detection.
 */
export async function parseCsv(
  text: string
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const Papa = await import('papaparse')
  const result = Papa.default.parse<string[]>(text, {
    header: false,
    skipEmptyLines: 'greedy',
  })

  const grid = (result.data || []).map(r => (Array.isArray(r) ? r.map(c => String(c ?? '').trim()) : []))
  if (grid.length === 0) {
    return { headers: [], rows: [] }
  }

  const headerIdx = findHeaderRowIndex(grid)
  const rawHeaders = (grid[headerIdx] || []).map(h => String(h ?? '').trim())
  const headers = rawHeaders.map((h, i) => h || `Column_${i + 1}`)

  const rows: Record<string, string>[] = []
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const rawRow = grid[i]
    if (!rawRow || rawRow.every(c => !c || String(c).trim() === '')) continue
    const rowObj: Record<string, string> = {}
    headers.forEach((headerName, colIdx) => {
      rowObj[headerName] = String(rawRow[colIdx] ?? '').trim()
    })
    rows.push(rowObj)
  }

  return { headers, rows }
}

/**
 * Attempts to auto-detect column mappings from headers.
 */
export function autoDetectColumns(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  const lower = headers.map(h => h.toLowerCase().trim())

  const patterns: Record<string, RegExp[]> = {
    date: [/date/i, /txn date/i, /value date/i, /posting date/i],
    description: [/narration/i, /description/i, /particulars/i, /details/i, /remarks/i, /transaction remarks/i],
    amount: [/^amount$/i, /transaction amount/i, /txn amount/i],
    debit: [/debit/i, /dr amount/i, /withdrawal/i, /dr/i],
    credit: [/credit/i, /cr amount/i, /deposit/i, /cr/i],
    type: [/type/i, /txn type/i, /dr\/cr/i, /d\/c/i],
    balance: [/balance/i, /closing balance/i, /running balance/i, /available balance/i],
    ref_no: [/ref/i, /reference/i, /cheque/i, /chq/i, /transaction id/i, /txn id/i],
  }

  for (const [field, regexes] of Object.entries(patterns)) {
    for (const header of headers) {
      if (regexes.some(r => r.test(header))) {
        if (!map[field]) map[field] = header
      }
    }
  }

  return map
}
