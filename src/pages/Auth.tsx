import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Car, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export default function Auth() {
  const { session } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  if (session) return <Navigate to="/command-center" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success('Welcome back!')
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
        if (error) throw error
        toast.success('Account created! Please check your email.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-teal-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-teal-500 rounded-2xl shadow-lg mb-4">
            <Car size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white"><span className="text-teal-400">Recon</span>Pulse</h1>
          <p className="text-gray-400 text-sm mt-1">Dealership Reconditioning Tracker</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {(['login', 'signup'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Chris Turcotte" required={mode === 'signup'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@dealership.com" required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required minLength={6}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
