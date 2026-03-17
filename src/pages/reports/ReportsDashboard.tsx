import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Car, Clock, AlertTriangle, Timer, AlertCircle, User } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import { supabase } from '@/integrations/supabase/client'
import { useDealership } from '@/contexts/DealershipContext'
import { getDaysInRecon } from '@/lib/utils'

export default function ReportsDashboard() {
  const { dealership, stages } = useDealership()
  const { data: vehicles = [] } = useQuery({ queryKey: ['report-vehicles', dealership?.id], queryFn: async () => { if (!dealership) return []; const { data } = await supabase.from('vehicles').select('id,status,current_stage_id,assigned_to,entered_recon_at,front_line_ready_at').eq('dealership_id', dealership.id); return data || [] }, enabled: !!dealership })
  const inRecon = vehicles.filter((v:any) => v.status === 'in_recon').length
  const unassigned = vehicles.filter((v:any) => v.status === 'in_recon' && !v.assigned_to).length
  const reconVehicles = vehicles.filter((v:any) => v.status === 'in_recon')
  const avgAge = reconVehicles.length ? Math.round(reconVehicles.reduce((s:number,v:any) => s + getDaysInRecon(v.entered_recon_at), 0) / reconVehicles.length) : 0
  const stageCounts = stages.map(s => ({ stage: s.name, count: vehicles.filter((v:any) => v.current_stage_id === s.id).length }))
  const maxCount = Math.max(...stageCounts.map(s => s.count), 1)
  const KPI = [
    { label: 'In Recon', value: inRecon, icon: Car, warning: false },
    { label: 'Avg Recon Age', value: avgAge + 'd', icon: Clock, warning: false },
    { label: 'Overdue', value: 0, icon: AlertTriangle, warning: false },
    { label: 'Avg FLR Time', value: avgAge + 'd', icon: Timer, warning: false },
    { label: 'Exceptions', value: unassigned, icon: AlertCircle, warning: unassigned > 0 },
    { label: 'Unassigned', value: unassigned, icon: User, warning: unassigned > 0 },
  ]
  const LINKS = [
    { title: 'Recon Aging', desc: 'Days vehicles have been in recon', href: '/reports/aging' },
    { title: 'Stage Bottleneck', desc: 'Identify slow stages', href: '/reports/bottleneck' },
    { title: 'WIP Queue', desc: 'Work in progress across stages', href: '/reports/wip' },
    { title: 'Time to FLR', desc: 'Avg time from intake to front-line ready', href: '/reports/flr' },
    { title: 'Exceptions', desc: 'Vehicles flagged for review', href: '/reports/exceptions' },
  ]
  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Reports Dashboard</h1><p className="text-sm text-gray-500 mt-0.5">Operational reporting for recon performance management</p></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {KPI.map(({ label, value, icon: Icon, warning }) => (
            <div key={label} className={`bg-white border rounded-lg p-4 ${warning ? 'border-amber-200 bg-amber-50' : 'border-gray-200'}`}>
              <div className="flex items-center gap-1.5 mb-2"><Icon size={13} className={warning?'text-amber-500':'text-gray-400'} /><span className="text-xs text-gray-500 font-medium">{label}</span></div>
              <p className={`text-2xl font-bold ${warning?'text-amber-600':'text-gray-900'}`}>{value}</p>
            </div>
          ))}
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Stage Distribution</h2>
          <div className="space-y-2.5">
            {stageCounts.map(({ stage, count }) => (
              <div key={stage} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-56 shrink-0 truncate">{stage}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-teal-500 rounded-full" style={{ width: `${(count/maxCount)*100}%` }} /></div>
                <span className="text-sm font-medium text-gray-700 w-5 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {LINKS.map(({ title, desc, href }) => (
            <Link key={title} to={href} className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow group">
              <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors mb-1">{title}</h3>
              <p className="text-sm text-gray-500">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}