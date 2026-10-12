const fs = require('fs')
const path = require('path')

const scriptPath = path.join(__dirname, 'add-indian-rules.js')
const content = fs.readFileSync(scriptPath, 'utf8')

const tagsMatch = content.match(/const INDIAN_TAGS = (\[[\s\S]*?\])\s*const INDIAN_RULES/)
const rulesMatch = content.match(/const INDIAN_RULES = (\[[\s\S]*?\])\s*function escapeSql/)

if (!tagsMatch || !rulesMatch) {
  console.error('Could not parse INDIAN_TAGS or INDIAN_RULES')
  process.exit(1)
}

const tags = eval(tagsMatch[1])
const rules = eval(rulesMatch[1])

function escapeSql(str) {
  return "'" + str.replace(/'/g, "''") + "'"
}

const tagSql = 'INSERT INTO tags (name, color, icon) VALUES\n' +
  tags.map(t => `  (${escapeSql(t.name)}, ${escapeSql(t.color)}, ${escapeSql(t.icon)})`).join(',\n') +
  '\nON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color, icon = EXCLUDED.icon;\n'

const ruleSql = 'INSERT INTO tag_rules (name, priority, conditions, tags) VALUES\n' +
  rules.map(r => {
    const conds = escapeSql(JSON.stringify(r.conditions))
    const tagsArr = 'ARRAY[' + r.tags.map(t => escapeSql(t)).join(',') + ']'
    return `  (${escapeSql(r.name)}, ${r.priority}, ${conds}, ${tagsArr})`
  }).join(',\n') + ';\n'

const schemaPath = path.join(__dirname, '..', 'neon', 'schema.sql')
const schema = fs.readFileSync(schemaPath, 'utf8')
const marker = '-- ─── Seed: Default Tags'
const cutIdx = schema.indexOf(marker)

if (cutIdx === -1) {
  console.error('Could not find seed marker in schema.sql')
  process.exit(1)
}

const newSchema = schema.substring(0, cutIdx) +
  '-- ─── Seed: Indian Curated Tags ──────────────────────────────────────────\n' +
  tagSql + '\n' +
  '-- ─── Seed: Indian Comprehensive Automated Rules ─────────────────────────\n' +
  ruleSql

fs.writeFileSync(schemaPath, newSchema, 'utf8')
console.log('✅ neon/schema.sql updated with full Indian tags & rules!')
