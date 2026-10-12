const fs = require('fs')
const path = require('path')
const postgres = require('postgres')

const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const match = envContent.match(/DATABASE_URL=(.+)/)
const databaseUrl = match[1].trim()

const sql = postgres(databaseUrl, { ssl: 'require' })

function evalCondition(tx, cond) {
  let fieldValue = ''
  switch (cond.field) {
    case 'upi_vpa': fieldValue = (tx.upi_vpa ?? '').toLowerCase(); break
    case 'upi_name': fieldValue = (tx.upi_name ?? '').toLowerCase(); break
    case 'description': fieldValue = (tx.description ?? '').toLowerCase(); break
    case 'type': fieldValue = tx.type; break
    case 'amount':
      const amt = parseFloat(tx.amount)
      const threshold = parseFloat(cond.value)
      if (cond.op === 'gt') return amt > threshold
      if (cond.op === 'lt') return amt < threshold
      if (cond.op === 'equals') return amt === threshold
      return false
  }

  const val = cond.value.toLowerCase()
  switch (cond.op) {
    case 'contains': return fieldValue.includes(val)
    case 'starts_with': return fieldValue.startsWith(val)
    case 'ends_with': return fieldValue.endsWith(val)
    case 'equals': return fieldValue === val
    default: return false
  }
}

async function reapply() {
  console.log('⚡ Evaluating all Indian rules against transactions in database...')
  const rules = await sql`SELECT * FROM tag_rules ORDER BY priority ASC, name ASC`
  const txs = await sql`SELECT * FROM transactions`

  let updated = 0
  for (const tx of txs) {
    for (const rule of rules) {
      const match = rule.conditions.every(c => evalCondition(tx, c))
      if (match) {
        const combined = Array.from(new Set([...(tx.tags || []), ...rule.tags]))
        const changed = combined.length !== (tx.tags || []).length || tx.tag_source !== 'rule'
        if (changed) {
          await sql`
            UPDATE transactions
            SET tags = ${combined}, tag_source = 'rule'
            WHERE id = ${tx.id}
          `
          updated++
        }
        break
      }
    }
  }

  console.log(`✅ Evaluated ${rules.length} rules across ${txs.length} transactions.`)
  console.log(`   Updated ${updated} transactions with active tags.`)
  await sql.end()
}

reapply().catch(err => {
  console.error('Error applying rules:', err)
  process.exit(1)
})
