import resend from './resend'
import EmailConfirmation from '@/components/emails/EmailConfirmation'
import PasswordReset from '@/components/emails/PasswordReset'
import FinancialPasswordReset from '@/components/emails/FinancialPasswordReset'
import { render } from '@react-email/components'

export interface EmailConfirmationData {
  userName: string
  userEmail: string
  confirmationToken: string
}

export interface PasswordResetData {
  userName: string
  userEmail: string
  resetToken: string
}

export interface FinancialPasswordResetData {
  userName: string
  userEmail: string
  resetToken: string
}

export class EmailService {
  private static readonly FROM_EMAIL = 'noreply@minerstone.com.br'
  private static readonly BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  /**
   * Envia email de confirmação de conta
   */
  static async sendConfirmationEmail(data: EmailConfirmationData): Promise<boolean> {
    try {
      const confirmationUrl = `${this.BASE_URL}/auth/confirm-email?token=${data.confirmationToken}`
      
      const emailHtml = await render(
        EmailConfirmation({
          userName: data.userName,
          confirmationUrl,
        })
      )

      const { data: result, error } = await resend.emails.send({
        from: this.FROM_EMAIL,
        to: [data.userEmail],
        subject: 'Confirme sua conta - MinerStone',
        html: emailHtml,
      })

      if (error) {
        console.error('Erro ao enviar email de confirmação:', error)
        return false
      }

      console.log('Email de confirmação enviado:', result?.id)
      return true
    } catch (error) {
      console.error('Erro ao enviar email de confirmação:', error)
      return false
    }
  }

  /**
   * Envia email de recuperação de senha
   */
  static async sendPasswordResetEmail(data: PasswordResetData): Promise<boolean> {
    try {
      const resetUrl = `${this.BASE_URL}/auth/reset-password?token=${data.resetToken}`
      
      const emailHtml = await render(
        PasswordReset({
          userName: data.userName,
          resetUrl,
        })
      )

      const { data: result, error } = await resend.emails.send({
        from: this.FROM_EMAIL,
        to: [data.userEmail],
        subject: 'Recuperação de Senha - MinerStone',
        html: emailHtml,
      })

      if (error) {
        console.error('Erro ao enviar email de recuperação:', error)
        return false
      }

      console.log('Email de recuperação enviado:', result?.id)
      return true
    } catch (error) {
      console.error('Erro ao enviar email de recuperação:', error)
      return false
    }
  }

  /**
   * Envia email de recuperação de senha financeira
   */
  static async sendFinancialPasswordResetEmail(data: FinancialPasswordResetData): Promise<boolean> {
    try {
      const resetUrl = `${this.BASE_URL}/auth/reset-financial-password?token=${data.resetToken}`
      
      const emailHtml = await render(
        FinancialPasswordReset({
          userName: data.userName,
          resetUrl,
        })
      )

      const { data: result, error } = await resend.emails.send({
        from: this.FROM_EMAIL,
        to: [data.userEmail],
        subject: 'Recuperação de Senha Financeira - MinerStone',
        html: emailHtml,
      })

      if (error) {
        console.error('Erro ao enviar email de recuperação de senha financeira:', error)
        return false
      }

      console.log('Email de recuperação de senha financeira enviado:', result?.id)
      return true
    } catch (error) {
      console.error('Erro ao enviar email de recuperação de senha financeira:', error)
      return false
    }
  }
} 