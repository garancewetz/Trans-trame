/** Logs réservés au développement local (pas de bruit en production). */
export function devWarn(message: string, ...rest: unknown[]) {
  if (import.meta.env.DEV) {
    console.warn(`[trans_trame] ${message}`, ...rest)
  }
}
