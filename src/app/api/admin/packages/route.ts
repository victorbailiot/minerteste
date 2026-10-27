import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import { z } from 'zod'

// Schema para validação de edição de pacote (sem campos binários)
const updatePackageSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional().nullable(),
  price: z.number().positive('Preço deve ser maior que zero'),
  points: z.number().int().positive('Pontos devem ser um número inteiro positivo'),
  profitSharePercent: z.number().min(0, 'Percentual de lucro deve ser não negativo').max(100, 'Percentual de lucro não pode exceder 100%'),
  percentExtra: z.number().min(0, 'Percentual extra deve ser não negativo').max(100, 'Percentual extra não pode exceder 100%').optional().default(0),
  directBonus: z.number().min(0, 'Bônus direto deve ser não negativo').optional().default(0),
  reactivationAmount: z.number().min(0, 'Valor de reativação deve ser não negativo').optional().default(0),
  reactivationBonus: z.number().min(0, 'Bônus de reativação deve ser não negativo').optional().default(0),
  maxQuantity: z.number().int().min(1, 'Quantidade máxima deve ser pelo menos 1').optional().default(50),
  maxInstallments: z.number().int().min(1, 'Parcelas deve ser pelo menos 1').optional().default(6),
  generatesCouponOnPurchase: z.boolean().optional().default(false),
  visibleOnlyForActiveUsers: z.boolean().optional().default(false),
  clube300Eligible: z.boolean().optional().default(false),
  clube300Cotas: z.number().int().min(0, 'Cotas deve ser não negativo').optional().default(0),
  clube300CashbackPercent: z.number().min(0, 'Cashback deve ser não negativo').max(100).optional().default(0),
  minerIds: z.array(z.number().int().positive()).optional().default([]),
  slug: z.string().optional().nullable(),
  isActive: z.boolean()
})

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'packages.read')) {
      return NextResponse.json({ error: 'Sem permissão para visualizar pacotes' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const includeUserCount = searchParams.get('includeUserCount') === 'true'

    // Buscar todos os pacotes com contagem de usuários ativos
    const packages = await prisma.package.findMany({
      include: {
        ...(includeUserCount ? {
          _count: {
            select: {
              userPackages: {
                where: { isActive: true }
              }
            }
          }
        } : {}),
        packageMiners: {
          include: {
            miner: true
          }
        }
      },
      orderBy: [
        { isActive: 'desc' }, // Primeiro os ativos (true vem antes de false)
        { price: 'asc' }       // Depois ordena por preço do menor para o maior
      ]
    })

    // Formatar resposta
    const formattedPackages = packages.map(pkg => ({
      id: Number(pkg.id),
      name: pkg.name,
      description: pkg.description,
      price: Number(pkg.price),
      points: pkg.points,
      isActive: pkg.isActive,
      isUnilevel: pkg.isUnilevel,
      slug: pkg.slug,
      cycleBonus: Number(pkg.cycleBonus),
      dailyCycles: pkg.dailyCycles,
      totalCycles: pkg.totalCycles,
      profitSharePercent: Number(pkg.profitSharePercent),
      percentExtra: Number(pkg.percentExtra || 0),
      directBonus: Number(pkg.directBonus),
      reactivationAmount: Number(pkg.reactivationAmount),
      reactivationBonus: Number(pkg.reactivationBonus),
      maxQuantity: pkg.maxQuantity,
      maxInstallments: pkg.maxInstallments,
      generatesCouponOnPurchase: pkg.generatesCouponOnPurchase,
      visibleOnlyForActiveUsers: pkg.visibleOnlyForActiveUsers,
      clube300Eligible: pkg.clube300Eligible,
      clube300Cotas: pkg.clube300Cotas,
      clube300CashbackPercent: Number(pkg.clube300CashbackPercent),
      binaryBonusPercent: Number(pkg.binaryBonusPercent),
      binaryBonusDailyLimit: Number(pkg.binaryBonusDailyLimit),
      miners: pkg.packageMiners.map((item) => ({
        id: Number(item.miner.id),
        name: item.miner.name
      })),
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
      ...(includeUserCount && {
        activeUsersCount: (pkg as any)._count?.userPackages || 0
      })
    }))

    return NextResponse.json({
      success: true,
      data: formattedPackages
    })

  } catch (error) {
    console.error('Erro ao buscar pacotes:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: 'Não foi possível buscar os pacotes' 
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'packages.update')) {
      return NextResponse.json({ error: 'Sem permissão para atualizar pacotes' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID do pacote é obrigatório' },
        { status: 400 }
      )
    }

    // Validar dados com Zod
    const validatedData = updatePackageSchema.parse(updateData)

    // Verificar se o pacote existe
    const existingPackage = await prisma.package.findUnique({
      where: { id: BigInt(id) }
    })

    if (!existingPackage) {
      return NextResponse.json(
        { error: 'Pacote não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar pacote (sem alterar campos binários)
    const minerIds = validatedData.minerIds ?? []

    if (minerIds.length > 0) {
      const minersCount = await prisma.miner.count({
        where: {
          id: { in: minerIds.map((minerId) => BigInt(minerId)) }
        }
      })

      if (minersCount !== minerIds.length) {
        return NextResponse.json(
          { error: 'Uma ou mais mineradoras selecionadas são inválidas' },
          { status: 400 }
        )
      }
    }

    const updatedPackage = await prisma.$transaction(async (tx) => {
      const packageUpdated = await tx.package.update({
        where: { id: BigInt(id) },
        data: {
          name: validatedData.name,
          description: validatedData.description ?? null,
          price: validatedData.price,
          points: validatedData.points,
          profitSharePercent: validatedData.profitSharePercent,
          percentExtra: validatedData.percentExtra ?? 0,
          directBonus: validatedData.directBonus ?? 0,
          reactivationAmount: validatedData.reactivationAmount ?? 0,
          reactivationBonus: validatedData.reactivationBonus ?? 0,
          maxQuantity: validatedData.maxQuantity ?? 50,
          maxInstallments: validatedData.maxInstallments ?? 6,
          generatesCouponOnPurchase: validatedData.generatesCouponOnPurchase ?? false,
          visibleOnlyForActiveUsers: validatedData.visibleOnlyForActiveUsers ?? false,
          clube300Eligible: validatedData.clube300Eligible ?? false,
          clube300Cotas: validatedData.clube300Cotas ?? 0,
          clube300CashbackPercent: validatedData.clube300CashbackPercent ?? 0,
          slug: validatedData.slug ?? null,
          isActive: validatedData.isActive,
          updatedAt: new Date()
        }
      })

      await tx.packageMiner.deleteMany({
        where: { packageId: BigInt(id) }
      })

      if (minerIds.length > 0) {
        await tx.packageMiner.createMany({
          data: minerIds.map((minerId) => ({
            packageId: BigInt(id),
            minerId: BigInt(minerId)
          }))
        })
      }

      return packageUpdated
    })

    return NextResponse.json({
      success: true,
      data: {
        id: Number(updatedPackage.id),
        name: updatedPackage.name,
        description: updatedPackage.description,
        price: Number(updatedPackage.price),
        points: updatedPackage.points,
        isActive: updatedPackage.isActive,
        profitSharePercent: Number(updatedPackage.profitSharePercent),
        directBonus: Number(updatedPackage.directBonus),
        reactivationAmount: Number(updatedPackage.reactivationAmount),
        reactivationBonus: Number(updatedPackage.reactivationBonus),
        maxQuantity: updatedPackage.maxQuantity,
        maxInstallments: updatedPackage.maxInstallments,
        generatesCouponOnPurchase: updatedPackage.generatesCouponOnPurchase,
        visibleOnlyForActiveUsers: updatedPackage.visibleOnlyForActiveUsers,
        clube300Eligible: updatedPackage.clube300Eligible,
        clube300Cotas: updatedPackage.clube300Cotas,
        clube300CashbackPercent: Number(updatedPackage.clube300CashbackPercent),
        slug: updatedPackage.slug,
        createdAt: updatedPackage.createdAt,
        updatedAt: updatedPackage.updatedAt
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: error.issues 
        },
        { status: 400 }
      )
    }

    console.error('Erro ao atualizar pacote:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: 'Não foi possível atualizar o pacote' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'packages.create')) {
      return NextResponse.json({ error: 'Sem permissão para criar pacotes' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updatePackageSchema.parse(body)

    if (validatedData.slug) {
      const slugConflict = await prisma.package.findUnique({
        where: { slug: validatedData.slug }
      })
      if (slugConflict) {
        return NextResponse.json(
          { error: `Já existe um pacote com o slug "${validatedData.slug}"` },
          { status: 400 }
        )
      }
    }

    const minerIds = validatedData.minerIds ?? []

    if (minerIds.length > 0) {
      const minersCount = await prisma.miner.count({
        where: { id: { in: minerIds.map((id) => BigInt(id)) } }
      })
      if (minersCount !== minerIds.length) {
        return NextResponse.json(
          { error: 'Uma ou mais mineradoras selecionadas são inválidas' },
          { status: 400 }
        )
      }
    }

    const newPackage = await prisma.$transaction(async (tx) => {
      const created = await tx.package.create({
        data: {
          name: validatedData.name,
          description: validatedData.description ?? null,
          price: validatedData.price,
          points: validatedData.points,
          profitSharePercent: validatedData.profitSharePercent,
          percentExtra: validatedData.percentExtra ?? 0,
          directBonus: validatedData.directBonus ?? 0,
          reactivationAmount: validatedData.reactivationAmount ?? 0,
          reactivationBonus: validatedData.reactivationBonus ?? 0,
          maxQuantity: validatedData.maxQuantity ?? 50,
          maxInstallments: validatedData.maxInstallments ?? 6,
          generatesCouponOnPurchase: validatedData.generatesCouponOnPurchase ?? false,
          visibleOnlyForActiveUsers: validatedData.visibleOnlyForActiveUsers ?? false,
          clube300Eligible: validatedData.clube300Eligible ?? false,
          clube300Cotas: validatedData.clube300Cotas ?? 0,
          clube300CashbackPercent: validatedData.clube300CashbackPercent ?? 0,
          slug: validatedData.slug ?? null,
          isActive: validatedData.isActive,
          isUnilevel: true,
          cycleBonus: 0,
          dailyCycles: 0,
          totalCycles: 0,
          binaryBonusPercent: 0,
          binaryBonusDailyLimit: 0,
        }
      })

      if (minerIds.length > 0) {
        await tx.packageMiner.createMany({
          data: minerIds.map((minerId) => ({
            packageId: created.id,
            minerId: BigInt(minerId)
          }))
        })
      }

      return created
    })

    return NextResponse.json({
      success: true,
      data: {
        id: Number(newPackage.id),
        name: newPackage.name,
        description: newPackage.description,
        price: Number(newPackage.price),
        points: newPackage.points,
        isActive: newPackage.isActive,
        profitSharePercent: Number(newPackage.profitSharePercent),
        directBonus: Number(newPackage.directBonus),
        reactivationAmount: Number(newPackage.reactivationAmount),
        reactivationBonus: Number(newPackage.reactivationBonus),
        maxQuantity: newPackage.maxQuantity,
        maxInstallments: newPackage.maxInstallments,
        generatesCouponOnPurchase: newPackage.generatesCouponOnPurchase,
        visibleOnlyForActiveUsers: newPackage.visibleOnlyForActiveUsers,
        clube300Eligible: newPackage.clube300Eligible,
        clube300Cotas: newPackage.clube300Cotas,
        clube300CashbackPercent: Number(newPackage.clube300CashbackPercent),
        slug: newPackage.slug,
        createdAt: newPackage.createdAt,
        updatedAt: newPackage.updatedAt
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    // Slug duplicado via constraint única do banco
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Já existe um pacote com esse slug' },
        { status: 400 }
      )
    }

    console.error('Erro ao criar pacote:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor', message: 'Não foi possível criar o pacote' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'packages.activate')) {
      return NextResponse.json({ error: 'Sem permissão para ativar/desativar pacotes' }, { status: 403 })
    }

    const body = await request.json()
    const { id, isActive } = body

    if (!id || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'ID do pacote e status são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se o pacote existe
    const existingPackage = await prisma.package.findUnique({
      where: { id: BigInt(id) }
    })

    if (!existingPackage) {
      return NextResponse.json(
        { error: 'Pacote não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar apenas o status
    const updatedPackage = await prisma.package.update({
      where: { id: BigInt(id) },
      data: {
        isActive,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: Number(updatedPackage.id),
        name: updatedPackage.name,
        isActive: updatedPackage.isActive,
        updatedAt: updatedPackage.updatedAt
      }
    })

  } catch (error) {
    console.error('Erro ao alterar status do pacote:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: 'Não foi possível alterar o status do pacote' 
      },
      { status: 500 }
    )
  }
} 