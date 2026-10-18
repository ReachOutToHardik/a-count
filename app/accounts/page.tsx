import { Metadata } from 'next'
import { getAccounts, getAccountStats } from '@/lib/db'
import AccountsClient from './AccountsClient'

// Always read fresh data from the DB (otherwise Next prerenders this page once at build time)
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Accounts' }

export default async function AccountsPage() {
  const [accounts, accountStats] = await Promise.all([
    getAccounts(),
    getAccountStats(),
  ])

  return <AccountsClient accounts={accounts} accountStats={accountStats} />
}
