import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import * as jwt from 'jsonwebtoken'

// Schema de validação para o endpoint
const migrationSchema = z.object({
  dryRun: z.boolean().optional().default(false)
})

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação e permissões de admin
    let user: any = null
    
    // Tentar NextAuth session primeiro
    const session = await getServerSession(authOptions)
    if (session?.user) {
      user = session.user
    } else {
      // Tentar JWT token do header Authorization
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
          const userFromToken = await prisma.user.findUnique({
            where: { id: BigInt(decoded.userId) },
            select: {
              id: true,
              email: true,
              name: true,
              role: true
            }
          })
          if (userFromToken) {
            user = {
              id: userFromToken.id.toString(),
              email: userFromToken.email,
              name: userFromToken.name,
              role: userFromToken.role
            }
          }
        } catch (error) {
          console.log('Token JWT inválido:', error)
        }
      }
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem executar esta operação.' },
        { status: 403 }
      )
    }

    // Validar parâmetros da requisição
    const body = await request.json()
    const { dryRun } = migrationSchema.parse(body)

    console.log(`🚀 Iniciando migração binário para unilevel (dryRun: ${dryRun})`)

    // 1. Buscar todos os usuários que têm pacotes ativos
    const allActiveUsers = await prisma.user.findMany({
      where: {
        isActive: true
      },
      include: {
        packages: {
          where: {
            isActive: true
          },
          include: {
            package: true
          }
        },
        unilevelUser: true // Verificar se já existe registro unilevel
      }
    })

    console.log(`📊 Encontrados ${allActiveUsers.length} usuários ativos`)

    const migrationResults = {
      totalUsers: allActiveUsers.length,
      usersToMigrate: 0,
      usersAlreadyMigrated: 0,
      usersMigrated: 0,
      errors: [] as string[],
      details: [] as any[]
    }

    // 2. Processar cada usuário
    for (const currentUser of allActiveUsers) {
      try {
        // Verificar se já existe registro unilevel
        if (currentUser.unilevelUser) {
          migrationResults.usersAlreadyMigrated++
          migrationResults.details.push({
            userId: currentUser.id.toString(),
            email: currentUser.email,
            name: currentUser.name,
            status: 'Já migrado',
            unilevelUserId: currentUser.unilevelUser.id.toString()
          })
          continue
        }

        migrationResults.usersToMigrate++

        if (dryRun) {
          // Modo de teste - apenas simular
          migrationResults.details.push({
            userId: currentUser.id.toString(),
            email: currentUser.email,
            name: currentUser.name,
            status: 'Simulado',
            sponsorId: currentUser.sponsorId?.toString(),
            packages: currentUser.packages.map(p => ({
              id: p.id.toString(),
              packageName: p.package.name,
              isUnilevel: p.isUnilevel
            }))
          })
        } else {
          // Executar migração real
          const unilevelUser = await prisma.unilevelUser.create({
            data: {
              userId: currentUser.id,
              sponsorId: currentUser.sponsorId,
              careerLevelId: null,
              totalPoints: 0,
              teamVolume: 0,
              isActive: true
            }
          })

          migrationResults.usersMigrated++
          migrationResults.details.push({
            userId: currentUser.id.toString(),
            email: currentUser.email,
            name: currentUser.name,
            status: 'Migrado com sucesso',
            unilevelUserId: unilevelUser.id.toString(),
            sponsorId: currentUser.sponsorId?.toString(),
            packages: currentUser.packages.map(p => ({
              id: p.id.toString(),
              packageName: p.package.name,
              isUnilevel: p.isUnilevel
            }))
          })

          console.log(`✅ Usuário ${currentUser.email} migrado para unilevel (ID: ${unilevelUser.id})`)
        }
      } catch (error) {
        const errorMessage = `Erro ao migrar usuário ${currentUser.email}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        console.error(errorMessage)
        migrationResults.errors.push(errorMessage)
        migrationResults.details.push({
          userId: currentUser.id.toString(),
          email: currentUser.email,
          name: currentUser.name,
          status: 'Erro',
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        })
      }
    }

    // 3. Log final
    console.log(`📈 Resumo da migração:`)
    console.log(`   - Total de usuários: ${migrationResults.totalUsers}`)
    console.log(`   - Já migrados: ${migrationResults.usersAlreadyMigrated}`)
    console.log(`   - Para migrar: ${migrationResults.usersToMigrate}`)
    console.log(`   - Migrados com sucesso: ${migrationResults.usersMigrated}`)
    console.log(`   - Erros: ${migrationResults.errors.length}`)

    if (dryRun) {
      console.log(`🔍 Modo de teste ativado - nenhuma alteração foi feita no banco de dados`)
    } else {
      console.log(`✅ Migração concluída com sucesso!`)
    }

    return NextResponse.json({
      success: true,
      message: dryRun 
        ? 'Simulação de migração concluída' 
        : 'Migração binário para unilevel concluída com sucesso',
      dryRun,
      results: migrationResults
    })

  } catch (error) {
    console.error('❌ Erro durante a migração:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// Endpoint GET para verificar status da migração
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação e permissões de admin
    let user: any = null
    
    // Tentar NextAuth session primeiro
    const session = await getServerSession(authOptions)
    if (session?.user) {
      user = session.user
    } else {
      // Tentar JWT token do header Authorization
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
          const userFromToken = await prisma.user.findUnique({
            where: { id: BigInt(decoded.userId) },
            select: {
              id: true,
              email: true,
              name: true,
              role: true
            }
          })
          if (userFromToken) {
            user = {
              id: userFromToken.id.toString(),
              email: userFromToken.email,
              name: userFromToken.name,
              role: userFromToken.role
            }
          }
        } catch (error) {
          console.log('Token JWT inválido:', error)
        }
      }
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar esta informação.' },
        { status: 403 }
      )
    }

    // Estatísticas da migração
    const stats = await prisma.$transaction([
      // Total de usuários com pacotes ativos
      prisma.user.count({
        where: {
          packages: {
            some: {
              isActive: true
            }
          }
        }
      }),
      // Usuários já migrados para unilevel
      prisma.unilevelUser.count(),
      // Usuários com pacotes ativos mas sem registro unilevel
      prisma.user.count({
        where: {
          packages: {
            some: {
              isActive: true
            }
          },
          unilevelUser: null
        }
      })
    ])

    const [totalUsersWithPackages, migratedUsers, pendingUsers] = stats

    return NextResponse.json({
      success: true,
      migrationStatus: {
        totalUsersWithPackages,
        migratedUsers,
        pendingUsers,
        migrationProgress: totalUsersWithPackages > 0 
          ? Math.round((migratedUsers / totalUsersWithPackages) * 100) 
          : 0
      }
    })

  } catch (error) {
    console.error('❌ Erro ao verificar status da migração:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
