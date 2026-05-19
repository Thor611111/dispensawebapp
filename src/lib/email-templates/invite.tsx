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
    preview={`Sei stato invitato su ${siteName}`}
    heading="Hai un nuovo invito 🎉"
  >
    <Text style={text}>
      Sei stato invitato a entrare in <strong>{siteName}</strong>. Accetta
      l'invito per creare il tuo account e iniziare a condividere dispensa,
      ricette e lista della spesa.
    </Text>
    <Cta href={confirmationUrl} label="Accetta invito" />
    <Text style={subtle}>
      Se non aspettavi questo invito, puoi ignorare il messaggio.
    </Text>
  </EmailLayout>
)

export default InviteEmail
