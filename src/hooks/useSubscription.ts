import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEMO_MODE } from '../lib/mockData'
import type { Subscription } from '../types'

const MOCK_SUBSCRIPTION: Subscription = {
  id: 'sub-demo',
  user_id: 'user-demo',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  plan: 'free',
  status: 'trialing',
  trial_ends_at: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
  current_period_end: null,
  searches_used: 127,
  searches_limit: 500,
  created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [stripePublishableKey, setStripePublishableKey] = useState<string>('')

  useEffect(() => {
    if (DEMO_MODE) {
      setTimeout(() => setSubscription(MOCK_SUBSCRIPTION), 300)
      setLoading(false)
      return
    }

    async function fetch() {
      const [{ data: sub }, { data: settings }] = await Promise.all([
        supabase.from('subscriptions').select('*').single(),
        supabase.from('app_settings').select('key, value').in('key', ['stripe_publishable_key']),
      ])

      if (sub) setSubscription(sub as Subscription)
      const pk = settings?.find(s => s.key === 'stripe_publishable_key')?.value ?? ''
      setStripePublishableKey(pk)
      setLoading(false)
    }
    fetch()
  }, [])

  // Days remaining in trial
  const trialDaysLeft = subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0

  const isTrialing = subscription?.status === 'trialing' && trialDaysLeft > 0
  const isPremium = subscription?.status === 'active' && subscription?.plan === 'premium'
  const isExpired = subscription?.status === 'trial_expired' || (subscription?.status === 'trialing' && trialDaysLeft <= 0)
  const isPastDue = subscription?.status === 'past_due'

  async function createCheckout() {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return null

    const res = await fetch('/.netlify/functions/stripe-create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        origin: window.location.origin,
        success_url: `${window.location.origin}/abbonamento?success=true`,
        cancel_url: `${window.location.origin}/abbonamento`,
      }),
    })

    if (!res.ok) return null
    const data = await res.json() as { url?: string }
    return data.url ?? null
  }

  async function openPortal() {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return null

    const res = await fetch('/.netlify/functions/stripe-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ origin: window.location.origin }),
    })

    if (!res.ok) return null
    const data = await res.json() as { url?: string }
    return data.url ?? null
  }

  return {
    subscription,
    loading,
    stripePublishableKey,
    trialDaysLeft,
    isTrialing,
    isPremium,
    isExpired,
    isPastDue,
    createCheckout,
    openPortal,
  }
}
