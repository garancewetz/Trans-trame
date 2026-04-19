# Contexte produit - Trans-trame

## Intention

Trans-trame est une cartographie 2D des filiations féministes et afro-féministes.
Le projet transforme une collection de références en réseau navigable pour montrer
les continuités, les transmissions et les ruptures.

## Modèle de données

- `books` : ouvrages (titre, année, axes, authorIds)
- `authors` : entités séparées (prénom, nom, axes) — relation many-to-many avec les livres via `book_authors`
- `links` : citations / références entre ouvrages (avec citation_text, edition, page, context)
- 11 axes thématiques : Antiracism & Decolonial, Afrofeminism, Queer Studies,
  Health & Trauma, History & Archives, Institutional & Labor, Childhood & Family,
  Crip Theory, Body & Sexology, Feminist Theory, Sans catégorie (fallback)

## Expérience actuelle

- Graphe 2D interactif (react-force-graph-2d)
- Timeline en bas de l’écran avec filtre de période et contrôles play/pause
- Modes de vue :
  - `Constellation` (exploration libre, react-force-graph-2d)
  - `Cosmograph` (spike expérimental, renderer cosmos.gl GPU — filtres,
    drag et nav clavier alignés sur Constellation)
- Navbar compacte et centralisée :
  - switch de vue discret près du logo
  - bouton `Contribuer` (mint) — bascule vers la vue table d’édition
  - barre de recherche globale (ouvrages + auteur·ices)
  - `Catalogue` en dropdown (Textes, Auteur·ices, Analyse)
- Encarts auxiliaires :
  - légende catégories (filtrage par axe)
  - hints clavier
  - panneaux latéraux (détail noeud, détail lien, admin)
  - panneau analyse

## Vue table (Contribuer)

Quatre onglets :
- **Textes** : CRUD ouvrages, détection doublons, détection orphelins, merge
- **Auteur·ices** : CRUD auteurs·ices, dédoublonnage, merge
- **Liens** : CRUD liens entre ouvrages
- **Historique** : consultation des batches d'import passés (stats, détails via BatchInfoModal),
  point d'entrée vers l'import intelligent

Fonctionnalités transversales :
- recherche / filtre par onglet
- export JSON filtré par onglet
- import intelligent (batch, détection similarité, parsing auteur·ices/axes)
- traçabilité des imports : chaque livre porte un `importSourceId` qui le rattache
  à un batch (table `import_sources`), permettant audit et retour en arrière

## Logique de filtres

Les filtres sont distribués dans l’interface :

- **Axe** : clic sur la légende (panneau gauche) pour filtrer par catégorie
- **Auteur·ice** : sélection via recherche globale ou panneau Auteur·ices
- **Période** : curseurs de la timeline (bas de l’écran)

## Stack technique

- React 19 + Vite 8
- react-force-graph-2d
- Tailwind CSS 4
- Supabase (base de données PostgreSQL + auth)
- TanStack React Query (état serveur)
- React Router 7
- React Hook Form
- lucide-react, Sonner (toasts), @floating-ui