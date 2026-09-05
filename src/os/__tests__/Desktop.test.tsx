// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { I18nProvider } from '@/i18n'
import { Desktop } from '@/os/Desktop'
import { WINDOWS } from '@/os/registry'

afterEach(cleanup)

/** jsdom has matchMedia but it always reports false; drive it explicitly. */
function setViewport(isDesktop: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: isDesktop,
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
