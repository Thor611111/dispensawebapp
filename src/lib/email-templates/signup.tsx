import * as React from 'react'
import { Text } from '@react-email/components'
import { Cta, EmailLayout, subtle, text } from './_layout'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ siteName, recipient, confirmationUrl }: SignupEmailProps) => (
  <EmailLayout
    preview={`Conferma la tua email per ${siteName}`}
    heading="Benvenuto in PantryAI!"
  >
    <Text style={text}>
      Grazie per esserti registrato a <strong>{siteName}</strong>. Conferma il
      tuo indirizzo <strong>{recipient}</strong> per iniziare a gestire la tua
      dispensa.
    </Text>
    <Cta href={confirmationUrl} label="Conferma email" />
    <Text style={subtle}>
      Se non hai creato un account, puoi ignorare questa email.
    </Text>
  </EmailLayout>
)

export default SignupEmail
