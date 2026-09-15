import { Metadata } from 'next'
import { getTags, getTagRules } from '@/lib/db'
import TagsClient from './TagsClient'

export const metadata: Metadata = { title: 'Tags & Rules' }

export default async function TagsPage() {
  const [tags, rules] = await Promise.all([
    getTags(),
    getTagRules(),
  ])

  return <TagsClient tags={tags} rules={rules} />
}
