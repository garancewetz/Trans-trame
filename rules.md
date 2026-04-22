# Repository rules (Trans-Trame)

**Note:** For day-to-day Git behavior in Cursor, see `.cursor/rules/` (e.g. when agents may commit or push). This document describes **code and workflow conventions** for this repo.

---

## Critical — commit messages

**No AI co-authorship or tool trailers in commits** — non-negotiable for this project.

- Do **not** add `Co-Authored-By: …` or similar trailers to commit messages.
- Do **not** use `--trailer` or other automation that injects tool attribution.
- Commit messages should contain only what the human author intends, with no AI/tool attribution.

**Why:** Keeps `git` history clearly attributable to human contributors and avoids polluting messages with tool metadata.

**Examples:**

```bash
# BAD
git commit -m "feat: add feature

Co-Authored-By: Claude <noreply@anthropic.com>"

# GOOD
git commit -m "feat: add feature"
```

---

## Project stack (keep rules realistic)

- **App:** Vite, React 19, TypeScript, Tailwind CSS 4.
- **Data:** Supabase (`@supabase/supabase-js`); graph state and mutations live mainly in `src/features/graph/hooks/useGraphData.ts` and related modules. **There is no Apollo Client** in this repository — ignore any GraphQL-cache guidance meant for other codebases.
- **Layout:** `src/core/` (Supabase client, QueryClient provider), `src/common/` (shared UI, global hooks, global utils), `src/features/<feature>/` (api/, hooks/, components/, types.ts), `src/pages/` (route containers), `src/types/` (global types incl. generated Supabase types).

Do **not** reference files that do not exist here (e.g. `use-cache-view.ts`, `useAddEtiology.ts`, `use-update-condition-status.tsx`).

---

## General practices

- Prefer **semantic HTML** where it fits (e.g. real lists for lists, headings in order).
- Avoid `eslint-disable` unless there is a short, justified comment.
- **File size:** a single source file **must not exceed 250 lines**. Before hitting the limit, extract hooks, subcomponents, or helpers into dedicated modules. (Existing files over the limit should be split when you work on them.)
- Keep code **factored**, **simple**, and **consistent** with surrounding patterns; avoid unnecessary side effects.

### Bad practices to avoid

1. **Type assertions (`as`) — avoid.** Do not use `as` (including `as unknown as …`) to silence errors without fixing the model. Prefer type guards, generics, or small helper modules. **Documented exceptions:** (a) `as const` on literal config objects (e.g. keyword maps); (b) import aliases (`import { x as y }`) and `type X as Y` renames are not type assertions. **Remaining debt:** occasional `as const` for discriminated unions (`useGlobalSearch.ts`); keep new `as` out of feature code.

2. **`@ts-nocheck` in graph modules** — `react-force-graph-2d`’s recursive `LinkObject` / `NodeObject` generics are incompatible with our domain `Link` / `Book` without duplicating a huge prop surface or scattering assertions. The following files use `// @ts-nocheck` for this reason; behaviour is validated via build and manual QA. Prefer extracting into typed helpers rather than re-enabling full strict checking until upstream types improve.
   - `Graph.tsx` — core graph canvas (upstream type conflict)
   - `nodeObject.ts` — custom node renderer (d3 runtime `x`/`y`)
   - `Minimap.tsx` — minimap canvas (same upstream types)
   - `nodeVisualState.ts`, `nodeVisibility.ts`, `nodeRadius.ts` — node style helpers (d3 runtime `x`/`y`)
   - `nodeCache.ts`, `canvasUtils.ts` — canvas utilities (shared with `nodeObject.ts`)
   - `useAdjacencyIndex.ts` — adjacency index (shared with `Graph.tsx`)
   - `useGraphLayout.ts` — d3-force internals not exposed in upstream types

3. **Files over 250 lines** must be split when touched; new code must stay under the limit. **Current outliers (approx.):** `parseSmartInput.logic.ts` (~626), `SmartImportPreviewRow.tsx` (~487), `SmartImportInputPhase.tsx` (~462), `AuthorsTab.tsx` (~459), `BooksTab.tsx` (~432), `Graph.tsx` (~430, `@ts-nocheck`), `LinksTab.tsx` (~420), `AIOrphanReconcileModal.tsx` (~366), `HistoryTab.tsx` (~361), `TableView.tsx` (~327), `AuthorOrphanReconcileModal.tsx` (~326), `AIEnrichModal.tsx` (~322), `BooksTabBookRow.tsx` (~320), `LinkDetails.tsx` (~318), `SvgDefs.tsx` (~304), `nodeObject.ts` (~302, `@ts-nocheck`), `CircularDendrogramView.tsx` (~298), `useTableViewController.ts` (~291), `HistCiteView.tsx` (~280), `LinkRow.tsx` (~276), `useGraphData.ts` (~276), `cameraControls.ts` (~274), `SmartImportPreviewPhase.tsx` (~257). `supabase.ts` (~391) is auto-generated — exempt.

4. **Heavy `await` in UI handlers** — Prefer patterns already used in the feature: encapsulate async work in hooks or small functions, keep presentational components thin.

---

## Design and structure

1. **Feature isolation:** Shared `src/components/` should not depend on a specific feature’s internals. If a component needs feature-only types or data, colocate it under that feature.
2. **Configurable data** high in the tree when it affects many children.
3. **Avoid over-abstraction** — extra configuration layers have a cost.
4. **Law of Demeter:** Prefer small, direct dependencies over deep chaining.

