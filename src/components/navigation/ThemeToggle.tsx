import React from 'react'

const ThemeToggle = () => {
  const [isDark, setIsDark] = React.useState<boolean>(true)

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('theme')
      const dark = saved ? saved === 'dark' : true
      setIsDark(dark)
      document.documentElement.classList.toggle('dark', dark)
    } catch {}
  }, [])

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch {}
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
    >
      {isDark ? (
        // Sun
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-amber-300">
          <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm0 4a1 1 0 0 1-1-1v-1.25a1 1 0 1 1 2 0V21a1 1 0 0 1-1 1Zm0-18a1 1 0 0 1-1-1V1.75a1 1 0 1 1 2 0V3a1 1 0 0 1-1 1ZM4 13H2.75a1 1 0 1 1 0-2H4a1 1 0 1 1 0 2Zm17.25 0H20a1 1 0 1 1 0-2h1.25a1 1 0 1 1 0 2ZM5.05 20.95a1 1 0 0 1-1.41-1.41l.88-.88a1 1 0 1 1 1.41 1.41l-.88.88Zm13.43-13.43a1 1 0 0 1-1.41-1.41l.88-.88a1 1 0 0 1 1.41 1.41l-.88.88Zm0 12.02.88.88a1 1 0 1 1-1.41 1.41l-.88-.88a1 1 0 1 1 1.41-1.41ZM5.93 5.93l-.88-.88A1 1 0 1 1 6.46 3.64l.88.88a1 1 0 1 1-1.41 1.41Z"/>
        </svg>
      ) : (
        // Moon
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-zinc-200">
          <path d="M21.64 13a9 9 0 1 1-10.63-10.6 1 1 0 0 1 1.11 1.45A7 7 0 1 0 20.19 12a1 1 0 0 1 1.45-1.11Z"/>
        </svg>
      )}
    </button>
  )
}

export default ThemeToggle
