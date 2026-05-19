import * as React from 'react'
import { Text } from '@react-email/components'
import { EmailLayout, codeBox, subtle, text } from './_layout'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EmailLayout
    preview="Il tuo codice di verifica PantryAI"
    heading="Il tuo codice di verifica"
  >
    <Text style={text}>
      Usa il codice qui sotto per confermare la tua identità su PantryAI:
    </Text>
    <Text style={codeBox}>{token}</Text>
    <Text style={subtle}>
      Il codice scade tra pochi minuti. Se non hai richiesto tu questa
      operazione, ignora pure questa email.
    </Text>
  </EmailLayout>
)

export default ReauthenticationEmail
