import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FileText, CheckCircle, Clock, XCircle } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import { supabase } from '@/integrations/supabase/client'
import { useDealership } from '@/contexts/DealershipContext'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default function ImportHistory() {
  const { dealership } = useDealership()
  const { data: batches = [], isLoading } = useQuery({ queryKey: ['import-history', dealership?.id], queryFn: async () => { if (!dealership?.id) return []; const { data } = await supabase.from('import_batches').select('*, importer:profiles!imported_by(full_name)').eq('dealership_id', dealership.id).order('created_at', { ascending: false }).limit(50); return data || [] }, enabled: !!dealership?.id })
  const STATUS_STYLE: Record<string,string> = { completed:'text-green-700 bg-green-50 border-green-200', processing:'text-amber-700 bg-amber-50 border-amber-200', failed:'text-red-700 bg-red-50 border-red-200', review_required:'text-blue-700 bg-blue-50 border-blue-200' }
  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6"><div><h1 className="text-2xl font-bold text-gray-900">Import History</h1><p className="text-sm text-gray-500 mt-1">All CSV import batches</p></div><Link to="/import/settings" className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-lg">New Import</Link></div>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {isLoading ? <div className="py-12 text-center text-gray-400 text-sm">Loading...</div>
          : batches.length === 0 ? <div className="py-16 text-center"><FileText size={32} className="mx-auto mb-2 text-gray-200" /><p className="text-gray-400 text-sm">No imports yet</p><Link to="/import/settings" className="text-teal-600 text-sm hover:underline mt-1 inline-block">Upload your first CSV →</Link></div>
          : <table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b border-gray-100"><th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">File</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">By</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th></tr></thead><tbody>{(batches as any[]).map(b => <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50"><td className="px-5 py-3 font-medium text-gray-900">{b.filename||'Unnamed'}</td><td className="px-4 py-3 text-gray-500">{format(new Date(b.created_at),'MMM d, yyyy')}</td><td className="px-4 py-3 text-gray-700">{b.importer?.full_name||'—'}</td><td className="px-4 py-3 text-gray-700">{b.total_rows??0}</td><td className="px-4 py-3"><span className={cn('text-xs border font-medium px-2 py-0.5 rounded-full',STATUS_STYLE[b.status]||'text-gray-600 bg-gray-50 border-gray-200')}>{b.status?.replace('_',' ')}</span></td></tr>)}</tbody></table>}
        </div>
      </div>
    </AppLayout>
  )
}