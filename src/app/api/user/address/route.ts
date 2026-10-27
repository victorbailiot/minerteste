import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validatePostalCode } from '@/lib/international-utils'

// Schema de validação para endereço
const addressSchema = z.object({
  street: z.string().min(3, 'Rua deve ter pelo menos 3 caracteres'),
  number: z.string().min(1, 'Número é obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, 'Bairro deve ter pelo menos 2 caracteres'),
  city: z.string().min(2, 'Cidade deve ter pelo menos 2 caracteres'),
  state: z.string().min(2, 'Estado deve ter pelo menos 2 caracteres'),
  postalCode: z.string().min(4, 'CEP/Código postal inválido'),
  country: z.string().length(2, 'Código do país deve ter 2 caracteres'),
  isDefault: z.boolean().optional().default(false),
})

// GET - Listar endereços do usuário
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(session.user.id)

    const addresses = await prisma.address.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    // Serializar BigInt
    const serializedAddresses = addresses.map(addr => ({
      ...addr,
      id: Number(addr.id),
      userId: Number(addr.userId),
    }))

    return NextResponse.json({ success: true, addresses: serializedAddresses })
  } catch (error) {
    console.error('Erro ao listar endereços:', error)
    return NextResponse.json(
      { error: 'Erro ao listar endereços' },
      { status: 500 }
    )
  }
}

// POST - Criar novo endereço
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(session.user.id)
    const body = await request.json()

    // Validar dados
    const validatedData = addressSchema.parse(body)

    // Validar código postal
    if (!validatePostalCode(validatedData.postalCode, validatedData.country)) {
      return NextResponse.json(
        { error: 'Código postal inválido para o país selecionado' },
        { status: 400 }
      )
    }

    // Se este endereço for marcado como padrão, desmarcar outros
    if (validatedData.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      })
    }

    // Se é o primeiro endereço, forçar como padrão
    const existingAddresses = await prisma.address.count({
      where: { userId, isActive: true },
    })

    const newAddress = await prisma.address.create({
      data: {
        ...validatedData,
        userId,
        isDefault: existingAddresses === 0 ? true : validatedData.isDefault,
      },
    })

    // Serializar BigInt
    const serializedAddress = {
      ...newAddress,
      id: Number(newAddress.id),
      userId: Number(newAddress.userId),
    }

    return NextResponse.json({
      success: true,
      message: 'Endereço criado com sucesso',
      address: serializedAddress,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro ao criar endereço:', error)
    return NextResponse.json(
      { error: 'Erro ao criar endereço' },
      { status: 500 }
    )
  }
}






