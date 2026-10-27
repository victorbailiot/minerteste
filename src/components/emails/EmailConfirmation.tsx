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

interface EmailConfirmationProps {
  userName: string
  confirmationUrl: string
}

export default function EmailConfirmation({
  userName,
  confirmationUrl,
}: EmailConfirmationProps) {
  return (
    <Html>
      <Head />
      <Preview>Confirme sua conta na TectonMiner</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>TectonMiner</Heading>
            <Text style={subtitle}>Confirmação de Conta</Text>
          </Section>

          <Section style={content}>
            <Text style={greeting}>Olá, {userName}!</Text>
            
            <Text style={paragraph}>
              Obrigado por se cadastrar na nossa plataforma de mineração. Para começar a usar sua conta, 
              precisamos confirmar seu endereço de email.
            </Text>

            <Text style={paragraph}>
              Clique no botão abaixo para confirmar sua conta:
            </Text>

            <Button style={button} href={confirmationUrl}>
              Confirmar Conta
            </Button>

            <Text style={paragraph}>
              Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
            </Text>

            <Text style={link}>{confirmationUrl}</Text>

            <Text style={paragraph}>
              Este link é válido por 24 horas. Após esse período, você precisará solicitar um novo link de confirmação.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              Se você não criou uma conta na TectonMiner, pode ignorar este email.
            </Text>
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
  backgroundColor: '#3b82f6',
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
  color: '#3b82f6',
  fontSize: '14px',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
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