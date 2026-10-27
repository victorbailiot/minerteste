import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Link,
  Preview,
  Section,
  Button,
  Hr,
  Heading,
} from '@react-email/components'

interface FinancialPasswordResetProps {
  userName: string
  resetUrl: string
}

export default function FinancialPasswordReset({
  userName,
  resetUrl,
}: FinancialPasswordResetProps) {
  return (
    <Html>
      <Head />
      <Preview>Redefina sua senha financeira na Minerstone</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Minerstone</Heading>
            <Text style={subtitle}>Recuperação de Senha Financeira</Text>
          </Section>

          <Section style={content}>
            <Text style={greeting}>Olá, {userName}!</Text>
            
            <Text style={paragraph}>
              Recebemos uma solicitação para redefinir sua senha financeira na plataforma Minerstone.
            </Text>

            <Text style={paragraph}>
              Clique no botão abaixo para criar uma nova senha financeira:
            </Text>

            <Button style={button} href={resetUrl}>
              Redefinir Senha Financeira
            </Button>

            <Text style={paragraph}>
              Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
            </Text>

            <Text style={link}>{resetUrl}</Text>

            <Text style={paragraph}>
              Este link é válido por 1 hora. Após esse período, você precisará solicitar um novo link de recuperação.
            </Text>

            <Text style={warning}>
              Se você não solicitou a redefinição de senha financeira, ignore este email. Sua senha financeira permanecerá inalterada.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              Para dúvidas, entre em contato conosco através do suporte.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const header = {
  textAlign: 'center' as const,
  padding: '20px 0',
}

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 8px',
}

const subtitle = {
  color: '#6b7280',
  fontSize: '16px',
  margin: '0',
}

const content = {
  padding: '0 48px',
}

const greeting = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px',
}

const paragraph = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
}

const button = {
  backgroundColor: '#dc2626',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  margin: '16px 0',
}

const link = {
  color: '#dc2626',
  fontSize: '14px',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
}

const warning = {
  color: '#dc2626',
  fontSize: '14px',
  fontWeight: 'bold',
  backgroundColor: '#fef2f2',
  padding: '12px',
  borderRadius: '6px',
  border: '1px solid #fecaca',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
}

const footer = {
  padding: '0 48px',
}

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 8px',
}

