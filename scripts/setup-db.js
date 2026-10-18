const fs = require('fs')
const path = require('path')

// Read .env.local manually
const envPath = path.join(__dirname, '..', '.env.local')
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!')
  process.exit(1)
}

const envContent = fs.readFileSync(envPath, 'utf8')
const match = envContent.match(/DATABASE_URL=(.+)/)
if (!match) {
  console.error('❌ DATABASE_URL not found in .env.local')
  process.exit(1)
}

const databaseUrl = match[1].trim()
const isNeon = databaseUrl.includes('neon.tech')
const isSupabase = databaseUrl.includes('supabase.co') || databaseUrl.includes('supabase.com') || databaseUrl.includes('pooler.supabase.com')

console.log(`🔌 Connecting to ${isSupabase ? 'Supabase' : isNeon ? 'Neon' : 'PostgreSQL'} database...`)

let sql
if (isNeon) {
  const { neon } = require('@neondatabase/serverless')
  sql = neon(databaseUrl)
} else {
  const postgres = require('postgres')
  sql = postgres(databaseUrl, {
    ssl: databaseUrl.includes('localhost') ? false : 'require',
    prepare: false, // Supabase transaction pooler (port 6543) does not support prepared statements
    connect_timeout: 15,
  })
}

async function executeSql(rawStmt) {
  if (isNeon) {
    return sql.query(rawStmt)
  } else {
    return sql.unsafe(rawStmt)
  }
}

async function runScript(filePath) {
  console.log(`\n📄 Running ${path.basename(filePath)}...`)
  const content = fs.readFileSync(filePath, 'utf8')
  
  if (isNeon) {
    const statements = content
      .split(/;\s*[\r\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      if (!stmt || stmt.startsWith('--')) continue
      try {
        await sql.query(stmt)
      } catch (err) {
        if (!err.message.includes('already exists') && !err.message.includes('duplicate key')) {
          console.warn(`  ⚠️ Warning on statement ${i + 1}:`, err.message)
        }
      }
    }
  } else {
    // Postgres natively executes the entire multi-statement file atomically
    await sql.unsafe(content)
  }
}

async function setup() {
  try {
    const schema1 = path.join(__dirname, '..', 'neon', 'schema.sql')
    const schema2 = path.join(__dirname, '..', 'neon', 'networth_schema.sql')

    await runScript(schema1)
    await runScript(schema2)

    console.log('\n🔍 Verifying tables in database...')
    const rows = await executeSql("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename ASC")
    console.log('\n✅ All tables initialized successfully:')
    const tableList = Array.isArray(rows) ? rows : (rows.rows || [])
    tableList.forEach(r => console.log(`   - ${r.tablename}`))
    console.log('\n🎉 Setup complete! You can now use A-Count with full functionality.')
  } catch (err) {
    console.error('\n❌ Setup error:', err.message)
    if (err.cause) console.error('  Cause:', err.cause)
  } finally {
    if (!isNeon && sql && sql.end) {
      await sql.end()
    }
  }
}

setup()
