// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Scramble } from '@/os/Scramble'

afterEach(cleanup)

describe('Scramble', () => {
  it('paints the real text first, so crawlers and the first frame read it', () => {
    render(<Scramble text="hello world" />)
    // Before any animation frame runs, the DOM holds the real string.
    expect(screen.getByText('hello world')).toBeTruthy()
  })

  it('never scrambles spaces, so word shape survives the effect', async () => {
    render(<Scramble text="ab cd" duration={50} />)
    await new Promise((r) => setTimeout(r, 20))
    const p = document.querySelector('p')
    expect(p?.textContent?.length).toBe('ab cd'.length)
    expect(p?.textContent?.[2]).toBe(' ')
  })

  it('settles on the real text once the duration has elapsed', async () => {
    render(<Scramble text="settled" duration={30} />)
    await new Promise((r) => setTimeout(r, 120))
    expect(screen.getByText('settled')).toBeTruthy()
  })
})
