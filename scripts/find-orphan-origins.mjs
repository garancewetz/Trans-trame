#!/usr/bin/env node
/**
 * Diagnostic : retrouve à quels ouvrages ont pu être liés des auteur·ices orphelin·es.
 *
 * v2 — corrige le matching first_name (Stephen ≠ Steven), inclut les livres soft-deleted,
 * compte le nombre d'auteur·ices par livre dans la fenêtre, et propose des candidats forts
 * basés sur la connaissance des œuvres co-signées de chaque auteur·ice.
 *
 * Limitation : le book_authors join table n'a PAS de trigger d'audit (seuls books/authors/links
 * y sont). Donc on ne peut pas prouver formellement quel livre a perdu quel·le co-auteur·ice.
 * On infère par : créé·es dans la même fenêtre = même import = très probable co-auteur.
 *
 * Usage : node scripts/find-orphan-origins.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvLocal() {
  const p = resolve(process.cwd(), '.env.local')
  if (!existsSync(p)) return
  const raw = readFileSync(p, 'utf8')
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1)
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvLocal()

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Manque VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (ou SERVICE_ROLE)')
  process.exit(1)
}

const supabase = createClient(url, key)

const ORPHANS = [
  { last: 'KAULA', first: 'H.' },
  { last: 'WHIPPLE', first: 'B.' },
  { last: 'ROSE', first: 'Stephen' },
  { last: 'COLEBROOK', first: 'Claire' },
  { last: 'IZENOUR', first: 'Steven' },
  { last: 'BROWN', first: 'Denise Scott' },
]

/**
 * Heuristiques manuelles : ouvrages co-signés notoires de chaque auteur·ice.
 * Pour chaque orphelin·e, on liste des fragments de titre à matcher dans la fenêtre d'import.
 */
const KNOWN_WORKS = {
  'KAULA H.': [
    /science of orgasm/i, // Komisaruk, Beyer-Flores, Whipple — pas Kaula. Mais parfois mal attribué.
    /g[ -]?spot/i,
  ],
  'WHIPPLE B.': [
    /science of orgasm/i, // Beverly Whipple co-autrice
    /g[ -]?spot/i, // The G Spot, Whipple/Perry/Ladas
    /beyond the g[ -]?spot/i,
  ],
  'ROSE Stephen': [
    // Stephen J. Rose, économiste américain (≠ Steven Rose, neuroscientifique britannique)
    /american profile poster/i, // The American Profile Poster (1986), Stephen J. Rose
    /poverty in the american dream/i, // Poverty in the American Dream (1983), Stephen Rose
    /social stratification/i,
  ],
  'COLEBROOK Claire': [
    /deleuze and feminist theory/i, // co-éditrice avec Ian Buchanan
  ],
  'IZENOUR Steven': [
    /learning from las vegas/i, // Venturi, Scott Brown, Izenour
  ],
  'BROWN Denise Scott': [
    /learning from las vegas/i, // Venturi, Scott Brown, Izenour
  ],
}

