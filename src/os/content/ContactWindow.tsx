import type { ComponentType } from 'react'
import { FaDiscord, FaInstagram, FaLinkedin, FaSpotify } from 'react-icons/fa'
import { MdEmail } from 'react-icons/md'
import { RiTwitterXFill } from 'react-icons/ri'
import { useI18n } from '@/i18n'

interface ContactLink {
  labelKey: string
  Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  /** Absent for a handle that is not a URL. */
  href?: string
  /** Brand colour on hover. Rest state stays the OS palette. */
  hover: string
}

// react-icons is already a dependency and Vite tree-shakes it per icon, so
// these six cost a few kilobytes and no network round trips.
const LINKS: readonly ContactLink[] = [
  { labelKey: 'os.contact.email', Icon: MdEmail, href: 'mailto:projects@wildeax.com', hover: 'hover:text-brand-200' },
  { labelKey: 'os.contact.linkedin', Icon: FaLinkedin, href: 'https://www.linkedin.com/in/wildeax/', hover: 'hover:text-[#0A66C2]' },
  { labelKey: 'os.contact.x', Icon: RiTwitterXFill, href: 'https://x.com/Wildeax_', hover: 'hover:text-white' },
  { labelKey: 'os.contact.instagram', Icon: FaInstagram, href: 'https://www.instagram.com/wildeaxart/', hover: 'hover:text-[#E4405F]' },
  { labelKey: 'os.contact.podcast', Icon: FaSpotify, href: 'https://open.spotify.com/show/022JC04g9oijOmPtHfsDUN', hover: 'hover:text-[#1DB954]' },
  // No href: a Discord username is not a link.
  { labelKey: 'os.contact.discord', Icon: FaDiscord, hover: 'hover:text-[#5865F2]' },
]

export function ContactWindow() {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-500">{t('os.contact.heading')}</h2>
      <ul className="space-y-1">
        {LINKS.map(({ labelKey, Icon, href, hover }) => {
          const row = (
            <>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/10 bg-white/5 transition-transform group-hover:scale-110">
                <Icon aria-hidden className="h-4 w-4" />
              </span>
              <span className="font-mono text-[13px]">{t(labelKey)}</span>
            </>
          )
          const className = `group flex items-center gap-3 rounded px-2 py-1.5 text-brand-300 transition ${hover}`
          return (
            <li key={labelKey}>
              {href ? (
                <a
                  href={href}
                  target={href.startsWith('mailto:') ? undefined : '_blank'}
                  rel="noreferrer"
                  className={`${className} hover:bg-white/5`}
                >
                  {row}
                </a>
              ) : (
                <span className={`${className} cursor-default text-zinc-400`}>{row}</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
