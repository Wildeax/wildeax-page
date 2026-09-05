import type { WindowId } from '@/os/types'

export interface Project {
  id: WindowId
  nameKey: string
  descKey: string
  stackKey: string
  /**
   * skillicons.dev icon ids, comma separated. Rendered as one image so the
   * stack reads at a glance; stackKey remains the alt text and the tooltip.
   */
  stackIcons: string
  /** Absent for work with no public site. */
  href?: string
}

/**
 * The pharmacy ERP client is deliberately unnamed. See the spec: describe the
 * work, never the client.
 */
export const PROJECTS: readonly Project[] = [
  {
    id: 'splitwars',
    nameKey: 'os.project.splitwars.name',
    descKey: 'os.project.splitwars.desc',
    stackKey: 'os.project.splitwars.stack',
    stackIcons: 'unity,cs,java,go,rust,cloudflare',
    href: 'https://splitwars.com',
  },
  {
    id: 'arena',
    nameKey: 'os.project.arena.name',
    descKey: 'os.project.arena.desc',
    stackKey: 'os.project.arena.stack',
    stackIcons: 'electron,react,ts,nodejs,express,postgres,docker,nginx',
    href: 'https://arena-assistant.com',
  },
  {
    id: 'sweepr98',
    nameKey: 'os.project.sweepr98.name',
    descKey: 'os.project.sweepr98.desc',
    stackKey: 'os.project.sweepr98.stack',
    stackIcons: 'ts,react,nodejs',
    href: 'https://sweepr98.com',
  },
  {
    id: 'collab',
    nameKey: 'os.project.collab.name',
    descKey: 'os.project.collab.desc',
    stackKey: 'os.project.collab.stack',
    stackIcons: 'ts,nodejs',
    href: 'https://github.com/MoodStudios/moodstudios-collab-dist',
  },
  {
    id: 'pos',
    nameKey: 'os.project.pos.name',
    descKey: 'os.project.pos.desc',
    stackKey: 'os.project.pos.stack',
    stackIcons: 'java,ts,react,tauri,rust,postgres',
  },
]
