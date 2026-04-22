# Trans-Trame — Features & Actions Reference

Comprehensive reference of all user-facing features in the application.

---

## 1. Graph Visualization

Main view: a 2D GPU-accelerated graph (cosmos.gl / WebGL) where **nodes = works** and **edges = citations**. Three view modes share the same renderer instance — switching preserves camera and selection.

### View modes

| Mode | Layout | Purpose |
|------|--------|---------|
| **Transmissions** (default) | Force-directed (repulsion + link spring + gravity) | Read the citation network — who cites whom |
| **Catégories** | Clustered around a ring of thematic axes + a central "Autres disciplines" mass (philosophy / sociology / literature etc. cited by the feminist corpus) | Read the thematic composition of the corpus |
| **Chronologie** | Positions fixed: X ∝ publication year, Y stacked per year; works without a year grouped at the right | Read the temporal spread of the corpus |

### Interactions (all modes)

| Action | Trigger | Effect |
|--------|---------|--------|
| Select node | Click node | Opens side panel with book details |
| Deselect node | Click same node / Escape | Closes side panel |
| Hover node | Mouse over node | Highlights outgoing (cyan) / incoming (gold) citations, shows full label |
| Select link | Click citation in side panel | Shows citation details (quote, edition, page) |
| Drag node | Pointer drag on node (Transmissions / Catégories) | Moves node and reheats the simulation so neighbors follow |
| Pan camera | Drag empty space / Arrow keys | Moves viewport |
| Zoom | Scroll wheel / Z, S, +, − | Zooms in/out (clamped) |
| Fit to view | Space | Centers camera on all visible nodes |

### Node rendering

- Circle size scaled by citation count (in-degree)
- Conic-gradient disc colored by the work's thematic axes (solid fill for single-axis works)
- Gradient textures cached per unique axis-combination (≈50 textures for ~5k nodes)
- Green pulse ring for ~3.5 s around freshly imported nodes
- Selection halo on click; hover glow tinted by the dominant axis color

### Labels

- **Landmarks always visible**: top 12 by in-degree in Transmissions; top 12 by size in Catégories
- **Focal label on hover / selection**: larger font, brighter background, full author + title wrapped on 2 lines
- **Axis ring labels**: only in Catégories — uppercase, placed above the topmost tracked point of each cluster, bordered with the axis color
- Greyed-out points (filter / timeline) suppress their landmark label

### Physics engine

- cosmos.gl GPU simulation — repulsion, link spring, center, gravity, cluster-attraction, friction
- Three pre-tuned force profiles per mode (see [cosmographForces.ts](src/features/visualizations/cosmographForces.ts))
- Simulation paused in Chronologie (positions are imposed); safety-net values keep drag-release stable

### Minimap

- Top-500 nodes by degree shown as dots in a corner box
- Red viewport rectangle tracks the camera
- Click to pan the camera there

---

## 2. Timeline

Bottom bar with year range filter and playback controls.

| Action | Trigger | Effect |
|--------|---------|--------|
| Set range | Drag start/end thumbs | Filters graph to books within [start, end] |
| Play / Pause | Click play/pause button | Advances end year per frame (fixed start) / stops |
| Reset | Click reset button | Snaps to full year range |

Display: histogram of book distribution per year, gradient fill between thumbs, decade tick marks.

---

## 3. Filters

All filter types are mutually exclusive: toggling one clears the others.

### Axis filter

| Action | Trigger | Location |
|--------|---------|----------|
| Filter by axis | Click axis label | Legend, Analysis panel, Books tab dropdown |
| Clear axis filter | Click active axis again | Same |

### Author filter

| Action | Trigger | Location |
|--------|---------|----------|
| Filter by author | Click author name | Search results, Auteur·ices panel, side panel |
| Clear author filter | Click active author again | Same |

### Decade highlight

| Action | Trigger | Location |
|--------|---------|----------|
| Highlight decade | Click decade | Analysis panel |
| Clear highlight | Click active decade again | Same |

---

## 4. Search

### Global search (Navbar)

| Action | Trigger | Effect |
|--------|---------|--------|
| Search | Type in navbar search bar | Fuzzy matches books (title + author) and authors |
| Select result | Click search result | Selects book or activates author filter |

