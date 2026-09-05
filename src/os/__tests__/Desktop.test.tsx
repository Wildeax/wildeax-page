// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { I18nProvider } from '@/i18n'
import { Desktop } from '@/os/Desktop'
import { WINDOWS } from '@/os/registry'
import { Z_BASE } from '@/os/windowState'

afterEach(cleanup)

/** jsdom has matchMedia but it always reports false; drive it explicitly. */
function setViewport(isDesktop: boolean) {
  // Answer per query. The old stub returned the same value for every query,
  // which made prefers-reduced-motion read as true on desktop and skipped the
  // flights these tests exist to exercise.
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width') ? isDesktop : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }))
}

beforeEach(() => vi.unstubAllGlobals())

describe('Desktop at mobile widths', () => {
  it('renders every window as a card and no taskbar', () => {
    setViewport(false)
    render(
      <I18nProvider>
        <Desktop />
      </I18nProvider>,
    )
    expect(screen.getAllByRole('dialog')).toHaveLength(WINDOWS.length)
    expect(screen.queryByRole('button', { name: /switch language/i })).toBeTruthy()
    expect(document.querySelector('[data-taskbar]')).toBeNull()
  })
})

describe('Desktop at desktop widths', () => {
  it('renders the taskbar and the desktop icons', () => {
    setViewport(true)
    render(
      <I18nProvider>
        <Desktop />
      </I18nProvider>,
    )
    expect(document.querySelector('[data-taskbar]')).not.toBeNull()
    expect(document.querySelectorAll('[data-icon]').length).toBeGreaterThan(0)
  })

  it('puts z-index on the wrapper outside the transform, ordered by open sequence', () => {
    setViewport(true)
    render(
      <I18nProvider>
        <Desktop />
      </I18nProvider>,
    )
    // PlayableSurface always carries a transform, which is its own stacking
    // context. A z-index inside it cannot order one window over another, so the
    // wrapper above the surface must own it. readme, work, me open in that
    // order, so me is topmost.
    const wrapperOf = (id: string) =>
      document.querySelector(`[data-window="${id}"]`)!.closest('.absolute') as HTMLElement
    expect(wrapperOf('readme').style.zIndex).toBe(String(Z_BASE))
    expect(wrapperOf('work').style.zIndex).toBe(String(Z_BASE + 1))
    expect(wrapperOf('me').style.zIndex).toBe(String(Z_BASE + 2))
    expect(wrapperOf('art').style.zIndex).toBe('')
  })

  it('hides a minimized window only after its flight ends, and flights do not cancel each other', () => {
    setViewport(true)
    render(
      <I18nProvider>
        <Desktop />
      </I18nProvider>,
    )
    const dialog = (id: string) => document.querySelector(`[data-window="${id}"]`) as HTMLElement
    const wrapper = (id: string) => document.querySelector(`[data-win-wrapper="${id}"]`) as HTMLElement
    const minimizeButton = (id: string) =>
      dialog(id).querySelector('button[aria-label^="Minimize"]') as HTMLButtonElement

    fireEvent.click(minimizeButton('readme'))
    // Still drawn while the flight plays; the reducer has not been told yet.
    expect(dialog('readme').hasAttribute('hidden')).toBe(false)
    expect(wrapper('readme').className).toContain('os-flight-minimize')

    // A second flight on another window must not cancel the first.
    fireEvent.click(minimizeButton('work'))
    expect(wrapper('readme').className).toContain('os-flight-minimize')
    expect(wrapper('work').className).toContain('os-flight-minimize')

    fireEvent.animationEnd(wrapper('readme'))
    fireEvent.animationEnd(wrapper('work'))
    expect(dialog('readme').hasAttribute('hidden')).toBe(true)
    expect(dialog('work').hasAttribute('hidden')).toBe(true)
    // Both keep their taskbar entries, marked minimized.
    expect(document.querySelector('[data-task="readme"][data-minimized]')).not.toBeNull()
    expect(document.querySelector('[data-task="work"][data-minimized]')).not.toBeNull()
  })

  it('removes a closed window from the taskbar once its flight ends', () => {
    setViewport(true)
    render(
      <I18nProvider>
        <Desktop />
      </I18nProvider>,
    )
    const me = document.querySelector('[data-window="me"]') as HTMLElement
    fireEvent.click(me.querySelector('button[aria-label^="Close"]')!)
    expect(document.querySelector('[data-task="me"]')).not.toBeNull()
    fireEvent.animationEnd(document.querySelector('[data-win-wrapper="me"]')!)
    expect(me.hasAttribute('hidden')).toBe(true)
    expect(document.querySelector('[data-task="me"]')).toBeNull()
  })

  it('keeps closed windows in the DOM so crawlers read them', () => {
    setViewport(true)
    render(
      <I18nProvider>
        <Desktop />
      </I18nProvider>,
    )
    expect(screen.getAllByRole('dialog', { hidden: true })).toHaveLength(WINDOWS.length)
  })
})
