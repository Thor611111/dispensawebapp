import { createServerFn } from '@tanstack/react-start'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import type { Database } from '@/integrations/supabase/types'

type AuthInput = { accessToken: string }

async function ownerClient(accessToken: string) {
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) throw new Error('Backend non configurato')

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  })
  const { data: claims, error } = await supabase.auth.getClaims(accessToken)
  if (error || !claims?.claims?.sub) throw new Error('Sessione non valida')
  const userId = claims.claims.sub as string

  const { data: ownerCheck, error: ownerErr } = await supabase.rpc('is_current_user_owner')
  if (ownerErr || !ownerCheck) throw new Error('Accesso riservato all\u2019owner')
  return { supabase, userId }
}

async function logAction(accessToken: string, source: string, level: string, message: string, metadata: Record<string, unknown> = {}) {
  try {
    const { supabase } = await ownerClient(accessToken)
    await supabase.rpc('admin_log', { _source: source, _level: level, _message: message, _metadata: metadata as never })
  } catch { /* swallow */ }
}

export const isOwnerCheck = createServerFn({ method: 'POST' })
  .inputValidator((d: AuthInput) => d)
  .handler(async ({ data }) => {
    try { await ownerClient(data.accessToken); return { ok: true } }
    catch { return { ok: false } }
  })

export const getAdminOverview = createServerFn({ method: 'POST' })
  .inputValidator((d: AuthInput) => d)
  .handler(async ({ data }) => {
    const { supabase } = await ownerClient(data.accessToken)
    const { data: overview, error } = await supabase.rpc('admin_overview')
    if (error) throw new Error(error.message)
    return overview
  })

export const listAdminUsers = createServerFn({ method: 'POST' })
  .inputValidator((d: AuthInput) => d)
  .handler(async ({ data }) => {
    const { supabase } = await ownerClient(data.accessToken)
    const { data: users, error } = await supabase.rpc('admin_list_users')
    if (error) throw new Error(error.message)
    return users ?? []
  })

export const setUserAdminRole = createServerFn({ method: 'POST' })
  .inputValidator((d: AuthInput & { userId: string; grant: boolean }) => d)
  .handler(async ({ data }) => {
    const { supabase } = await ownerClient(data.accessToken)
    const { error } = await supabase.rpc('admin_set_role', { _target_user: data.userId, _role: 'admin', _grant: data.grant })
    if (error) throw new Error(error.message)
    await logAction(data.accessToken, 'admin', 'info', `set admin=${data.grant}`, { userId: data.userId })
    return { ok: true }
  })

export const listEmailLog = createServerFn({ method: 'POST' })
  .inputValidator((d: AuthInput) => d)
  .handler(async ({ data }) => {
    const { supabase } = await ownerClient(data.accessToken)
    const { data: logs, error } = await supabase.from('email_send_log').select('*').order('created_at', { ascending: false }).limit(500)
    if (error) throw new Error(error.message)
    return logs ?? []
  })

export const listPushLog = createServerFn({ method: 'POST' })
  .inputValidator((d: AuthInput) => d)
  .handler(async ({ data }) => {
    await ownerClient(data.accessToken)
    const { data: logs, error } = await supabaseAdmin.from('push_send_log').select('*').order('created_at', { ascending: false }).limit(500)
    if (error) throw new Error(error.message)
    return logs ?? []
  })

export const listActivityLog = createServerFn({ method: 'POST' })
  .inputValidator((d: AuthInput) => d)
  .handler(async ({ data }) => {
    const { supabase } = await ownerClient(data.accessToken)
    const { data: logs, error } = await supabase.from('admin_activity_log').select('*').order('created_at', { ascending: false }).limit(500)
    if (error) throw new Error(error.message)
    return logs ?? []
  })

// Admin user actions ---------------------------------------------------------

export const adminResetPassword = createServerFn({ method: 'POST' })
  .inputValidator((d: AuthInput & { email: string }) => d)
  .handler(async ({ data }) => {
    await ownerClient(data.accessToken)
    const redirectTo = `https://www.pantryai.it/reset-password`
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(data.email, { redirectTo })
    if (error) throw new Error(error.message)
    await logAction(data.accessToken, 'admin', 'info', `reset password sent`, { email: data.email })
    return { ok: true }
  })

