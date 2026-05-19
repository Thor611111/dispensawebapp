import * as React from 'react'
import { Text } from '@react-email/components'
import { Cta, EmailLayout, subtle, text } from './_layout'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <EmailLayout
    preview={`Conferma la tua email per ${siteName}`}
    heading="Benvenuto in PantryAI 🌿"
  >
    <Text style={text}>
      Grazie per esserti registrato a <strong>{siteName}</strong>. Manca solo un
      passaggio: conferma la tua email <strong>{recipient}</strong> per attivare
      l'account e iniziare a organizzare dispensa, ricette e spesa.
    </Text>
    <Cta href={confirmationUrl} label="Conferma la mia email" />
    <Text style={subtle}>
      Se non hai creato tu un account, puoi ignorare tranquillamente questo
      messaggio.
    </Text>
  </EmailLayout>
)

export default SignupEmail
