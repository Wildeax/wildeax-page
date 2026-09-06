// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { I18nProvider } from '@/i18n'
import { WorkWindow } from '@/os/content/WorkWindow'
import { PROJECTS } from '@/os/projects'

afterEach(cleanup)

describe('WorkWindow', () => {
  it('lists every project', () => {
    render(
      <I18nProvider>
        <WorkWindow onOpen={() => {}} />
      </I18nProvider>,
    )
    expect(screen.getAllByRole('button')).toHaveLength(PROJECTS.length)
  })

  it('opens the matching window when a row is chosen', () => {
    const onOpen = vi.fn()
    render(
      <I18nProvider>
        <WorkWindow onOpen={onOpen} />
      </I18nProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /Splitwars Online/ }))
    expect(onOpen).toHaveBeenCalledWith('splitwars')
  })
})
