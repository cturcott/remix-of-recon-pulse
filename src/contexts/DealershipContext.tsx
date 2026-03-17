import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './AuthContext'

export interface Dealership {
  id: string
  name: string
  code: string
  timezone: string
}

export interface WorkflowStage {
  id: string
  dealership_id: string
  name: string
  display_order: number
  color: string
  sla_hours: number
  is_active: boolean
  requires_approval: boolean
}

interface DealershipContextType {
  dealership: Dealership | null
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
    if (dealerRes.data) setDealership(dealerRes.data as Dealership)
    if (stagesRes.data) setStages(stagesRes.data as WorkflowStage[])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [profile?.dealership_id])

  return (
    <DealershipContext.Provider value={{ dealership, stages, loading, refetchStages: fetchData }}>
      {children}
    </DealershipContext.Provider>
  )
}

export function useDealership() {
  const ctx = useContext(DealershipContext)
  if (!ctx) throw new Error('useDealership must be used within DealershipProvider')
  return ctx
}
