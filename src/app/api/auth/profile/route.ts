import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { DocumentType } from '@/generated/prisma'

// Schema de validação para atualização do perfil
const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: z.string().email('Email inválido'),
  country: z.string().length(2).optional(),
  documentType: z.nativeEnum(DocumentType).optional(),
  documentNumber: z.string().optional(),
  phoneCountryCode: z.string().optional(),
  phoneNumber: z.string().optional()
})

export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 Iniciando requisição PUT para /api/auth/profile')
    
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
    console.log('📝 Dados recebidos:', body)
    
    const validationResult = updateProfileSchema.safeParse(body)
    console.log('✅ Validação:', validationResult.success)
    
    if (!validationResult.success) {
      console.log('❌ Erros de validação:', validationResult.error.issues)
      return NextResponse.json(
        { message: 'Dados inválidos', errors: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { name, email, country, documentType, documentNumber, phoneCountryCode, phoneNumber } = validationResult.data
    console.log('📋 Dados validados:', { name, email, country, documentType, phoneCountryCode })

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

    // Não há mais verificação de senha nesta API

    // Normalizar email (converter para minúsculas e remover espaços)
    const normalizedEmail = email.toLowerCase().trim()

    // Verificar se o email já está em uso por outro usuário
    if (normalizedEmail !== currentUser.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      })
      
      if (existingUser && existingUser.id !== currentUser.id) {
        return NextResponse.json(
          { message: 'Este email já está em uso' },
          { status: 400 }
        )
      }
    }

    // Preparar dados para atualização
    const updateData: any = {
      name,
      email: normalizedEmail,
      updatedAt: new Date()
    }

    // Adicionar campos internacionais se fornecidos
    if (country) updateData.country = country
    if (documentType) updateData.documentType = documentType
    if (documentNumber) updateData.documentNumber = documentNumber
    if (phoneCountryCode) updateData.phoneCountryCode = phoneCountryCode
    if (phoneNumber) {
      updateData.phoneNumber = phoneNumber
      // Manter phone para compatibilidade
      updateData.phone = `${phoneCountryCode || ''} ${phoneNumber}`
    }

    // Atualizar usuário
    const updatedUser = await prisma.user.update({
      where: { id: BigInt(session.user.id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        country: true,
        documentType: true,
        documentNumber: true,
        phoneCountryCode: true,
        phoneNumber: true,
        role: true,
        referralCode: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      message: 'Perfil atualizado com sucesso',
      user: updatedUser
    })

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 