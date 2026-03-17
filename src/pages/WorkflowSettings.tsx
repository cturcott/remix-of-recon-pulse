import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GripVertical, Pencil, Check, X, Clock } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import { supabase } from '@/integrations/supabase/client'
import { useDealership } from '@/contexts/DealershipContext'
import { toast } from 'sonner'

export default function WorkflowSettings() {
  const { dealership, refetchStages } = useDealership()
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSla, setEditSla] = useState(48)

  const { data: stages = [] } = useQuery({
    queryKey: ['stages-admin', dealership?.id],
    queryFn: async () => {
      if (!dealership?.id) return []
      const { data } = await supabase.from('workflow_stages').select('*').eq('dealership_id', dealership.id).order('display_order')
      return data || []
    },
    enabled: !!dealership?.id,
  })

  const updateStage = useMutation({
    mutationFn: async ({ id, name, sla_hours }: { id: string; name: string; sla_hours: number }) => {
      const { error } = await supabase.from('workflow_stages').update({ name, sla_hours }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stages-admin'] }); refetchStages(); setEditingId(null); toast.success('Stage updated') },
    onError: () => toast.error('Failed to update stage'),
  })

  function startEdit(stage: any) { setEditingId(stage.id); setEditName(stage.name); setEditSla(stage.sla_hours) }

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Workflow Stages</h1>
          <p className="text-sm text-gray-500 mt-1">Configure the stages vehicles move through during reconditioning</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {stages.map((stage: any, i: number) => (
            <div key={stage.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 group">
              <GripVertical size={16} className="text-gray-300 cursor-grab" />
              <div className="w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</div>
              {editingId === stage.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input value={editName} onChange={e => setEditName(e.target.value)} className="border border-gray-200 rounded px-2 py-1 text-sm flex-1 outline-none focus:border-teal-400" />
                  <div className="flex items-center gap-1">
                    <Clock size={13} className="text-gray-400" />
                    <input type="number" value={editSla} onChange={e => setEditSla(Number(e.target.value))} className="border border-gray-200 rounded px-2 py-1 text-sm w-16 outline-none focus:border-teal-400" />
                    <span className="text-xs text-gray-400">hrs SLA</span>
                  </div>
                  <button onClick={() => updateStage.mutate({ id: stage.id, name: editName, sla_hours: editSla })} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={15} /></button>
                  <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={15} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-sm font-medium text-gray-900">{stage.name}</span>
                  <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={11} />{stage.sla_hours}h SLA</span>
                  {stage.requires_approval && <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">Requires Approval</span>}
                </div>
              )}
              {editingId !== stage.id && (
                <button onClick={() => startEdit(stage)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all">
                  <Pencil size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">Drag stages to reorder. Changes take effect immediately.</p>
      </div>
    </AppLayout>
  )
}
