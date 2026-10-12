import type { Metadata } from 'next'
import GlossaryClient from './GlossaryClient'

export const metadata: Metadata = {
  title: 'Glossary & Calculations — A-Count',
  description: 'Understand every metric, calculation, and formula used in A-Count.',
}

export default function GlossaryPage() {
  return <GlossaryClient />
}
