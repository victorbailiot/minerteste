/**
 * API para gerenciamento do Clube dos 300
 * Endpoints para estatísticas, adição e remoção de membros
 * Suporte multi-mineradora: filtrar por minerId via query param ou body
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  getClube300Stats,
  addUserToClube300,
  removeUserFromClube300,
  getClube300Members 
} from '@/lib/clube300-service'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/clube300
 * Retorna estatísticas do Clube dos 300
 * Query params:
 *   action=members — lista membros (admin only)
 *   minerId=<id>  — filtra por mineradora (opcional)
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

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const minerIdParam = searchParams.get('minerId')
    const minerId = minerIdParam ? BigInt(minerIdParam) : undefined

    if (action === 'members') {
      const user = await prisma.user.findUnique({
        where: { id: BigInt(session.user.id) },
        select: { role: true }
      })

      if (user?.role !== 'ADMIN') {
        return NextResponse.json({ 
          success: false, 
          message: 'Acesso restrito a administradores' 
        }, { status: 403 })
      }

      const members = await getClube300Members(minerId)
      
      return NextResponse.json({
        success: true,
        members: members.map(member => ({
          id: member.id.toString(),
          userId: member.userId.toString(),
          userPackageId: member.userPackageId.toString(),
          minerId: member.minerId.toString(),
          memberNumber: member.memberNumber,
          name: member.user.name,
          email: member.user.email,
          packageName: member.userPackage.package.name,
          packagePrice: member.userPackage.package.price.toNumber(),
          cotas: member.cotas,
          joinedAt: member.createdAt,
          isActive: member.isActive
        }))
      })
    }

    const stats = await getClube300Stats(minerId)
    
    return NextResponse.json({
      success: true,
      stats: {
        totalMembers: stats.totalMembers,
        availableSlots: stats.availableSlots,
        nucleoMembers: stats.nucleoMembers,
        tectonMembers: stats.tectonMembers,
        totalCotas: stats.totalCotas,
        todayTotalCashback: stats.todayTotalCashback.toNumber(),
        businessDaysThisMonth: stats.businessDaysThisMonth
      }
    })

  } catch (error) {
    console.error('Erro ao obter dados do Clube 300:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor'
    }, { status: 500 })
  }
}

/**
 * POST /api/clube300
 * Adiciona um usuário ao Clube dos 300 de uma mineradora
 * Body: { userId, packageId, minerId }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        message: 'Não autorizado' 
      }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: BigInt(session.user.id) },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ 
        success: false, 
        message: 'Acesso restrito a administradores' 
      }, { status: 403 })
    }

    const { userId, packageId, minerId } = await request.json()

    if (!userId || !packageId || !minerId) {
      return NextResponse.json({
        success: false,
        message: 'userId, packageId e minerId são obrigatórios'
      }, { status: 400 })
    }

    const success = await addUserToClube300(BigInt(userId), BigInt(packageId), BigInt(minerId))

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Usuário adicionado ao Clube dos 300 com sucesso'
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Não foi possível adicionar o usuário ao Clube dos 300'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Erro ao adicionar usuário ao Clube 300:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/clube300
 * Remove um usuário do Clube dos 300 de uma mineradora específica
 * Body: { userId, minerId }
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        message: 'Não autorizado' 
      }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: BigInt(session.user.id) },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ 
        success: false, 
        message: 'Acesso restrito a administradores' 
      }, { status: 403 })
    }

    const { userId, minerId } = await request.json()

    if (!userId || !minerId) {
      return NextResponse.json({
        success: false,
        message: 'userId e minerId são obrigatórios'
      }, { status: 400 })
    }

    const success = await removeUserFromClube300(BigInt(userId), BigInt(minerId))

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Usuário removido do Clube dos 300 com sucesso'
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Não foi possível remover o usuário do Clube dos 300'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Erro ao remover usuário do Clube 300:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
