import * as React from 'react'
import { Text } from '@react-email/components'
import { EmailLayout, codeBox, subtle, text } from './_layout'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EmailLayout preview="Il tuo codice di verifica" heading="Conferma identità">
    <Text style={text}>Usa il codice qui sotto per confermare la tua identità:</Text>
    <Text style={codeBox}>{token}</Text>
    <Text style={subtle}>
      Il codice scade a breve. Se non hai richiesto questa verifica, ignora
      questa email.
    </Text>
  </EmailLayout>
)

export default ReauthenticationEmail
