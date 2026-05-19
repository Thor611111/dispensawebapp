import * as React from 'react'
import { Text } from '@react-email/components'
import { Cta, EmailLayout, subtle, text } from './_layout'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
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
    heading="Conferma il cambio email"
  >
    <Text style={text}>
      Hai richiesto di cambiare l'indirizzo email del tuo account{' '}
      <strong>{siteName}</strong> da <strong>{oldEmail}</strong> a{' '}
      <strong>{newEmail}</strong>.
    </Text>
    <Cta href={confirmationUrl} label="Conferma cambio email" />
    <Text style={subtle}>
      Se non sei stato tu, ti consigliamo di proteggere subito il tuo account
      cambiando la password.
    </Text>
  </EmailLayout>
)

export default EmailChangeEmail
