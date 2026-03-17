import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useDealership } from '@/contexts/DealershipContext'
import { supabase } from '@/integrations/supabase/client'
import AppLayout from '@/components/layout/AppLayout'
import { toast } from 'sonner'
import { User, Building, Key } from 'lucide-react'

export default function Settings() {
  const { profile } = useAuth()
  const { dealership } = useDealership()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [saving, setSaving] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [changingPw, setChangingPw] = useState(false)

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const { error } = await supabase.from('profiles').update({ full_name: fullName, avatar_initials: fullName.slice(0,2).toUpperCase() }).eq('id', profile?.id || '')
    if (error) toast.error('Failed to save'); else toast.success('Profile updated')
    setSaving(false)
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault(); setChangingPw(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) toast.error(error.message); else { toast.success('Password updated'); setNewPw('') }
    setChangingPw(false)
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Settings</h1><p className="text-sm text-gray-500 mt-1">Manage your account and preferences</p></div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4"><User size={16} className="text-teal-500" /><h2 className="font-semibold text-gray-900">Profile</h2></div>
          <form onSubmit={saveProfile} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label><input value={fullName} onChange={e => setFullName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-teal-400" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label><input value={profile?.email || ''} disabled className="w-full border border-gray-100 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-500" /></div>
            <button type="submit" disabled={saving} className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">{saving ? 'Saving...' : 'Save Changes'}</button>
          </form>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4"><Building size={16} className="text-teal-500" /><h2 className="font-semibold text-gray-900">Dealership</h2></div>
          <div className="space-y-2">
            {[['Name', dealership?.name],['Code', dealership?.code],['Timezone', dealership?.timezone]].map(([l,v]) => (
              <div key={l} className="flex justify-between py-2 border-b border-gray-100 last:border-0"><span className="text-sm text-gray-500">{l}</span><span className="text-sm font-medium text-gray-900">{v}</span></div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4"><Key size={16} className="text-teal-500" /><h2 className="font-semibold text-gray-900">Change Password</h2></div>
          <form onSubmit={changePassword} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label><input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} minLength={6} required className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-teal-400" placeholder="At least 6 characters" /></div>
            <button type="submit" disabled={changingPw || !newPw} className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">{changingPw ? 'Updating...' : 'Update Password'}</button>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
