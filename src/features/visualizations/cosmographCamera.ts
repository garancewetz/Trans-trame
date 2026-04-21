// Clé URL pour persister la caméra. Coexiste avec `?book=` / `?link=` gérés
// par useMapUrlSync — on n'écrase jamais les autres params.
export const CAM_QUERY_KEY = 'cam'
export const CAM_WRITE_THROTTLE_MS = 400

export type CamState = { x: number; y: number; zoom: number }

/** Parse `cam=cx,cy,cz` depuis l'URL. Retourne null si invalide. */
export function parseCamParam(raw: string | null): CamState | null {
  if (!raw) return null
  const parts = raw.split(',').map(Number)
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null
  return { x: parts[0], y: parts[1], zoom: parts[2] }
}

/** Sérialise une caméra avec 2 décimales — évite le bruit dans l'URL. */
export function serializeCam(cam: CamState): string {
  const f = (n: number) => Number(n.toFixed(2)).toString()
  return `${f(cam.x)},${f(cam.y)},${f(cam.zoom)}`
}
