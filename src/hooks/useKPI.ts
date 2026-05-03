import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEMO_MODE, MOCK_KPI } from '../lib/mockData'
import type { KPIData } from '../types'

export function useKPI() {
  const [kpi, setKpi] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (DEMO_MODE) {
      setTimeout(() => { setKpi(MOCK_KPI); setLoading(false) }, 600)
      return
    }

    async function fetchKPI() {
      const today = new Date().toISOString().split('T')[0]
      const [contactsToday, companiesToday, contactsTotal, companiesTotal] = await Promise.all([
        supabase.from('contacts').select('id', { count: 'exact' }).gte('created_at', today),
        supabase.from('companies').select('id', { count: 'exact' }).gte('created_at', today),
        supabase.from('contacts').select('id', { count: 'exact' }),
        supabase.from('companies').select('id', { count: 'exact' }),
      ])
      setKpi({
        contacts_today: contactsToday.count ?? 0,
        companies_today: companiesToday.count ?? 0,
        contacts_total: contactsTotal.count ?? 0,
        companies_total: companiesTotal.count ?? 0,
        qualified_total: 0,
        last_sync: new Date().toISOString(),
      })
      setLoading(false)
    }
    fetchKPI()
  }, [])

  // Realtime: increment counters on new INSERT without re-fetching
  useEffect(() => {
    if (DEMO_MODE) return

    const channel = supabase
      .channel('kpi-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contacts' }, (payload) => {
        const isToday = new Date(payload.new.created_at as string).toDateString() === new Date().toDateString()
        setKpi(prev => prev ? {
          ...prev,
          contacts_total: prev.contacts_total + 1,
          contacts_today: isToday ? prev.contacts_today + 1 : prev.contacts_today,
          last_sync: new Date().toISOString(),
        } : prev)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'companies' }, (payload) => {
        const isToday = new Date(payload.new.created_at as string).toDateString() === new Date().toDateString()
        setKpi(prev => prev ? {
          ...prev,
          companies_total: prev.companies_total + 1,
          companies_today: isToday ? prev.companies_today + 1 : prev.companies_today,
          last_sync: new Date().toISOString(),
        } : prev)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { kpi, loading }
}
