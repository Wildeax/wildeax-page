// no default React import needed in React 17+ JSX runtime
import ScrambledText from '@/reactbits/ScrambledText'
import SpotlightCard from '@/reactbits/SpotlightCard'
import avatarImg from '@/assets/img/wildeax square optimized.png'
import { FaInstagram, FaLinkedin, FaSpotify } from 'react-icons/fa'
import { RiTwitterXFill } from 'react-icons/ri'
import { MdEmail } from 'react-icons/md'

type LinkItem = {
  label: string
  href: string
  icon: React.ReactNode
  external?: boolean
}

const links: LinkItem[] = [
  { label: 'Email', href: 'mailto:projects@wildeax.com', icon: <MdEmail className="h-5 w-5" /> },
  { label: 'Instagram', href: 'https://www.instagram.com/wildeaxart/', icon: <FaInstagram className="h-5 w-5" />, external: true },
  { label: 'X (Twitter)', href: 'https://x.com/Wildeax_', icon: <RiTwitterXFill className="h-5 w-5" />, external: true },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/wildeax/', icon: <FaLinkedin className="h-5 w-5" />, external: true },
  { label: 'Level Up Unity Game Dev — Spotify', href: 'https://open.spotify.com/show/022JC04g9oijOmPtHfsDUN?si=ZUFz0aD3RzCfV7aCt1WdjQ', icon: <FaSpotify className="h-5 w-5" />, external: true },
]

function Links() {
  return (
    <main className="relative z-10 py-16 md:py-24">
      <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
        <div className="relative mb-8">
          <div className="absolute -inset-8 -z-10 opacity-40">
            <div className="h-40 blur-3xl rounded-full bg-gradient-to-br from-brand-500/40 to-violet-500/40" />
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-brand-400 to-violet-500 blur opacity-70" />
              <img src={avatarImg} alt="Wildeax avatar" className="relative h-24 w-24 rounded-full border border-white/20 object-cover" />
            </div>
            <ScrambledText className="mt-4 text-2xl font-extrabold tracking-tight text-zinc-100">Wildeax</ScrambledText>
            <p className="mt-1 text-sm text-zinc-400">Digital Artist & Dev</p>
          </div>
        </div>

        <div className="space-y-3">
          {links.map((link) => (
            <SpotlightCard key={link.href}>
              <a
                href={link.href}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noreferrer' : undefined}
                className="group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 transition-colors"
                aria-label={link.label}
              >
                <div className="flex items-center gap-3">
                  <span className="text-zinc-100">
                    {link.icon}
                  </span>
                  <span className="font-semibold text-zinc-100">
                    {link.label}
                  </span>
                </div>
                {/* No trailing label on link button */}
              </a>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </main>
  )
}

export default Links


