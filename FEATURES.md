# Trans-Trame — Features & Actions Reference

Comprehensive reference of all user-facing features in the application.

---

## 1. Graph Visualization (Constellation)

Main view: a 2D force-directed graph where **nodes = works** and **edges = citations**.

### Interactions

| Action | Trigger | Effect |
|--------|---------|--------|
| Select node | Click node | Opens side panel with book details |
| Deselect node | Click same node / Escape | Closes side panel |
| Hover node | Mouse over node | Highlights connected citations, shows label + year |
| Select link | Click link (or citation in side panel) | Shows citation details (quote, edition, page) |
| Pan camera | Drag on empty space / Arrow keys | Moves viewport |
| Zoom | Scroll wheel | Zooms in/out (clamped to bounds) |
| Fit to view | Space | Centers camera on all visible nodes |

### Node rendering

- Circle size scaled by citation count (in-degree)
- Color blended from thematic axes
- Gradient for multi-axis nodes
- Label + year shown on hover or when zoomed in
- Selection halo on click

### Physics engine

- D3 force simulation: charge (repulsion), collide (padding), link distance
- Adaptive forces based on node degree
- Damping/friction for stable layout

---

## 2. Alternative Visualization Modes

Selectable via the view mode toggle in the navbar.

### HistCite (Chronological Genealogy)

- X-axis: year (decade bins), Y-axis: position within decade
- Bezier arcs representing citations
- Hover highlights connected arcs
- Independent pan/zoom

### Dendrogramme (Circular Dendrogram)

- Radial layout: books arranged by axis, then year
- Bezier chords representing citations
- Colored ring segments showing thematic groups
- Hover highlights connected chords + labels
- Independent pan/zoom

---

## 3. Timeline

Bottom bar with year range filter and playback controls.

| Action | Trigger | Effect |
|--------|---------|--------|
| Set range | Drag start/end thumbs | Filters graph to books within [start, end] |
| Play / Pause | Click play/pause button | Advances end year per frame (fixed start) / stops |
| Reset | Click reset button | Snaps to full year range |

Display: histogram of book distribution per year, gradient fill between thumbs, decade tick marks.

---

## 4. Filters

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

## 5. Search

### Global search (Navbar)

| Action | Trigger | Effect |
|--------|---------|--------|
| Search | Type in navbar search bar | Fuzzy matches books (title + author) and authors |
| Select result | Click search result | Selects book or activates author filter |

### Contextual search

The Catalogue panels and Contribution table each have a local search bar that filters their own list by title/author.

---

## 6. Side Panel (Node & Link Details)

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

## 7. Catalogue Panels (Left Sidebar)

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
| Filter by author | Click author name | Activates author filter (→ see §4) |

---

## 8. Analysis Panel

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

## 9. Contribution Table (CRUD)

Full data editing interface. Requires authentication (→ see §12).

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
| Smart import | "Import intelligent" button | Opens SmartImportModal (→ see §10) |

---

## 10. Smart Import

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

## 11. AI-Assisted Features

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

## 12. Authentication

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

## 13. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Center camera / fit to view |
| Escape | Close panel / clear selection / dismiss analysis |
| Arrow keys | Pan camera |

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
| 11 | Uncategorized | #999999 |
