import { useMediaQuery } from './useMediaQuery'

/** Windows need room in both directions, including on a rotated phone. */
const DESKTOP_QUERY = '(min-width: 1024px) and (min-height: 600px)'

export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY, true)
}
