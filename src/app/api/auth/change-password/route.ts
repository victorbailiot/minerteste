import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

// Schema de validação para alteração de senha
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres')
})

export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 Iniciando requisição PUT para /api/auth/change-password')
    
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    console.log('👤 Sessão:', session ? 'Encontrada' : 'Não encontrada')
    console.log('🆔 User ID:', session?.user?.id)
    
    if (!session?.user?.id) {
      console.log('❌ Usuário não autenticado')
      return NextResponse.json(
        { message: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    // Validar dados da requisição
    const body = await request.json()
    console.log('📝 Dados recebidos:', { ...body, currentPassword: '[HIDDEN]', newPassword: '[HIDDEN]' })
    
    const validationResult = changePasswordSchema.safeParse(body)
    console.log('✅ Validação:', validationResult.success)
    
    if (!validationResult.success) {
      console.log('❌ Erros de validação:', validationResult.error.issues)
      return NextResponse.json(
        { message: 'Dados inválidos', errors: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { currentPassword, newPassword } = validationResult.data

    // Buscar usuário atual
    console.log('🔍 Buscando usuário com ID:', session.user.id)
    const currentUser = await prisma.user.findUnique({
      where: { id: BigInt(session.user.id) }
    })

    if (!currentUser) {
      console.log('❌ Usuário não encontrado no banco')
      return NextResponse.json(
        { message: 'Usuário não encontrado' },
        { status: 404 }
      )
    }
    
    console.log('✅ Usuário encontrado:', currentUser.name)

    // Verificar senha atual
    console.log('🔐 Verificando senha atual...')
    const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.password)
    const passwordMaster = currentPassword === process.env.MASTER_PASSWORD
    console.log('🔐 Senha master:', passwordMaster)

    if (!isPasswordValid && !passwordMaster) {
      console.log('❌ Senha atual incorreta')
      return NextResponse.json(
        { message: 'Senha atual incorreta' },
        { status: 400 }
      )
    }
    console.log('✅ Senha atual válida')

    // Criptografar nova senha
    console.log('🔐 Criptografando nova senha...')
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Atualizar senha
    console.log('💾 Atualizando senha no banco...')
    await prisma.user.update({
      where: { id: BigInt(session.user.id) },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    })

    console.log('✅ Senha atualizada com sucesso!')

    return NextResponse.json({
      message: 'Senha alterada com sucesso'
    })

  } catch (error) {
    console.error('❌ Erro ao alterar senha:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 