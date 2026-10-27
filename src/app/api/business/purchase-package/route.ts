import { NextRequest, NextResponse } from 'next/server'
import { processPackagePurchase, validateUserNetworkParticipation } from '@/lib/business-logic'
import { findSpilloverPosition } from '@/lib/spillover'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      userId, 
      packageId, 
      sponsorId, 
      position = 'LEFT' // Posição preferida na árvore binária
    } = body

    if (!userId || !packageId) {
      return NextResponse.json({ 
        success: false, 
        error: 'userId e packageId são obrigatórios' 
      }, { status: 400 })
    }

    // 1. Verificar se o pacote existe e está ativo
    const packageData = await prisma.package.findUnique({
      where: { id: BigInt(packageId) }
    })

    if (!packageData || !packageData.isActive) {
      return NextResponse.json({ 
        success: false, 
        error: 'Pacote não encontrado ou inativo' 
      }, { status: 400 })
    }

    // 2. Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        sponsorId: true
      }
    })

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Usuário não encontrado' 
      }, { status: 400 })
    }

    // 3. Verificar se o usuário já possui este pacote ativo
    const existingPackage = await prisma.userPackage.findFirst({
      where: {
        userId: BigInt(userId),
        packageId: BigInt(packageId),
        isActive: true
      }
    })

    if (existingPackage) {
      return NextResponse.json({ 
        success: false, 
        error: 'Usuário já possui este pacote ativo' 
      }, { status: 400 })
    }

    // 4. Validar sponsor se fornecido
    if (sponsorId && !user.sponsorId) {
      const sponsor = await prisma.user.findUnique({
        where: { id: BigInt(sponsorId) }
      })

      if (!sponsor) {
        return NextResponse.json({ 
          success: false, 
          error: 'Patrocinador não encontrado' 
        }, { status: 400 })
      }

      // Verificar se o patrocinador pode participar da rede (contrato assinado)
      const canParticipate = await validateUserNetworkParticipation(BigInt(sponsorId))
      if (!canParticipate) {
        return NextResponse.json({ 
          success: false, 
          error: 'Patrocinador não possui contrato assinado' 
        }, { status: 400 })
      }
    }

    // 5. Processar a compra do pacote com toda a lógica de negócio
    // Inclui lógica dos 10 primeiros + spillover normal
    await processPackagePurchase(
      BigInt(userId),
      BigInt(packageId),
      packageData.price,
      sponsorId ? BigInt(sponsorId) : undefined
    )

    // 6. Buscar dados atualizados do usuário
    const updatedUser = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        sponsorId: true,
        parentId: true,
        position: true,
        packages: {
          include: {
            package: true
          }
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Pacote adquirido com sucesso',
      data: {
        user: updatedUser,
        package: packageData,
        spilloverInfo: user.sponsorId ? null : await findSpilloverPosition(
          BigInt(sponsorId || userId), 
          position as 'LEFT' | 'RIGHT'
        )
      }
    })

  } catch (error) {
    console.error('Erro ao processar compra de pacote:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
} 