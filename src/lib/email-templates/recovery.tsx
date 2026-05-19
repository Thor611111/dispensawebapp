import * as React from 'react'
import { Text } from '@react-email/components'
import { Cta, EmailLayout, subtle, text } from './_layout'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <EmailLayout
    preview={`Reimposta la tua password per ${siteName}`}
    heading="Reimposta la tua password"
  >
    <Text style={text}>
      Abbiamo ricevuto una richiesta di reimpostazione password per il tuo
      account <strong>{siteName}</strong>. Tocca il pulsante per scegliere una
      nuova password.
    </Text>
    <Cta href={confirmationUrl} label="Imposta nuova password" />
    <Text style={subtle}>
      Se non hai richiesto la reimpostazione, ignora pure questa email: la tua
      password resta invariata.
    </Text>
  </EmailLayout>
)

export default RecoveryEmail
