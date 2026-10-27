import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addUserToClube300 } from '@/lib/clube300-service'
import * as jwt from 'jsonwebtoken'

interface EligibleUser {
  id: bigint
  name: string
  email: string
  packages: Array<{
    id: bigint
    minerId: bigint | null
    package: {
      id: bigint
      name: string
      price: any
    }
    isActive: boolean
    createdAt: Date
  }>
}

interface AddEligibleUsersResult {
  success: boolean
  eligibleUsers: number
  addedUsers: number
  alreadyMembers: number
  errors: string[]
  details: Array<{
    userId: bigint
    userName: string
    packageName: string
    packagePrice: number
    status: 'added' | 'already_member' | 'error'
    error?: string
  }>
  clubeStats: {
    totalMembers: number
    availableSlots: number
    minerId?: number
  }
}

async function getAuthUser(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user) return session.user

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      const userFromToken = await prisma.user.findUnique({
        where: { id: BigInt(decoded.userId) },
        select: { id: true, email: true, name: true, role: true }
      })
      if (userFromToken) {
        return {
          id: userFromToken.id.toString(),
          email: userFromToken.email,
          name: userFromToken.name,
          role: userFromToken.role
        }
      }
    } catch {
      // token inválido
    }
  }
  return null
}

/**
 * POST /api/admin/clube300/add-eligible-users
 * Busca e adiciona usuários elegíveis ao Clube dos 300 de uma mineradora
 * Body: { minerId: number } — mineradora alvo (obrigatório)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem executar esta ação.' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const minerIdRaw = body?.minerId
    const minerId: bigint | undefined = minerIdRaw ? BigInt(minerIdRaw) : undefined

    console.log(`🏆 Iniciando busca de usuários elegíveis para o Clube dos 300${minerId ? ` da mineradora ${Number(minerId)}` : ''}...`)

    // Buscar usuários com pacotes elegíveis para o Clube dos 300
    const eligibleUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        packages: {
          some: {
            isActive: true,
            isUnilevel: true,
            ...(minerId ? { minerId } : {}),
            package: {
              clube300Eligible: true
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        packages: {
          where: {
            isActive: true,
            isUnilevel: true,
            ...(minerId ? { minerId } : {}),
            package: {
              clube300Eligible: true
            }
          },
          include: {
            package: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    }) as EligibleUser[]

    console.log(`📊 Encontrados ${eligibleUsers.length} usuários elegíveis`)

    const clubeStats = await prisma.clube300Member.aggregate({
      where: { isActive: true, ...(minerId ? { minerId } : {}) },
      _count: { id: true }
    })

    const currentMembersCount = clubeStats._count.id
    const availableSlots = 300 - currentMembersCount

    console.log(`📈 Clube: ${currentMembersCount} membros, ${availableSlots} vagas disponíveis`)

    const result: AddEligibleUsersResult = {
      success: false,
      eligibleUsers: eligibleUsers.length,
      addedUsers: 0,
      alreadyMembers: 0,
      errors: [],
      details: [],
      clubeStats: {
        totalMembers: currentMembersCount,
        availableSlots,
        ...(minerId ? { minerId: Number(minerId) } : {})
      }
    }

    if (availableSlots <= 0) {
      result.errors.push(`Clube dos 300${minerId ? ` da mineradora ${Number(minerId)}` : ''} está lotado (300 membros)`)
      result.success = false
      return NextResponse.json(result, { status: 400 })
    }

    for (const eligibleUser of eligibleUsers) {
      try {
        // Selecionar o pacote de maior valor para o clube
        const packagesByPrice = eligibleUser.packages.sort(
          (a, b) => Number(b.package.price) - Number(a.package.price)
        )
        const selectedUserPackage = packagesByPrice[0]
        const packagePrice = Number(selectedUserPackage.package.price)
        const packageName = selectedUserPackage.package.name
        const packageMinerId = selectedUserPackage.minerId ?? minerId

        if (!packageMinerId) {
          result.errors.push(`Usuário ${eligibleUser.name}: minerId não disponível para o pacote`)
          result.details.push({
            userId: eligibleUser.id,
            userName: eligibleUser.name,
            packageName,
            packagePrice,
            status: 'error',
            error: 'minerId não disponível'
          })
          continue
        }

        console.log(`🔍 Processando ${eligibleUser.name} (${eligibleUser.email}) - ${packageName} (R$ ${packagePrice}) - mineradora ${Number(packageMinerId)}`)

        const added = await addUserToClube300(eligibleUser.id, selectedUserPackage.package.id, packageMinerId)

        if (added) {
          const memberCheck = await prisma.clube300Member.findFirst({
            where: { userId: eligibleUser.id, minerId: packageMinerId }
          })

          if (memberCheck?.isActive) {
            result.addedUsers++
            result.details.push({
              userId: eligibleUser.id,
              userName: eligibleUser.name,
              packageName,
              packagePrice,
              status: 'added'
            })
            console.log(`✅ ${eligibleUser.name} adicionado ao Clube dos 300`)
          } else {
            result.alreadyMembers++
            result.details.push({
              userId: eligibleUser.id,
              userName: eligibleUser.name,
              packageName,
              packagePrice,
              status: 'already_member'
            })
          }
        } else {
          const existingMember = await prisma.clube300Member.findFirst({
            where: { userId: eligibleUser.id, minerId: packageMinerId }
          })

          if (existingMember?.isActive) {
            result.alreadyMembers++
            result.details.push({
              userId: eligibleUser.id,
              userName: eligibleUser.name,
              packageName,
              packagePrice,
              status: 'already_member'
            })
            console.log(`ℹ️ ${eligibleUser.name} já era membro`)
          } else {
            const errorMsg = `Falha ao adicionar usuário ${eligibleUser.name}`
            result.errors.push(errorMsg)
            result.details.push({
              userId: eligibleUser.id,
              userName: eligibleUser.name,
              packageName,
              packagePrice,
              status: 'error',
              error: errorMsg
            })
            console.log(`❌ ${errorMsg}`)
          }
        }

        // Verificar vagas a cada 10 processados
        if ((result.addedUsers + result.alreadyMembers) % 10 === 0) {
          const updatedStats = await prisma.clube300Member.aggregate({
            where: { isActive: true, ...(minerId ? { minerId } : {}) },
            _count: { id: true }
          })
          result.clubeStats.totalMembers = updatedStats._count.id
          result.clubeStats.availableSlots = 300 - updatedStats._count.id

          if (result.clubeStats.availableSlots <= 0) {
            result.errors.push('Clube dos 300 lotou durante o processamento')
            break
          }
        }

      } catch (error) {
        const errorMsg = `Erro ao processar usuário ${eligibleUser.name}: ${error}`
        console.error(errorMsg)
        result.errors.push(errorMsg)
        result.details.push({
          userId: eligibleUser.id,
          userName: eligibleUser.name,
          packageName: eligibleUser.packages[0]?.package.name || 'Desconhecido',
          packagePrice: Number(eligibleUser.packages[0]?.package.price || 0),
          status: 'error',
          error: errorMsg
        })
      }
    }

    const finalStats = await prisma.clube300Member.aggregate({
      where: { isActive: true, ...(minerId ? { minerId } : {}) },
      _count: { id: true }
    })
    result.clubeStats.totalMembers = finalStats._count.id
    result.clubeStats.availableSlots = 300 - finalStats._count.id

    result.success = result.errors.length === 0 || result.addedUsers > 0

    console.log(`🎯 Concluído: ${result.addedUsers} adicionados, ${result.alreadyMembers} já membros, ${result.errors.length} erros`)

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Erro geral no endpoint de adição ao Clube dos 300:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/clube300/add-eligible-users
 * Lista usuários elegíveis sem adicionar ao clube
 * Query params: minerId=<id> (opcional)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem executar esta ação.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const minerIdParam = searchParams.get('minerId')
    const minerId: bigint | undefined = minerIdParam ? BigInt(minerIdParam) : undefined

    const eligibleUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        packages: {
          some: {
            isActive: true,
            isUnilevel: true,
            ...(minerId ? { minerId } : {}),
            package: {
              clube300Eligible: true
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        packages: {
          where: {
            isActive: true,
            isUnilevel: true,
            ...(minerId ? { minerId } : {}),
            package: {
              clube300Eligible: true
            }
          },
          include: {
            package: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    const userIds = eligibleUsers.map(u => u.id)
    const existingMembers = await prisma.clube300Member.findMany({
      where: {
        userId: { in: userIds },
        isActive: true,
        ...(minerId ? { minerId } : {})
      },
      select: { userId: true }
    })

    const existingMemberIds = new Set(existingMembers.map(m => m.userId))

    const clubeStats = await prisma.clube300Member.aggregate({
      where: { isActive: true, ...(minerId ? { minerId } : {}) },
      _count: { id: true }
    })

    const result = {
      eligibleUsers: eligibleUsers.length,
      alreadyMembers: existingMembers.length,
      newEligibleUsers: eligibleUsers.length - existingMembers.length,
      clubeStats: {
        totalMembers: clubeStats._count.id,
        availableSlots: 300 - clubeStats._count.id,
        ...(minerId ? { minerId: Number(minerId) } : {})
      },
      users: eligibleUsers.map(u => {
        const packagesByPrice = u.packages.sort((a, b) => Number(b.package.price) - Number(a.package.price))
        const selectedPackage = packagesByPrice[0]?.package
        
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          createdAt: u.createdAt,
          package: selectedPackage,
          isClubeMember: existingMemberIds.has(u.id)
        }
      })
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Erro ao buscar usuários elegíveis:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