### Understandability

- Stay consistent with nearby code.
- Use clear names and local variables for non-obvious expressions.
- Centralize tricky boundary handling where it is easy to test and review.

### Naming

- **Code identifiers and commit subjects in English.**
- Prefer full words over cryptic abbreviations; common acronyms (`id`, `url`) are fine when conventional.
- Avoid meaningless single-letter names such as `v` or `i` except in extremely local, obvious contexts (e.g. a short numeric loop index where the team already uses `i`).
- Replace magic numbers with named constants when it aids readability.

#### Book (code) ≡ resource (DB)

The DB pivot table is `resources` (renamed from `books` in migration `20260419_books_to_resources`), with a `resource_type` column allowing polymorphism (`'book'`, and eventually `'film'`, `'album'`, …). Application code keeps `Book`, `BookId`, `handleAddBook`, `BooksTab`, `graphData.books`, etc. — "book" is still the dominant type (>95%) and reads well in UI copy.

- When writing **new** code: match nearby conventions. In DB-adjacent modules (`graphDataApi.ts`, `graphDataModel.ts`, `supabase.ts`), use `resource_*` for DB column names and table references; elsewhere use `book`/`Book`.
- When reading code: `Book` type ↔ `resources` table is the same entity — don't chase down a phantom `Resource` type.
- **No rename planned.** If/when non-book resource types become the majority (films, albums at volume), revisit.

### Functions

- Small, focused functions; few parameters when possible.
- Pure helpers are ideal; React components and data hooks naturally have side effects — contain them deliberately.

### Comments

- Do not commit blocks of **commented-out** code — remove or restore.
- Comment **why** non-obvious choices were made, not what the next line literally does.
- Comments, file names, and constant names must always be in English.

### File layout

- Group related code vertically; callers above callees when it helps reading order.

---

## TypeScript / React — props

- Prefer `type Props = { … }` for component props (local, non-exported unless needed).
- Destructure props in the function signature.
- For `children`, use `PropsWithChildren<{ … }>` when appropriate.
- Extend with intersections: `type Props = Base & { … }`.
- Use `import type` for type-only imports from `react`.

### Keys in lists

1. Prefer stable IDs: `key={item.id}`.
2. Else a stable unique field.
3. Composite keys only when necessary: `` key={`${a}-${b}`} ``.
4. Avoid index-only keys except for static, non-reorderable lists.

### Tailwind conditional classes

- Prefer **`clsx`** for conditional class names (already a dependency). Many components still use `[...].join(' ')`; migrate to `clsx` when editing those call sites.

### Components and exports

- **PascalCase** component names.
- **Named exports only.** Export components and hooks with `export function MyComponent()` or `export const MyComponent = …`. Do **not** use `export default` for application code. The only exceptions are **mandatory** framework or tooling entry contracts (e.g. if a specific API requires a default); prefer named exports and a thin re-export at the boundary when possible.
- Prefer function declarations for components: `export function MyComponent(props: Props) { … }`.

### Custom hooks

- Prefix with `use`.
- Return objects (e.g. `{ data, setX }`) rather than opaque tuples, unless a well-known API (e.g. `useState`) is mirrored.
- **Locations:** `src/app/hooks/` for app shell wiring; `src/features/<feature>/hooks/` for feature-specific logic (e.g. `useGraphData`, `useGlobalSearch`).
- Memoize callbacks returned from hooks when they are used in dependency arrays or passed deep into children.

### React imports

- `import type { … } from 'react'` for types; value imports for hooks.

### Errors

- For **invalid required input** or impossible state in a loader, prefer a clear error or boundary rather than silent failure.
- For **optional UI**, returning `null` is acceptable. Do not blanket-replace every guard with `throw` without context.

### Performance

- `useCallback` / `useMemo` when dependencies and re-renders matter; avoid premature optimization.

### Context

- Typical pattern: `createContext` + `Provider` + `useContext` hook with a guard (see `AppDataContext.tsx`).

---

## Dependencies (`package.json`)

- **Pin exact versions.** Every dependency and devDependency must use an **exact** version string (e.g. `"1.2.3"`). Do **not** use `^`, `~`, `>`, or ranges.
- When upgrading, change the number deliberately and run install + tests. If the lockfile is committed, keep it in sync after version changes.

---

## Conventional Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <description>`.

- **Types:** `feat`, `fix`, `docs`, `refactor`, `perf`, `style`, `test`, `build`, `ci`, etc.
- **Scope:** Optional; prefer a real area of this app, e.g. `graph`, `table`, `app`, `shell`, `analysis`, `add-book-form` — not the repo name alone.
- **Language:** English — all commit messages (subject, body, and footer) must be written in English without exception.
- **Subject:** Imperative, lowercase, no trailing period.

**Examples for this project:**

```text
feat(graph): highlight author selection on canvas
fix(table): close merge modal after success
refactor(app): extract navbar props hook
docs: update README setup
```

**Avoid:**

```text
Added graph feature
fix stuff
```

---

## Relationship to Cursor

- **This file (`rules.md`)** is the human-readable rule set for the Trans-Trame codebase.
- **`.cursor/rules/*.mdc`** may add tool-specific instructions (e.g. when agents may run `git commit`). If both exist, follow Cursor rules for agent behavior and this file for code style unless you intentionally align them.