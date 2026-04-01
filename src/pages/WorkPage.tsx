import { useMemo } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { mapBookUrlSearch, parseBookIdFromWorkSlugParam } from '@/common/utils/bookSlug'

/** Redirige les anciens liens `/works/...` vers `/?book=<uuid>`. */
export function WorkPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const bookId = useMemo(() => parseBookIdFromWorkSlugParam(slug), [slug])

  if (!bookId) {
    return <Navigate to="/" replace />
  }

  return <Navigate to={{ pathname: '/', search: mapBookUrlSearch(bookId) }} replace />
}