export const adminUpdateUserEmail = createServerFn({ method: 'POST' })
  .inputValidator((d: AuthInput & { userId: string; email: string }) => d)
  .handler(async ({ data }) => {
    await ownerClient(data.accessToken)
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { email: data.email, email_confirm: true })
    if (error) throw new Error(error.message)
    await logAction(data.accessToken, 'admin', 'warn', `email changed`, { userId: data.userId, newEmail: data.email })
    return { ok: true }
  })

export const adminUpdateUserName = createServerFn({ method: 'POST' })
  .inputValidator((d: AuthInput & { userId: string; name: string }) => d)
  .handler(async ({ data }) => {
    const { supabase } = await ownerClient(data.accessToken)
    const { error } = await supabase.rpc('admin_update_display_name', { _target_user: data.userId, _name: data.name })
    if (error) throw new Error(error.message)
    await logAction(data.accessToken, 'admin', 'info', `name changed`, { userId: data.userId, name: data.name })
    return { ok: true }
  })

export const adminDeleteUser = createServerFn({ method: 'POST' })
  .inputValidator((d: AuthInput & { userId: string }) => d)
  .handler(async ({ data }) => {
    const { supabase, userId: callerId } = await ownerClient(data.accessToken)
    if (data.userId === callerId) throw new Error('Non puoi eliminare il tuo account da qui')
    const { error: pErr } = await supabase.rpc('admin_purge_user_data', { _target_user: data.userId })
    if (pErr) throw new Error(pErr.message)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId)
    if (error) throw new Error(error.message)
    await logAction(data.accessToken, 'admin', 'warn', `user deleted`, { userId: data.userId })
    return { ok: true }
  })

export const adminImpersonate = createServerFn({ method: 'POST' })
  .inputValidator((d: AuthInput & { userId: string }) => d)
  .handler(async ({ data }) => {
    await ownerClient(data.accessToken)
    const { data: u, error: ue } = await supabaseAdmin.auth.admin.getUserById(data.userId)
    if (ue || !u.user?.email) throw new Error('Utente non trovato')
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: u.user.email,
      options: { redirectTo: 'https://www.pantryai.it/home' },
    })
    if (error) throw new Error(error.message)
    await logAction(data.accessToken, 'admin', 'warn', `impersonation link generated`, { userId: data.userId })
    return { url: link.properties?.action_link, email: u.user.email }
  })

export const triggerDailyNotifications = createServerFn({ method: 'POST' })
  .inputValidator((d: AuthInput) => d)
  .handler(async ({ data }) => {
    await ownerClient(data.accessToken)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const res = await fetch('https://project--30cdf66c-7516-40c8-aa07-54c7f7aae181.lovable.app/api/public/hooks/daily-notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` }, body: '{}',
    })
    await logAction(data.accessToken, 'admin', 'info', `cron daily-notifications triggered`, { status: res.status })
    return await res.json().catch(() => ({ ok: res.ok }))
  })

// Console command runner -----------------------------------------------------

type CmdResult = { ok: boolean; output: string; data?: unknown }

