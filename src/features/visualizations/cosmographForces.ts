// Link colors. Baseline discrète (alpha 0.15, aligné sur ALPHA.dim de
// Galaxy/linkStyle.ts) pour ne pas saturer la lecture du graphe au repos —
// les liens ne servent qu'à répondre à "qui cite quoi" au moment où on
// interroge un nœud spécifique. Au hover, outgoing (cyan vif = le focal cite)
// et incoming (jaune vif = est cité par le focal) remontent, les autres
// s'effacent encore plus.
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

// Mode libre : forte répulsion, liens longs et mous, centrage léger. Laisse
// respirer les gros hubs (beaucoup de citations = beaucoup de liens tirant).
export const FORCES_FREE = {
  simulationRepulsion: 8.0,
  simulationLinkSpring: 0.15,
  simulationLinkDistance: 140,
  simulationCenter: 0.1,
  simulationGravity: 0.1,
  simulationCluster: 0,
  simulationFriction: 0.9,
} as const

// Mode cluster : valeurs alignées sur l'exemple officiel cosmos.gl
// (stories/clusters/with-labels). La gravité élevée (2.0) rapproche tous les
// clusters autour de l'origine → ils se touchent, se compactent en
// "honeycomb". Sans setClusterPositions explicite (laissé à l'auto-placement
// cosmos par centermass), cette gravité + répulsion 10 + cluster 0.25 suffit
// à les packer proprement sans les superposer.
export const FORCES_CLUSTER = {
  simulationRepulsion: 10.0,
  simulationLinkSpring: 0.03,
  simulationLinkDistance: 100,
  simulationCenter: 0,
  simulationGravity: 2.0,
  simulationCluster: 0.25,
  simulationFriction: 0.95,
} as const
