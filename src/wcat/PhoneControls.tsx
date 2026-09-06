import type { usePhonePlay } from './usePhonePlay'
import { PHONE_LABELS } from './phone-labels'
import type { PhoneLabels } from './phone-labels'

export function PhoneControls({ play, labels = PHONE_LABELS }: { play: ReturnType<typeof usePhonePlay>; labels?: PhoneLabels }) {
  const active = play.status === 'on' || play.status === 'waiting'
  return <>
    <button type="button" className="phone-tool" data-phone-pet onClick={play.pet} aria-label={labels.pet}>
      <span aria-hidden="true" className="text-xl">♡</span><span>{labels.pet}</span>
    </button>
    <button type="button" className="phone-tool" data-phone-tilt data-status={play.status} aria-pressed={active}
      aria-label={active ? labels.disable : labels.enable} disabled={play.status === 'reduced'} onClick={() => void play.toggle()}>
      <span aria-hidden="true" className="text-xl">↔</span><span>{labels.tilt}</span>
    </button>
    {play.status !== 'off' && <div className="phone-motion-status" role="status">
      <span>{labels[play.status]}</span>
      {play.status === 'on' && <button type="button" onClick={play.recenter}>{labels.recenter}</button>}
    </div>}
  </>
}
