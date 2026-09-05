import { useCallback, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import { useI18n } from '@/i18n'
import { Playable } from '@/play'
import { DesktopIcon } from '@/os/DesktopIcon'
import { Taskbar } from '@/os/Taskbar'
import { Window } from '@/os/Window'
import { DESKTOP_ICON_IDS, WINDOWS } from '@/os/registry'
import { PROJECTS } from '@/os/projects'
import { initialOsState, isOpen, osReducer, zIndexOf } from '@/os/windowState'
import { useIsDesktop } from '@/os/useIsDesktop'
import type { WindowId } from '@/os/types'
import { ArtWindow } from '@/os/content/ArtWindow'
import { ContactWindow } from '@/os/content/ContactWindow'
import { MeWindow } from '@/os/content/MeWindow'
import { ProjectWindow } from '@/os/content/ProjectWindow'
import { ReadmeWindow } from '@/os/content/ReadmeWindow'
import { WorkWindow } from '@/os/content/WorkWindow'

export function Desktop() {
  const { t } = useI18n()
  const isDesktop = useIsDesktop()
  const [state, dispatch] = useReducer(osReducer, WINDOWS, initialOsState)

  const open = useCallback((id: WindowId) => dispatch({ type: 'open', id }), [])
  const close = useCallback((id: WindowId) => dispatch({ type: 'close', id }), [])
  const focus = useCallback((id: WindowId) => dispatch({ type: 'focus', id }), [])

  const bodies = useMemo(() => {
    const map = new Map<WindowId, ReactNode>([
      ['readme', <ReadmeWindow key="readme" />],
      ['work', <WorkWindow key="work" onOpen={open} />],
      ['art', <ArtWindow key="art" />],
      ['me', <MeWindow key="me" />],
      ['contact', <ContactWindow key="contact" />],
    ])
    for (const p of PROJECTS) map.set(p.id, <ProjectWindow key={p.id} project={p} />)
    return map
  }, [open])

  // On mobile every window is already expanded, so WorkWindow's row buttons
  // dispatch an open for something already visible. Harmless, and cheaper than
  // a second code path; revisit only if it confuses anyone.
  if (!isDesktop) {
    return (
      <div className="relative z-10 mx-auto flex max-w-xl flex-col gap-4 px-4 py-6">
        <MobileHeader />
        {WINDOWS.map((w) => (
          <div key={w.id} className="h-[min(70vh,520px)]">
            <Window
              id={w.id}
              title={t(w.titleKey)}
              zIndex={0}
              hidden={false}
              onClose={() => {}}
              onFocus={() => {}}
            >
              {bodies.get(w.id)}
            </Window>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="relative z-10 h-screen overflow-hidden">
      <ul className="absolute left-3 top-3 z-[5] flex w-24 flex-col gap-1">
        {DESKTOP_ICON_IDS.map((id) => {
          const def = WINDOWS.find((w) => w.id === id)
          if (!def) return null
          return (
            <li key={id}>
              <Playable id={`icon-${id}`} caps={['move']}>
                <DesktopIcon id={id} label={t(def.titleKey)} glyph={def.glyph} onOpen={() => open(id)} />
              </Playable>
            </li>
          )
        })}
      </ul>

      {WINDOWS.map((w) => {
        const shown = isOpen(state, w.id)
        return (
          <div key={w.id} className="absolute" style={{ left: w.x, top: w.y }}>
            <Playable id={`win-${w.id}`} caps={['move']}>
              <div style={{ width: w.width, height: w.height }}>
                <Window
                  id={w.id}
                  title={t(w.titleKey)}
                  zIndex={zIndexOf(state, w.id)}
                  hidden={!shown}
                  onClose={() => close(w.id)}
                  onFocus={() => focus(w.id)}
                >
                  {bodies.get(w.id)}
                </Window>
              </div>
            </Playable>
          </div>
        )
      })}

      <div data-taskbar>
        <Taskbar open={state.open} onSelect={focus} />
      </div>
    </div>
  )
}

function MobileHeader() {
  const { lang, setLang } = useI18n()
  return (
    <header className="flex items-center justify-between">
      <span className="font-mono text-sm tracking-widest text-brand-300">WILDEAX OS</span>
      <button
        type="button"
        aria-label="Switch language"
        onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
        className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-zinc-300"
      >
        {lang === 'en' ? 'ES' : 'EN'}
      </button>
    </header>
  )
}
