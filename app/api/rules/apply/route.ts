import { NextResponse } from 'next/server'
import { getDb, getTagRules, getTransactions } from '@/lib/db'
import { runRulesEngine } from '@/lib/tagger/engine'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const scope = body.scope || 'untagged' // 'untagged' | 'all'
    const accountId = body.accountId || undefined

    const [rules, transactions] = await Promise.all([
      getTagRules(),
      getTransactions({ accountId, limit: 5000 }),
    ])

    if (rules.length === 0 || transactions.length === 0) {
      return NextResponse.json({ updatedCount: 0, totalProcessed: transactions.length })
    }

    const sql = getDb()
    let updatedCount = 0

    const toProcess = scope === 'untagged'
      ? transactions.filter(t => t.tags.length === 0)
      : transactions

    for (const tx of toProcess) {
      const originalTags = [...tx.tags]
      if (scope === 'all') {
        tx.tags = []
      }
      runRulesEngine([tx], rules)

      // Check if tags changed
      const tagsChanged = JSON.stringify(originalTags.sort()) !== JSON.stringify(tx.tags.sort())
      if (tagsChanged && tx.tags.length > 0) {
        await sql`
          UPDATE transactions
          SET tags = ${tx.tags}, tag_source = 'rule'
          WHERE id = ${tx.id}
        `
        updatedCount++
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      totalProcessed: toProcess.length,
    })
  } catch (err: any) {
    console.error('API apply rules error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
