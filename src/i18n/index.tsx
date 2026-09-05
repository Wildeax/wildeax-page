import React, { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { resources } from '@/i18n/resources'
import type { Lang } from '@/i18n/resources'

export type { Lang } from '@/i18n/resources'


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


