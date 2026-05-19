import * as React from 'react'
import { Text } from '@react-email/components'
import { Cta, EmailLayout, subtle, text } from './_layout'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <EmailLayout
    preview={`Il tuo link di accesso a ${siteName}`}
    heading="Il tuo link di accesso"
  >
    <Text style={text}>
      Tocca il pulsante qui sotto per accedere a <strong>{siteName}</strong>.
      Il link scade tra pochi minuti per motivi di sicurezza.
    </Text>
    <Cta href={confirmationUrl} label="Accedi a PantryAI" />
    <Text style={subtle}>
      Non hai richiesto questo link? Ignora pure questa email.
    </Text>
  </EmailLayout>
)

export default MagicLinkEmail
