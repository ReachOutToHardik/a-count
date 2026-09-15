import { Metadata } from 'next'
import { getAccounts, getTransactions, getTags } from '@/lib/db'
import { computeMonthlyStats } from '@/lib/utils'
import { Transaction, Account } from '@/lib/types'
import DashboardClient from './DashboardClient'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const [accounts, transactions, tags] = await Promise.all([
    getAccounts(),
    getTransactions({ limit: 5000 }),
    getTags(),
  ])

  const txList = (transactions ?? []) as Transaction[]
  const acctList = (accounts ?? []) as Account[]
  const tagMap = Object.fromEntries((tags ?? []).map(t => [t.name, t]))

  return (
    <DashboardClient
      accounts={acctList}
      transactions={txList}
      tagMap={tagMap}
    />
  )
}
