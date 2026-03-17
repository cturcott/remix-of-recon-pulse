import AppLayout from '@/components/layout/AppLayout'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
export default function StageBottleneckReport() {
  return (
    <AppLayout>
      <div className="p-6">
        <Link to="/reports" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5"><ArrowLeft size={15} /> Back to Reports</Link>
        <h1 className="text-2xl font-bold text-gray-900">Stage Bottleneck</h1>
        <p className="text-sm text-gray-500 mt-1">Identify which stages are causing delays</p>
        <div className="mt-8 bg-white border border-gray-200 rounded-xl p-10 text-center"><p className="text-gray-400 text-sm">Report data will appear here once vehicles have been processed through stages.</p></div>
      </div>
    </AppLayout>
  )
}