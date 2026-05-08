import * as React from 'react'
import { Text } from '@react-email/components'
import { Cta, EmailLayout, subtle, text } from './_layout'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, confirmationUrl }: InviteEmailProps) => (
  <EmailLayout
    preview={`Sei stato invitato a unirti a ${siteName}`}
    heading="Sei stato invitato"
  >
    <Text style={text}>
      Sei stato invitato a unirti a <strong>{siteName}</strong>. Clicca sul
      pulsante qui sotto per accettare l'invito e creare il tuo account.
    </Text>
    <Cta href={confirmationUrl} label="Accetta invito" />
    <Text style={subtle}>
      Se non aspettavi questo invito, puoi ignorare questa email.
    </Text>
  </EmailLayout>
)

export default InviteEmail
