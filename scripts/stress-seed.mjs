/**
 * Stress test : ~120 auteurs, 300 ouvrages, ~800–1100 liens.
 * Graphe hub-and-spoke : une poignée d’ouvrages « foyers » (canon) très cités,
 * la majorité des ouvrages cite surtout ces foyers ; liens satellite–satellite rares.
 *
 * Prérequis : variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (ex. .env.local).
 *
 * Usage :
 *   node --env-file=.env.local scripts/stress-seed.mjs seed
 *   node --env-file=.env.local scripts/stress-seed.mjs clean
 *
 * npm run stress-seed
 * npm run stress-seed:clean
 */

import { createClient } from '@supabase/supabase-js'

const AXES = [
  'ECOLOGY',
  'QUEER',
  'AFROFEMINIST',
  'ANTIRACISM',
  'CHILDHOOD',
  'HEALTH',
  'CRIP',
  'HISTORY',
  'INSTITUTIONAL',
]

const BOOK_PREFIX = 'stress-book-'
const AUTHOR_PREFIX = 'stress-author-'
const BATCH = 200

function env(name) {
  const v = process.env[name]
  return v && String(v).trim() ? String(v).trim() : ''
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)]
}

function pickN(rng, arr, n) {
  const copy = [...arr]
  const out = []
  while (out.length < n && copy.length) {
    const i = Math.floor(rng() * copy.length)
    out.push(copy.splice(i, 1)[0])
  }
  return out
}

/** Sans remise, probabilités proportionnelles à `weights` (même longueur que `items`). */
function pickWeightedN(rng, items, weights, n) {
  const pool = items.map((id, i) => ({ id, w: Math.max(1e-9, weights[i]) }))
  const out = []
  while (out.length < n && pool.length) {
    let sum = 0
    for (const p of pool) sum += p.w
    let r = rng() * sum
    let idx = pool.length - 1
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].w
      if (r <= 0) {
        idx = i
        break
      }
    }
    out.push(pool.splice(idx, 1)[0].id)
  }
  return out
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

async function insertBatches(supabase, table, rows) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const { error } = await supabase.from(table).insert(chunk)
    if (error) throw new Error(`${table} insert: ${error.message}`)
  }
}

