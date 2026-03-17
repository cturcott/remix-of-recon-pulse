import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Flag, ChevronDown, Check, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import AppLayout from '@/components/layout/AppLayout'
import { supabase } from '@/integrations/supabase/client'
import { useDealership } from '@/contexts/DealershipContext'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

type Tab = 'open'|'overdue'|'blocked'|'due_today'|'completed'
const PRIORITIES = ['All Priority','urgent','high','medium','low']

export default function MyTasks() {
  const { dealership } = useDealership(); const { user } = useAuth(); const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('open'); const [priority, setPriority] = useState('All Priority'); const [priorityOpen, setPriorityOpen] = useState(false)

  const { data: tasks = [], isLoading } = useQuery({ queryKey: ['my-tasks', dealership?.id, user?.id], queryFn: async () => { if (!dealership||!user) return []; const { data, error } = await supabase.from('tasks').select('*, vehicle:vehicles!vehicle_id(stock_number,make,model,year)').eq('dealership_id', dealership.id).eq('assigned_to', user.id).order('created_at',{ascending:false}); if (error) throw error; return data }, enabled: !!dealership && !!user })

  const completeMutation = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('tasks').update({ status:'completed', completed_at: new Date().toISOString() }).eq('id', id); if (error) throw error }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-tasks'] }); toast.success('Task completed!') } })

  const now = new Date(); const today = now.toDateString()
  const filterTab = (t: any) => { if (activeTab==='open') return t.status==='open'||t.status==='in_progress'; if (activeTab==='blocked') return t.status==='blocked'; if (activeTab==='completed') return t.status==='completed'; if (activeTab==='overdue') return (t.status==='open')&&t.due_date&&new Date(t.due_date)<now; if (activeTab==='due_today') return t.due_date&&new Date(t.due_date).toDateString()===today; return false }
  const counts: any = { open: tasks.filter((t:any)=>t.status==='open'||t.status==='in_progress').length, overdue: tasks.filter((t:any)=>t.status==='open'&&t.due_date&&new Date(t.due_date)<now).length, blocked: tasks.filter((t:any)=>t.status==='blocked').length, due_today: tasks.filter((t:any)=>t.due_date&&new Date(t.due_date).toDateString()===today).length, completed: tasks.filter((t:any)=>t.status==='completed').length }
  const filtered = (tasks as any[]).filter(filterTab).filter(t => priority==='All Priority'||t.priority===priority)
  const TABS: {id:Tab;label:string}[] = [{id:'open',label:'Open'},{id:'overdue',label:'Overdue'},{id:'blocked',label:'Blocked'},{id:'due_today',label:'Due Today'},{id:'completed',label:'Completed'}]
  const priorityColor = (p: string) => ({urgent:'text-red-600',high:'text-orange-500',medium:'text-yellow-500',low:'text-gray-400'}[p]||'text-gray-400')

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-5"><h1 className="text-2xl font-bold text-gray-900">My Tasks</h1><p className="text-sm text-gray-500 mt-0.5">Tasks assigned to you across all vehicles</p></div>
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {TABS.map(tab => <button key={tab.id} onClick={()=>setActiveTab(tab.id)} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors', activeTab===tab.id?'bg-teal-500 text-white':'bg-white border border-gray-200 text-gray-600 hover:border-gray-300')}>{counts[tab.id]} {tab.label}</button>)}
          <div className="relative ml-auto"><button onClick={()=>setPriorityOpen(v=>!v)} className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 h-9 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">{priority}<ChevronDown size={12} className={cn('text-gray-400 transition-transform',priorityOpen&&'rotate-180')} /></button>{priorityOpen && <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px] z-20">{PRIORITIES.map(p=><button key={p} onClick={()=>{setPriority(p);setPriorityOpen(false)}} className={cn('w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 capitalize',priority===p&&'text-teal-600 font-medium')}>{p}</button>)}</div>}</div>
        </div>
        {isLoading ? <div className="space-y-3">{Array.from({length:3}).map((_,i)=><div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse"><div className="h-4 bg-gray-200 rounded w-64 mb-2" /><div className="h-3 bg-gray-100 rounded w-40" /></div>)}</div>
        : filtered.length===0 ? <div className="text-center py-24 text-gray-400"><Flag size={40} className="mx-auto mb-3 opacity-20" /><p className="text-base font-medium text-gray-500">No {activeTab.replace('_',' ')} tasks assigned to you</p></div>
        : <div className="space-y-2">{filtered.map((task:any) => <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-4 hover:shadow-sm transition-shadow"><button onClick={()=>completeMutation.mutate(task.id)} className={cn('mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',task.status==='completed'?'bg-teal-500 border-teal-500 text-white':'border-gray-300 hover:border-teal-500')}>{task.status==='completed'&&<Check size={11} />}</button><div className="flex-1 min-w-0"><div className="flex items-start justify-between gap-2"><p className={cn('font-medium text-gray-900',task.status==='completed'&&'line-through text-gray-400')}>{task.title}</p><span className={cn('text-xs font-semibold capitalize shrink-0',priorityColor(task.priority))}>{task.priority}</span></div>{task.description&&<p className="text-sm text-gray-500 mt-0.5 truncate">{task.description}</p>}<div className="flex items-center gap-3 mt-1.5">{task.vehicle&&<span className="text-xs text-gray-400">{(task.vehicle as any).year} {(task.vehicle as any).make} · {(task.vehicle as any).stock_number}</span>}{task.due_date&&<span className="flex items-center gap-1 text-xs text-gray-400"><Clock size={10} />Due {format(new Date(task.due_date),'MMM d')}</span>}{task.status==='blocked'&&<span className="flex items-center gap-1 text-xs text-red-500 font-medium"><AlertCircle size={10} />Blocked</span>}</div></div></div>)}</div>}
      </div>
    </AppLayout>
  )
}