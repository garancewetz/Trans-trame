import type { Dispatch, RefObject, SetStateAction } from 'react'
import { axesGradient } from '@/common/utils/categories'
import type { AuthorNode } from '@/common/utils/authorUtils'
import type { GraphData } from '@/types/domain'
import type { AnalysisPanelImperativeHandle } from '@/features/analysis-panel/components/AnalysisPanel'
import type { GlobalSearchResultItem } from '@/features/shell/hooks/useGlobalSearch'

export function useNavbarProps({
  searchRef,
  globalSearch,
  setGlobalSearch,
  searchFocused,
  setSearchFocused,
  searchResults,
  handleSearchSelect,
  authorsMap,
  handleOpenTable,
  selectedAuthor,
  viewMode,
  handleViewChange,
  tableMode,
  setTableMode,
  openTextsPanel,
  openAuthorsPanel,
  analysisPanelRef,
  graphData,
  authorCount,
}: {
  searchRef: RefObject<HTMLDivElement | null>
  globalSearch: string
  setGlobalSearch: (q: string) => void
  searchFocused: boolean
  setSearchFocused: (v: boolean) => void
  searchResults: GlobalSearchResultItem[]
  handleSearchSelect: (item: GlobalSearchResultItem | null | undefined) => void
  authorsMap: Map<string, AuthorNode>
  handleOpenTable: (tab?: 'books' | 'authors' | 'links', linkSourceId?: string | null, focusBookId?: string | null) => void
  selectedAuthor: string | null
  viewMode: string
  handleViewChange: (mode: string) => void
  tableMode: boolean
  setTableMode: Dispatch<SetStateAction<boolean>>
  openTextsPanel: () => void
  openAuthorsPanel: () => void
  analysisPanelRef: RefObject<AnalysisPanelImperativeHandle | null>
  graphData: GraphData
  authorCount: number
}) {
  return {
    search: {
      ref: searchRef,
      query: globalSearch,
      setQuery: setGlobalSearch,
      focused: searchFocused,
      setFocused: setSearchFocused,
      results: searchResults,
      onSelect: handleSearchSelect,
      axesGradient,
      authorsMap,
      onOpenTable: handleOpenTable,
    },
    filters: {
      selectedAuthorId: selectedAuthor,
    },
    view: {
      mode: viewMode,
      onChange: handleViewChange,
      tableMode,
      onToggleTable: () => setTableMode((v) => !v),
    },
    catalogue: {
      onOpenTexts: openTextsPanel,
      onOpenAuthors: openAuthorsPanel,
      onOpenAnalysis: () => analysisPanelRef.current?.openPanel(),
      graphData,
      authorCount,
    },
  }
}