async function seed() {
  const url = env('VITE_SUPABASE_URL')
  const key = env('VITE_SUPABASE_ANON_KEY')
  if (!url || !key) {
    console.error(
      'Définir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (ex. node --env-file=.env.local …)'
    )
    process.exit(1)
  }

  const supabase = createClient(url, key)
  const rng = mulberry32(0x73747265) // "stre"

  const authorCount = 120
  const bookCount = 300
  const authorIds = Array.from({ length: authorCount }, (_, i) => `${AUTHOR_PREFIX}${i}`)
  const bookIds = Array.from({ length: bookCount }, (_, i) => `${BOOK_PREFIX}${i}`)

  const authors = authorIds.map((id, i) => ({
    id,
    first_name: 'Stress',
    last_name: `Auteur ${i}`,
    axes: pickN(rng, AXES, 1 + Math.floor(rng() * 2)),
  }))

  /** @type {{ bookId: string; authorIds: string[] }[]} */
  const bookAuthorPairs = []

  const books = bookIds.map((id, i) => {
    const na = 1 + Math.floor(rng() * 2)
    const bookAuthorIds = pickN(rng, authorIds, na)
    bookAuthorPairs.push({ bookId: id, authorIds: bookAuthorIds })
    return {
      id,
      title: `Ouvrage stress ${i + 1}`,
      first_name: '',
      last_name: '',
      year: 1980 + Math.floor(rng() * 45),
      description: `Description générée pour le stress test (#${i + 1}).`,
      axes: pickN(rng, AXES, 1 + Math.floor(rng() * 2)),
    }
  })

  /** @type {{ source_id: string; target_id: string; citation_text: string; context: string; edition: string; page: string }[]} */
  const links = []
  const seen = new Set()

  function addLink(source_id, target_id) {
    if (source_id === target_id) return
    const k = `${source_id}\0${target_id}`
    if (seen.has(k)) return
    seen.add(k)
    links.push({
      source_id,
      target_id,
      citation_text: 'Citation (stress test)',
      context: '',
      edition: '',
      page: String(1 + Math.floor(rng() * 200)),
    })
  }

  // —— Foyers (canon) : ~4–6 % des ouvrages, fortement cités (poids inégaux).
  const hubCount = Math.min(20, Math.max(10, Math.round(bookCount * 0.05)))
  const hubIds = bookIds.slice(0, hubCount)
  const satIds = bookIds.slice(hubCount)
  const hubWeights = hubIds.map((_, i) => 1.2 + rng() * 0.8 + (hubCount - i) * 0.15)

  // Satellites → foyers : chaque périphérie cite surtout le canon.
  for (const s of satIds) {
    const nToHubs = 2 + Math.floor(rng() * 4) // 2–5 citations vers des foyers
    for (const t of pickWeightedN(rng, hubIds, hubWeights, nToHubs)) {
      addLink(s, t)
    }
    // Rarement un satellite cite un autre (même « orbite », pas maillage complet).
    if (rng() < 0.12 && satIds.length > 1) {
      const others = satIds.filter((x) => x !== s)
      addLink(s, pick(rng, others))
    }
  }

  // Foyers ↔ foyers : réseau clairsemé entre références majeures.
  for (const h of hubIds) {
    const others = hubIds.filter((x) => x !== h)
    const wOthers = others.map((id) => hubWeights[hubIds.indexOf(id)])
    const n = 1 + Math.floor(rng() * 2) // 1–2 autres foyers cités
    for (const t of pickWeightedN(rng, others, wOthers, Math.min(n, others.length))) {
      addLink(h, t)
    }
  }

  // Foyers → satellites : le canon renvoie parfois vers des travaux périphériques.
  for (const h of hubIds) {
    const nOut = 1 + Math.floor(rng() * 4) // 1–4
    for (let k = 0; k < nOut && satIds.length; k++) {
      addLink(h, pick(rng, satIds))
    }
  }

  // Build junction rows from bookAuthorPairs
  const bookAuthorsRows = bookAuthorPairs.flatMap(({ bookId, authorIds: aids }) =>
    aids.map((author_id) => ({ book_id: bookId, author_id }))
  )

  const t0 = performance.now()
  await insertBatches(supabase, 'authors', authors)
  await insertBatches(supabase, 'books', books)
  await insertBatches(supabase, 'book_authors', bookAuthorsRows)
  await insertBatches(supabase, 'links', links)
  const ms = Math.round(performance.now() - t0)

  console.log(
    `OK — ${authors.length} auteurs, ${books.length} ouvrages, ${links.length} liens en ${ms} ms`
  )
}

async function clean() {
  const url = env('VITE_SUPABASE_URL')
  const key = env('VITE_SUPABASE_ANON_KEY')
  if (!url || !key) {
    console.error(
      'Définir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (ex. node --env-file=.env.local …)'
    )
    process.exit(1)
  }

  const supabase = createClient(url, key)

  const pattern = `${BOOK_PREFIX}%`
  const { error: e1 } = await supabase.from('links').delete().like('source_id', pattern)
  if (e1) throw new Error(`links delete (source): ${e1.message}`)
  const { error: e1b } = await supabase.from('links').delete().like('target_id', pattern)
  if (e1b) throw new Error(`links delete (target): ${e1b.message}`)

  // book_authors cleaned up by CASCADE when books/authors are deleted
  const { error: e2 } = await supabase.from('books').delete().like('id', `${BOOK_PREFIX}%`)
  if (e2) throw new Error(`books delete: ${e2.message}`)

  const { error: e3 } = await supabase.from('authors').delete().like('id', `${AUTHOR_PREFIX}%`)
  if (e3) throw new Error(`authors delete: ${e3.message}`)

  console.log('OK — données stress supprimées (liens, ouvrages, auteurs).')
}

const cmd = process.argv[2] || 'seed'
;(async () => {
  try {
    if (cmd === 'clean') await clean()
    else if (cmd === 'seed') await seed()
    else {
      console.error('Usage: stress-seed.mjs [seed|clean]')
      process.exit(1)
    }
  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  }
})()
