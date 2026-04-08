# Contexte produit - Trans-trame

## Intention

Trans-trame est une cartographie 2D des filiations féministes et afro-féministes.
Le projet transforme une collection de références en réseau navigable pour montrer
les continuités, les transmissions et les ruptures.

## Modèle de données

- `books` : ouvrages (titre, année, axes, authorIds)
- `authors` : entités séparées (prénom, nom, axes) — relation many-to-many avec les livres via `book_authors`
- `links` : citations / références entre ouvrages (avec citation_text, edition, page, context)
- 10 axes thématiques : Antiracism, Afrofeminism, Queer Studies, Health & Trauma,
  History & Archives, Institutional & Labor, Childhood & Family, Crip Theory,
  Ecology, Body & Sexology

## Expérience actuelle

- Graphe 2D interactif (react-force-graph-2d)
- Timeline en bas de l’écran avec filtre de période et contrôles play/pause
- Trois modes de vue :
  - `Constellation` (exploration libre)
  - `HistCite` (généalogie chronologique)
  - `Dendrogramme` (arborescence circulaire)
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

Trois onglets :
- **Textes** : CRUD ouvrages, détection doublons, détection orphelins, merge
- **Auteur·ices** : CRUD auteurs, dédoublonnage, merge
- **Liens** : CRUD liens entre ouvrages

Fonctionnalités transversales :
- recherche / filtre par onglet
- export JSON filtré par onglet
- import intelligent (batch, détection similarité, parsing auteurs/axes)

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