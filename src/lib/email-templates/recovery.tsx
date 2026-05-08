import * as React from 'react'
import { Text } from '@react-email/components'
import { Cta, EmailLayout, subtle, text } from './_layout'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <EmailLayout
    preview={`Reimposta la password di ${siteName}`}
    heading="Reimposta la password"
  >
    <Text style={text}>
      Abbiamo ricevuto una richiesta di reset password per il tuo account{' '}
      <strong>{siteName}</strong>. Clicca sul pulsante qui sotto per scegliere
      una nuova password.
    </Text>
    <Cta href={confirmationUrl} label="Reimposta password" />
    <Text style={subtle}>
      Se non hai richiesto il reset, ignora questa email — la tua password
      resterà invariata.
    </Text>
  </EmailLayout>
)

export default RecoveryEmail
