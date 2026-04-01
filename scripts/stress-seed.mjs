#!/usr/bin/env node
/**
 * Vide les tables graphe (links → book_authors → books → authors) puis insère un seed
 * réaliste (filiations féministes / afro-féministes) pour stresser chargement graphe / table.
 *
 * Requiert la clé service_role (recommandée) : les politiques RLS bloquent souvent les DELETE massifs avec la clé anon.
 *
 * Variables (ou .env.local) :
 *   SUPABASE_URL ou VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (recommandé)
 *
 * Options :
 *   --dry-run     affiche les volumes sans appeler Supabase
 *   --books=N     nombre d’ouvrages (défaut 500)
 *   --authors=M   nombre d’auteur·ices au-delà du noyau canonique (défaut 100)
 *   --seed=N      graine RNG (défaut 42)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

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

/** Noyau réaliste : auteur·ices et axes typiques du domaine */
const CANONICAL_AUTHORS = [
  { first_name: 'Simone', last_name: 'de Beauvoir', axes: ['HISTORY', 'INSTITUTIONAL'] },
  { first_name: 'Audre', last_name: 'Lorde', axes: ['AFROFEMINIST', 'QUEER'] },
  { first_name: 'bell', last_name: 'hooks', axes: ['AFROFEMINIST', 'ANTIRACISM'] },
  { first_name: 'Angela', last_name: 'Davis', axes: ['AFROFEMINIST', 'ANTIRACISM', 'HISTORY'] },
  { first_name: 'Gloria', last_name: 'Anzaldúa', axes: ['QUEER', 'HISTORY'] },
  { first_name: 'Chandra Talpade', last_name: 'Mohanty', axes: ['ANTIRACISM', 'INSTITUTIONAL'] },
  { first_name: 'Donna', last_name: 'Haraway', axes: ['ECOLOGY', 'HISTORY'] },
  { first_name: 'Sylvia', last_name: 'Wynter', axes: ['AFROFEMINIST', 'HISTORY'] },
  { first_name: 'Françoise', last_name: 'd’Eaubonne', axes: ['ECOLOGY', 'HISTORY'] },
  { first_name: 'Monique', last_name: 'Wittig', axes: ['QUEER', 'HISTORY'] },
  { first_name: 'Kimberlé', last_name: 'Crenshaw', axes: ['AFROFEMINIST', 'ANTIRACISM', 'INSTITUTIONAL'] },
  { first_name: 'Patricia Hill', last_name: 'Collins', axes: ['AFROFEMINIST', 'HISTORY'] },
  { first_name: 'Sara', last_name: 'Ahmed', axes: ['QUEER', 'INSTITUTIONAL'] },
  { first_name: 'Trinh T.', last_name: 'Minh-ha', axes: ['ANTIRACISM', 'HISTORY'] },
  { first_name: 'Édouard', last_name: 'Glissant', axes: ['AFROFEMINIST', 'HISTORY'] },
]

