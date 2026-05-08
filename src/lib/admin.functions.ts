import { createServerFn } from '@tanstack/react-start'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'

type AdminAuthInput = { accessToken: string }

async function getAuthenticatedAdminClient(accessToken: string) {
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Backend non configurato')
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  })

  const { data: claims, error: authError } = await supabase.auth.getClaims(accessToken)
  if (authError || !claims?.claims?.sub) throw new Error('Sessione non valida')

  const { data, error } = await supabase.rpc('is_current_user_admin')
  if (error || !data) throw new Error('Accesso admin non autorizzato')

  return supabase
}

export const getAdminOverview = createServerFn({ method: 'POST' })
  .inputValidator((data: AdminAuthInput) => data)
  .handler(async ({ data: input }) => {
    const supabase = await getAuthenticatedAdminClient(input.accessToken)
    const { data: overview, error } = await supabase.rpc('admin_overview')
    if (error) throw new Error(error.message)
    return overview
  })

export const listAdminUsers = createServerFn({ method: 'POST' })
  .inputValidator((data: AdminAuthInput) => data)
  .handler(async ({ data: input }) => {
    const supabase = await getAuthenticatedAdminClient(input.accessToken)
    const { data: users, error } = await supabase.rpc('admin_list_users')
    if (error) throw new Error(error.message)
    return users ?? []
  })

export const setUserAdminRole = createServerFn({ method: 'POST' })
  .inputValidator((d: AdminAuthInput & { userId: string; grant: boolean }) => d)
  .handler(async ({ data }) => {
    const supabase = await getAuthenticatedAdminClient(data.accessToken)
    const { error } = await supabase.rpc('admin_set_role', {
      _target_user: data.userId,
      _role: 'admin',
      _grant: data.grant,
    })
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const listEmailLog = createServerFn({ method: 'POST' })
  .inputValidator((data: AdminAuthInput) => data)
  .handler(async ({ data: input }) => {
    const supabase = await getAuthenticatedAdminClient(input.accessToken)
    const { data: logs, error } = await supabase
      .from('email_send_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw new Error(error.message)
    return logs ?? []
  })

export const listActivityLog = createServerFn({ method: 'POST' })
  .inputValidator((data: AdminAuthInput) => data)
  .handler(async ({ data: input }) => {
    const supabase = await getAuthenticatedAdminClient(input.accessToken)
    const { data: logs, error } = await supabase
      .from('admin_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw new Error(error.message)
    return logs ?? []
  })

export const triggerDailyNotifications = createServerFn({ method: 'POST' })
  .inputValidator((data: AdminAuthInput) => data)
  .handler(async ({ data: input }) => {
    await getAuthenticatedAdminClient(input.accessToken)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const res = await fetch('https://project--30cdf66c-7516-40c8-aa07-54c7f7aae181.lovable.app/api/public/hooks/daily-notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
      body: '{}',
    })
    return await res.json().catch(() => ({ ok: res.ok }))
  })