# Plan — Marquer des auteurs comme "pas des doublons" (faux-positifs)

## Contexte

La détection de doublons auteurs dans [src/features/table/hooks/useTableViewDuplicateDerived.ts:58-111](../src/features/table/hooks/useTableViewDuplicateDerived.ts#L58-L111) tourne à chaque rendu (Pass 1 exact match + Pass 2 fuzzy Levenshtein ≤ 2). Les faux-positifs reviennent à chaque ouverture du modal.

**But** : permettre de marquer une paire (ou un groupe) d'auteurs comme "pas des doublons" de façon persistante, partagée entre utilisateurs.

**Approche retenue** : table de jointure Supabase dédiée (Option B — la plus propre). Cohérente avec l'architecture existante (RLS, audit log, contribution tracking).

---

## 1. Migration SQL

**Fichier** : `supabase/migrations/20260413_author_not_duplicate_pairs.sql`

```sql
-- Table pour marquer des paires d'auteurs comme "pas des doublons"
-- (faux-positifs de la détection fuzzy côté client)
create table public.author_not_duplicate_pairs (
  id uuid primary key default gen_random_uuid(),
  author_a_id uuid not null references public.authors(id) on delete cascade,
  author_b_id uuid not null references public.authors(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  -- Ordre canonique : empêche (A,B) ET (B,A)
  constraint author_pair_order check (author_a_id < author_b_id),
  constraint author_pair_unique unique (author_a_id, author_b_id)
);

create index author_not_duplicate_pairs_a_idx on public.author_not_duplicate_pairs(author_a_id);
create index author_not_duplicate_pairs_b_idx on public.author_not_duplicate_pairs(author_b_id);

-- RLS (cohérent avec 20260410_enable_rls.sql)
alter table public.author_not_duplicate_pairs enable row level security;

create policy "author_not_duplicate_pairs_select" on public.author_not_duplicate_pairs
  for select to authenticated using (true);
create policy "author_not_duplicate_pairs_insert" on public.author_not_duplicate_pairs
  for insert to authenticated with check (true);
create policy "author_not_duplicate_pairs_delete" on public.author_not_duplicate_pairs
  for delete to authenticated using (true);

-- Trigger created_by (réutilise set_contribution_fields de 20260410)
create trigger set_author_not_dup_contribution
  before insert on public.author_not_duplicate_pairs
  for each row execute function public.set_contribution_fields();
```

### ⚠️ À vérifier avant d'écrire la migration

- **Le trigger `set_contribution_fields`** de `20260410_add_contribution_tracking.sql` — est-ce qu'il tente d'assigner `updated_by` ? Cette table n'a pas cette colonne. Si le trigger est générique, soit :
  - créer une fonction trigger dédiée qui ne touche que `created_by`
  - ou ajouter `updated_by` (probablement inutile ici puisqu'on n'update jamais la ligne — on crée ou on supprime)

---

## 2. Régénérer les types TS

```bash
npx supabase gen types typescript --local > src/types/supabase.ts
```

À confirmer selon le script dans `package.json` (peut-être `npm run gen:types` ou équivalent).

---

## 3. API Supabase

**Fichier** : [src/features/graph/api/graphDataApi.ts](../src/features/graph/api/graphDataApi.ts) — ajouter :

```typescript
// Charger toutes les paires (peu nombreuses, pas de pagination)
export function loadAuthorNotDuplicatePairs() {
  return supabase
    .from('author_not_duplicate_pairs')
    .select('author_a_id, author_b_id')
}

// Normalise l'ordre (A<B) avant insert pour respecter la contrainte
export function insertAuthorNotDuplicatePair(a: string, b: string) {
  const [author_a_id, author_b_id] = a < b ? [a, b] : [b, a]
  return supabase
    .from('author_not_duplicate_pairs')
    .insert({ author_a_id, author_b_id })
}

export function deleteAuthorNotDuplicatePair(a: string, b: string) {
  const [author_a_id, author_b_id] = a < b ? [a, b] : [b, a]
  return supabase
    .from('author_not_duplicate_pairs')
    .delete()
    .eq('author_a_id', author_a_id)
    .eq('author_b_id', author_b_id)
}
```

Et ajouter dans `loadGraphDataFromSupabase()` le fetch parallèle des paires :

```typescript
const [booksRes, authorsRes, linksRes, bookAuthorsRes, notDupPairsRes] = await Promise.all([
  // ...
  supabase.from('author_not_duplicate_pairs').select('author_a_id, author_b_id'),
])
return { booksRes, authorsRes, linksRes, bookAuthorsRes, notDupPairsRes }
```

---

## 4. Modèle & hook de données

**Fichier** : [src/features/graph/hooks/useGraphDataset.ts](../src/features/graph/hooks/useGraphDataset.ts)

- Ajouter `authorNotDuplicatePairs: Array<[string, string]>` au retour (toujours en ordre canonique A<B).

**Fichier** : [src/features/graph/hooks/useGraphData.ts](../src/features/graph/hooks/useGraphData.ts)

- Propager cette donnée.
- Exposer `markAuthorsNotDuplicate(a, b)` et `unmarkAuthorsNotDuplicate(a, b)` qui font l'appel API puis invalident la query TanStack (ou optimistic update).

---

## 5. Filtrage dans la détection

**Fichier** : [src/features/table/hooks/useTableViewDuplicateDerived.ts:58-111](../src/features/table/hooks/useTableViewDuplicateDerived.ts#L58-L111)

- Ajouter paramètre `notDuplicatePairs: Set<string>` (format `"idA|idB"` avec A<B).
- Helper : `const pairKey = (x, y) => (x < y ? `${x}|${y}` : `${y}|${x}`)`.
- Après construction des groupes bruts, **scinder chaque groupe** via union-find :
  - Deux auteurs sont reliés s'ils matchent (logique existante) ET que leur paire n'est pas dans `notDuplicatePairs`.
  - Garder uniquement les composantes connexes de taille ≥ 2.

**Détail subtil — transitivité** : un groupe de 3 auteurs `{X, Y, Z}` où `(X,Z)` est marqué non-doublon mais `(X,Y)` et `(Y,Z)` matchent → reste groupé via Y. C'est voulu (transitivité maintenue). Un groupe `{X, Y}` marqué non-doublon disparaît entièrement.

### Implémentation union-find concrète

Pour chaque groupe `group` détecté par la logique actuelle :
1. Construire les arêtes : pour chaque paire `(i, j)` dans `group`, ajouter l'arête sauf si la paire est dans `notDuplicatePairs`.
2. Union-find sur ces arêtes.
3. Retourner toutes les composantes de taille ≥ 2.

*Note perf* : groupes typiquement petits (2-3 auteurs), donc O(n²) acceptable.

---

## 6. UI du modal

**Fichier** : [src/features/table/components/TableAuthorDedupeModal.tsx](../src/features/table/components/TableAuthorDedupeModal.tsx)

- Ajouter prop `onMarkGroupNotDuplicate: (groupIndex: number) => void`.
- **Placement recommandé** : bouton **par groupe** (en-tête du groupe, à côté de "Groupe N — X entrées"), pas dans le footer. Plus clair avec plusieurs groupes.
- Libellé : "Ce ne sont pas des doublons" ou icône ⊘ / ✗.
- Pour un groupe de taille ≥ 3, marquer **toutes les paires** du groupe comme non-doublons en une fois (N*(N-1)/2 paires, typiquement 1 ou 3).

---

## 7. Câblage dans le controller

**Fichier** : [src/features/table/hooks/useTableViewController.ts](../src/features/table/hooks/useTableViewController.ts)

- Accepter `authorNotDuplicatePairs` et `onMarkAuthorsNotDuplicate` en props (typer dans `tableViewTypes.ts`).
- Construire le `Set<string>` mémoïsé depuis `authorNotDuplicatePairs`.
- Passer ce Set à `useTableViewDuplicateDerived`.
- Implémenter `handleMarkGroupNotDuplicate(groupIndex)` :
  ```typescript
  const handleMarkGroupNotDuplicate = (groupIndex: number) => {
    const group = authorDuplicateGroups[groupIndex]
    if (!group || group.length < 2) return
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        onMarkAuthorsNotDuplicate?.(group[i].id, group[j].id)
      }
    }
  }
  ```
- Exposer dans le retour du hook + passer à `TableAuthorDedupeModal`.

---

## 8. Propagation depuis App / parent

Remonter au composant qui monte `TableView` pour câbler depuis `useGraphData`. À identifier en lisant le fichier parent (probablement `App.tsx` ou similaire).

---

## Points à valider avant d'attaquer

1. **Le trigger `set_contribution_fields`** — lire [supabase/migrations/20260410_add_contribution_tracking.sql](../supabase/migrations/20260410_add_contribution_tracking.sql) pour voir s'il peut être réutilisé tel quel ou s'il faut une variante dédiée (pas de `updated_by`).
2. **La commande de regen des types** — vérifier `package.json` pour un script dédié.
3. **Placement UX du bouton "Pas un doublon"** — par groupe (reco) ou global ?
4. **Optimistic update vs invalidation** — TanStack Query : faut-il un optimistic update pour que le groupe disparaisse immédiatement du modal, ou attendre le refetch ?

---

## Ordre d'implémentation suggéré

1. Migration SQL + regen types (commit 1)
2. API Supabase + loadGraphData + useGraphDataset (commit 2)
3. Logique filtrage union-find dans useTableViewDuplicateDerived (commit 3 — testable en isolation avec des pairs mockées)
4. UI modal + câblage controller + App (commit 4)
5. QA manuel : marquer / démarquer / vérifier après refresh

---

## Estimation code

~150-200 lignes au total, réparties sur ~7 fichiers + 1 migration.
