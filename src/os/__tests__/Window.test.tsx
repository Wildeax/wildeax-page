// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { Window } from '@/os/Window'
import { DesktopIcon } from '@/os/DesktopIcon'

afterEach(cleanup)

describe('Window', () => {
  it('renders its title and body', () => {
    render(
      <Window id="readme" title="readme.txt" hidden={false} onClose={() => {}} onFocus={() => {}}>
        <p>hello</p>
      </Window>,
    )
    expect(screen.getByText('readme.txt')).toBeTruthy()
    expect(screen.getByText('hello')).toBeTruthy()
  })

  it('is a labelled dialog for screen readers', () => {
    render(
      <Window id="readme" title="readme.txt" hidden={false} onClose={() => {}} onFocus={() => {}}>
        <p>hello</p>
      </Window>,
    )
    expect(screen.getByRole('dialog', { name: 'readme.txt' })).toBeTruthy()
  })

  it('calls onClose when the close control is used', () => {
    const onClose = vi.fn()
    render(
      <Window id="readme" title="readme.txt" hidden={false} onClose={onClose} onFocus={() => {}}>
        <p>hello</p>
      </Window>,
    )
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <Window id="readme" title="readme.txt" hidden={false} onClose={onClose} onFocus={() => {}}>
        <p>hello</p>
      </Window>,
    )
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('focuses when the body is clicked', () => {
    const onFocus = vi.fn()
    render(
      <Window id="readme" title="readme.txt" hidden={false} onClose={() => {}} onFocus={onFocus}>
        <p>hello</p>
      </Window>,
    )
    fireEvent.mouseDown(screen.getByRole('dialog'))
    expect(onFocus).toHaveBeenCalled()
  })

  it('stays in the DOM when hidden, so crawlers still read it', () => {
    render(
      <Window id="readme" title="readme.txt" hidden onClose={() => {}} onFocus={() => {}}>
        <p>indexable</p>
      </Window>,
    )
    const el = screen.getByText('indexable')
    expect(el).toBeTruthy()
    expect(el.closest('[hidden]')).not.toBeNull()
  })
})

describe('DesktopIcon', () => {
  it('opens on click', () => {
    const onOpen = vi.fn()
    render(<DesktopIcon id="art" label="art" glyph="🎨" onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button', { name: /art/ }))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