export const runAdminCommand = createServerFn({ method: 'POST' })
  .inputValidator((d: AuthInput & { command: string }) => d)
  .handler(async ({ data }): Promise<CmdResult> => {
    const { supabase } = await ownerClient(data.accessToken)
    const cmd = data.command.trim()
    if (!cmd) return { ok: false, output: 'comando vuoto' }
    const parts = cmd.split(/\s+/)
    const [g, sub, ...args] = parts
    try {
      if (g === 'help') {
        return { ok: true, output: [
          'help',
          'user find <email|id>',
          'user reset-password <email>',
          'user set-email <id> <newEmail>',
          'user set-name <id> <name...>',
          'user delete <id>',
          'user impersonate <id>',
          'cron run daily-notifications',
          'log tail <email|push|admin> [n=20]',
          'db count <table>',
        ].join('\n') }
      }
      if (g === 'user') {
        if (sub === 'find') {
          const q = args[0]
          if (!q) return { ok: false, output: 'manca email|id' }
          const { data: users } = await supabase.rpc('admin_list_users')
          const found = (users ?? []).filter((u: any) => u.email?.includes(q) || u.id === q)
          return { ok: true, output: found.length ? JSON.stringify(found, null, 2) : 'nessun risultato' }
        }
        if (sub === 'reset-password') {
          const email = args[0]; if (!email) return { ok: false, output: 'manca email' }
          const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo: 'https://www.pantryai.it/reset-password' })
          if (error) return { ok: false, output: error.message }
          await logAction(data.accessToken, 'console', 'info', `reset password sent`, { email })
          return { ok: true, output: `email di recupero inviata a ${email}` }
        }
        if (sub === 'set-email') {
          const [id, email] = args; if (!id || !email) return { ok: false, output: 'usage: user set-email <id> <newEmail>' }
          const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { email, email_confirm: true })
          if (error) return { ok: false, output: error.message }
          await logAction(data.accessToken, 'console', 'warn', `email changed`, { id, email })
          return { ok: true, output: `email aggiornata` }
        }
        if (sub === 'set-name') {
          const [id, ...rest] = args; const name = rest.join(' ')
          if (!id || !name) return { ok: false, output: 'usage: user set-name <id> <name>' }
          const { error } = await supabase.rpc('admin_update_display_name', { _target_user: id, _name: name })
          if (error) return { ok: false, output: error.message }
          await logAction(data.accessToken, 'console', 'info', `name changed`, { id, name })
          return { ok: true, output: 'nome aggiornato' }
        }
        if (sub === 'delete') {
          const id = args[0]; if (!id) return { ok: false, output: 'manca id' }
          const { error: pe } = await supabase.rpc('admin_purge_user_data', { _target_user: id })
          if (pe) return { ok: false, output: pe.message }
          const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
          if (error) return { ok: false, output: error.message }
          await logAction(data.accessToken, 'console', 'warn', `user deleted`, { id })
          return { ok: true, output: 'utente eliminato' }
        }
        if (sub === 'impersonate') {
          const id = args[0]; if (!id) return { ok: false, output: 'manca id' }
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(id)
          if (!u.user?.email) return { ok: false, output: 'utente non trovato' }
          const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink', email: u.user.email,
            options: { redirectTo: 'https://www.pantryai.it/home' },
          })
          if (error) return { ok: false, output: error.message }
          await logAction(data.accessToken, 'console', 'warn', `impersonation`, { id })
          return { ok: true, output: `apri questo link in incognito:\n${link.properties?.action_link}` }
        }
      }
      if (g === 'cron' && sub === 'run' && args[0] === 'daily-notifications') {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const res = await fetch('https://project--30cdf66c-7516-40c8-aa07-54c7f7aae181.lovable.app/api/public/hooks/daily-notifications', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` }, body: '{}',
        })
        const body = await res.text()
        await logAction(data.accessToken, 'console', 'info', `cron daily-notifications`, { status: res.status })
        return { ok: res.ok, output: `${res.status} ${body}` }
      }
      if (g === 'log' && sub === 'tail') {
        const which = args[0]; const n = Number(args[1] ?? 20)
        const table = which === 'email' ? 'email_send_log' : which === 'push' ? 'push_send_log' : which === 'admin' ? 'admin_activity_log' : null
        if (!table) return { ok: false, output: 'usage: log tail <email|push|admin> [n]' }
        const { data: rows, error } = await (supabaseAdmin.from(table) as any).select('*').order('created_at', { ascending: false }).limit(Math.min(n, 200))
        if (error) return { ok: false, output: error.message }
        return { ok: true, output: JSON.stringify(rows, null, 2) }
      }
      if (g === 'db' && sub === 'count') {
        const table = args[0]; if (!table) return { ok: false, output: 'manca tabella' }
        const allowed = ['profiles','households','recipes','food_items','shopping_list_items','expenses','meal_plans','admin_activity_log','email_send_log','push_send_log','user_roles','app_owners']
        if (!allowed.includes(table)) return { ok: false, output: 'tabella non consentita' }
        const { count, error } = await (supabaseAdmin.from(table) as any).select('*', { count: 'exact', head: true })
        if (error) return { ok: false, output: error.message }
        return { ok: true, output: `${table}: ${count}` }
      }
      return { ok: false, output: `comando sconosciuto: ${cmd}\nusa "help"` }
    } catch (e: any) {
      return { ok: false, output: e?.message ?? String(e) }
    }
  })
