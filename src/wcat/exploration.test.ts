import { describe, expect, it } from 'vitest'
import { createVisit, visitIcon } from './exploration'
import { createBody } from './physics'

const body = createBody({ width: 800, floor: 600, platforms: [] })
const icons = [{ id: 'art', x: 52, y: 400, open: false }]
const random = () => 0.5

describe('icon visits', () => {
  it('waits between visits, inspects, then chooses whether to hop inside', () => {
    const first = createVisit(0, random)
    expect(visitIcon(first, body, icons, 2, false, random).phase).toBe('idle')
    const inspect = visitIcon(first, body, icons, 40, false, random)
    expect(inspect.phase).toBe('inspect')
    expect(visitIcon(inspect, body, icons, 42, false, random).phase).toBe('hop')
    const decline = visitIcon(inspect, body, icons, 42, false, () => 0.8)
    expect(decline.phase).toBe('idle')
    expect(decline.nextAt).toBeGreaterThan(60)
  })

  it('ignores open windows and pauses visits during direct interaction', () => {
    const initial = createVisit(0, random)
    expect(visitIcon(initial, body, [{ ...icons[0], open: true }], 40, false, random).phase).toBe('idle')
    expect(visitIcon(initial, body, icons, 40, true, random).phase).toBe('idle')
    const inspecting = visitIcon(initial, body, icons, 40, false, random)
    expect(visitIcon(inspecting, body, icons, 41, true, random).phase).toBe('idle')
  })

  it('revisits only on a quiet desktop, but can investigate an unfamiliar app', () => {
    const initial = createVisit(0, random)
    const visited = new Set(['art'])
    expect(visitIcon(initial, body, icons, 40, false, random, visited, 2).phase).toBe('idle')
    expect(visitIcon(initial, body, icons, 40, false, random, visited, 1).phase).toBe('inspect')
    expect(visitIcon(initial, body, icons, 40, false, random, new Set(), 3).phase).toBe('inspect')
    const inspecting = visitIcon(initial, body, icons, 40, false, random, visited, 1)
    expect(visitIcon(inspecting, body, icons, 42, false, random, visited, 2).phase).toBe('idle')
  })

  it('cancels cleanly if the icon disappears or opens during inspection', () => {
    const inspecting = visitIcon(createVisit(0, random), body, icons, 40, false, random)
    expect(visitIcon(inspecting, body, [], 41, false, random).phase).toBe('idle')
    expect(visitIcon(inspecting, body, [{ ...icons[0], open: true }], 41, false, random).phase).toBe('idle')
  })
})
