// Les 9 catégories — TRANS TRAME
export const CATEGORY_THEME = {
  ECOLOGY: { color: '#00FF87', label: 'Ecology' },
  QUEER: { color: '#FF2E97', label: 'Queer' },
  AFROFEMINIST: { color: '#FFD700', label: 'Afrofeminist' },
  ANTIRACISM: { color: '#FF5F1F', label: 'Antiracism' },
  CHILDHOOD: { color: '#FF7F50', label: 'Childhood/Family' }, // Nouvelle catégorie
  HEALTH: { color: '#9D50BB', label: 'Health/Trauma' },
  CRIP: { color: '#8B4513', label: 'Crip Theory' },
  HISTORY: { color: '#00D1FF', label: 'History' },
  INSTITUTIONAL: { color: '#B0B0CC', label: 'Institutional' }, // Gris sombre "Béton"
} as const

export type Axis = keyof typeof CATEGORY_THEME

