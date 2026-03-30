# Trans-trame

Application web de **cartographie des relations entre ouvrages** (citations, influences, transmissions) sous forme de **graphe interactif** et de **vue tabulaire** pour la contribution.

> **Démo en ligne :** [À compléter — URL de déploiement](https://example.com)  
> *(Vercel, Netlify, GitHub Pages, etc.)*

**Capture d’écran (recommandé pour la vitrine) :** ajoute une image du graphe, par ex. `docs/preview.png`, puis insère `![Aperçu](docs/preview.png)` ici.

---

## Concept

Trans-trame rend visibles les liens entre textes via des **nœuds** (ouvrages) et des **arêtes** (citations et métadonnées). L’objectif est de naviguer dans une généalogie d’idées plutôt que dans une bibliographie linéaire.

---

## Fonctionnalités principales

- Graphe **2D** interactif (`react-force-graph-2d`) : sélection, zoom, déplacement caméra
- Vues **Constellation** et **Généalogie**
- **Timeline** filtrante (période)
- **Catalogue** (textes, auteur·ices), recherche globale, filtres par axe / auteur·ice / période
- **Table « Contribuer »** : ouvrages, auteur·ices, liens, import intelligent
- Données persistées via **Supabase** (PostgreSQL)

---

## Stack technique

| Domaine | Choix |
|--------|--------|
| UI | React 19, Vite 8 |
| Graphe | react-force-graph-2d |
| Styles | Tailwind CSS 4 |
| Données | Supabase (`@supabase/supabase-js`) |
| Formulaires | react-hook-form |
| Langage | TypeScript (projet principal sans `strict` global ; voir `typecheck:strict`), ESLint |

Structure : `src/app/` (shell app), `src/features/` (modules métier), `src/components/`, `src/domain/`, `src/lib/` (Supabase, logger, **catégories**, **authorUtils**, constantes).  
Imports absolus via l’alias **`@/`** → `src/` (voir `vite.config.js` et `tsconfig.json`).

---

## Prérequis

- [Node.js](https://nodejs.org/) 20+ recommandé
- Un projet [Supabase](https://supabase.com/) avec les tables utilisées par l’app (`books`, `authors`, `links`, etc.)

---

## Installation

```bash
git clone https://github.com/garancewetz/Trans-trame.git
cd Trans-trame
npm install
```

### Variables d’environnement

1. Copier le modèle :

   ```bash
   cp .env.example .env.local
   ```

2. Renseigner dans `.env.local` les valeurs du dashboard Supabase (**Settings → API**) :

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

**Ne jamais committer** `.env`, `.env.local` ni aucune clé. Le dépôt inclut `.env.example` sans secrets.

### Lancer en développement

```bash
npm run dev
```

### Build production

```bash
npm run build
npm run preview   # test local du dossier dist/
```

### Qualité

```bash
npm run lint
npm run typecheck
npm run typecheck:strict   # `strict: true` sur src/lib, src/domain, graph api/domain (voir tsconfig.strict.json)
```

Pour étendre le typage strict : ajoute des globs dans `tsconfig.strict.json` (`include`) et corrige les erreurs au fil de l’eau.

---

## Sécurité (Supabase)

La clé **anon** est exposée côté client : c’est le fonctionnement normal du SDK. **La protection des données repose sur les [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)** et les politiques sur tes tables. Avant une démo publique, vérifie que les accès anonymes correspondent à ce que tu acceptes (lecture seule, pas d’écriture ouverte abusive, etc.).

---

## Structure des exports (racine `src/`)

Quelques fichiers à la racine de `src/` (`App.tsx`, `Graph.tsx`, …) réexportent des modules dans `features/` pour des chemins d’import courts. Un barrel `src/index.ts` regroupe aussi certains exports publics.

---

## Licence

Voir le fichier [LICENSE](./LICENSE) (MIT).

---

## Auteur

Projet vitrine — développement front-end par **Garance Wetzel** *(adapter si besoin)*.
