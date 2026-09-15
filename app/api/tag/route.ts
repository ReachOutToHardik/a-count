import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const VALID_TAGS = [
  'food', 'delivery', 'groceries', 'transport', 'cab', 'bike', 'fuel',
  'shopping', 'clothing', 'beauty', 'recharge', 'utilities', 'bills',
  'entertainment', 'subscription', 'medical', 'transfer', 'salary',
  'income', 'interest', 'dividend', 'cash', 'atm', 'rent', 'other'
]

interface TxInput {
  id: string
  description: string
  amount: number
  type: string
  upi_vpa?: string | null
  upi_name?: string | null
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
  }

  const { transactions }: { transactions: TxInput[] } = await request.json()

  if (!transactions?.length) {
    return NextResponse.json({ results: [] })
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  // Process in batches of 50
  const batchSize = 50
  const results: { id: string; tags: string[] }[] = []

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize)

    const prompt = `You are a financial transaction classifier. Classify each bank transaction into one or more tags from the allowed list.

Allowed tags: ${VALID_TAGS.join(', ')}

Transactions (JSON array):
${JSON.stringify(batch.map(tx => ({
  id: tx.id,
  desc: tx.description,
  upi: tx.upi_vpa || tx.upi_name || '',
  amount: tx.amount,
  type: tx.type,
})), null, 2)}

Return ONLY a JSON array like:
[{"id":"<id>","tags":["tag1","tag2"]},...]

Rules:
- Use 1-3 tags per transaction
- Only use tags from the allowed list
- For transfers/UPI between people, use ["transfer"]
- For salary/income use ["salary","income"]
- If truly unknown, use ["other"]
- Return valid JSON only, no explanation`

    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      
      // Extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { id: string; tags: string[] }[]
        // Validate tags
        for (const item of parsed) {
          item.tags = item.tags.filter(t => VALID_TAGS.includes(t))
          if (item.tags.length === 0) item.tags = ['other']
          results.push(item)
        }
      }
    } catch (err) {
      console.error('Gemini batch error:', err)
      // Return fallback for this batch
      for (const tx of batch) {
        results.push({ id: tx.id, tags: ['other'] })
      }
    }
  }

  return NextResponse.json({ results })
}