### Contextual search

The Catalogue panels and Contribution table each have a local search bar that filters their own list by title/author.

---

## 5. Side Panel (Node & Link Details)

Right panel that appears on node/link selection.

### States

- **Empty**: no selection
- **Book details**: selected book info + incoming/outgoing citations
- **Dual panel**: book details + link details side-by-side

### Book details tab (read-only)

- Title, author(s), year, axes, description
- Incoming citations (books citing this work)
- Outgoing citations (works cited by this book)
- Same-author works
- Edition variants (grouped by originalTitle)
- Click citation to see link details

### Edit tab (requires auth)

| Action | Trigger | Effect |
|--------|---------|--------|
| Edit book fields | Modify fields in edit tab | Updates title, year, axes, authors, description |
| Delete book | Trash icon + confirm | Removes book and all its links |

### Link details

- Source/target book badges
- Citation text, edition, page, context
- Inline editing of each field (click to edit)
- Delete link with double-confirm

---

## 6. Catalogue Panels (Left Sidebar)

### Textes Panel

| Action | Trigger | Effect |
|--------|---------|--------|
| Browse books | Open via Catalogue > Textes | Virtual list of all books |
| Select book | Click book title | Selects node, opens side panel |
| Peek book | Click eye icon | Lightweight highlight on graph without opening panel |
| Open detail page | Click detail button | Navigates to /works/:slug |

### Auteur·ices Panel

| Action | Trigger | Effect |
|--------|---------|--------|
| Browse authors | Open via Catalogue > Auteur·ices | Virtual list of all authors |
| Filter by author | Click author name | Activates author filter (→ see §3) |

---

## 7. Analysis Panel

Floating panel with graph statistics and metrics. Toggle via navbar.

### Sections

| Section | Content |
|---------|---------|
| Panorama | Node count, edge count, density, average degree |
| Axes | Distribution of books per axis (stacked bar) |
| Decades | Books per decade (clickable → activates decade highlight) |
| Most cited | Top works ranked by in-degree |
| Top authors | Authors ranked by book count |
| Maillage | Citation density / tightness metric |
| Inter-axis bridges | Links connecting different thematic axes |
| Archipelagos | Book clusters by axis |

Dismissible with Escape.

---

## 8. Contribution Table (CRUD)

Full data editing interface. Requires authentication (→ see §11).

### Books Tab (Textes)

| Action | Trigger | Effect |
|--------|---------|--------|
| Add book | Click add row, fill form | Creates new book (title, originalTitle, year, axes, authors) |
| Edit book | Click row → inline edit | Updates book fields |
| Delete book | Trash icon + confirm | Removes book |
| Detect duplicates | "Détecter doublons" button | Fuzzy matching (Levenshtein) to find similar titles |
| Merge books | Select 2+ books → merge | Combines into representative with merged authorIds |
| Find orphans | "Détecter orphelins" button | Opens orphan modal |

### Authors Tab (Auteur·ices)

| Action | Trigger | Effect |
|--------|---------|--------|
| Add author | Click add row, fill form | Creates new author (firstName, lastName, axes) |
| Edit author | Click row → inline edit | Updates author fields |
| Delete author | Trash icon + confirm | Removes author |
| Deduplicate | "Dédoublonner" button | Fuzzy match to find similar names |
| Mark pair as not a duplicate | "Pas des doublons" button per group | Persists in `author_not_duplicate_pairs`; the group never resurfaces in dedupe detection (homonyms like Barbara FRIED vs Barbara CREED) |
| Find orphans | "Orphelins" button | Authors not linked to any book |

### Links Tab (Liens)

| Action | Trigger | Effect |
|--------|---------|--------|
| Browse links | List mode | All links grouped by source book |
| Add link | Create mode | Select source → target → fill citation metadata |
| Edit link | Click link row → expand | Edit citation_text, edition, page, context |
| Delete link | Trash icon + confirm | Removes citation link |
| Toggle direction | Direction button in create mode | Switch source ↔ target |

### History Tab (Historique)

| Action | Trigger | Effect |
|--------|---------|--------|
| View imports | Open history tab | Shows past batch imports with stats |
| View batch details | Click batch entry | Opens BatchInfoModal with import details |
| Smart import | "Import intelligent" button | Opens SmartImportModal (→ see §9) |

