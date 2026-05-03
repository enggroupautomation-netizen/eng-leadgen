import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { DEMO_MODE, MOCK_CONTACTS } from '../lib/mockData'
import type { Contact } from '../types'

interface Filters {
  stage_id?: string
  search?: string
  campaign_id?: string
}

export function useContacts(filters: Filters = {}) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContacts = useCallback(async () => {
    setLoading(true)

    if (DEMO_MODE) {
      await new Promise(r => setTimeout(r, 400)) // simula latenza
      let data = [...MOCK_CONTACTS]
      if (filters.search) {
        const s = filters.search.toLowerCase()
        data = data.filter(c =>
          c.name.toLowerCase().includes(s) ||
          (c.company ?? '').toLowerCase().includes(s)
        )
      }
      if (filters.stage_id) data = data.filter(c => c.stage_id === filters.stage_id)
      setContacts(data)
      setLoading(false)
      return
    }

    let query = supabase
      .from('contacts')
      .select('*, stage:pipeline_stages(*)')
      .order('created_at', { ascending: false })

    if (filters.stage_id) query = query.eq('stage_id', filters.stage_id)
    if (filters.campaign_id) query = query.eq('campaign_id', filters.campaign_id)
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,company.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) setError(error.message)
    else setContacts(data as Contact[])
    setLoading(false)
  }, [filters.stage_id, filters.campaign_id, filters.search])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  useEffect(() => {
    if (DEMO_MODE) return
    const channel = supabase
      .channel('contacts-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contacts' },
        async (payload) => {
          const { data } = await supabase
            .from('contacts')
            .select('*, stage:pipeline_stages(*)')
            .eq('id', payload.new.id)
            .single()
          if (data) setContacts(prev => [data as Contact, ...prev])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return { contacts, loading, error, refetch: fetchContacts }
}
