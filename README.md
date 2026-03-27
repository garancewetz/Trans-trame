# Trans-trame

Visualisation interactive des filiations féministes et afro-féministes sous forme de graphe 3D.

## Concept

Trans-trame rend visibles les relations entre textes via des nœuds (ouvrages) et des liens (citations, influences, transmissions).  
L’objectif est de naviguer dans une généalogie d’idées plutôt que dans une bibliographie linéaire.

## Fonctionnalités principales

- Graphe 3D interactif (sélection, zoom, déplacement caméra)
- Timeline filtrante (période) avec lecture animée
- Deux vues du graphe : `Constellation` et `Généalogie`
- Navigation structurée dans la navbar :
  - `Catalogue` (Textes, Auteur·ices)
  - `Actions` (Ajouter une référence, Ajouter un lien, Analyse)
- Gestion des filtres actifs en dropdown :
  - retrait unitaire (catégorie, auteur·ice, période timeline)
  - action `Tout retirer`
- Panneau d’analyse et panneaux latéraux (textes, auteur·ices, détails)

## Stack

- React + Vite
- react-force-graph-3d (Three.js)
- Tailwind CSS
- Données en JSON

## Installation

```bash
git clone git@github.com:garancewetz/Trans-trame.git
cd Trans-trame
npm install
npm run dev
```

## Scripts

- `npm run dev` : développement local
- `npm run build` : build de production
- `npm run preview` : prévisualisation du build
