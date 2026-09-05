import { describe, it, expect } from 'vitest'
import { WINDOWS, DESKTOP_ICON_IDS } from '@/os/registry'
import { PROJECTS } from '@/os/projects'
import { resources } from '@/i18n/resources'

describe('WINDOWS', () => {
  it('has unique ids', () => {
    const ids = WINDOWS.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('opens readme, work and me on load, so a no-scroll page is not empty', () => {
    expect(WINDOWS.filter((w) => w.openOnLoad).map((w) => w.id)).toEqual(['readme', 'work', 'me'])
  })

  it('gives every window a positive size', () => {
    for (const w of WINDOWS) {
      expect(w.width).toBeGreaterThan(0)
      expect(w.height).toBeGreaterThan(0)
    }
  })
})

describe('DESKTOP_ICON_IDS', () => {
  it('only references windows that exist', () => {
    const ids = new Set(WINDOWS.map((w) => w.id))
    for (const id of DESKTOP_ICON_IDS) expect(ids.has(id)).toBe(true)
  })
})

describe('PROJECTS', () => {
  it('only references windows that exist', () => {
    const ids = new Set(WINDOWS.map((w) => w.id))
    for (const p of PROJECTS) expect(ids.has(p.id)).toBe(true)
  })

  it('never names the ERP client', () => {
    const blob = JSON.stringify([WINDOWS, PROJECTS]).toLowerCase()
    expect(blob).not.toContain('farmacenter')
    expect(blob).not.toContain('coopidrogas')
  })
})

describe('translations', () => {
  it('resolves every window title in both languages', () => {
    for (const w of WINDOWS) {
      expect(resources.en[w.titleKey], `en ${w.titleKey}`).toBeTruthy()
      expect(resources.es[w.titleKey], `es ${w.titleKey}`).toBeTruthy()
    }
  })

  it('resolves every project string in both languages', () => {
    for (const p of PROJECTS) {
      for (const key of [p.nameKey, p.descKey, p.stackKey]) {
        expect(resources.en[key], `en ${key}`).toBeTruthy()
        expect(resources.es[key], `es ${key}`).toBeTruthy()
      }
    }
  })

  it('has no key present in one language but missing in the other', () => {
    expect(Object.keys(resources.en).sort()).toEqual(Object.keys(resources.es).sort())
  })
})
