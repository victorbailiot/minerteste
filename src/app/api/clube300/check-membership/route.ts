/**
 * API para verificar se o usuário é membro do Clube dos 300
 * Suporte multi-mineradora: retorna memberships em todas as mineradoras
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/clube300/check-membership
 * Verifica se o usuário logado é membro do Clube dos 300
 * Query param opcional: minerId — filtra por mineradora específica
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        message: 'Não autorizado' 
      }, { status: 401 })
    }

    const userId = BigInt(session.user.id)
    const { searchParams } = new URL(request.url)
    const minerIdParam = searchParams.get('minerId')
    const minerId = minerIdParam ? BigInt(minerIdParam) : undefined

    const members = await prisma.clube300Member.findMany({
      where: { 
        userId,
        isActive: true,
        ...(minerId ? { minerId } : {})
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        userPackage: {
          include: {
            package: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        },
        miner: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    if (members.length === 0) {
      return NextResponse.json({
        success: true,
        isMember: false,
        message: 'Usuário não é membro do Clube dos 300'
      })
    }

    // Compatibilidade retroativa: retornar o primeiro membro como principal
    const primaryMember = members[0]

    return NextResponse.json({
      success: true,
      isMember: true,
      member: {
        id: primaryMember.id.toString(),
        memberNumber: primaryMember.memberNumber,
        cotas: primaryMember.cotas,
        minerId: primaryMember.minerId.toString(),
        minerName: primaryMember.miner.name,
        packageType: primaryMember.userPackage.package.name,
        createdAt: primaryMember.createdAt,
        user: {
          id: primaryMember.user.id.toString(),
          name: primaryMember.user.name,
          email: primaryMember.user.email
        },
        package: {
          id: primaryMember.userPackage.package.id.toString(),
          name: primaryMember.userPackage.package.name,
          price: primaryMember.userPackage.package.price.toNumber()
        }
      },
      // Todas as memberships (multi-mineradora)
      memberships: members.map(m => ({
        id: m.id.toString(),
        memberNumber: m.memberNumber,
        cotas: m.cotas,
        minerId: m.minerId.toString(),
        minerName: m.miner.name,
        packageName: m.userPackage.package.name,
        createdAt: m.createdAt
      }))
    })

  } catch (error) {
    console.error('❌ Erro ao verificar membro do Clube 300:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}
