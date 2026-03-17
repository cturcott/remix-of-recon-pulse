import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Clock, AlertTriangle, ChevronRight, ExternalLink, User, SortAsc } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import AppLayout from '@/components/layout/AppLayout'
import { supabase } from '@/integrations/supabase/client'
import { useDealership } from '@/contexts/DealershipContext'
import { cn, formatDaysHours, formatMileage } from '@/lib/utils'

interface Vehicle { id: string; stock_number: string; vin: string | null; year: number | null; make: string | null; model: string | null; trim: string | null; mileage: number | null; status: string; current_stage_id: string | null; assigned_to: string | null; entered_recon_at: string; stage_entered_at: string; assignee?: { full_name: string | null; avatar_initials: string | null } | null }

export default function CommandCenter() {
  const { stages, dealership } = useDealership()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [activeStageId, setActiveStageId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const activeStage = stages.find(s => s.id === (activeStageId || stages[0]?.id)) || stages[0]

  const { data: vehicles = [], isLoading } = useQuery({ queryKey: ['vehicles', activeStage?.id, dealership?.id], queryFn: async () => { if (!activeStage || !dealership) return []; const { data, error } = await supabase.from('vehicles').select('*, assignee:profiles!assigned_to(full_name, avatar_initials)').eq('dealership_id', dealership.id).eq('current_stage_id', activeStage.id).eq('status', 'in_recon').order('stage_entered_at', { ascending: true }); if (error) throw error; return data as Vehicle[] }, enabled: !!activeStage && !!dealership })
  const { data: stageCounts = {} } = useQuery({ queryKey: ['stage-counts', dealership?.id], queryFn: async () => { if (!dealership) return {}; const { data } = await supabase.from('vehicles').select('current_stage_id').eq('dealership_id', dealership.id).eq('status', 'in_recon'); const counts: Record<string, number> = {}; data?.forEach(v => { if (v.current_stage_id) counts[v.current_stage_id] = (counts[v.current_stage_id] || 0) + 1 }); return counts }, enabled: !!dealership, refetchInterval: 30000 })
  const advanceMutation = useMutation({ mutationFn: async ({ vehicleId, nextStageId }: { vehicleId: string; nextStageId: string }) => { const { error } = await supabase.from('vehicles').update({ current_stage_id: nextStageId, stage_entered_at: new Date().toISOString() }).eq('id', vehicleId); if (error) throw error }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); qc.invalidateQueries({ queryKey: ['stage-counts'] }); toast.success('Vehicle advanced') }, onError: () => toast.error('Failed to advance vehicle') })

  const totalInRecon = Object.values(stageCounts).reduce((a: number, b: number) => a + b, 0)
  const filtered = vehicles.filter(v => !search || [v.stock_number, v.vin, v.year?.toString(), v.make, v.model].join(' ').toLowerCase().includes(search.toLowerCase()))
  const currentStageIdx = stages.findIndex(s => s.id === activeStage?.id)
  const nextStage = currentStageIdx >= 0 && currentStageIdx < stages.length - 1 ? stages[currentStageIdx + 1] : null

  return (
    <AppLayout>
      <div className="bg-white border-b border-gray-200 px-5 py-2.5 flex items-center gap-6">
        <span className="flex items-center gap-1.5 text-sm text-gray-600"><span className="font-semibold text-gray-900">{totalInRecon}</span> in recon</span>
        <span className="flex items-center gap-1.5 text-sm text-gray-600"><Clock size={13} className="text-gray-400" /><span className="font-semibold text-gray-900">4</span> avg days</span>
        <span className="flex items-center gap-1.5 text-sm text-gray-600"><AlertTriangle size={13} className="text-gray-400" /><span className="font-semibold text-gray-900">0</span> overdue</span>
        <button onClick={() => navigate('/vehicles')} className="ml-auto flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"><Plus size={15} />Add Vehicle</button>
      </div>
      <div className="flex h-[calc(100vh-105px)]">
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">
          <div className="px-4 pt-4 pb-3 border-b border-gray-100"><h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Workflow Queue</h2><p className="text-xs text-gray-400 mt-0.5">{totalInRecon} vehicles in recon</p></div>
          {stages.map(stage => (<button key={stage.id} onClick={() => setActiveStageId(stage.id)} className={cn('flex items-center justify-between px-4 py-2.5 text-sm font-medium text-left border-l-[3px] transition-all w-full', activeStage?.id === stage.id ? 'bg-teal-50 border-teal-500 text-teal-700' : 'border-transparent text-gray-700 hover:bg-gray-50')}><span className="truncate">{stage.name}</span><div className="flex items-center gap-1.5 shrink-0">{((stageCounts as any)[stage.id] || 0) > 0 && <span className="bg-teal-500 text-white text-xs font-bold rounded-full px-2 py-0.5">{(stageCounts as any)[stage.id]}</span>}<ChevronRight size={13} className="text-gray-400" /></div></button>))}
        </aside>
        <div className="flex-1 overflow-y-auto">
          <div className="sticky top-0 bg-[#f8f7f6] border-b border-gray-200 px-4 py-3 flex items-center gap-3 z-10">
            <div className="relative flex-1 max-w-sm"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search VIN, stock #, vehicle..." className="w-full border border-gray-200 rounded-lg pl-8 pr-3 h-9 text-sm bg-white focus:outline-none focus:border-teal-500" /></div>
            <button className="flex items-center gap-1.5 border border-gray-200 bg-white rounded-lg px-3 h-9 text-sm text-gray-600 hover:bg-gray-50"><SortAsc size={14} />Oldest first</button>
            <span className="text-sm text-gray-500 ml-auto">{filtered.length} vehicles in <strong>{activeStage?.name}</strong></span>
          </div>
          <div className="p-4 space-y-3">
            {isLoading ? Array.from({length:3}).map((_,i) => <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse"><div className="h-4 bg-gray-200 rounded w-48 mb-2" /><div className="h-3 bg-gray-100 rounded w-32 mb-3" /><div className="h-9 bg-gray-100 rounded" /></div>)
            : filtered.length === 0 ? <div className="text-center py-20 text-gray-400"><p className="text-sm font-medium text-gray-500">No vehicles in this stage</p></div>
            : filtered.map(vehicle => (
              <div key={vehicle.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div><div className="font-semibold text-gray-900 text-sm">{vehicle.year} {vehicle.make} {vehicle.model}</div>{vehicle.trim && <div className="text-xs text-gray-400">{vehicle.trim}</div>}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0"><Clock size={11} />{formatDaysHours(vehicle.stage_entered_at)}</div>
                </div>
                <div className="flex items-center gap-3 mb-3 text-xs text-gray-500"><span className="font-mono font-semibold text-gray-700">{vehicle.stock_number}</span>{vehicle.mileage && <span>{formatMileage(vehicle.mileage)} mi</span>}</div>
                <div className="flex items-center gap-2 mb-3"><User size={12} className="text-gray-400" /><span className="text-xs text-gray-500">{(vehicle.assignee as any)?.full_name || 'Unassigned'}</span></div>
                <div className="flex items-center gap-2">
                  {nextStage ? <button onClick={() => advanceMutation.mutate({ vehicleId: vehicle.id, nextStageId: nextStage.id })} className="flex-1 bg-teal-500 hover:bg-teal-600 text-white rounded-lg py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">Send to {nextStage.name}<ChevronRight size={13} /></button>
                  : <button className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-lg py-2 text-xs font-semibold transition-colors">Mark Front-Line Ready</button>}
                  <button onClick={() => navigate('/vehicle/' + vehicle.id)} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500"><ExternalLink size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}