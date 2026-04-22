import type { TableTabId, DrawerTool } from '@/core/TableUiContext'

export const ADMIN_ROUTE = '/admin'

export const ADMIN_QUERY_KEYS = {
  tool: 'tool',
  focus: 'focus',
  from: 'from',
} as const

export function adminPathForTab(tab: TableTabId): string {
  if (tab === 'authors') return '/admin/authors'
  if (tab === 'links') return '/admin/links'
  return '/admin'
}

export function tabFromAdminSegment(segment: string | undefined): TableTabId {
  if (segment === 'authors') return 'authors'
  if (segment === 'links') return 'links'
  return 'books'
}

export function drawerToolFromParam(value: string | null): DrawerTool {
  if (value === 'history') return 'history'
  if (value === 'review') return 'review'
  if (value === 'subaxes') return 'subaxes'
  return null
}
