import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

type AppRole = 'platform_admin' | 'admin' | 'manager' | 'technician' | 'advisor'

export interface Profile {
  id: string
  user_id: string
  dealership_id: string | null
  full_name: string | null
  // aliases for old Lovable components
  first_name: string | null
  last_name: string | null
  title: string | null
  email: string | null
  role: string
  avatar_initials: string | null
  is_active: boolean
  force_password_change: boolean
  created_at: string
  updated_at: string
}

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  roles: AppRole[]
  loading: boolean
  isPlatformAdmin: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [roles, setRoles] = useState<AppRole[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUserData = async (userId: string) => {
    const [profileRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).single(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ])
    if (profileRes.data) {
      const p = profileRes.data as any
      setProfile({
        ...p,
        first_name: p.full_name?.split(' ')[0] || null,
        last_name: p.full_name?.split(' ').slice(1).join(' ') || null,
        title: p.role || null,
      } as Profile)
    }
    if (rolesRes.data) setRoles(rolesRes.data.map((r) => r.role as AppRole))
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          setTimeout(() => fetchUserData(session.user.id), 0)
        } else {
          setProfile(null)
          setRoles([])
        }
        setLoading(false)
      }
    )
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchUserData(session.user.id)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setRoles([])
  }

  const isPlatformAdmin = roles.includes('platform_admin')

  return (
    <AuthContext.Provider value={{ session, user, profile, roles, loading, isPlatformAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
