import React, { createContext, useContext, useMemo, useState, useEffect } from 'react'

export type Lang = 'en' | 'es'

type Dict = Record<string, string>
type Resources = Record<Lang, Dict>

export const resources: Resources = {
  en: {
    'os.win.readme': 'readme.txt',
    'os.win.work': 'work.exe',
    'os.win.art': 'art',
    'os.win.me': 'me.jpg',
    'os.win.contact': 'contact.txt',
    'os.win.splitwars': 'splitwars.exe',
    'os.win.arena': 'arena-assistant.exe',
    'os.win.sweepr98': 'sweepr98.exe',
    'os.win.collab': 'mood-collab.exe',
    'os.win.pos': 'pharmacy-erp.exe',
    'os.readme.p1': 'Francol Steven Aristizabal Romero. Medellín, Colombia. Co-founder at Mood Studios.',
    'os.readme.p2': 'I came up through digital art and game design. These days most of my hours go to the systems underneath: game servers, desktop clients, and the pipelines that ship them.',
    'os.readme.p3': 'Self-taught, still learning in public.',
    'os.work.heading': 'Things I am building',
    'os.work.open': 'Open',
    'os.art.heading': 'Selected work',
    'os.art.placeholder': 'Artwork coming soon',
    'os.me.caption': 'Medellín, 2025',
    'os.contact.heading': 'Get in touch',
    'os.contact.email': 'Email',
    'os.contact.linkedin': 'LinkedIn',
    'os.contact.x': 'X',
    'os.contact.instagram': 'Instagram',
    'os.contact.discord': 'Discord: wildeax',
    'os.contact.podcast': 'Level Up Unity Game Dev',
    'os.project.visit': 'Visit',
    'os.project.stackLabel': 'Stack',
    'os.project.splitwars.name': 'Splitwars Online',
    'os.project.splitwars.desc': 'Sci-fi isometric MMO RTS for PC and mobile, in closed alpha.',
    'os.project.splitwars.stack': 'Unity 6000.3, Java on SmartFoxServer, Go load balancer, Rust build pipeline, Cloudflare Worker CDN, Xsolla payments',
    'os.project.arena.name': 'Arena Assistant',
    'os.project.arena.desc': 'Companion app for the League of Legends Arena mode. 1.8M matches and 35M participant rows aggregated on a 15 minute cycle.',
    'os.project.arena.stack': 'Electron, React, Node, Express, Postgres, Docker blue/green behind nginx',
    'os.project.sweepr98.name': 'Sweepr98',
    'os.project.sweepr98.desc': 'Minesweeper rebuilt for the browser inside a Windows 98 shell, with co-op, race and ranked modes. Built solo.',
    'os.project.sweepr98.stack': 'TypeScript, real-time multiplayer',
    'os.project.collab.name': 'Mood Collab',
    'os.project.collab.desc': 'Real-time Markdown collaboration for Obsidian: per-user cursors, anchored comments, folder-level roles.',
    'os.project.collab.stack': 'TypeScript, CRDT sync, Obsidian plugin API',
    'os.project.pos.name': 'Pharmacy POS and ERP',
    'os.project.pos.desc': 'Replacing a legacy .NET point of sale and ERP, working from decompiled source and a map of the processes it runs.',
    'os.project.pos.stack': 'Java backend, two TypeScript frontends, Tauri desktop, shared design system',
    'os.taskbar.here': 'here now',
    'os.window.close': 'Close',
    'nav.tagline': 'Digital Artist & Dev',
    'nav.arena': 'Arena Assistant',
    'nav.splitwars': 'Splitwars',
    'nav.minesweeper': 'Sweepr',

    'hero.badge': 'Open to collaborations',
    'hero.title': 'Wildeax',
    'hero.tagline': 'Generalist artist–developer focused on Unity. I mix concept art, gameplay systems, tools, and performance to ship fast, great‑looking games — and share the process along the way.',
    'hero.btn.start': 'Start a project',
    'hero.btn.explore': 'Explore expertise',

    'ethos.title': 'Wildeax Ethos',
    'ethos.point1': 'Art × Engineering: concept to playable, solo.',
    'ethos.point2': 'Unity first: performance, shaders, clean gameplay code.',
    'ethos.point3': 'Learning in public: Level Up Unity Game Dev.',

    'features.heading': 'Capabilities',
    'features.sub': 'What I build for teams',
    'features.generalist.title': 'Generalist Unity Dev',
    'features.generalist.desc': 'From concept art to gameplay systems, tooling, and shipping builds that run fast on real devices.',
    'features.graphics.title': 'Graphics & Shaders',
    'features.graphics.desc': 'ShaderLab/HLSL, stylized pipelines, 2D/3D look‑dev, mobile‑first visual scaling.',
    'features.arch.title': 'Architecture & Workflows',
    'features.arch.desc': 'ScriptableObjects, clean gameplay code, editor tools, and repeatable production pipelines.',
    'features.educator.title': 'Developer‑Educator',
    'features.educator.desc': 'Level Up Unity Game Dev — concise, advanced episodes; teaching as branding and community.',

    'about.title': 'About “Wildeax”',
    'about.body': 'Generalist artist & Unity developer. I move across concept, gameplay, tools, and optimization to keep ideas moving from sketch to playable. I also share concise notes on the Level Up Unity Game Dev podcast.',
    'about.badge.ceo': 'CEO · Mood Studios',
    'about.chip.unity': 'Unity',
    'about.chip.shaders': 'Shaders',
    'about.chip.gameplay': 'Gameplay',
    'about.chip.tools': 'Tools',

    'contact.title': 'Contact',
    'contact.sub': 'Reach out for collaborations or opportunities.',
    'contact.email': 'Email',
    'contact.comingSoon': 'Coming soon',
    'contact.linkedin': 'LinkedIn',
    'contact.x': 'X',

    'footer.about': 'About',
    'footer.features': 'Features',
    'footer.contact': 'Contact',
    'footer.email': 'Email',
    'footer.linkedin': 'LinkedIn',
    'footer.x': 'X',
    'footer.rights': 'All rights reserved',

    'arena.nav.download': 'Download',
    'arena.title': 'Arena Assistant for League of Legends',
    'arena.tagline': 'Real‑time guidance that respects your focus. Arena Assistant helps you make fast, high‑impact decisions in champ select and planning — who to pick, what to build, and when to pivot.',
    'arena.download': 'Download for Windows (.exe)',
    'arena.note': 'Signed installer. macOS build coming soon.',
    'arena.card1.title': 'Champ‑select clarity',
    'arena.card1.desc': 'Role‑aware suggestions, comp checks, and quick reads that don’t flood your screen.',
    'arena.card2.title': 'Build paths that adapt',
    'arena.card2.desc': 'Compact item/augment paths tuned for scanning between bans and locks.',
    'arena.card3.title': 'Overlay‑friendly UI',
    'arena.card3.desc': 'Dark, legible visuals with subtle motion and thin borders — readable on any monitor.',
    'arena.card4.title': 'Lightweight & local',
    'arena.card4.desc': 'Low resource usage and privacy‑first: runs locally and never automates gameplay.',
    'arena.back': 'Back to Wildeax',

    'notfound.message': 'This page could not be found. The link may be broken or the page may have moved.',
    'notfound.back': 'Go back home',
  },
  es: {
    'os.win.readme': 'leeme.txt',
    'os.win.work': 'trabajo.exe',
    'os.win.art': 'arte',
    'os.win.me': 'yo.jpg',
    'os.win.contact': 'contacto.txt',
    'os.win.splitwars': 'splitwars.exe',
    'os.win.arena': 'arena-assistant.exe',
    'os.win.sweepr98': 'sweepr98.exe',
    'os.win.collab': 'mood-collab.exe',
    'os.win.pos': 'erp-farmacia.exe',
    'os.readme.p1': 'Francol Steven Aristizabal Romero. Medellín, Colombia. Cofundador en Mood Studios.',
    'os.readme.p2': 'Vengo del arte digital y el diseño de juegos. Hoy la mayoría de mis horas van a los sistemas de abajo: servidores de juego, clientes de escritorio y las tuberías que los publican.',
    'os.readme.p3': 'Autodidacta, y sigo aprendiendo en público.',
    'os.work.heading': 'En lo que estoy trabajando',
    'os.work.open': 'Abrir',
    'os.art.heading': 'Trabajo seleccionado',
    'os.art.placeholder': 'Obra próximamente',
    'os.me.caption': 'Medellín, 2025',
    'os.contact.heading': 'Hablemos',
    'os.contact.email': 'Correo',
    'os.contact.linkedin': 'LinkedIn',
    'os.contact.x': 'X',
    'os.contact.instagram': 'Instagram',
    'os.contact.discord': 'Discord: wildeax',
    'os.contact.podcast': 'Level Up Unity Game Dev',
    'os.project.visit': 'Visitar',
    'os.project.stackLabel': 'Tecnologías',
    'os.project.splitwars.name': 'Splitwars Online',
    'os.project.splitwars.desc': 'RTS MMO isométrico de ciencia ficción para PC y móvil, en alfa cerrada.',
    'os.project.splitwars.stack': 'Unity 6000.3, Java sobre SmartFoxServer, balanceador en Go, pipeline de build en Rust, CDN con Cloudflare Worker, pagos con Xsolla',
    'os.project.arena.name': 'Arena Assistant',
    'os.project.arena.desc': 'App complementaria para el modo Arena de League of Legends. 1.8M partidas y 35M filas de participantes agregadas cada 15 minutos.',
    'os.project.arena.stack': 'Electron, React, Node, Express, Postgres, Docker blue/green detrás de nginx',
    'os.project.sweepr98.name': 'Sweepr98',
    'os.project.sweepr98.desc': 'Buscaminas rehecho para el navegador dentro de una carcasa de Windows 98, con modos co-op, carrera y competitivo. Hecho en solitario.',
    'os.project.sweepr98.stack': 'TypeScript, multijugador en tiempo real',
    'os.project.collab.name': 'Mood Collab',
    'os.project.collab.desc': 'Colaboración en Markdown en tiempo real para Obsidian: cursores por usuario, comentarios anclados y roles por carpeta.',
    'os.project.collab.stack': 'TypeScript, sincronización CRDT, API de plugins de Obsidian',
    'os.project.pos.name': 'POS y ERP de farmacia',
    'os.project.pos.desc': 'Reemplazo de un punto de venta y ERP heredado en .NET, partiendo del código decompilado y de un mapa de sus procesos.',
    'os.project.pos.stack': 'Backend en Java, dos frontends en TypeScript, escritorio con Tauri, sistema de diseño compartido',
    'os.taskbar.here': 'en línea',
    'os.window.close': 'Cerrar',
    'nav.tagline': 'Artista digital y desarrollador',
    'nav.arena': 'Arena Assistant',
    'nav.splitwars': 'Splitwars',
    'nav.minesweeper': 'Sweepr',

    'hero.badge': 'Abierto a colaboraciones',
    'hero.title': 'Wildeax',
    'hero.tagline': 'Artista–desarrollador generalista enfocado en Unity. Combino concept art, sistemas de gameplay, herramientas y rendimiento para lanzar juegos rápidos y con gran apariencia — compartiendo el proceso en el camino.',
    'hero.btn.start': 'Iniciar un proyecto',
    'hero.btn.explore': 'Explorar habilidades',

    'ethos.title': 'Principios Wildeax',
    'ethos.point1': 'Arte × Ingeniería: del concepto a lo jugable, en solitario.',
    'ethos.point2': 'Unity primero: rendimiento, shaders y código limpio.',
    'ethos.point3': 'Aprender en público: Level Up Unity Game Dev.',

    'features.heading': 'Capacidades',
    'features.sub': 'Lo que construyo',
    'features.generalist.title': 'Unity generalista',
    'features.generalist.desc': 'Desde concept art hasta sistemas de juego y tooling, con builds que corren rápido en dispositivos reales.',
    'features.graphics.title': 'Gráficos y Shaders',
    'features.graphics.desc': 'ShaderLab/HLSL, pipelines estilizados, look‑dev 2D/3D y escalado móvil.',
    'features.arch.title': 'Arquitectura y Flujos',
    'features.arch.desc': 'ScriptableObjects, código de gameplay limpio, herramientas de editor y pipelines repetibles.',
    'features.educator.title': 'Divulgador',
    'features.educator.desc': 'Level Up Unity Game Dev — episodios concisos y avanzados; enseñanza como marca y comunidad.',

    'about.title': 'Sobre “Wildeax”',
    'about.body': 'Artista generalista y desarrollador Unity. Me muevo entre concepto, gameplay, herramientas y optimización para llevar ideas de boceto a jugable. También comparto notas concisas en el podcast Level Up Unity Game Dev.',
    'about.badge.ceo': 'CEO · Mood Studios',
    'about.chip.unity': 'Unity',
    'about.chip.shaders': 'Shaders',
    'about.chip.gameplay': 'Gameplay',
    'about.chip.tools': 'Herramientas',

    'contact.title': 'Contacto',
    'contact.sub': 'Escríbeme para colaborar u oportunidades.',
    'contact.email': 'Correo',
    'contact.comingSoon': 'Próximamente',
    'contact.linkedin': 'LinkedIn',
    'contact.x': 'X',

    'footer.about': 'Sobre mí',
    'footer.features': 'Capacidades',
    'footer.contact': 'Contacto',
    'footer.email': 'Correo',
    'footer.linkedin': 'LinkedIn',
    'footer.x': 'X',
    'footer.rights': 'Todos los derechos reservados',

    'arena.nav.download': 'Descargar',
    'arena.title': 'Arena Assistant para League of Legends',
    'arena.tagline': 'Guía en tiempo real que respeta tu foco. Te ayuda a decidir rápido en selección y planeación: a quién elegir, qué construir y cuándo pivotar.',
    'arena.download': 'Descargar para Windows (.exe)',
    'arena.note': 'Instalador firmado. Versión para macOS próximamente.',
    'arena.card1.title': 'Claridad en selección',
    'arena.card1.desc': 'Sugerencias según rol, chequeos de composición y lecturas rápidas sin saturar la pantalla.',
    'arena.card2.title': 'Rutas que se adaptan',
    'arena.card2.desc': 'Recomendaciones compactas de ítems/augments para escanear entre bans y locks.',
    'arena.card3.title': 'Interfaz para overlay',
    'arena.card3.desc': 'Visuales oscuros y legibles con movimiento sutil y bordes finos, legibles en cualquier monitor.',
    'arena.card4.title': 'Ligero y local',
    'arena.card4.desc': 'Bajo uso de recursos y privacidad primero: corre local y nunca automatiza el juego.',
    'arena.back': 'Volver a Wildeax',

    'notfound.message': 'No encontramos esta página. El enlace puede estar roto o la página se ha movido.',
    'notfound.back': 'Volver al inicio',
  },
}

type I18nCtx = {
  lang: Lang
  t: (key: string) => string
  setLang: (l: Lang) => void
  version: number
}

const Ctx = createContext<I18nCtx | null>(null)

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const defaultLang: Lang = (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('es')) ? 'es' : 'en'
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('lang') as Lang) || defaultLang)
  const [version, setVersion] = useState(0)

  useEffect(() => { try { localStorage.setItem('lang', lang) } catch {}; setVersion((v) => v + 1) }, [lang])

  const dict = resources[lang]
  const t = useMemo(() => (key: string) => dict[key] ?? key, [dict])

  return (
    <Ctx.Provider value={{ lang, t, setLang, version }}>
      {children}
    </Ctx.Provider>
  )
}

export const useI18n = () => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}


