import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

async function ensureAdmin(supabase: any) {
  const { data, error } = await supabase.rpc('is_current_user_admin')
  if (error || !data) throw new Response('Forbidden', { status: 403 })
}

export const getAdminOverview = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context
    await ensureAdmin(supabase)
    const { data, error } = await supabase.rpc('admin_overview')
    if (error) throw new Error(error.message)
    return data
  })

export const listAdminUsers = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context
    await ensureAdmin(supabase)
    const { data, error } = await supabase.rpc('admin_list_users')
    if (error) throw new Error(error.message)
    return data ?? []
  })

export const setUserAdminRole = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; grant: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context
    await ensureAdmin(supabase)
    const { error } = await supabase.rpc('admin_set_role', {
      _target_user: data.userId,
      _role: 'admin',
      _grant: data.grant,
    })
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const listEmailLog = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context
    await ensureAdmin(supabase)
    const { data, error } = await supabase
      .from('email_send_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw new Error(error.message)
    return data ?? []
  })

export const listActivityLog = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context
    await ensureAdmin(supabase)
    const { data, error } = await supabase
      .from('admin_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw new Error(error.message)
    return data ?? []
  })

export const triggerDailyNotifications = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context
    await ensureAdmin(supabase)
    const url = `${process.env.SUPABASE_URL}`.replace(/^https?:\/\/[^.]+\./, 'https://')
    // call the public hook directly
    const res = await fetch('https://project--30cdf66c-7516-40c8-aa07-54c7f7aae181.lovable.app/api/public/hooks/daily-notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    return await res.json().catch(() => ({ ok: res.ok }))
  })