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
      Abbiamo ricevuto una richiesta per cambiare la password del tuo account{' '}
      <strong>{siteName}</strong>. Premi il pulsante per scegliere una nuova password.
    </Text>
    <Cta href={confirmationUrl} label="Reimposta password" />
    <Text style={subtle}>
      Se non hai richiesto il recupero password, ignora questa email: la tua password non verrà modificata.
    </Text>
  </EmailLayout>
)

export default RecoveryEmail
