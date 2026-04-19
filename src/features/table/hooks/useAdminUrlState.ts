import { useCallback } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import type { TableTabId, DrawerTool } from '@/core/TableUiContext'
import {
  ADMIN_QUERY_KEYS,
  adminPathForTab,
  drawerToolFromParam,
  tabFromAdminSegment,
} from '@/common/utils/adminUrl'

/** URL is the single source of truth for the admin view's `tab` and
 *  `drawerTool`. We read them from `useLocation` / `useSearchParams` and
 *  write them with `navigate`. No local state, no effects, no sync loop. */
export function useAdminUrlState() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const segment = location.pathname.replace(/^\/admin\/?/, '').split('/')[0]
  const tab = tabFromAdminSegment(segment)
  const drawerTool = drawerToolFromParam(searchParams.get(ADMIN_QUERY_KEYS.tool))

  const setTab = useCallback((next: TableTabId) => {
    const search = searchParams.toString()
    navigate({
      pathname: adminPathForTab(next),
      search: search ? `?${search}` : '',
    }, { replace: true })
  }, [navigate, searchParams])

  const setDrawerTool = useCallback((next: DrawerTool) => {
    const params = new URLSearchParams(searchParams)
    if (next) params.set(ADMIN_QUERY_KEYS.tool, next)
    else params.delete(ADMIN_QUERY_KEYS.tool)
    const search = params.toString()
    navigate({
      pathname: location.pathname,
      search: search ? `?${search}` : '',
    }, { replace: true })
  }, [navigate, location.pathname, searchParams])

  return { tab, setTab, drawerTool, setDrawerTool }
}
