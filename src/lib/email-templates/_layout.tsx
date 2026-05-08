import * as React from 'react'
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'

export const BRAND = {
  name: 'PantryAI',
  logoUrl:
    'https://pflkgnslqdjqqmchetgp.supabase.co/storage/v1/object/public/email-assets/logo.png',
  siteUrl: 'https://pantryai.it',
  cream: '#fff8ea',
  leaf: '#4f8a5b',
  leafDark: '#326640',
  sage: '#eaf3df',
  tomato: '#d97a3c',
  text: '#1f3327',
  muted: '#66776b',
  border: '#e6dcc4',
  white: '#ffffff',
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
        <Section style={hero}>
          <Row>
            <Column style={logoColumn}>
              <Img src={BRAND.logoUrl} alt={BRAND.name} width="58" height="58" style={logo} />
            </Column>
            <Column>
              <Text style={brandName}>{BRAND.name}</Text>
              <Text style={brandClaim}>La tua dispensa intelligente</Text>
            </Column>
          </Row>
        </Section>

        <Container style={card}>
          <Heading style={h1}>{heading}</Heading>
          {children}
        </Container>

        <Text style={footer}>
          {BRAND.name} · Email automatica di sicurezza account
          <br />
          Se non hai richiesto questa operazione, puoi ignorare il messaggio.
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
  <Section style={ctaSection}>
    <Link href={href} style={ctaButton}>
      {label}
    </Link>
    <Text style={fallbackText}>In alternativa apri questo link:</Text>
    <Link href={href} style={fallbackLink}>
      {href}
    </Link>
  </Section>
)

const body = {
  backgroundColor: BRAND.white,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  margin: 0,
  padding: '0',
}
const outer = {
  maxWidth: '620px',
  margin: '0 auto',
  padding: '28px 12px',
  backgroundColor: BRAND.cream,
}
const hero = {
  backgroundColor: BRAND.sage,
  borderRadius: '22px 22px 0 0',
  padding: '26px 28px',
  border: `1px solid ${BRAND.border}`,
  borderBottom: '0',
}
const logoColumn = { width: '72px' }
const logo = { display: 'block', borderRadius: '16px', backgroundColor: BRAND.white }
const brandName = {
  fontSize: '24px',
  fontWeight: 800 as const,
  color: BRAND.text,
  margin: '3px 0 2px',
}
const brandClaim = {
  fontSize: '13px',
  fontWeight: 600 as const,
  color: BRAND.leafDark,
  margin: 0,
}
const card = {
  backgroundColor: BRAND.white,
  borderRadius: '0 0 22px 22px',
  padding: '36px 30px 32px',
  border: `1px solid ${BRAND.border}`,
  boxShadow: '0 12px 30px rgba(31, 51, 39, 0.10)',
}
const h1 = {
  fontSize: '27px',
  lineHeight: '1.18',
  fontWeight: 800 as const,
  color: BRAND.text,
  margin: '0 0 18px',
}
const ctaSection = { textAlign: 'center' as const, margin: '32px 0 26px' }
const ctaButton = {
  backgroundColor: BRAND.leaf,
  color: '#ffffff',
  fontSize: '17px',
  lineHeight: '1.2',
  fontWeight: 800 as const,
  borderRadius: '14px',
  padding: '16px 34px',
  textDecoration: 'none',
  display: 'inline-block',
  border: `2px solid ${BRAND.leafDark}`,
  boxShadow: '0 8px 18px rgba(79, 138, 91, 0.28)',
}
const fallbackText = {
  fontSize: '12px',
  color: BRAND.muted,
  margin: '20px 0 8px',
}
const fallbackLink = {
  fontSize: '12px',
  lineHeight: '1.5',
  color: BRAND.leafDark,
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
}
const footer = {
  fontSize: '12px',
  color: BRAND.muted,
  textAlign: 'center' as const,
  margin: '22px 18px 0',
  lineHeight: '1.6',
}

export const text = {
  fontSize: '15px',
  color: BRAND.text,
  lineHeight: '1.65',
  margin: '0 0 14px',
}
export const subtle = {
  fontSize: '13px',
  color: BRAND.muted,
  lineHeight: '1.6',
  margin: '24px 0 0',
}
export const codeBox = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: '30px',
  fontWeight: 800 as const,
  letterSpacing: '0.2em',
  color: BRAND.text,
  backgroundColor: BRAND.sage,
  border: `1px solid ${BRAND.border}`,
  borderRadius: '14px',
  padding: '20px',
  textAlign: 'center' as const,
  margin: '10px 0 24px',
}
