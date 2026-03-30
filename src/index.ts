// Point d’entrée d’exports “publics” de `src/`.
// Les proxies historiques (`src/App.tsx`, `src/Graph.tsx`, etc.) restent valides.

export { default as App } from './app/App'
export { default as Graph } from './features/graph/Graph'
export { default as AnalysisPanel } from './features/analysis-panel/AnalysisPanel'
export { default as AddBookForm } from './features/add-book-form/AddBookForm'

export * from './domain/types'

