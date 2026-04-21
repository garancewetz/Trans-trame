// Link colors. Baseline discrète (alpha 0.15, aligné sur ALPHA.dim de
// Galaxy/linkStyle.ts) pour ne pas saturer la lecture du graphe au repos —
// les liens ne servent qu'à répondre à "qui cite quoi" au moment où on
// interroge un nœud spécifique. Au hover d'un nœud, outgoing (cyan vif = le
// focal cite) et incoming (jaune vif = est cité par le focal) remontent, les
// autres s'effacent encore plus.
export const LINK_DEFAULT_RGBA = [140 / 255, 220 / 255, 255 / 255, 0.15] as const
export const LINK_DIM_RGBA = [140 / 255, 220 / 255, 255 / 255, 0.03] as const
export const LINK_CITES_FOCAL_RGBA = [140 / 255, 220 / 255, 255 / 255, 0.85] as const
export const LINK_CITED_BY_FOCAL_RGBA = [255 / 255, 210 / 255, 80 / 255, 0.85] as const
// Lien dont au moins une extrémité est greyout (filtre, highlight, ou livre
// publié hors-range de la timeline) : alpha 0 → invisible. cosmos.gl n'a pas
// de `setLinkVisibility`, on atténue via la couleur comme pour les autres
// états.
export const LINK_HIDDEN_RGBA = [0, 0, 0, 0] as const

export type LinkRgba = readonly [number, number, number, number]

// Profils de forces simulation — bascule via setConfigPartial au toggle
// cluster. Séparer les profils évite de tuner à l'aveugle dans l'effet.

// Mode libre : répulsion forte, liens courts et mous, centrage marqué pour
// compacter le nuage. Friction basse = le graphe s'immobilise vite après
// chaque perturbation.
export const FORCES_FREE = {
  simulationRepulsion: 38.5,    // À quel point les points se repoussent. ↑ = plus d'espace entre eux.
  simulationLinkSpring: 0.06,   // Raideur du "ressort" des liens. ↑ = le lien tire fort pour ramener les nœuds à sa longueur cible ; ↓ = corde molle.
  simulationLinkDistance: 45,   // Longueur cible d'un lien au repos, en unités sim. ↑ = graphe étalé.
  simulationCenter: 2,          // Force qui ramène tout vers (0, 0). ↑ = le nuage se contracte vers le milieu du canvas.
  simulationGravity: 0.1,       // Gravité globale vers le centre, appliquée à chaque nœud. ↑ = effet "aspirateur" plus fort que simulationCenter.
  simulationCluster: 0,         // Force qui attire chaque nœud vers le centroïde de son cluster. 0 = désactivée (en mode libre).
  simulationFriction: 0.52,     // Amortissement. 1 = le graphe bouge sans s'arrêter ; ↓ = s'immobilise vite (0.5 = coupe sec, 0.9 = respiration douce).
} as const

// Mode chronologique : toutes les forces à zéro. Les positions sont imposées
// explicitement (X ∝ année) et la simulation est mise en pause juste après —
// ces valeurs servent de filet de sécurité pour le cas où une interaction
// (drag, resize) relance une tick avant que `pause()` ne reprenne la main.
export const FORCES_FROZEN = {
  simulationRepulsion: 90,
  simulationLinkSpring: 0,
  simulationLinkDistance: 90,
  simulationCenter: 0,
  simulationGravity: 0,
  simulationCluster: 0,
  // Friction haute = tout mouvement résiduel (drag release) s'arrête aussitôt.
  simulationFriction: 0.2,
} as const

// Mode cluster : répulsion très forte + ressorts coupés = chaque cluster se
// forme comme un disque compact autour de son centroïde, sans que les liens
// tirent sur la composition. Gravité modérée rapproche les clusters sans les
// écraser l'un dans l'autre.
export const FORCES_CLUSTER = {
  simulationRepulsion: 80,     // Répulsion entre points. Très élevée pour que les nœuds d'un même cluster restent lisibles malgré le packing.
  simulationLinkSpring: 0,     // Liens désactivés côté force : en cluster, seuls les centroïdes dictent la place.
  simulationLinkDistance: 10,  // Non pertinent quand linkSpring = 0, gardé bas par cohérence.
  simulationCenter: 0,         // Pas de recentrage : c'est la gravité qui s'en charge, plus brutalement.
  simulationGravity: 0.9,      // Gravité modérée : rapproche les clusters vers l'origine sans les fusionner.
  simulationCluster: 0.24,     // Force qui colle chaque nœud à son cluster. ↑ = clusters plus compacts, mais peut écraser les nœuds les uns sur les autres.
  simulationFriction: 0.5,     // Amortissement faible : le graphe oscille peu et se stabilise vite après chaque perturbation.
} as const