const CANONICAL_BOOKS = [
  { title: 'Le Deuxième Sexe', year: 1949, axes: ['HISTORY', 'INSTITUTIONAL'], authorLast: 'de Beauvoir' },
  { title: 'Sister Outsider', year: 1984, axes: ['AFROFEMINIST', 'QUEER'], authorLast: 'Lorde' },
  { title: 'Ain’t I a Woman', year: 1981, axes: ['AFROFEMINIST', 'HISTORY'], authorLast: 'hooks' },
  { title: 'Women, Race and Class', year: 1981, axes: ['AFROFEMINIST', 'ANTIRACISM'], authorLast: 'Davis' },
  { title: 'Borderlands / La Frontera', year: 1987, axes: ['QUEER', 'HISTORY'], authorLast: 'Anzaldúa' },
  { title: 'Under Western Eyes', year: 1988, axes: ['ANTIRACISM', 'INSTITUTIONAL'], authorLast: 'Mohanty' },
  { title: 'A Cyborg Manifesto', year: 1985, axes: ['ECOLOGY', 'HISTORY'], authorLast: 'Haraway' },
  { title: 'Unsettling the Coloniality of Being', year: 2003, axes: ['AFROFEMINIST', 'HISTORY'], authorLast: 'Wynter' },
  { title: 'Le Féminisme ou la Mort', year: 1974, axes: ['ECOLOGY', 'HISTORY'], authorLast: 'd’Eaubonne' },
  { title: 'The Straight Mind', year: 1980, axes: ['QUEER', 'HISTORY'], authorLast: 'Wittig' },
  {
    title: 'Demarginalizing the Intersection of Race and Sex',
    year: 1989,
    axes: ['AFROFEMINIST', 'ANTIRACISM', 'INSTITUTIONAL'],
    authorLast: 'Crenshaw',
  },
  { title: 'Black Feminist Thought', year: 1990, axes: ['AFROFEMINIST', 'HISTORY'], authorLast: 'Collins' },
  { title: 'Living a Feminist Life', year: 2017, axes: ['QUEER', 'INSTITUTIONAL'], authorLast: 'Ahmed' },
  { title: 'Woman, Native, Other', year: 1989, axes: ['ANTIRACISM', 'HISTORY'], authorLast: 'Minh-ha' },
]

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

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
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

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function parseArgs(argv) {
  let dryRun = false
  let bookTarget = 500
  let extraAuthors = 100
  let seed = 42
  for (const a of argv) {
    if (a === '--dry-run') dryRun = true
    else if (a.startsWith('--books=')) bookTarget = Math.max(20, parseInt(a.split('=')[1], 10) || 500)
    else if (a.startsWith('--authors=')) extraAuthors = Math.max(0, parseInt(a.split('=')[1], 10) || 100)
    else if (a.startsWith('--seed=')) seed = parseInt(a.split('=')[1], 10) || 42
  }
  return { dryRun, bookTarget, extraAuthors, seed }
}

async function wipe(supabase) {
  const { error: lErr } = await supabase.from('links').delete().not('id', 'is', null)
  if (lErr) throw new Error(`links: ${lErr.message}`)
  // Pas de colonne id sur book_authors
  const { error: baErr } = await supabase.from('book_authors').delete().not('book_id', 'is', null)
  if (baErr) throw new Error(`book_authors: ${baErr.message}`)
  const { error: bErr } = await supabase.from('books').delete().not('id', 'is', null)
  if (bErr) throw new Error(`books: ${bErr.message}`)
  const { error: aErr } = await supabase.from('authors').delete().not('id', 'is', null)
  if (aErr) throw new Error(`authors: ${aErr.message}`)
}

async function insertBatches(supabase, table, rows, batchSize = 400) {
  for (const part of chunk(rows, batchSize)) {
    const { error } = await supabase.from(table).insert(part)
    if (error) throw new Error(`${table} insert: ${error.message}`)
  }
}

