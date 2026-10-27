import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getUserFinancialData } from '@/lib/business-logic'
import { serializeBigInt } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 API /api/auth/login chamada')
    
    const { emailOrReferralCode, password } = await request.json()
    
    if (!emailOrReferralCode || !password) {
      return NextResponse.json({ error: 'Email/código de indicação e senha são obrigatórios' }, { status: 400 })
    }

    console.log('📧 Tentativa de login para:', emailOrReferralCode)

    // Função para detectar se é email ou código de indicação
    const isEmail = (value: string) => {
      return value.includes('@') && value.includes('.')
    }

    let user

    if (isEmail(emailOrReferralCode)) {
      // Buscar por email
      const normalizedEmail = emailOrReferralCode.toLowerCase().trim()
      console.log('🔍 Buscando usuário por email:', normalizedEmail)
      
      user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          emailVerified: true,
          sponsorId: true,
          parentId: true,
          position: true,
          createdAt: true,
          packages: {
            include: {
              package: true
            }
          }
        }
      })
    } else {
      // Buscar por código de indicação
      const referralCode = emailOrReferralCode.toUpperCase().trim()
      console.log('🔍 Buscando usuário por código de indicação:', referralCode)
      
      user = await prisma.user.findUnique({
        where: { referralCode },
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          emailVerified: true,
          sponsorId: true,
          parentId: true,
          position: true,
          createdAt: true,
          packages: {
            include: {
              package: true
            }
          }
        }
      })
    }

    if (!user) {
      console.log('❌ Usuário não encontrado para:', emailOrReferralCode)
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    console.log('✅ Usuário encontrado:', user.name, 'ID:', Number(user.id))

    // Verificar se o email foi confirmado
    if (!user.emailVerified) {
      console.log('❌ Email não confirmado para usuário:', user.email)
      return NextResponse.json({ 
        error: 'Por favor, confirme seu email antes de fazer login. Verifique sua caixa de entrada.' 
      }, { status: 401 })
    }

    // Calcular dados financeiros dinamicamente
    const financialData = await getUserFinancialData(user.id)
    console.log('💰 Dados financeiros calculados - Balance:', Number(financialData.balance), 'TotalEarned:', Number(financialData.totalEarned))

    // Verificar senha
    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      console.log('❌ Senha incorreta para usuário:', user.email)
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    console.log('✅ Senha correta, gerando token JWT')

    // Gerar token JWT
    const token = jwt.sign(
      { userId: user.id.toString() },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    console.log('🎫 Token gerado com sucesso para userId:', user.id.toString())
    console.log('🎫 Token:', `${token.substring(0, 20)}...`)

    // Remover senha da resposta
    const { password: _, ...userWithoutPassword } = user

    console.log('🚀 Login bem-sucedido, retornando dados')
    
    // Preparar dados do usuário com dados financeiros
    const userWithFinancialData = {
      ...userWithoutPassword,
      balance: financialData.balance,
      totalEarned: financialData.totalEarned
    }
    
    return NextResponse.json({
      success: true,
      user: serializeBigInt(userWithFinancialData),
      token
    })

  } catch (error) {
    console.error('❌ Erro no login:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
} 