import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://nfecgzmehlloxctfyfao.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZWNnem1laGxsb3hjdGZ5ZmFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MDg1MTIsImV4cCI6MjA5MDI4NDUxMn0.TV_ES-lCNhKA7ZSsVKz_elqDtzaqouI3ypQOpDsZ5cY'
)

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
}
function authorName(n) {
  return [n.first_name, n.last_name].filter(Boolean).join(' ')
}
function richness(n) {
  return [n.first_name, n.last_name, n.year, n.description].filter(Boolean).length + (n.axes?.length || 0)
}

const { data: books } = await sb.from('books').select('*')
const { data: links } = await sb.from('links').select('*')

// Grouper les doublons
const map = new Map()
books.forEach(b => {
  const key = norm(b.title) + '|||' + norm(authorName(b))
  if (!map.has(key)) map.set(key, [])
  map.get(key).push(b)
})
const groups = Array.from(map.values()).filter(g => g.length > 1)
console.log(`${groups.length} groupes de doublons à traiter...\n`)

let merged = 0, deleted = 0, errors = 0

for (const group of groups) {
  // Garder le plus riche (plus de champs remplis + plus d'axes)
  const sorted = [...group].sort((a, b) => richness(b) - richness(a))
  const keep = sorted[0]
  const toDelete = sorted.slice(1)

  for (const dupe of toDelete) {
    // Rediriger les liens du doublon vers le nœud conservé
    const dupeLinks = links.filter(l => l.source_id === dupe.id || l.target_id === dupe.id)

    for (const link of dupeLinks) {
      const newSrc = link.source_id === dupe.id ? keep.id : link.source_id
      const newTgt = link.target_id === dupe.id ? keep.id : link.target_id

      // Ignorer les auto-liens et les doublons de liens
      if (newSrc === newTgt) continue
      const alreadyExists = links.some(l =>
        l.id !== link.id &&
        ((l.source_id === newSrc && l.target_id === newTgt) ||
         (l.source_id === newTgt && l.target_id === newSrc))
      )
      if (alreadyExists) continue

      const { error } = await sb.from('links').update({ source_id: newSrc, target_id: newTgt }).eq('id', link.id)
      if (error) { console.log('  ⚠️  lien', link.id, error.message); errors++ }
      else merged++
    }

    // Supprimer le doublon (CASCADE supprime les liens non redirigés)
    const { error } = await sb.from('books').delete().eq('id', dupe.id)
    if (error) { console.log(`  ❌ "${dupe.title}" (${dupe.id}):`, error.message); errors++ }
    else { console.log(`  🗑  "${dupe.title}" → gardé: "${keep.title}"`); deleted++ }
  }
}

console.log(`\n✅ ${deleted} doublons supprimés, ${merged} liens redirigés, ${errors} erreurs.`)
