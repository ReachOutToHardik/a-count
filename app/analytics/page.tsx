import { Metadata } from 'next'
import { getTransactions, getAccounts, getTags } from '@/lib/db'
import AnalyticsClient from './AnalyticsClient'

export const metadata: Metadata = { title: 'Analytics' }

export default async function AnalyticsPage() {
  const [transactions, accounts, tags] = await Promise.all([
    getTransactions({ limit: 5000 }),
    getAccounts(),
    getTags(),
  ])

  const tagMap = Object.fromEntries(tags.map(t => [t.name, t]))

  return (
    <AnalyticsClient
      transactions={transactions}
      accounts={accounts}
      tagMap={tagMap}
    />
  )
}
