import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchMe, type AuthResponse, type User } from './api'

const TOKEN_KEY = 'campus_customs_token'

function readToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* storage unavailable: stay logged in for this tab only */ }
}

interface AuthState {
  user: User | null
  token: string | null
  signIn: (auth: AuthResponse) => void
  signOut: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(readToken)
  const [user, setUser] = useState<User | null>(null)

  // Restore the logged-in user after a page refresh.
  useEffect(() => {
    if (!token || user) return
    fetchMe(token).then(setUser).catch(() => { writeToken(null); setToken(null) })
  }, [token, user])

  const signIn = (auth: AuthResponse) => {
    writeToken(auth.token)
    setToken(auth.token)
    setUser(auth.user)
  }
  const signOut = () => {
    writeToken(null)
    setToken(null)
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, token, signIn, signOut }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
