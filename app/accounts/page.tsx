import { Metadata } from 'next'
import { getAccounts, getTransactions } from '@/lib/db'
import AccountsClient from './AccountsClient'

export const metadata: Metadata = { title: 'Accounts' }

export default async function AccountsPage() {
  const [accounts, transactions] = await Promise.all([
    getAccounts(),
    getTransactions({ limit: 5000 }),
  ])

  const accountStats: Record<string, { credit: number; debit: number; count: number }> = {}
  for (const tx of transactions) {
    if (!accountStats[tx.account_id]) accountStats[tx.account_id] = { credit: 0, debit: 0, count: 0 }
    if (tx.type === 'credit') accountStats[tx.account_id].credit += tx.amount
    else accountStats[tx.account_id].debit += tx.amount
    accountStats[tx.account_id].count++
  }

  return <AccountsClient accounts={accounts} accountStats={accountStats} />
}
