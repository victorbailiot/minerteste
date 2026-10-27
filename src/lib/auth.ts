import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { compare } from 'bcryptjs'
import { setupBigIntSerialization } from '@/lib/bigint-serializer'
import { getUserRoles } from '@/lib/authorization'

// Initialize BigInt serialization
setupBigIntSerialization()

// Secret único e obrigatório: evita secret aleatório do NextAuth que invalida sessões ao reiniciar
const authSecret =
  process.env.NEXTAUTH_SECRET ||
  process.env.JWT_SECRET
if (!authSecret) {
  throw new Error(
    'Defina NEXTAUTH_SECRET ou JWT_SECRET no .env para evitar erro "decryption operation failed"'
  )
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        emailOrReferralCode: { label: "Email ou Código de Indicação", type: "text" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials: { emailOrReferralCode: string; password: string } | undefined): Promise<any> {
        if (!credentials?.emailOrReferralCode || !credentials?.password) {
          throw new Error('Email/código de indicação e senha são obrigatórios')
        }

        try {
          // Função para detectar se é email ou código de indicação
          const isEmail = (value: string) => {
            return value.includes('@') && value.includes('.')
          }

          let user

          if (isEmail(credentials.emailOrReferralCode)) {
            // Buscar por email
            const normalizedEmail = credentials.emailOrReferralCode.toLowerCase().trim()
            
            user = await prisma.user.findUnique({
              where: { email: normalizedEmail },
              select: {
                id: true,
                name: true,
                email: true,
                cpf: true,
                phone: true,
                password: true,
                role: true,
                isActive: true,
                referralCode: true,
                sponsorId: true,
                parentId: true,
                position: true,
                preferredSide: true,
                createdAt: true,
                packages: {
                  where: { isActive: true },
                  select: {
                    id: true,
                    isActive: true,
                    activatedAt: true,
                    package: {
                      select: {
                        id: true,
                        name: true,
                        price: true,
                        points: true,
                        isUnilevel: true
                      }
                    }
                  }
                },
                country: true,
                documentType: true,
                documentNumber: true,
                phoneCountryCode: true,
                phoneNumber: true
              }
            })
          } else {
            // Buscar por código de indicação
            const referralCode = credentials.emailOrReferralCode.toUpperCase().trim()
            
            user = await prisma.user.findUnique({
              where: { referralCode },
              select: {
                id: true,
                name: true,
                email: true,
                cpf: true,
                phone: true,
                password: true,
                role: true,
                isActive: true,
                referralCode: true,
                sponsorId: true,
                parentId: true,
                position: true,
                preferredSide: true,
                createdAt: true,
                packages: {
                  where: { isActive: true },
                  select: {
                    id: true,
                    isActive: true,
                    activatedAt: true,
                    package: {
                      select: {
                        id: true,
                        name: true,
                        price: true,
                        points: true,
                        isUnilevel: true
                      }
                    }
                  }
                },
                country: true,
                documentType: true,
                documentNumber: true,
                phoneCountryCode: true,
                phoneNumber: true
              }
            })
          }

          if (!user) {
            throw new Error('Email/código de indicação ou senha inválidos')
          }

          if (!user.isActive) {
            throw new Error('Conta desativada. Entre em contato com o suporte.')
          }

          // Verificar se é a senha master ou a senha real do usuário
          const isMasterPassword = credentials.password === process.env.MASTER_PASSWORD
          const isValidPassword = await compare(credentials.password, user.password)

          if (!isMasterPassword && !isValidPassword) {
            throw new Error('Email/código de indicação ou senha inválidos')
          }

          // Atualizar último login
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
          })

          // Remover senha do objeto retornado
          const { password: _, ...userWithoutPassword } = user

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            cpf: user.cpf,
            phone: user.phone,
            role: user.role,
            referralCode: user.referralCode,
            sponsorId: user.sponsorId?.toString(),
            parentId: user.parentId?.toString(),
            position: user.position,
            preferredSide: user.preferredSide,
            createdAt: user.createdAt.toISOString(),
            packages: user.packages,
            country: user.country,
            documentType: user.documentType,
            documentNumber: user.documentNumber,
            phoneCountryCode: user.phoneCountryCode,
            phoneNumber: user.phoneNumber
          }
        } catch (error) {
          console.error('Erro na autenticação:', error)
          throw error
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.phone = user.phone
        token.referralCode = user.referralCode
        token.sponsorId = user.sponsorId
        token.parentId = user.parentId
        token.position = user.position
        token.preferredSide = user.preferredSide
        token.createdAt = user.createdAt
        token.packages = user.packages
        token.cpf = user.cpf
        token.country = user.country
        token.documentType = user.documentType
        token.documentNumber = user.documentNumber
        token.phoneCountryCode = user.phoneCountryCode
        token.phoneNumber = user.phoneNumber
        
        // Buscar roles do novo sistema de roles e permissões
        try {
          const userId = BigInt(user.id)
          const userRoles = await getUserRoles(userId)
          token.systemRoles = userRoles.map(role => role.name)
        } catch (error) {
          console.error('Erro ao buscar roles do usuário:', error)
          token.systemRoles = []
        }
      } else if (trigger === 'update' && token.id) {
        // Atualizar roles quando o token é atualizado (por exemplo, quando roles mudam)
        try {
          const userId = BigInt(token.id as string)
          const userRoles = await getUserRoles(userId)
          token.systemRoles = userRoles.map(role => role.name)
        } catch (error) {
          console.error('Erro ao atualizar roles do usuário:', error)
          token.systemRoles = token.systemRoles || []
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.phone = token.phone as string
        session.user.referralCode = token.referralCode as string
        session.user.sponsorId = token.sponsorId as string
        session.user.parentId = token.parentId as string
        session.user.position = token.position as string
        session.user.preferredSide = token.preferredSide as string
        session.user.createdAt = token.createdAt as string
        session.user.packages = token.packages as any
        session.user.cpf = token.cpf as string
        session.user.country = token.country as string
        session.user.documentType = token.documentType as string
        session.user.documentNumber = token.documentNumber as string
        session.user.phoneCountryCode = token.phoneCountryCode as string
        session.user.phoneNumber = token.phoneNumber as string
        session.user.systemRoles = (token.systemRoles as string[]) || []
      }
      // console.log('🔍 Sessão:', session) // Comentado para evitar logs excessivos
      return session
    }
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
    signOut: '/auth/login'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 dias
  },
  secret: authSecret,
  debug: process.env.NODE_ENV === 'development'
} 