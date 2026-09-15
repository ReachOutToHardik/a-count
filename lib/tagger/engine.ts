import { Transaction, RuleCondition } from '@/lib/types'

/**
 * Evaluates a single condition against a transaction.
 */
function evalCondition(tx: Transaction, cond: RuleCondition): boolean {
  let fieldValue = ''

  switch (cond.field) {
    case 'upi_vpa':
      fieldValue = (tx.upi_vpa ?? '').toLowerCase()
      break
    case 'upi_name':
      fieldValue = (tx.upi_name ?? '').toLowerCase()
      break
    case 'description':
      fieldValue = (tx.description ?? '').toLowerCase()
      break
    case 'type':
      fieldValue = tx.type
      break
    case 'amount':
      const amt = tx.amount
      const threshold = parseFloat(cond.value)
      if (cond.op === 'gt') return amt > threshold
      if (cond.op === 'lt') return amt < threshold
      if (cond.op === 'equals') return amt === threshold
      return false
  }

  const val = cond.value.toLowerCase()

  switch (cond.op) {
    case 'contains':    return fieldValue.includes(val)
    case 'starts_with': return fieldValue.startsWith(val)
    case 'ends_with':   return fieldValue.endsWith(val)
    case 'equals':      return fieldValue === val
    default:            return false
  }
}

import { TagRule } from '@/lib/types'

/**
 * Runs the rules engine against a list of transactions.
 * Modifies transactions in-place. Returns count of tagged transactions.
 */
export function runRulesEngine(
  transactions: Transaction[],
  rules: TagRule[]
): number {
  // Sort by priority ascending (lower number = higher priority)
  const sorted = [...rules].sort((a, b) => a.priority - b.priority)
  let tagged = 0

  for (const tx of transactions) {
    for (const rule of sorted) {
      const allMatch = rule.conditions.every(cond => evalCondition(tx, cond))
      if (allMatch) {
        tx.tags = [...new Set([...tx.tags, ...rule.tags])]
        tx.tag_source = 'rule'
        tagged++
        break // first matching rule wins
      }
    }
  }

  return tagged
}

/**
 * Extracts UPI VPA and name from a description string.
 * Common patterns: "UPI-merchant@bank-Name-ref", "Paid to merchant@vpa Name"
 */
export function extractUpiInfo(description: string): {
  upi_vpa: string | null
  upi_name: string | null
} {
  // Match UPI VPA pattern: word@word
  const vpaMatch = description.match(/\b([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+)\b/)
  const upi_vpa = vpaMatch ? vpaMatch[1].toLowerCase() : null

  // Extract name: often appears before or after VPA
  let upi_name: string | null = null
  if (upi_vpa) {
    // Try to find name before the VPA: "NAME UPI-VPA" pattern
    const beforeVpa = description.substring(0, description.toLowerCase().indexOf(upi_vpa)).trim()
    // Try to find name after VPA: "VPA-Name-Ref" pattern  
    const afterVpa = description.substring(
      description.toLowerCase().indexOf(upi_vpa) + upi_vpa.length
    ).trim()

    // Clean up common prefixes
    const cleaned = beforeVpa
      .replace(/^(upi|upi\/cr|upi\/dr|imps|neft|rtgs|paid to|received from|by|from|to)\s*/gi, '')
      .replace(/[-_]/g, ' ')
      .trim()

    upi_name = cleaned.length > 1 ? cleaned : 
      afterVpa.split(/[-_\/]/)[0]?.trim().replace(/\d+/g, '').trim() || null
    
    if (upi_name && upi_name.length < 2) upi_name = null
  }

  return { upi_vpa, upi_name }
}
