import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'oyo_admin_mode'

const AdminModeContext = createContext({
  isAdminMode: false,
  toggleAdminMode: () => {},
})

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === '1' || v === 'true'
  } catch {
    return false
  }
}

function writeStored(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {}
}

export function AdminModeProvider({ children }) {
  const [isAdminMode, setState] = useState(readStored)

  useEffect(() => {
    writeStored(isAdminMode)
  }, [isAdminMode])

  const toggleAdminMode = useCallback(() => {
    setState((prev) => !prev)
  }, [])

  return (
    <AdminModeContext.Provider value={{ isAdminMode, toggleAdminMode }}>
      {children}
    </AdminModeContext.Provider>
  )
}

export function useAdminMode() {
  const ctx = useContext(AdminModeContext)
  if (!ctx) {
    return { isAdminMode: false, toggleAdminMode: () => {} }
  }
  return ctx
}
