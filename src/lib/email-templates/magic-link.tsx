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
    heading="Accedi al tuo account"
  >
    <Text style={text}>
      Usa il pulsante qui sotto per accedere in modo sicuro a <strong>{siteName}</strong>.
      Il link è personale e resta valido solo per pochi minuti.
    </Text>
    <Cta href={confirmationUrl} label="Accedi ora" />
    <Text style={subtle}>
      Se non hai richiesto questo accesso, puoi ignorare questa email.
    </Text>
  </EmailLayout>
)

export default MagicLinkEmail