async function main() {
  // ── 1. Charger toutes les ressources nécessaires en bloc ──────────────────
  const [authorsRes, booksRes, baRes] = await Promise.all([
    supabase.from('authors').select('*'), // y compris deleted (RLS public select utilise deleted_at IS NULL — donc filtré côté DB)
    supabase.from('books').select('id, title, year, created_at, created_by, import_source_id, deleted_at'),
    supabase.from('book_authors').select('book_id, author_id'),
  ])
  if (authorsRes.error || booksRes.error || baRes.error) {
    console.error('fetch:', authorsRes.error, booksRes.error, baRes.error)
    process.exit(1)
  }
  const authors = authorsRes.data || []
  const books = booksRes.data || []
  const bookAuthors = baRes.data || []

  console.log(`Authors: ${authors.length}, Books: ${books.length}, BookAuthors: ${bookAuthors.length}`)

  // index : authorId → nb de book_authors actuels
  const authorBookCount = new Map()
  for (const ba of bookAuthors) {
    authorBookCount.set(ba.author_id, (authorBookCount.get(ba.author_id) || 0) + 1)
  }

  // index : bookId → liste de author_ids
  const bookAuthorMap = new Map()
  for (const ba of bookAuthors) {
    if (!bookAuthorMap.has(ba.book_id)) bookAuthorMap.set(ba.book_id, [])
    bookAuthorMap.get(ba.book_id).push(ba.author_id)
  }

  // ── 2. Pour chaque orphelin·e cible, traiter ─────────────────────────────
  for (const o of ORPHANS) {
    console.log(`\n${'═'.repeat(78)}`)
    console.log(`## ${o.last} ${o.first}`)
    console.log('═'.repeat(78))

    // Match strict last_name + first_name (full)
    const matches = authors.filter(
      (a) =>
        (a.last_name || '').toLowerCase() === o.last.toLowerCase() &&
        ((a.first_name || '').toLowerCase() === o.first.toLowerCase() ||
          (a.first_name || '').toLowerCase().startsWith(o.first.toLowerCase().replace('.', ''))),
    )
    if (matches.length === 0) {
      // Fallback : juste le nom de famille
      const lastOnly = authors.filter((a) => (a.last_name || '').toLowerCase() === o.last.toLowerCase())
      console.log(`   Aucun match exact ; ${lastOnly.length} match(es) sur le nom de famille seul :`)
      for (const a of lastOnly) console.log(`     - id=${a.id}  ${a.first_name} ${a.last_name}`)
      continue
    }
    if (matches.length > 1) {
      console.log(`   ${matches.length} matches (homonymes) :`)
      for (const a of matches) console.log(`     - id=${a.id}  ${a.first_name} ${a.last_name}  (${authorBookCount.get(a.id) || 0} livres)`)
    }

    for (const a of matches) {
      const cnt = authorBookCount.get(a.id) || 0
      console.log(`\n  ── Candidat·e: ${a.first_name} ${a.last_name} (id=${a.id}, ${cnt} livres actuels)`)
      console.log(`     créé·e: ${a.created_at} | par: ${a.created_by ?? '?'} | deleted_at: ${a.deleted_at ?? '–'}`)

      if (cnt > 0) {
        const ids = bookAuthors.filter((b) => b.author_id === a.id).map((b) => b.book_id)
        console.log(`     livres actuellement liés:`)
        for (const id of ids) {
          const b = books.find((x) => x.id === id)
          if (b) console.log(`       • [${b.id}] "${b.title}" (${b.year ?? '?'})`)
        }
      }

      // Fenêtre d'import ±10 minutes
      const tCreated = new Date(a.created_at).getTime()
      const win = books.filter((b) => {
        const bt = new Date(b.created_at).getTime()
        return Math.abs(bt - tCreated) <= 10 * 60_000
      })

      const key = `${o.last} ${o.first}`
      const knownPatterns = KNOWN_WORKS[key] || []

      // Cherche les matches forts (titre contient un fragment connu)
      const strong = win.filter((b) => knownPatterns.some((p) => p.test(b.title || '')))

      if (strong.length > 0) {
        console.log(`     🎯 CANDIDATS FORTS (titre matche œuvre connue de cet·te auteur·ice) :`)
        for (const b of strong) {
          const others = (bookAuthorMap.get(b.id) || []).map((aid) => {
            const ax = authors.find((x) => x.id === aid)
            return ax ? `${ax.first_name} ${ax.last_name}` : aid
          })
          const del = b.deleted_at ? ' [SOFT-DELETED]' : ''
          console.log(`       ✓ [${b.id}] "${b.title}" (${b.year ?? '?'})${del}`)
          console.log(`         co-auteur·ices actuels: ${others.length ? others.join(', ') : '(aucun·e)'}`)
        }
      } else {
        console.log(`     (aucun candidat fort dans la fenêtre — voir la liste complète plus bas)`)
      }

      // Aussi : livres soft-deleted dans la fenêtre
      const deleted = win.filter((b) => b.deleted_at)
      if (deleted.length > 0) {
        console.log(`     ⚠ ${deleted.length} livre(s) soft-deleted dans la fenêtre :`)
        for (const b of deleted.slice(0, 5)) {
          console.log(`       - [${b.id}] "${b.title}" deleted_at=${b.deleted_at}`)
        }
      }

      console.log(`     fenêtre totale: ${win.length} livres créés ±10 min (même import probablement)`)
    }
  }

  // ── 3. Génère une requête SQL prête à coller dans le SQL Editor de Supabase ───
  const orphanIds = ORPHANS.flatMap((o) =>
    authors
      .filter(
        (a) =>
          (a.last_name || '').toLowerCase() === o.last.toLowerCase() &&
          ((a.first_name || '').toLowerCase() === o.first.toLowerCase() ||
            (a.first_name || '').toLowerCase().startsWith(o.first.toLowerCase().replace('.', ''))),
      )
      .map((a) => `'${a.id}'`),
  )
  console.log(`\n${'═'.repeat(78)}`)
  console.log(`SQL à exécuter dans le SQL Editor Supabase (accès whitelisted requis)`)
  console.log('═'.repeat(78))
  console.log(`
-- Cherche dans activity_log toute trace des IDs orphelins en old_values/new_values
SELECT created_at, entity_type, entity_id, operation,
       old_values::text ILIKE '%KAULA%'   OR new_values::text ILIKE '%KAULA%'   AS hit_kaula,
       old_values::text ILIKE '%WHIPPLE%' OR new_values::text ILIKE '%WHIPPLE%' AS hit_whipple,
       old_values::text ILIKE '%IZENOUR%' OR new_values::text ILIKE '%IZENOUR%' AS hit_izenour
FROM activity_log
WHERE
  ${orphanIds.map((id) => `old_values::text LIKE '%${id.slice(1, -1)}%' OR new_values::text LIKE '%${id.slice(1, -1)}%'`).join('\n  OR ')}
ORDER BY created_at DESC;

-- Variante : cherche par nom de famille dans les old_values JSONB de books
SELECT created_at, entity_id, operation, old_values, new_values
FROM activity_log
WHERE entity_type = 'books'
  AND (old_values::text ~* '(KAULA|WHIPPLE|IZENOUR|COLEBROOK)')
ORDER BY created_at DESC;
`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
