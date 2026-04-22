
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
  UNCATEGORIZED: { color: '#999999', label: 'Autres disciplines' },
} as const

export type Axis = keyof typeof CATEGORY_THEME

/**
 * Ordre narratif des pôles sur l'anneau (vue Catégories).
 * Distinct de l'ordre des clés de `CATEGORY_THEME` et exclut `UNCATEGORIZED`
 * (masse centrale).
 */
export const CLUSTER_RING_AXES = [
  'ANTIRACISM',
  'AFROFEMINIST',
  'QUEER',
  'FEMINIST',
  'BODY',
  'HEALTH',
  'CRIP',
  'CHILDHOOD',
  'INSTITUTIONAL',
  'HISTORY',
] as const satisfies readonly Axis[]

/**
 * Sous-clusters rendus à l'intérieur du cluster central "Autres disciplines".
 * Chaque entrée = un sous-axe stocké sous forme `UNCATEGORIZED:<subKey>` dans
 * `book.axes`, suffisamment lourd dans le corpus pour mériter un mini-pôle
 * distinct *sans* être promu au rang d'axe féministe.
 *
 * Décision politique : ces œuvres sont convoquées par le corpus féministe
 * sans en faire partie. Le mini-pôle les densifie visuellement (lisibilité)
 * tout en restant à l'intérieur de "Autres disciplines" (distinction
 * préservée). Label plus petit + couleur désaturée renforcent la hiérarchie.
 *
 * Liste hardcoded à dessein — toute promotion reste un acte éditorial,
 * jamais un effet de seuil automatique.
 */
export const SUB_CLUSTERS = [
  { subKey: 'philosophy', label: 'Philosophie', color: '#8B8BA3' },
] as const

export type SubCluster = typeof SUB_CLUSTERS[number]

