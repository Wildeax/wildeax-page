// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { I18nProvider } from '@/i18n'
import { Taskbar } from '@/os/Taskbar'
import type { WindowId } from '@/os/types'

afterEach(cleanup)

function renderTaskbar(open: WindowId[], minimized: WindowId[] = [], onSelect = vi.fn()) {
  render(
    <I18nProvider>
      <Taskbar open={open} minimized={minimized} onSelect={onSelect} />
    </I18nProvider>,
  )
  return onSelect
}

describe('Taskbar', () => {
  it('lists one button per open window', () => {
    renderTaskbar(['readme', 'work'])
    expect(screen.getByRole('button', { name: /readme\.txt/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /work\.exe/ })).toBeTruthy()
  })

  it('reports the selected window', () => {
    const onSelect = renderTaskbar(['readme'])
    fireEvent.click(screen.getByRole('button', { name: /readme\.txt/ }))
    expect(onSelect).toHaveBeenCalledWith('readme')
  })

  it('marks minimized windows so they read differently from visible ones', () => {
    renderTaskbar(['readme', 'work'], ['work'])
    expect(document.querySelector('[data-task="work"]')?.getAttribute('data-minimized')).toBe('true')
    expect(document.querySelector('[data-task="readme"]')?.hasAttribute('data-minimized')).toBe(false)
  })

  it('exposes a dock target per window for the minimize animation', () => {
    renderTaskbar(['readme'])
    expect(document.querySelector('[data-task="readme"]')).not.toBeNull()
  })

  it('offers a language toggle', () => {
    renderTaskbar([])
    expect(screen.getByRole('button', { name: /switch language/i })).toBeTruthy()
  })
})
