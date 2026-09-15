import { ParsedRow } from '@/lib/types'
import { extractUpiInfo } from '@/lib/tagger/engine'

type ColumnMap = Record<string, string> // fieldKey -> csvHeader

/**
 * Tries to intelligently detect date from various formats.
 */
function parseDate(val: string): string {
  if (!val) return new Date().toISOString().split('T')[0]
  // Try common Indian bank date formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
  const cleaned = val.trim()
  const ddmmyyyy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // ISO format
  const iso = new Date(cleaned)
  if (!isNaN(iso.getTime())) return iso.toISOString().split('T')[0]
  return cleaned
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

      const description = descRaw?.toString().trim() || ''
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
 * Reads an XLSX file buffer and returns array of arrays (rows).
 * Dynamically imports xlsx to avoid SSR issues.
 */
export async function parseXlsx(
  buffer: ArrayBuffer
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const json: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, {
    raw: false,
    defval: '',
  })
  const headers = json.length > 0 ? Object.keys(json[0]) : []
  return { headers, rows: json }
}

/**
 * Parses a CSV string and returns headers + rows.
 */
export async function parseCsv(
  text: string
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const Papa = await import('papaparse')
  const result = Papa.default.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  })
  const headers: string[] = result.meta.fields ?? []
  return { headers, rows: result.data }
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
