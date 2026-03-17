import { useQuery } from '@tanstack/react-query'
import { UserPlus, Mail, User } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import { supabase } from '@/integrations/supabase/client'
import { useDealership } from '@/contexts/DealershipContext'
import { cn } from '@/lib/utils'

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-50 text-purple-700 border-purple-200',
  manager: 'bg-blue-50 text-blue-700 border-blue-200',
  technician: 'bg-green-50 text-green-700 border-green-200',
  advisor: 'bg-amber-50 text-amber-700 border-amber-200',
  platform_admin: 'bg-red-50 text-red-700 border-red-200',
}

export default function Team() {
  const { dealership } = useDealership()
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team', dealership?.id],
    queryFn: async () => {
      if (!dealership?.id) return []
      const { data } = await supabase.from('profiles').select('*, user_roles(role)').eq('dealership_id', dealership.id).eq('is_active', true).order('full_name')
      return data || []
    },
    enabled: !!dealership?.id,
  })
  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold text-gray-900">Team</h1><p className="text-sm text-gray-500 mt-1">{members.length} members at {dealership?.name}</p></div>
          <button className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"><UserPlus size={15} />Invite Member</button>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {isLoading ? <div className="py-12 text-center text-gray-400 text-sm">Loading team...</div>
          : members.length === 0 ? <div className="py-12 text-center"><User size={32} className="mx-auto mb-2 text-gray-300" /><p className="text-gray-400 text-sm">No team members yet</p></div>
          : members.map((m: any) => {
            const role = m.user_roles?.[0]?.role || m.role || 'technician'
            return (
              <div key={m.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <div className="w-9 h-9 bg-teal-600 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">{m.avatar_initials || m.full_name?.slice(0,2).toUpperCase() || '?'}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900">{m.full_name || 'Unknown'}</p><p className="text-xs text-gray-400 flex items-center gap-1"><Mail size={11} />{m.email}</p></div>
                <span className={cn('text-xs border px-2 py-0.5 rounded-full font-medium capitalize', ROLE_COLORS[role] || 'bg-gray-50 text-gray-600 border-gray-200')}>{role.replace('_',' ')}</span>
              </div>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}
