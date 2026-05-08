import * as React from 'react'
import { Text } from '@react-email/components'
import { Cta, EmailLayout, subtle, text } from './_layout'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <EmailLayout
    preview={`Conferma il cambio email per ${siteName}`}
    heading="Conferma cambio email"
  >
    <Text style={text}>
      Hai richiesto di cambiare l'indirizzo email del tuo account{' '}
      <strong>{siteName}</strong> da <strong>{oldEmail}</strong> a{' '}
      <strong>{newEmail}</strong>.
    </Text>
    <Cta href={confirmationUrl} label="Conferma cambio" />
    <Text style={subtle}>
      Se non hai richiesto questa modifica, proteggi subito il tuo account.
    </Text>
  </EmailLayout>
)

export default EmailChangeEmail
