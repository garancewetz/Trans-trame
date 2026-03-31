export const bookKeys = {
  all: ['books'] as const,
  list: () => [...bookKeys.all, 'list'] as const,
  detail: (id: string) => [...bookKeys.all, 'detail', id] as const,
}

export const authorKeys = {
  all: ['authors'] as const,
  list: () => [...authorKeys.all, 'list'] as const,
}

export const linkKeys = {
  all: ['links'] as const,
  list: () => [...linkKeys.all, 'list'] as const,
}

/** Single key for the combined dataset query (books + authors + links). */
export const DATASET_QUERY_KEY = ['dataset'] as const
