import type { Metadata } from 'next'
import NetworthClient from './NetworthClient'

export const metadata: Metadata = {
  title: 'Net Worth',
  description: 'See your complete financial picture — assets, liabilities, investments, FDs, and net worth in one place.',
}

export default function NetworthPage() {
  return <NetworthClient />
}
