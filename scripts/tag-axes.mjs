import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nfecgzmehlloxctfyfao.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZWNnem1laGxsb3hjdGZ5ZmFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MDg1MTIsImV4cCI6MjA5MDI4NDUxMn0.TV_ES-lCNhKA7ZSsVKz_elqDtzaqouI3ypQOpDsZ5cY'
)

// Mapping titre → axes cibles
const TARGETS = [
  { title: "Ainsi l'Animal et nous",                         axes: ['ECOLOGY', 'ANTIRACISM'] },
  { title: "Décolonisons-nous",                              axes: ['ANTIRACISM'] },
  { title: "Suites décoloniales",                            axes: ['ANTIRACISM', 'HISTORY'] },
  { title: "Race",                                           axes: ['INSTITUTIONAL', 'ANTIRACISM'] },
  { title: "L'Opposé de la blancheur",                       axes: ['AFROFEMINIST', 'ANTIRACISM'] },
  { title: "Petit Manuel de lutte contre l'antisémitisme",   axes: ['ANTIRACISM'] },
  { title: "Notre dignité",                                  axes: ['AFROFEMINIST', 'ANTIRACISM'] },
  { title: "Le Triangle et l'Hexagone",                      axes: ['AFROFEMINIST', 'HISTORY'] },
  { title: "Entrer en pédagogie antiraciste",                axes: ['INSTITUTIONAL', 'ANTIRACISM'] },
  { title: "Des Blancs comme les autres",                    axes: ['ANTIRACISM', 'HISTORY'] },
  { title: "Où sont les gens du voyage",                     axes: ['ANTIRACISM'] },
  { title: "W. E. B. Du Bois",                               axes: ['HISTORY', 'ANTIRACISM'] },
  { title: "La Race tue deux fois",                          axes: ['HISTORY', 'ANTIRACISM'] },
  { title: "La Domination blanche",                          axes: ['INSTITUTIONAL', 'ANTIRACISM'] },
  { title: "Une minorité modèle",                            axes: ['ANTIRACISM'] },
  { title: "Décolonisons les arts",                          axes: ['AFROFEMINIST', 'HISTORY'] },
  { title: "Et un jour je suis devenu arabe",                axes: ['ANTIRACISM'] },
  { title: "Vous les asiates",                               axes: ['ANTIRACISM'] },
  { title: "Islamophobie",                                   axes: ['INSTITUTIONAL', 'ANTIRACISM'] },
  { title: "Le Gaslighting",                                 axes: ['INSTITUTIONAL', 'QUEER'] },
  { title: "Unbound",                                        axes: ['AFROFEMINIST', 'HISTORY'] },
  { title: "Afrotrans",                                      axes: ['QUEER', 'AFROFEMINIST'] },
  { title: "Kiffe ta race",                                  axes: ['AFROFEMINIST', 'ANTIRACISM'] },
  { title: "Vandalisme queer",                               axes: ['QUEER'] },
  { title: "Repenser le genre",                              axes: ['INSTITUTIONAL', 'QUEER'] },
  { title: "Pour un féminisme matérialiste et queer",        axes: ['QUEER'] },
  { title: "Manifeste pour une démocratie déviante",         axes: ['QUEER'] },
  { title: "Pour en finir avec la famille",                  axes: ['QUEER', 'INSTITUTIONAL'] },
  { title: "Apprendre à transgresser",                       axes: ['AFROFEMINIST', 'INSTITUTIONAL'] },
  { title: "Enemy Feminisms",                                axes: ['QUEER', 'HISTORY'] },
  { title: "Manuel rabat-joie féministe",                    axes: ['QUEER', 'AFROFEMINIST'] },
  { title: "Pleasure Activism",                              axes: ['ECOLOGY', 'QUEER'] },
  { title: "Nos puissantes amitiés",                         axes: ['QUEER', 'HISTORY'] },
  { title: "Blackness and Disability",                       axes: ['CRIP', 'AFROFEMINIST'] },
  { title: "Feminist, Queer, Crip",                          axes: ['CRIP', 'QUEER'] },
  { title: "De chair et de fer",                             axes: ['CRIP', 'QUEER'] },
  { title: "Gendered racism, coping, and traumatic stress",  axes: ['HEALTH', 'AFROFEMINIST'] },
  { title: "Assessing burnout",                              axes: ['HEALTH', 'INSTITUTIONAL'] },
  { title: "Racism and health",                              axes: ['HEALTH', 'ANTIRACISM'] },
  { title: "Sociopath",                                      axes: ['HEALTH', 'INSTITUTIONAL'] },
  { title: "Gérer la dissociation d'origine traumatique",    axes: ['HEALTH'] },
  { title: "Dissociation and the Dissociative Disorders",    axes: ['HEALTH', 'INSTITUTIONAL'] },
  { title: "La Perversion narcissique",                      axes: ['INSTITUTIONAL', 'HEALTH'] },
  { title: "The Analysis of the Self",                       axes: ['HEALTH', 'INSTITUTIONAL'] },
  { title: "Les Perversions narcissiques",                   axes: ['HEALTH', 'INSTITUTIONAL'] },
  { title: "Psychothérapie de la dissociation et du trauma", axes: ['HEALTH'] },
  { title: "Inégalités sociales, savoirs et ignorance",      axes: ['INSTITUTIONAL'] },
  { title: "The Science Question in Feminism",               axes: ['INSTITUTIONAL', 'HISTORY'] },
  { title: "The speculum of ignorance",                      axes: ['INSTITUTIONAL', 'QUEER'] },
  { title: "Politiser l'enfance",                            axes: ['INSTITUTIONAL', 'ANTIRACISM'] },
  { title: "Nos enfants, nous-mêmes",                        axes: ['INSTITUTIONAL', 'ANTIRACISM'] },
  { title: "Black Girls Matter",                             axes: ['AFROFEMINIST', 'INSTITUTIONAL'] },
  { title: "Illusions perdues",                              axes: ['INSTITUTIONAL'] },
  { title: "Elles vécurent heureuses",                       axes: ['INSTITUTIONAL', 'QUEER'] },
  { title: "Militer à tout prix",                            axes: ['INSTITUTIONAL', 'HISTORY'] },
  { title: "Non-noyées",                                     axes: ['AFROFEMINIST', 'ECOLOGY'] },
  { title: "3. Une aspiration au dehors",                    axes: ['INSTITUTIONAL', 'HISTORY'] },
  { title: "Emergent Strategy",                              axes: ['ECOLOGY'] },
  { title: "The Revolution Starts at Home",                  axes: ['HEALTH', 'AFROFEMINIST'] },
  { title: "Lutter ensemble",                                axes: ['HISTORY', 'ANTIRACISM'] },
]

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const { data: books, error } = await supabase.from('books').select('id, title, axes')
if (error) { console.error('Erreur chargement:', error); process.exit(1) }

console.log(`${books.length} ouvrages en base.\n`)

let updated = 0, notFound = 0

for (const target of TARGETS) {
  const normTarget = norm(target.title)
  const match = books.find((b) => {
    const n = norm(b.title)
    return n === normTarget || n.includes(normTarget) || normTarget.includes(n)
  })

  if (!match) {
    console.log(`❌ Non trouvé : "${target.title}"`)
    notFound++
    continue
  }

  const { error: updateErr } = await supabase
    .from('books')
    .update({ axes: target.axes })
    .eq('id', match.id)

  if (updateErr) {
    console.log(`⚠️  Erreur mise à jour "${match.title}":`, updateErr.message)
  } else {
    console.log(`✅ ${match.title} → [${target.axes.join(', ')}]`)
    updated++
  }
}

console.log(`\n${updated} mis à jour, ${notFound} non trouvés.`)
