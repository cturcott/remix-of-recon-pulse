import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import { supabase } from '@/integrations/supabase/client'
import { useDealership } from '@/contexts/DealershipContext'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc: string }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div><p className="text-sm font-medium text-gray-900">{label}</p><p className="text-xs text-gray-400 mt-0.5">{desc}</p></div>
      <button onClick={() => onChange(!checked)} className={cn('relative w-11 h-6 rounded-full transition-colors', checked ? 'bg-teal-500' : 'bg-gray-200')}>
        <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform', checked && 'translate-x-5')} />
      </button>
    </div>
  )
}

export default function WorkflowNotifications() {
  const { dealership } = useDealership()
  const qc = useQueryClient()
  const { data: settings } = useQuery({
    queryKey: ['notif-settings', dealership?.id],
    queryFn: async () => {
      if (!dealership?.id) return null
      const { data } = await supabase.from('notification_settings').select('*').eq('dealership_id', dealership.id).single()
      return data
    },
    enabled: !!dealership?.id,
  })
  const update = useMutation({
    mutationFn: async (patch: Record<string, boolean | number>) => {
      if (!dealership?.id) return
      const { error } = await supabase.from('notification_settings').update(patch).eq('dealership_id', dealership.id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notif-settings'] }); toast.success('Updated') },
    onError: () => toast.error('Failed to update'),
  })
  const s = settings as any
  return (
    <AppLayout>
      <div className="p-6 max-w-2xl">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 bg-teal-50 rounded-lg flex items-center justify-center"><Bell size={18} className="text-teal-600" /></div>
          <div><h1 className="text-xl font-bold text-gray-900">Notifications</h1><p className="text-sm text-gray-500">Control when your team gets alerted</p></div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5">
          <Toggle checked={s?.notify_stage_change ?? true} onChange={v => update.mutate({ notify_stage_change: v })} label="Stage Changes" desc="Alert when a vehicle moves to a new stage" />
          <Toggle checked={s?.notify_overdue ?? true} onChange={v => update.mutate({ notify_overdue: v })} label="Overdue Alerts" desc="Alert when a vehicle exceeds its stage SLA" />
          <Toggle checked={s?.notify_approval_needed ?? true} onChange={v => update.mutate({ notify_approval_needed: v })} label="Approval Requests" desc="Alert when a service item needs approval" />
          <Toggle checked={s?.notify_approval_decision ?? true} onChange={v => update.mutate({ notify_approval_decision: v })} label="Approval Decisions" desc="Alert when an approval is approved or rejected" />
        </div>
        <div className="mt-5 bg-white border border-gray-200 rounded-xl px-5 py-4">
          <label className="block text-sm font-medium text-gray-900 mb-2">Overdue Threshold</label>
          <div className="flex items-center gap-2">
            <input type="number" defaultValue={s?.overdue_threshold_hours ?? 48} min={1} max={240}
              onBlur={e => update.mutate({ overdue_threshold_hours: Number(e.target.value) })}
              className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400" />
            <span className="text-sm text-gray-500">hours before flagged as overdue</span>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
