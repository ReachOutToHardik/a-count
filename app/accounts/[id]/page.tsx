import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAccountById, getTransactions, getTags } from '@/lib/db'
import AccountDetailClient from './AccountDetailClient'

export const metadata: Metadata = { title: 'Account Detail' }

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [account, transactions, tags] = await Promise.all([
    getAccountById(id),
    getTransactions({ accountId: id, limit: 2000 }),
    getTags(),
  ])

  if (!account) notFound()

  const tagMap = Object.fromEntries(tags.map(t => [t.name, t]))

  return (
    <AccountDetailClient
      account={account}
      transactions={transactions}
      tagMap={tagMap}
    />
  )
}
