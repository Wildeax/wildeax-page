import { useI18n } from '@/i18n'

const LINKS: ReadonlyArray<{ labelKey: string; href?: string }> = [
  { labelKey: 'os.contact.email', href: 'mailto:projects@wildeax.com' },
  { labelKey: 'os.contact.linkedin', href: 'https://www.linkedin.com/in/wildeax/' },
  { labelKey: 'os.contact.x', href: 'https://x.com/Wildeax_' },
  { labelKey: 'os.contact.instagram', href: 'https://www.instagram.com/wildeaxart/' },
  { labelKey: 'os.contact.podcast', href: 'https://open.spotify.com/show/022JC04g9oijOmPtHfsDUN' },
  // No href: a Discord username is not a link.
  { labelKey: 'os.contact.discord' },
]

export function ContactWindow() {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-500">{t('os.contact.heading')}</h2>
      <ul className="space-y-1.5 font-mono text-[13px]">
        {LINKS.map(({ labelKey, href }) => (
          <li key={labelKey}>
            {href ? (
              <a
                href={href}
                target={href.startsWith('mailto:') ? undefined : '_blank'}
                rel="noreferrer"
                className="text-brand-300 underline-offset-2 hover:underline"
              >
                {t(labelKey)}
              </a>
            ) : (
              <span className="text-zinc-400">{t(labelKey)}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
