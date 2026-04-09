
export const CATEGORY_THEME = {
  // --- Tes catégories originales conservées ---
  ANTIRACISM: { color: '#FF5F1F', label: 'Antiracism & Decolonial' }, // Dominante : Lao, Mazouz, Brahim
  AFROFEMINIST: { color: '#FFD700', label: 'Afrofeminism' }, // Davis, hooks, Gumbs
  QUEER: { color: '#FF2E97', label: 'Queer Studies' }, // Ahmed, Spina, Noyé
  HEALTH: { color: '#9D50BB', label: 'Health & Trauma' }, // Williams, Boon, Smith
  HISTORY: { color: '#00D1FF', label: 'History & Archives' }, // Aptheker, Lerner, Wells
  INSTITUTIONAL: { color: '#B0B0CC', label: 'Institutional & Labor' }, // Engels, Oakley, Foner
  CHILDHOOD: { color: '#FF7F50', label: 'Childhood & Family' }, // Balzac, hooks, Collectif
  CRIP: { color: '#8B4513', label: 'Crip Theory' }, // Kafer, Bell, Landis

  // --- La catégorie suggérée pour compléter les 240 titres ---
  BODY: { color: '#FF4D6D', label: 'Body & Sexology' }, // Pour la recherche scientifique (Brotto, Chivers, Laqueur)

  // --- Théorie féministe (transversal) ---
  FEMINIST: { color: '#E040FB', label: 'Feminist Theory' },

  // --- Fallback pour les textes hors-thème ---
  UNCATEGORIZED: { color: '#999999', label: 'Sans catégorie' },
} as const


export type Axis = keyof typeof CATEGORY_THEME

