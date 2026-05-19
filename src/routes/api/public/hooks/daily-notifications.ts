import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { render } from '@react-email/components'
import * as React from 'react'
import webpush from 'web-push'
import { DailyDigestEmail } from '@/lib/email-templates/daily-digest'
import { ymd } from '@/lib/date'

const SLOT_LABELS: Record<string, string> = {
  breakfast: 'Colazione', lunch: 'Pranzo', dinner: 'Cena', snack: 'Spuntino',
}

export const Route = createFileRoute('/api/public/hooks/daily-notifications')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const SUPABASE_URL = process.env.SUPABASE_URL!
        const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const authHeader = request.headers.get('Authorization')
        if (!SERVICE_KEY || authHeader !== `Bearer ${SERVICE_KEY}`) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        }
        const APP_URL = 'https://dispensawebapp.lovable.app'
        const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        })

        const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY
        const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
        const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:hello@pantryai.it'
        const pushReady = Boolean(VAPID_PUBLIC && VAPID_PRIVATE)
        if (pushReady) {
          webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC!, VAPID_PRIVATE!)
        }

        // Use Europe/Rome to match the timezone clients store dates in (day_date, expires_on, spent_on)
        const now = new Date()
        const currentHour = Number(
          now.toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Europe/Rome' }).slice(0, 2),
        )
        const today = ymd(now)

        const log = async (level: string, source: string, message: string, metadata?: any) => {
          await admin.from('admin_activity_log').insert({ level, source, message, metadata })
        }

        try {
          const { data: prefs, error: prefsErr } = await admin
            .from('notification_preferences')
            .select('*')
            .eq('daily_send_hour', currentHour)
            .eq('email_enabled', true)

          if (prefsErr) throw prefsErr
          if (!prefs || prefs.length === 0) {
            return Response.json({ ok: true, processed: 0, hour: currentHour })
          }

          let sent = 0
          for (const pref of prefs) {
            try {
              const householdId = pref.household_id
              const { data: userPrefs } = await admin
                .from('user_preferences')
                .select('expiry_warning_days')
                .eq('household_id', householdId)
                .maybeSingle()
              const warnDays = userPrefs?.expiry_warning_days ?? 3

              const limitDate = new Date()
              limitDate.setDate(limitDate.getDate() + warnDays)
              const limitStr = ymd(limitDate)

              const expiringRes = pref.expiry_alerts
                ? await admin
                    .from('food_items')
                    .select('name, quantity, unit, expires_on')
                    .eq('household_id', householdId)
                    .not('expires_on', 'is', null)
                    .lte('expires_on', limitStr)
                    .order('expires_on', { ascending: true })
                    .limit(20)
                : { data: [] as any[] }

              const planEntries = pref.weekly_plan_reminders
                ? await admin
                    .from('meal_plan_entries')
                    .select('day_date, slot, recipe_title_snapshot, meal_plans!inner(household_id)')
                    .eq('day_date', today)
                    .eq('meal_plans.household_id', householdId)
                : { data: [] as any[] }

              const shoppingRes = pref.shopping_reminders
                ? await admin
                    .from('shopping_list_items')
                    .select('name, quantity, unit')
                    .eq('household_id', householdId)
                    .eq('checked', false)
                    .limit(20)
                : { data: [] as any[] }

              const expiringItems = (expiringRes.data ?? []).map((f: any) => ({
                name: f.name,
                detail: f.expires_on ? `scade ${f.expires_on}` : undefined,
              }))
              const todaysMeals = (planEntries.data ?? []).map((e: any) => ({
                name: e.recipe_title_snapshot ?? '—',
                detail: SLOT_LABELS[e.slot] ?? e.slot,
              }))
              const shoppingItems = (shoppingRes.data ?? []).map((s: any) => ({
                name: s.name,
                detail: `${s.quantity} ${s.unit}`,
              }))

              if (expiringItems.length === 0 && todaysMeals.length === 0 && shoppingItems.length === 0) {
                continue
              }

              const { data: members } = await admin
                .from('household_members')
                .select('user_id')
                .eq('household_id', householdId)
              if (!members || members.length === 0) continue

              for (const m of members) {
                const { data: userRes } = await admin.auth.admin.getUserById(m.user_id)
                const email = userRes?.user?.email
                if (!email) continue
                const displayName = (userRes?.user?.user_metadata as any)?.display_name
                  ?? email.split('@')[0]
                const greeting = `Ciao, ${displayName.split(' ')[0]} 👋`

                const html = await render(
                  React.createElement(DailyDigestEmail, {
                    greeting,
                    expiringItems,
                    todaysMeals,
                    shoppingItems,
                    appUrl: APP_URL,
                  }),
                )
                const text = await render(
                  React.createElement(DailyDigestEmail, {
                    greeting,
                    expiringItems,
                    todaysMeals,
                    shoppingItems,
                    appUrl: APP_URL,
                  }),
                  { plainText: true },
                )

                const messageId = `digest-${householdId}-${m.user_id}-${today}`
                const { error: enqErr } = await admin.rpc('enqueue_email', {
                  queue_name: 'transactional_emails',
                  payload: {
                    to: email,
                    from: 'PantryAI <hello@pantryai.it>',
                    subject: 'Il tuo riepilogo PantryAI di oggi',
                    html,
                    text,
                    label: 'daily_digest',
                    message_id: messageId,
                  },
                })
                if (enqErr) {
                  await log('error', 'daily-notifications', `enqueue failed for ${email}`, { error: enqErr.message })
                } else {
                  sent++
                  await admin.from('email_send_log').insert({
                    message_id: messageId,
                    template_name: 'daily_digest',
                    recipient_email: email,
                    status: 'pending',
                  })
                }

                if (pushReady && pref.push_enabled) {
                  const { data: subs } = await admin
                    .from('push_subscriptions')
                    .select('endpoint, p256dh, auth')
                    .eq('user_id', m.user_id)
                  const parts: string[] = []
                  if (expiringItems.length) parts.push(`${expiringItems.length} in scadenza`)
                  if (todaysMeals.length) parts.push(`${todaysMeals.length} pasti oggi`)
                  if (shoppingItems.length) parts.push(`${shoppingItems.length} da comprare`)
                  const title = 'Il tuo riepilogo PantryAI'
                  const body = parts.join(' · ') || 'Apri per i dettagli'
                  const payload = JSON.stringify({ title, body, url: '/home' })
                  for (const sub of subs ?? []) {
                    try {
                      await webpush.sendNotification(
                        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                        payload,
                      )
                      await admin.from('push_send_log').insert({
                        user_id: m.user_id, household_id: householdId,
                        category: 'daily_digest', title, body, status: 'sent',
                      })
                    } catch (pushErr: any) {
                      const code = pushErr?.statusCode
                      if (code === 404 || code === 410) {
                        await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
                      }
                      await admin.from('push_send_log').insert({
                        user_id: m.user_id, household_id: householdId,
                        category: 'daily_digest', title, body,
                        status: 'failed', error_message: pushErr?.message ?? String(pushErr),
                      })
                    }
                  }
                }
              }
            } catch (e: any) {
              await log('error', 'daily-notifications', `household ${pref.household_id} failed`, { error: e?.message })
            }
          }

          await log('info', 'daily-notifications', `cron run hour=${currentHour} sent=${sent}`)
          return Response.json({ ok: true, processed: prefs.length, sent, hour: currentHour })
        } catch (e: any) {
          await log('error', 'daily-notifications', 'fatal', { error: e?.message })
          return new Response(JSON.stringify({ ok: false, error: e?.message }), { status: 500 })
        }
      },
    },
  },
})