import { Suspense } from 'react'
import { Metadata } from 'next'
import { getAccounts, getTagRules, getTags } from '@/lib/db'
import ImportClient from './ImportClient'

export const metadata: Metadata = { title: 'Import Statement' }

export default async function ImportPage() {
  const [accounts, rules, tags] = await Promise.all([
    getAccounts(),
    getTagRules(),
    getTags(),
  ])

  const tagMap = Object.fromEntries(tags.map(t => [t.name, t]))

  return (
    <Suspense fallback={<div className="empty-state" style={{ marginTop: 40 }}><div className="empty-state-title">Loading Statement Engine…</div></div>}>
      <ImportClient
        accounts={accounts}
        rules={rules}
        tagMap={tagMap}
      />
    </Suspense>
  )
}
