import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components'

export const BRAND = {
  name: 'PantryAI',
  logoUrl:
    'https://pflkgnslqdjqqmchetgp.supabase.co/storage/v1/object/public/email-assets/logo.png',
  siteUrl: 'https://pantryai.it',
  cream: '#faf6e7',
  card: '#ffffff',
  primary: '#4f8a5b',
  primaryDark: '#3d6e47',
  accent: '#d97a3c',
  text: '#1f3327',
  muted: '#6b7c70',
  border: '#e6e0c8',
}

interface LayoutProps {
  preview: string
  heading: string
  children: React.ReactNode
}

export const EmailLayout = ({ preview, heading, children }: LayoutProps) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={body}>
      <Container style={outer}>
        <Section style={headerSection}>
          <Img src={BRAND.logoUrl} alt={BRAND.name} width="56" height="56" style={logo} />
          <Text style={brandName}>{BRAND.name}</Text>
        </Section>
        <Container style={card}>
          <Heading style={h1}>{heading}</Heading>
          {children}
        </Container>
        <Text style={footer}>
          {BRAND.name} · La tua dispensa intelligente
          <br />
          Hai ricevuto questa email perché è collegata al tuo account.
        </Text>
      </Container>
    </Body>
  </Html>
)

interface CtaProps {
  href: string
  label: string
}

export const Cta = ({ href, label }: CtaProps) => (
  <Section style={{ textAlign: 'center', margin: '32px 0' }}>
    <Button href={href} style={ctaButton}>
      {label}
    </Button>
    <Text style={fallbackText}>
      Se il pulsante non funziona, copia e incolla questo link nel browser:
    </Text>
    <Text style={fallbackLink}>{href}</Text>
  </Section>
)

const body = {
  backgroundColor: BRAND.cream,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: '32px 12px',
}
const outer = { maxWidth: '560px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '8px 0 24px' }
const logo = { display: 'inline-block', borderRadius: '14px' }
const brandName = {
  fontSize: '20px',
  fontWeight: 700 as const,
  color: BRAND.primary,
  margin: '8px 0 0',
  letterSpacing: '-0.01em',
}
const card = {
  backgroundColor: BRAND.card,
  borderRadius: '20px',
  padding: '36px 32px',
  border: `1px solid ${BRAND.border}`,
  boxShadow: '0 4px 16px rgba(31, 51, 39, 0.06)',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 700 as const,
  color: BRAND.text,
  margin: '0 0 16px',
  letterSpacing: '-0.01em',
}
const ctaButton = {
  backgroundColor: BRAND.primary,
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 600 as const,
  borderRadius: '12px',
  padding: '14px 32px',
  textDecoration: 'none',
  display: 'inline-block',
  border: `1px solid ${BRAND.primaryDark}`,
}
const fallbackText = {
  fontSize: '12px',
  color: BRAND.muted,
  margin: '20px 0 6px',
}
const fallbackLink = {
  fontSize: '12px',
  color: BRAND.primary,
  wordBreak: 'break-all' as const,
  margin: 0,
}
const footer = {
  fontSize: '12px',
  color: BRAND.muted,
  textAlign: 'center' as const,
  margin: '24px 0 0',
  lineHeight: '1.6',
}

export const text = {
  fontSize: '15px',
  color: BRAND.text,
  lineHeight: '1.6',
  margin: '0 0 14px',
}
export const subtle = {
  fontSize: '13px',
  color: BRAND.muted,
  lineHeight: '1.6',
  margin: '24px 0 0',
}
export const codeBox = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '28px',
  fontWeight: 700 as const,
  letterSpacing: '0.2em',
  color: BRAND.text,
  backgroundColor: BRAND.cream,
  border: `1px solid ${BRAND.border}`,
  borderRadius: '12px',
  padding: '18px',
  textAlign: 'center' as const,
  margin: '8px 0 24px',
}