// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { PlayRoot, Playable } from '@/play/sync'

afterEach(cleanup)

describe('when the sync backend is unreachable', () => {
  it('still renders the page content', () => {
    render(
      <PlayRoot pathname="/">
        <Playable id="hero-title" caps={['move']}>
          <h1>Wildeax</h1>
        </Playable>
      </PlayRoot>,
    )
    expect(screen.getByText('Wildeax')).toBeTruthy()
  })

  it('surfaces no error UI', () => {
    const { container } = render(
      <PlayRoot pathname="/">
        <Playable id="hero-title" caps={['move']}>
          <h1>Wildeax</h1>
        </Playable>
      </PlayRoot>,
    )
    expect(container.textContent).not.toMatch(/error|reconnect|offline/i)
  })

  it('renders a Playable outside any provider at all', () => {
    render(
      <Playable id="orphan" caps={['move']}>
        <span>still here</span>
      </Playable>,
    )
    expect(screen.getByText('still here')).toBeTruthy()
  })
})
