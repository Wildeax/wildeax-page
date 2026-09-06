import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Cat } from './Cat'
import { roomFor } from './exploration'
import type { Body } from './physics'
import { YarnToy } from './YarnToy'
import type { YarnState } from './yarn'
import { usePhonePlay } from './usePhonePlay'
import { PhoneControls } from './PhoneControls'
import { PHONE_LABELS } from './phone-labels'
import type { PhoneLabels } from './phone-labels'

type Residence = { kind: 'desktop'; body?: Body } | { kind: 'icon'; id: string } | { kind: 'room'; id: string; host: HTMLElement }

/** Only one cat runs at a time. Room cats inherit their window's clipping and stacking. */
export function Wcat({ mobile = false, label, insideLabel = 'wcat is inside', toyLabel = 'Yarn toy, only yours', toyHelp = 'Yarn toy. Drag to throw. Right-click to remove. Space to lift or drop, arrows to move, Delete to remove.', phoneLabels = PHONE_LABELS }: { mobile?: boolean; label: string; insideLabel?: string; toyLabel?: string; toyHelp?: string; phoneLabels?: PhoneLabels }) {
  const anchor = useRef<HTMLSpanElement>(null)
  const toy = useRef<YarnState | null>(null)
  const phone = usePhonePlay(mobile)
  const [visited] = useState(() => new Set<string>())
  const [residence, setResidence] = useState<Residence>({ kind: 'desktop' })
  const enter = useCallback((id: string) => {
    visited.add(id)
    setResidence({ kind: 'icon', id })
  }, [visited])
  const hide = useCallback(() => setResidence((current) => current.kind === 'room' ? { kind: 'icon', id: current.id } : current), [])
  const exit = useCallback((body: Body) => setResidence({ kind: 'desktop', body }), [])

  useEffect(() => {
    if (residence.kind !== 'icon') return
    const root = anchor.current!.parentElement!
    let frame = 0
    const watch = () => {
      const host = roomFor(root, residence.id)
      if (host) setResidence({ kind: 'room', id: residence.id, host })
      else frame = requestAnimationFrame(watch)
    }
    frame = requestAnimationFrame(watch)
    return () => cancelAnimationFrame(frame)
  }, [residence])

  const icon = residence.kind === 'desktop' ? null : [...(anchor.current?.parentElement?.querySelectorAll<HTMLElement>('[data-icon]') ?? [])].find((el) => el.dataset.icon === residence.id)
  const props = { mobile, label, toy, phone: phone.input, visited, onEnter: enter, onHide: hide, onExit: exit }
  return <>
    <span ref={anchor} hidden />
    <YarnToy model={toy} mobile={mobile} label={toyLabel} help={toyHelp} phone={phone.input} shortLabel={phoneLabels.yarn}
      controls={mobile ? <PhoneControls play={phone} labels={phoneLabels} /> : undefined} />
    {residence.kind === 'desktop' && <Cat {...props} initialBody={residence.body} />}
    {residence.kind === 'room' && createPortal(<Cat {...props} roomId={residence.id} />, residence.host)}
    {icon && createPortal(<span className="wcat-icon-badge" data-cat-resident={residence.kind !== 'desktop' ? residence.id : undefined} role="img" aria-label={insideLabel} title={insideLabel}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 9V3l5 3h4l5-3v6c3 10-17 10-14 0Z" fill="currentColor" /><path d="M6 10h2m4 0h2" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg></span>, icon)}
  </>
}
