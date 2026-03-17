import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Check, X, Clock } from 'lucide-react'
import { toast } from 'sonner'
import AppLayout from '@/components/layout/AppLayout'
import { supabase } from '@/integrations/supabase/client'
import { useDealership } from '@/contexts/DealershipContext'
import { cn, formatCurrency } from '@/lib/utils'

export default function Approvals() {
  const { dealership } = useDealership(); const qc = useQueryClient()
  const [search, setSearch] = useState(''); const [statusFilter, setStatusFilter] = useState('pending'); const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data: approvals = [], isLoading } = useQuery({ queryKey: ['approvals', dealership?.id, statusFilter], queryFn: async () => { if (!dealership) return []; let q = supabase.from('service_approvals').select('*, vehicle:vehicles!vehicle_id(stock_number,year,make,model)').eq('dealership_id', dealership.id).order('created_at',{ascending:false}); if (statusFilter!=='all') q=q.eq('status',statusFilter); const { data, error } = await q; if (error) throw error; return data }, enabled: !!dealership })

  const updateMutation = useMutation({ mutationFn: async ({ id, status }: { id: string; status: string }) => { const { error } = await supabase.from('service_approvals').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id); if (error) throw error }, onSuccess: (_,vars) => { qc.invalidateQueries({ queryKey: ['approvals'] }); toast.success('Approval ' + vars.status) }, onError: () => toast.error('Failed') })

  const pendingCount = (approvals as any[]).filter(a=>a.status==='pending').length
  const filtered = (approvals as any[]).filter(a => !search||[a.description,a.vehicle?.stock_number,a.vehicle?.make,a.category].join(' ').toLowerCase().includes(search.toLowerCase()))

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-start justify-between mb-5"><div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-gray-900">Approvals</h1>{pendingCount>0&&<span className="bg-amber-500 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center">{pendingCount}</span>}</div><p className="text-sm text-gray-500 self-end">Review and approve service work items</p></div>
        <div className="flex items-center gap-3 mb-5"><div className="relative flex-1 max-w-lg"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search description, VIN, stock #..." className="w-full border border-gray-200 rounded-lg pl-8 pr-3 h-9 text-sm bg-white focus:outline-none focus:border-teal-500" /></div><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 h-9 text-sm bg-white"><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All</option></select></div>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full border-collapse text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200"><th className="w-10 px-4 py-3"><input type="checkbox" className="rounded" /></th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vehicle</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Est. Cost</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th></tr></thead>
            <tbody>
              {isLoading ? Array.from({length:4}).map((_,i)=><tr key={i} className="border-b border-gray-100">{Array.from({length:7}).map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>)
              : filtered.length===0 ? <tr><td colSpan={7} className="py-16 text-center text-gray-400 text-sm">No approvals found</td></tr>
              : filtered.map(a=><tr key={a.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50"><td className="px-4 py-3"><input type="checkbox" checked={selected.has(a.id)} onChange={()=>setSelected(s=>{const n=new Set(s);n.has(a.id)?n.delete(a.id):n.add(a.id);return n})} className="rounded" /></td><td className="px-4 py-3"><div className="font-medium text-gray-900">{a.vehicle?.year} {a.vehicle?.make} {a.vehicle?.model}</div><div className="text-xs text-gray-400">Stk# {a.vehicle?.stock_number}</div></td><td className="px-4 py-3 text-gray-900">{a.description}</td><td className="px-4 py-3 text-gray-600">{a.category}</td><td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(a.estimated_cost)}</td><td className="px-4 py-3">{a.status==='pending'&&<span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full"><Clock size={10} />Pending</span>}{a.status==='approved'&&<span className="inline-flex bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">Approved</span>}{a.status==='rejected'&&<span className="inline-flex bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">Rejected</span>}</td><td className="px-4 py-3">{a.status==='pending'&&<div className="flex items-center gap-1.5"><button onClick={()=>updateMutation.mutate({id:a.id,status:'approved'})} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Approve"><Check size={16} /></button><button onClick={()=>updateMutation.mutate({id:a.id,status:'rejected'})} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Reject"><X size={16} /></button></div>}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  )
}