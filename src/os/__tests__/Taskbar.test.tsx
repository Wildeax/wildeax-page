// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { I18nProvider } from '@/i18n'
import { Taskbar } from '@/os/Taskbar'
import type { WindowId } from '@/os/types'

afterEach(cleanup)

function renderTaskbar(open: WindowId[], onSelect = vi.fn()) {
  render(
    <I18nProvider>
      <Taskbar open={open} onSelect={onSelect} />
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

  it('offers a language toggle', () => {
    renderTaskbar([])
    expect(screen.getByRole('button', { name: /switch language/i })).toBeTruthy()
  })
})
