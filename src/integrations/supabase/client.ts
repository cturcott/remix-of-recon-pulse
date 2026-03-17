import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mbdcsaenffwodzjiqalq.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iZGNzYWVuZmZ3b2R6amlxYWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NTI2NDMsImV4cCI6MjA4OTIyODY0M30.ed0356Rr-pQUAvvpK-4j97Cy7vC7DNMfUgnKRYD_KLs'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
