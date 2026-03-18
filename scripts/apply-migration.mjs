// Utility script to apply migration SQL via Supabase's REST API
// Usage: node scripts/apply-migration.mjs
// This uses the anon key + service role to execute SQL

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '00001_initial_schema.sql')
const sql = readFileSync(sqlPath, 'utf-8')

console.log('Reading migration file...')
console.log(`SQL length: ${sql.length} characters`)
console.log('This script cannot execute DDL directly via the REST API.')
console.log('')
console.log('Please apply the migration using one of these methods:')
console.log('')
console.log('METHOD 1: Supabase Dashboard SQL Editor (Recommended)')
console.log('  1. Go to https://supabase.com/dashboard/project/twoesyyxaypygyajhdtd/sql/new')
console.log('  2. Copy the entire contents of: supabase/migrations/00001_initial_schema.sql')
console.log('  3. Paste into the SQL editor')
console.log('  4. Click "Run"')
console.log('')
console.log('METHOD 2: Supabase CLI with database password')
console.log('  npx supabase db push --db-url "postgresql://postgres:YOUR_PASSWORD@db.twoesyyxaypygyajhdtd.supabase.co:5432/postgres"')
console.log('')
console.log('METHOD 3: Supabase CLI login')
console.log('  npx supabase login')
console.log('  npx supabase link --project-ref twoesyyxaypygyajhdtd')
console.log('  npx supabase db push')
