/**
 * The namespace all shared state lives in. Bumping this number abandons the
 * old room and starts an empty one, which is the reset mechanism for the whole
 * site. There is deliberately no admin UI. See README.md.
 *
 * The room is shared by every host serving this Worker: production, every
 * preview URL, and any browser driven by the verification script. A
 * `?room=<name>` query parameter overrides it, so tests can run in a room of
 * their own instead of rearranging the live desktop, and so the author can look
 * at a clean desktop without resetting everyone's.
 */
const DEFAULT_ROOM = 'wildeax-2'

function roomFromQuery(): string | null {
  if (typeof window === 'undefined') return null
  const requested = new URLSearchParams(window.location.search).get('room')
  return requested && /^[a-z0-9-]{1,40}$/i.test(requested) ? requested : null
}

export const ROOM = roomFromQuery() ?? DEFAULT_ROOM
