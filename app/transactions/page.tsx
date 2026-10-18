import { Metadata } from 'next'
import { getAccounts, getTransactions, getTags } from '@/lib/db'
import TransactionsClient from './TransactionsClient'

// Always read fresh data from the DB (otherwise Next prerenders this page once at build time)
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Transactions' }

export default async function TransactionsPage() {
  const [accounts, transactions, tags] = await Promise.all([
    getAccounts(),
    getTransactions({ limit: 2000 }),
    getTags(),
  ])

  const tagMap = Object.fromEntries(tags.map(t => [t.name, t]))

  return (
    <TransactionsClient
      accounts={accounts}
      transactions={transactions}
      tagMap={tagMap}
      allTags={tags}
    />
  )
}
