# Contexte produit - Trans-trame

## Intention

Trans-trame est une cartographie 3D des filiations féministes et afro-féministes.
Le projet transforme une collection de références en réseau navigable pour montrer
les continuités, les transmissions et les ruptures.

## Modèle de données

- `nodes` : ouvrages
- `links` : citations / références entre ouvrages
- métadonnées principales : auteur·ice, année, catégories (axes)

## Expérience actuelle

- Graphe 3D interactif (navigation caméra, sélection)
- Timeline en bas de l’écran avec filtre de période
- Deux modes de vue :
  - `Constellation` (exploration libre)
  - `Généalogie` (lecture plus chronologique)
- Navbar compacte et centralisée :
  - switch de vue discret près du logo
  - `Catalogue` en dropdown (Textes, Auteur·ices)
  - `Actions` en dropdown (Ajout référence, Ajout lien, Analyse)
- Encarts auxiliaires :
  - légende catégories
  - hints clavier
  - panneaux latéraux et panneau analyse

## Logique de filtres

Les filtres actifs peuvent se cumuler :

- catégorie
- auteur·ice
- période (timeline)

Le bloc `Filtres` de la navbar liste les filtres actifs dans un dropdown et permet :

- suppression unitaire de chaque filtre
- suppression globale via `Tout retirer`

## Stack technique

- React + Vite
- react-force-graph-3d (Three.js)
- Tailwind CSS
- Données JSON locales