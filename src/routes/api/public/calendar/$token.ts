import { createFileRoute } from '@tanstack/react-router'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

function escapeICS(s: string) {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function foldLine(line: string) {
  // RFC5545: max 75 octets per line; fold with CRLF + space
  const out: string[] = []
  let s = line
  while (s.length > 73) {
    out.push(s.slice(0, 73))
    s = s.slice(73)
  }
  out.push(s)
  return out.join('\r\n ')
}

function fmtDateLocal(dateStr: string, timeStr: string) {
  // floating local time: YYYYMMDDTHHMMSS (no Z)
  const d = dateStr.replace(/-/g, '')
  const t = timeStr.slice(0, 8).replace(/:/g, '') // HH:MM:SS -> HHMMSS
  const tt = t.length === 4 ? t + '00' : t
  return `${d}T${tt}`
}

function addMinutes(dateStr: string, timeStr: string, minutes: number) {
  const [Y, M, D] = dateStr.split('-').map(Number)
  const [h, m] = timeStr.split(':').map(Number)
  const dt = new Date(Date.UTC(Y, (M - 1), D, h, m))
  dt.setUTCMinutes(dt.getUTCMinutes() + minutes)
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  const hh = String(dt.getUTCHours()).padStart(2, '0')
  const mi = String(dt.getUTCMinutes()).padStart(2, '0')
  return `${yy}${mm}${dd}T${hh}${mi}00`
}

function dtstamp() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
}

const SLOT_LABEL: Record<string, string> = {
  breakfast: 'Colazione', lunch: 'Pranzo', dinner: 'Cena', snack: 'Spuntino',
}

export const Route = createFileRoute('/api/public/calendar/$token')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = params.token.replace(/\.ics$/i, '')
        if (!token || token.length < 8) return new Response('Not found', { status: 404 })

        const { data: row } = await supabaseAdmin
          .from('calendar_tokens')
          .select('*')
          .eq('token', token)
          .maybeSingle()
        if (!row) return new Response('Not found', { status: 404 })

        // touch last_accessed_at (best-effort)
        supabaseAdmin.from('calendar_tokens')
          .update({ last_accessed_at: new Date().toISOString() })
          .eq('user_id', row.user_id).then(() => {}, () => {})

        const fromDate = new Date()
        fromDate.setDate(fromDate.getDate() - 28)
        const fromStr = fromDate.toISOString().slice(0, 10)

        const { data: plans } = await supabaseAdmin
          .from('meal_plans')
          .select('id')
          .eq('household_id', row.household_id)

        const planIds = (plans ?? []).map((p: any) => p.id)

        let entries: any[] = []
        if (planIds.length) {
          const { data: ents } = await supabaseAdmin
            .from('meal_plan_entries')
            .select('id, day_date, slot, notes, recipe_title_snapshot, recipe_id, recipes ( title, prep_minutes )')
            .in('meal_plan_id', planIds)
            .gte('day_date', fromStr)
            .order('day_date', { ascending: true })
          entries = ents ?? []
        }

        const slotTime = (slot: string) => {
          if (slot === 'breakfast') return row.breakfast_time
          if (slot === 'lunch') return row.lunch_time
          if (slot === 'dinner') return row.dinner_time
          return row.snack_time
        }

        const lines: string[] = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//PantryAI//Piano Pasti//IT',
          'CALSCALE:GREGORIAN',
          'METHOD:PUBLISH',
          'X-WR-CALNAME:PantryAI · Piano pasti',
          'X-WR-TIMEZONE:Europe/Rome',
          'X-PUBLISHED-TTL:PT1H',
          'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
        ]

        const stamp = dtstamp()
        for (const e of entries) {
          const title = e.recipes?.title || e.recipe_title_snapshot || SLOT_LABEL[e.slot] || 'Pasto'
          const t = slotTime(e.slot)
          const dur = e.recipes?.prep_minutes && e.recipes.prep_minutes > 0
            ? Math.min(180, Math.max(15, e.recipes.prep_minutes))
            : row.default_meal_minutes
          const dtstart = fmtDateLocal(e.day_date, t)
          const dtend = addMinutes(e.day_date, t.slice(0, 5), dur)
          const summary = `🍽 ${title}`
          const desc = [SLOT_LABEL[e.slot] ?? '', e.notes ?? ''].filter(Boolean).join(' — ')

          lines.push('BEGIN:VEVENT')
          lines.push(`UID:${e.id}@pantryai.it`)
          lines.push(`DTSTAMP:${stamp}`)
          lines.push(`DTSTART;TZID=Europe/Rome:${dtstart}`)
          lines.push(`DTEND;TZID=Europe/Rome:${dtend}`)
          lines.push(foldLine(`SUMMARY:${escapeICS(summary)}`))
          if (desc) lines.push(foldLine(`DESCRIPTION:${escapeICS(desc)}`))
          lines.push('END:VEVENT')
        }

        lines.push('END:VCALENDAR')
        const body = lines.join('\r\n') + '\r\n'

        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Cache-Control': 'public, max-age=600',
            'Content-Disposition': 'inline; filename="pantryai.ics"',
          },
        })
      },
    },
  },
})