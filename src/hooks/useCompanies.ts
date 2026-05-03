import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Company } from '../types'

interface Filters {
  stage_id?: string
  search?: string
  campaign_id?: string
}

export function useCompanies(filters: Filters = {}) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCompanies = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('companies')
      .select('*, stage:pipeline_stages(*)')
      .order('created_at', { ascending: false })

    if (filters.stage_id) query = query.eq('stage_id', filters.stage_id)
    if (filters.campaign_id) query = query.eq('campaign_id', filters.campaign_id)
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,industry.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) setError(error.message)
    else setCompanies(data as Company[])
    setLoading(false)
  }, [filters.stage_id, filters.campaign_id, filters.search])

  useEffect(() => { fetchCompanies() }, [fetchCompanies])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('companies-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'companies' },
        (payload) => setCompanies(prev => [payload.new as Company, ...prev])
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { companies, loading, error, refetch: fetchCompanies }
}
