import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './AuthContext'

export interface Dealership {
  id: string; name: string; code: string; timezone: string
  store_code?: string; address?: string; phone?: string
}

export interface WorkflowStage {
  id: string; dealership_id: string; name: string; display_order: number
  sort_order?: number; color: string; sla_hours: number; sla_days?: number
  is_active: boolean; requires_approval: boolean
  is_start_stage?: boolean; is_completion_stage?: boolean
  vehicleCount?: number; warningCount?: number; dangerCount?: number
}

interface DealershipContextType {
  dealership: Dealership | null
  currentDealership: Dealership | null
  dealerships: Dealership[]
  setCurrentDealership: (d: Dealership | null) => void
  stages: WorkflowStage[]
  loading: boolean
  refetchStages: () => void
}

const DealershipContext = createContext<DealershipContextType | undefined>(undefined)

export function DealershipProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [dealership, setDealership] = useState<Dealership | null>(null)
  const [stages, setStages] = useState<WorkflowStage[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    if (!profile?.dealership_id) { setLoading(false); return }
    const [dealerRes, stagesRes] = await Promise.all([
      supabase.from('dealerships').select('*').eq('id', profile.dealership_id).single(),
      supabase.from('workflow_stages').select('*').eq('dealership_id', profile.dealership_id).eq('is_active', true).order('display_order'),
    ])
    if (dealerRes.data) setDealership({ ...dealerRes.data, store_code: (dealerRes.data as any).code } as Dealership)
    if (stagesRes.data) setStages((stagesRes.data as any[]).map(s => ({ ...s, sort_order: s.display_order, sla_days: Math.ceil(s.sla_hours / 24), vehicleCount: 0, warningCount: 0, dangerCount: 0 })) as WorkflowStage[])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [profile?.dealership_id])

  return (
    <DealershipContext.Provider value={{ dealership, currentDealership: dealership, dealerships: dealership ? [dealership] : [], setCurrentDealership: setDealership, stages, loading, refetchStages: fetchData }}>
      {children}
    </DealershipContext.Provider>
  )
}

export function useDealership() {
  const ctx = useContext(DealershipContext)
  if (!ctx) throw new Error('useDealership must be used within DealershipProvider')
  return ctx
}