---

## 9. Smart Import

Two-phase batch import workflow with AI-assisted parsing.

### Input Phase

| Action | Trigger | Effect |
|--------|---------|--------|
| Paste text | Type/paste in textarea | Enter CSV, JSON, or free-form bibliography |
| Upload image | Drop/click to upload | Attach image of bibliography |
| Camera capture | Click camera button | Take photo of bibliography |
| Crop image | Drag crop area | Select relevant portion |
| Select data type | Dropdown | Choose: books, authors, or links |
| Parse | Click "Analyser" | LLM or regex parsing of input |

### Preview & Reconciliation Phase

| Action | Trigger | Effect |
|--------|---------|--------|
| Review entries | Scroll parsed results | See parsed books/authors with confidence |
| Toggle entry | Checkbox per row | Include/exclude from import |
| Edit field | Click cell to edit | Correct parsed value |
| Accept merge | Click merge suggestion | Merge with existing DB entry |
| Dismiss merge | Click dismiss | Keep as new entry |
| Insert batch | Click "Importer" | Batch insert approved entries |

---

## 10. AI-Assisted Features

### AI Enrichment (AIEnrichModal)

| Action | Trigger | Effect |
|--------|---------|--------|
| Start analysis | Click "Enrichir" on selected books | LLM analyzes books, suggests missing fields |
| Review suggestions | Toggle per field | Accept/reject suggested values |
| Apply | Click apply | Updates books with accepted fields |

### AI Orphan Reconciliation (AIOrphanReconcileModal)

| Action | Trigger | Effect |
|--------|---------|--------|
| Start reconciliation | Click "Réconcilier orphelins" | LLM matches orphan books to existing entries |
| Review matches | Toggle per match | Accept/reject proposed matches |
| Apply | Click apply | Merges or links matched entries |

### Author Orphan Reconciliation (AuthorOrphanReconcileModal)

| Action | Trigger | Effect |
|--------|---------|--------|
| Find orphan authors | Click "Réconcilier" | Finds authors not linked to books |
| Review suggestions | Toggle per match | Accept/reject proposed links |
| Apply | Click apply | Links authors to books |

---

## 11. Authentication

| Action | Trigger | Effect |
|--------|---------|--------|
| Login | Click login icon → email + password | Authenticates via Supabase |
| Sign up | Click signup tab → email + password | Creates account |
| Complete profile | Fill firstName + lastName | Updates user profile |
| Logout | Click account → sign out | Ends session |
| Auth gate | Access "Contribuer" while logged out | Opens login modal |

- Read access: public (anonymous)
- Write access: authenticated + email in `allowed_emails` whitelist
- RLS policies enforce server-side

---

## 12. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Center camera / fit to view |
| Escape | Close panel / clear selection / dismiss analysis |
| Arrow keys | Pan camera |
| Z / + / = | Zoom in |
| S / - | Zoom out |

---

## Appendix: Data Model

### Entities

| Entity | Key fields | DB Table |
|--------|------------|----------|
| Book | id, title, originalTitle, year, description, axes[], authorIds[], todo, importSourceId | `books` |
| Author | id, firstName, lastName, axes[], todo | `authors` |
| Link | id, source, target, citation_text, edition, page, context, type, provenance | `links` |

### Relationships

- Book ↔ Author: many-to-many (via `book_authors` join table + `authorIds` denormalized)
- Book → Book: many-to-many via Link (citations)
- Book grouping: books with same `originalTitle` are collapsed into single graph node

### Thematic Axes (11)

| # | Axis | Color |
|---|------|-------|
| 1 | Antiracism & Decolonial | #FF5F1F |
| 2 | Afrofeminism | #FFD700 |
| 3 | Queer Studies | #FF2E97 |
| 4 | Health & Trauma | #9D50BB |
| 5 | History & Archives | #00D1FF |
| 6 | Institutional & Labor | #B0B0CC |
| 7 | Childhood & Family | #FF7F50 |
| 8 | Crip Theory | #8B4513 |
| 9 | Body & Sexology | #FF4D6D |
| 10 | Feminist Theory | #E040FB |
| 11 | Autres disciplines | #999999 |
