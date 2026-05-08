import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { EmailLayout, Cta, text, subtle, BRAND } from './_layout'

interface Item { name: string; detail?: string }
interface Props {
  greeting: string
  expiringItems: Item[]
  todaysMeals: Item[]
  shoppingItems: Item[]
  appUrl: string
}

export const DailyDigestEmail = ({ greeting, expiringItems, todaysMeals, shoppingItems, appUrl }: Props) => (
  <EmailLayout preview="Il tuo riepilogo PantryAI di oggi" heading={greeting}>
    <Text style={text}>Ecco il riepilogo della tua dispensa di oggi.</Text>

    {expiringItems.length > 0 && (
      <Section style={section}>
        <Text style={sectionTitle}>🕒 In scadenza ({expiringItems.length})</Text>
        {expiringItems.slice(0, 8).map((it, i) => (
          <Text key={i} style={itemLine}>• <strong>{it.name}</strong>{it.detail ? ` — ${it.detail}` : ''}</Text>
        ))}
      </Section>
    )}

    {todaysMeals.length > 0 && (
      <Section style={section}>
        <Text style={sectionTitle}>🍽️ Pasti pianificati oggi</Text>
        {todaysMeals.map((it, i) => (
          <Text key={i} style={itemLine}>• <strong>{it.detail}</strong>: {it.name}</Text>
        ))}
      </Section>
    )}

    {shoppingItems.length > 0 && (
      <Section style={section}>
        <Text style={sectionTitle}>🛒 Lista della spesa ({shoppingItems.length})</Text>
        {shoppingItems.slice(0, 10).map((it, i) => (
          <Text key={i} style={itemLine}>• {it.name}{it.detail ? ` (${it.detail})` : ''}</Text>
        ))}
      </Section>
    )}

    {expiringItems.length === 0 && todaysMeals.length === 0 && shoppingItems.length === 0 && (
      <Text style={text}>Nessuna attività prevista oggi. Buona giornata!</Text>
    )}

    <Cta href={appUrl} label="Apri PantryAI" />
    <Text style={subtle}>Puoi disattivare le notifiche giornaliere in Impostazioni → Notifiche.</Text>
  </EmailLayout>
)

const section = { margin: '20px 0 8px' }
const sectionTitle = { fontSize: '15px', fontWeight: 700 as const, color: BRAND.leafDark, margin: '8px 0 6px' }
const itemLine = { fontSize: '14px', color: BRAND.text, margin: '2px 0', lineHeight: '1.5' }