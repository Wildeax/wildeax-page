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

  it('marks its title bar as the drag handle, so body text stays selectable', () => {
    render(
      <Window id="readme" title="readme.txt" hidden={false} onClose={() => {}} onFocus={() => {}}>
        <p>hello</p>
      </Window>,
    )
    const handle = screen.getByRole('dialog').querySelector('[data-drag-handle]')
    expect(handle).not.toBeNull()
    expect(handle?.textContent).toContain('readme.txt')
    expect(screen.getByText('hello').closest('[data-drag-handle]')).toBeNull()
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

  it('calls onMinimize when the minimize control is used', () => {
    const onMinimize = vi.fn()
    render(
      <Window
        id="readme"
        title="readme.txt"
        hidden={false}
        onClose={() => {}}
        onFocus={() => {}}
        onMinimize={onMinimize}
      >
        <p>hello</p>
      </Window>,
    )
    fireEvent.click(screen.getByRole('button', { name: /minimize/i }))
    expect(onMinimize).toHaveBeenCalledTimes(1)
  })

  it('has no minimize control when none is offered, as on mobile', () => {
    render(
      <Window id="readme" title="readme.txt" hidden={false} onClose={() => {}} onFocus={() => {}}>
        <p>hello</p>
      </Window>,
    )
    expect(screen.queryByRole('button', { name: /minimize/i })).toBeNull()
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
    const dialog = el.closest('[hidden]') as HTMLElement | null
    expect(dialog).not.toBeNull()
    // The attribute alone is not enough: Tailwind's .flex class outranked
    // [hidden]{display:none} and every closed window was drawn. The inline
    // style is what actually hides it.
    expect(dialog?.style.display).toBe('none')
  })

  it('does not force display when visible, so the flex layout applies', () => {
    render(
      <Window id="readme" title="readme.txt" hidden={false} onClose={() => {}} onFocus={() => {}}>
        <p>shown</p>
      </Window>,
    )
    expect((screen.getByRole('dialog') as HTMLElement).style.display).toBe('')
  })
})

describe('DesktopIcon', () => {
  it('opens on click', () => {
    const onOpen = vi.fn()
    render(<DesktopIcon id="art" label="art" glyph="🎨" onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button', { name: /art/ }))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('prefers a real image over the glyph when given one', () => {
    render(<DesktopIcon id="me" label="me.jpg" glyph="🖼️" iconSrc="/me.jpg" onOpen={() => {}} />)
    expect(document.querySelector('[data-icon="me"] img')).not.toBeNull()
    expect(screen.queryByText('🖼️')).toBeNull()
  })
})