function buildDataset({ bookTarget, extraAuthors, seed }) {
  const rng = mulberry32(seed)
  const authors = []
  const authorByLast = new Map()

  for (const a of CANONICAL_AUTHORS) {
    const id = randomUUID()
    authors.push({
      id,
      first_name: a.first_name,
      last_name: a.last_name,
      axes: a.axes,
      created_at: new Date().toISOString(),
    })
    authorByLast.set(a.last_name, id)
  }

  const firstNames = [
    'Aminata',
    'Camille',
    'Djénéba',
    'Élise',
    'Fatou',
    'Hélène',
    'Imani',
    'Jade',
    'Kaoutar',
    'Léna',
    'Maya',
    'Nour',
    'Océane',
    'Priya',
    'Rosa',
    'Soraya',
  ]
  const lastNames = [
    'Benali',
    'Cissé',
    'Dupont',
    'Fall',
    'García',
    'Koné',
    'Martin',
    'Ndoye',
    'Owusu',
    'Rossi',
    'Sow',
    'Traoré',
    'Varga',
    'Yaméogo',
    'Zhang',
  ]

  for (let i = 0; i < extraAuthors; i++) {
    const id = randomUUID()
    const fn = pick(rng, firstNames)
    const ln = `${pick(rng, lastNames)}-${i}`
    const axes = pickN(rng, AXES, 1 + Math.floor(rng() * 3))
    authors.push({
      id,
      first_name: fn,
      last_name: ln,
      axes,
      created_at: new Date().toISOString(),
    })
  }

  const books = []
  const bookAuthors = []

  for (const cb of CANONICAL_BOOKS) {
    const id = randomUUID()
    const aid = authorByLast.get(cb.authorLast)
    books.push({
      id,
      title: cb.title,
      first_name: '',
      last_name: '',
      year: cb.year,
      description: `Référence canonique — filiation féministe / afro-féministe (seed stress).`,
      axes: cb.axes,
      created_at: new Date().toISOString(),
    })
    if (aid) bookAuthors.push({ book_id: id, author_id: aid })
  }

  const themes = [
    'Transmission et archives',
    'Soins, vulnérabilité et politique',
    'Décolonialité et féminismes',
    'Corps, santé et justice',
    'Écologies féministes',
    'Institutions et légitimité',
    'Enfance et parentalités',
    'Antiracisme et solidarités',
  ]

  const remaining = Math.max(0, bookTarget - books.length)
  for (let i = 0; i < remaining; i++) {
    const id = randomUUID()
    const year = 1950 + Math.floor(rng() * 76)
    const th = pick(rng, themes)
    const axes = pickN(rng, AXES, 1 + Math.floor(rng() * 3))
    books.push({
      id,
      title: `${th} : cahier ${i + 1}`,
      first_name: '',
      last_name: '',
      year,
      description: `Ouvrage synthétique pour stress test — réseau de citations et d’influences.`,
      axes,
      created_at: new Date().toISOString(),
    })
    const author = pick(rng, authors)
    bookAuthors.push({ book_id: id, author_id: author.id })
  }

  books.sort((a, b) => (a.year ?? 0) - (b.year ?? 0))

  const links = []
  const linkKey = new Set()
  const contexts = ['Citation directe', 'Influence', 'Discussion critique', 'Réactivation', 'Traduction / médiation']

  for (let i = 0; i < books.length; i++) {
    const target = books[i]
    const windowStart = Math.max(0, i - 40)
    const predecessors = books.slice(windowStart, i)
    const nLinks = 1 + Math.floor(rng() * 4)
    let added = 0
    let guard = 0
    while (added < nLinks && predecessors.length && guard < 20) {
      guard++
      const source = pick(rng, predecessors)
      const key = `${source.id}->${target.id}`
      if (linkKey.has(key)) continue
      linkKey.add(key)
      links.push({
        id: randomUUID(),
        source_id: source.id,
        target_id: target.id,
        citation_text: pick(rng, [
          '« … une ligne de filiation à retracer … »',
          '« … héritage conceptuel explicite … »',
          '« … reprise et déplacement du cadre … »',
        ]),
        edition: pick(rng, ['1re éd.', '2e éd. revue', 'Trad. fr.', 'Poche']),
        page: String(20 + Math.floor(rng() * 200)),
        context: pick(rng, contexts),
        created_at: new Date().toISOString(),
      })
      added++
    }
  }

  return { authors, books, bookAuthors, links }
}

async function main() {
  loadEnvLocal()
  const { dryRun, bookTarget, extraAuthors, seed } = parseArgs(process.argv.slice(2))

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  const dataset = buildDataset({ bookTarget, extraAuthors, seed })

  console.log('Trans-trame — stress seed')
  console.log({
    books: dataset.books.length,
    authors: dataset.authors.length,
    book_authors: dataset.bookAuthors.length,
    links: dataset.links.length,
    seed,
    dryRun,
  })

  if (dryRun) {
    console.log('Dry-run : aucun appel Supabase.')
    return
  }

  if (!url || !key) {
    console.error('Manque SUPABASE_URL (ou VITE_SUPABASE_URL) et une clé (SUPABASE_SERVICE_ROLE_KEY recommandée).')
    process.exit(1)
  }

  const supabase = createClient(url, key)

  console.log('Vidage des tables…')
  await wipe(supabase)

  console.log('Insertion auteur·ices…')
  await insertBatches(supabase, 'authors', dataset.authors)

  console.log('Insertion ouvrages…')
  await insertBatches(supabase, 'books', dataset.books)

  console.log('Insertion book_authors…')
  await insertBatches(supabase, 'book_authors', dataset.bookAuthors)

  console.log('Insertion liens…')
  await insertBatches(supabase, 'links', dataset.links)

  console.log('Terminé.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
