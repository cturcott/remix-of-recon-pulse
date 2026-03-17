import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, ArrowUpDown, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import { supabase } from '@/integrations/supabase/client'
import { useDealership } from '@/contexts/DealershipContext'
import { cn, formatMileage, getDaysInRecon, formatDays, getStatusLabel } from '@/lib/utils'

export default function Vehicles() {
  const { dealership, stages } = useDealership()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')
  const [sortField, setSortField] = useState('stock_number')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc')

  const { data: vehicles = [], isLoading } = useQuery({ queryKey: ['all-vehicles', dealership?.id], queryFn: async () => { if (!dealership) return []; const { data, error } = await supabase.from('vehicles').select('*, stage:workflow_stages!current_stage_id(name)').eq('dealership_id', dealership.id).order('created_at', { ascending: false }); if (error) throw error; return data }, enabled: !!dealership })

  const filtered = (vehicles as any[]).filter(v => { if (search && ![v.stock_number,v.vin,v.make,v.model,v.year?.toString()].join(' ').toLowerCase().includes(search.toLowerCase())) return false; if (statusFilter !== 'all' && v.status !== statusFilter) return false; if (stageFilter !== 'all' && v.current_stage_id !== stageFilter) return false; return true }).sort((a: any, b: any) => { let cmp = 0; if (sortField === 'stock_number') cmp = a.stock_number.localeCompare(b.stock_number); else if (sortField === 'mileage') cmp = (a.mileage||0)-(b.mileage||0); else if (sortField === 'days') cmp = getDaysInRecon(a.entered_recon_at)-getDaysInRecon(b.entered_recon_at); return sortDir === 'asc' ? cmp : -cmp })

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-start justify-between mb-5"><div><h1 className="text-2xl font-bold text-gray-900">Vehicles</h1><p className="text-sm text-gray-500 mt-0.5">{filtered.length} vehicles in inventory</p></div><button onClick={() => navigate('/command-center')} className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-lg"><Plus size={15} />Add Vehicle</button></div>
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search VIN, make, model, stock #..." className="w-full border border-gray-200 rounded-lg pl-8 pr-3 h-9 text-sm bg-white focus:outline-none focus:border-teal-500" /></div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 h-9 text-sm bg-white"><option value="all">All Statuses</option><option value="in_recon">In Recon</option><option value="front_line_ready">Front Line Ready</option><option value="sold">Sold</option></select>
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 h-9 text-sm bg-white"><option value="all">All Stages</option>{stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full border-collapse text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200"><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock #</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vehicle</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">VIN</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Mileage</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stage</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Days</th></tr></thead>
            <tbody>
              {isLoading ? Array.from({length:5}).map((_,i) => <tr key={i}>{Array.from({length:7}).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>)
              : filtered.length === 0 ? <tr><td colSpan={7} className="py-16 text-center text-gray-400 text-sm">No vehicles found</td></tr>
              : filtered.map((v: any) => <tr key={v.id} onClick={() => navigate('/vehicle/' + v.id)} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer last:border-0"><td className="px-4 py-3 font-mono font-semibold text-gray-800">{v.stock_number}</td><td className="px-4 py-3"><span className="font-medium text-gray-900">{v.year} {v.make} {v.model}</span>{v.trim && <span className="text-gray-400 ml-1">{v.trim}</span>}</td><td className="px-4 py-3 font-mono text-xs text-gray-500">{v.vin || '—'}</td><td className="px-4 py-3 text-gray-700">{formatMileage(v.mileage)}</td><td className="px-4 py-3 text-gray-700">{v.stage?.name || '—'}</td><td className="px-4 py-3"><span className="bg-teal-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">{getStatusLabel(v.status)}</span></td><td className="px-4 py-3"><span className="flex items-center gap-1 text-gray-600"><Clock size={11} className="text-gray-400" />{formatDays(getDaysInRecon(v.entered_recon_at))}</span></td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  )
}