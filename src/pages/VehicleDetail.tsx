import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Clock, User, ChevronRight, Flag, ClipboardCheck, History } from 'lucide-react'
import { toast } from 'sonner'
import AppLayout from '@/components/layout/AppLayout'
import { supabase } from '@/integrations/supabase/client'
import { useDealership } from '@/contexts/DealershipContext'
import { cn, formatDaysHours, formatMileage, getStatusLabel, getDaysInRecon, formatDays } from '@/lib/utils'

type Tab = 'overview'|'tasks'|'approvals'|'history'

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { stages } = useDealership()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('overview')

  const { data: vehicle, isLoading } = useQuery({ queryKey: ['vehicle', id], queryFn: async () => { const { data, error } = await supabase.from('vehicles').select('*, stage:workflow_stages!current_stage_id(*), assignee:profiles!assigned_to(full_name, avatar_initials)').eq('id', id!).single(); if (error) throw error; return data }, enabled: !!id })
  const { data: approvals = [] } = useQuery({ queryKey: ['vehicle-approvals', id], queryFn: async () => { const { data } = await supabase.from('service_approvals').select('*').eq('vehicle_id', id!).order('created_at',{ascending:false}); return data||[] }, enabled: !!id && tab === 'approvals' })
  const { data: history = [] } = useQuery({ queryKey: ['vehicle-history', id], queryFn: async () => { const { data } = await supabase.from('vehicle_stage_history').select('*, stage:workflow_stages!stage_id(name)').eq('vehicle_id', id!).order('entered_at',{ascending:false}); return data||[] }, enabled: !!id && tab === 'history' })

  const advanceMutation = useMutation({ mutationFn: async (nextStageId: string) => { const now = new Date().toISOString(); await supabase.from('vehicle_stage_history').insert({ vehicle_id: id, stage_id: (vehicle as any)?.current_stage_id, exited_at: now }); const { error } = await supabase.from('vehicles').update({ current_stage_id: nextStageId, stage_entered_at: now }).eq('id', id!); if (error) throw error }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicle', id] }); toast.success('Stage advanced') }, onError: () => toast.error('Failed') })

  if (isLoading) return <AppLayout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div></AppLayout>
  if (!vehicle) return <AppLayout><div className="p-6 text-gray-500">Vehicle not found.</div></AppLayout>

  const v = vehicle as any
  const stageIdx = stages.findIndex(s => s.id === v.current_stage_id)
  const nextStage = stageIdx >= 0 && stageIdx < stages.length - 1 ? stages[stageIdx + 1] : null

  const fields: Array<{ label: string; value: string | number | null; mono?: boolean }> = [
    { label: 'VIN', value: v.vin || '—', mono: true },
    { label: 'Mileage', value: formatMileage(v.mileage) },
    { label: 'Color', value: v.color || '—' },
    { label: 'Year', value: v.year || '—' },
  ]

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors"><ArrowLeft size={16} />Back</button>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1"><span className="font-mono text-sm font-semibold text-gray-500">{v.stock_number}</span><span className="bg-teal-500 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full">{getStatusLabel(v.status)}</span></div>
                <h1 className="text-2xl font-bold text-gray-900">{v.year} {v.make} {v.model}</h1>
                {v.trim && <p className="text-gray-500">{v.trim}</p>}
              </div>
              {nextStage && <button onClick={() => advanceMutation.mutate(nextStage.id)} className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Advance to {nextStage.name}<ChevronRight size={15} /></button>}
            </div>
            <div className="grid grid-cols-3 gap-4 mt-5">
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">Time in Recon</p><div className="flex items-center gap-1.5"><Clock size={14} className="text-teal-500" /><span className="font-semibold text-gray-900">{formatDays(getDaysInRecon(v.entered_recon_at))}</span></div></div>
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">Current Stage</p><p className="font-semibold text-gray-900 text-sm">{v.stage?.name || '—'}</p></div>
              <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">Assigned To</p><div className="flex items-center gap-1.5"><User size={13} className="text-gray-400" /><span className="font-semibold text-gray-900 text-sm">{v.assignee?.full_name || 'Unassigned'}</span></div></div>
            </div>
          </div>
          <div className="flex border-b border-gray-100 px-6">
            {(['overview','tasks','approvals','history'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} className={cn('flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 mr-1 capitalize transition-colors', tab===t?'border-teal-500 text-teal-600':'border-transparent text-gray-500 hover:text-gray-700')}>{t}</button>
            ))}
          </div>
          <div className="p-6">
            {tab === 'overview' && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {fields.map(({ label, value, mono }) => (
                  <div key={label}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                    <p className={cn('text-sm text-gray-900', mono && 'font-mono')}>{value}</p>
                  </div>
                ))}
                {v.notes && <div className="col-span-2"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</p><p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{v.notes}</p></div>}
              </div>
            )}
            {tab === 'tasks' && <div className="text-center py-10 text-gray-400"><Flag size={32} className="mx-auto mb-2 opacity-20" /><p className="text-sm">No tasks for this vehicle</p></div>}
            {tab === 'approvals' && (approvals.length === 0 ? <div className="text-center py-10 text-gray-400"><ClipboardCheck size={32} className="mx-auto mb-2 opacity-20" /><p className="text-sm">No approvals for this vehicle</p></div> : <div className="space-y-2">{(approvals as any[]).map(a => <div key={a.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg"><div><p className="font-medium text-sm text-gray-900">{a.description}</p><p className="text-xs text-gray-400">{a.category}</p></div><span className={cn('text-xs font-semibold px-2 py-1 rounded-full',a.status==='pending'?'bg-amber-50 text-amber-700':a.status==='approved'?'bg-green-50 text-green-700':'bg-red-50 text-red-700')}>{a.status}</span></div>)}</div>)}
            {tab === 'history' && (history.length === 0 ? <div className="text-center py-10 text-gray-400"><History size={32} className="mx-auto mb-2 opacity-20" /><p className="text-sm">No stage history yet</p></div> : <div className="space-y-3">{(history as any[]).map((h,i) => <div key={h.id} className="flex items-start gap-3"><div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0',i===0?'bg-teal-500':'bg-gray-300')} /><div><p className="text-sm font-medium text-gray-900">{h.stage?.name}</p><p className="text-xs text-gray-400">{formatDaysHours(h.entered_at)} ago</p></div></div>)}</div>)}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}