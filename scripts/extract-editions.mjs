#!/usr/bin/env node
/**
 * Extrait toutes les éditions distinctes présentes dans la table `links`
 * et les affiche sous forme de tableau JS exploitable par le smart import.
 *
 * Usage :
 *   node scripts/extract-editions.mjs
 *   node scripts/extract-editions.mjs --json          # sortie JSON brut
 *   node scripts/extract-editions.mjs --out=fichier   # écrit dans un fichier
 *
 * Variables (ou .env.local) :
 *   SUPABASE_URL ou VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY ou VITE_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// ── Load .env.local ────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(root, '.env.local')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([\w]+)\s*=\s*(.+?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}
loadEnv()

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('❌  SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (ou VITE_*) requis.')
  process.exit(1)
}

const supabase = createClient(url, key)

// ── Args ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const jsonOnly = args.includes('--json')
const outArg = args.find((a) => a.startsWith('--out='))
const outPath = outArg ? resolve(outArg.split('=')[1]) : null

// ── Query ──────────────────────────────────────────────────────────────────
const { data, error } = await supabase
  .from('links')
  .select('edition')

if (error) {
  console.error('❌  Erreur Supabase :', error.message)
  process.exit(1)
}

// Extraire les valeurs uniques, nettoyer, trier
const editions = [...new Set(
  data
    .map((r) => (r.edition || '').trim())
    .filter((e) => e.length > 0)
)].sort((a, b) => a.localeCompare(b, 'fr'))

// ── Output ─────────────────────────────────────────────────────────────────
if (jsonOnly) {
  console.log(JSON.stringify(editions, null, 2))
} else {
  console.log(`\n📚  ${editions.length} éditions distinctes trouvées :\n`)
  console.log('export const KNOWN_EDITIONS: string[] = [')
  for (const e of editions) {
    console.log(`  ${JSON.stringify(e)},`)
  }
  console.log(']\n')
}

if (outPath) {
  const content = `/**
 * Éditions connues dans Trans-Trame — généré par scripts/extract-editions.mjs
 * Dernière extraction : ${new Date().toISOString().slice(0, 10)}
 */
export const KNOWN_EDITIONS: string[] = [\n${editions.map((e) => `  ${JSON.stringify(e)},`).join('\n')}\n]\n`
  writeFileSync(outPath, content, 'utf-8')
  console.log(`✅  Écrit dans ${outPath}`)
}
