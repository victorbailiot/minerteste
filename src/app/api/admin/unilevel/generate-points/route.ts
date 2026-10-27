import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

// Schema de validação para o endpoint
const generatePointsSchema = z.object({
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
        const { dryRun } = generatePointsSchema.parse(body)

        console.log(`🚀 Iniciando geração de pontuação unilevel (dryRun: ${dryRun})`)

        // 1. Buscar apenas usuários que já têm registro unilevel
        const users = await prisma.user.findMany({
            where: {
                isActive: true,
                unilevelUser: {
                    isNot: null
                }
            },
            include: {
                packages: {
                    where: {
                        isActive: true
                    },
                    include: {
                        package: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        console.log(JSON.stringify(users, null, 2))

        console.log(`📊 Encontrados ${users.length} usuários unilevel`)

        const results = {
            totalUsers: users.length,
            usersProcessed: 0,
            usersUpdated: 0,
            errors: [] as string[],
            details: [] as any[]
        }

        // 2. Processar cada usuário
        for (const user of users) {
            console.log(`📦 Processando usuário ${user.email} (ID: ${user.id})`)
            try {
                results.usersProcessed++

                // Calcular valor dos pacotes do usuário
                const userPackageValue = user.packages.reduce((total, userPackage) => {
                    return total + Number(userPackage.package.price)
                }, 0)

                const userUnilevel = await prisma.unilevelUser.findUnique({
                    where: { userId: user.id }
                })

                console.log(`📦 Usuário ${user.id}: ${userPackageValue} pontos dos pacotes`)

                if (dryRun) {
                    // Modo de teste - apenas simular
                    results.details.push({
                        userId: user.id,
                        email: user.email,
                        name: user.name,
                        status: 'Simulado',
                        packageValue: userPackageValue,
                        currentTotalPoints: userUnilevel!.totalPoints || 0,
                        newTotalPoints: userPackageValue
                    })
                } else {
                    let currentSponsorId = user.sponsorId

                    await prisma.unilevelUser.update({
                        where: { id: userUnilevel!.id },
                        data: {
                            totalPoints: userUnilevel!.totalPoints + userPackageValue,
                            careerLevelId: null // Explicitly set to null as per request
                        }
                    })

                    console.log(`📦 Usuário ${user.id}: ${userUnilevel!.totalPoints + userPackageValue} somando com os pacotes`)

                    // Subir a linha ascendente somando totalPoints + valor dos pacotes de cada patrocinador
                    while (currentSponsorId) {
                        const sponsor = await prisma.unilevelUser.findUnique({
                            where: { userId: currentSponsorId },
                            include: {
                                user: {
                                    include: {
                                        packages: true
                                    }
                                }
                            }
                        })

                        if (sponsor) {
                            console.log(`   📈 Sponsor ${sponsor.user.id}: (${sponsor.totalPoints} + R$ ${userPackageValue})`)
                            // Total do patrocinador = totalPoints + valor dos pacotes
                            const sponsorTotal = sponsor.totalPoints + userPackageValue

                            
                            
                            // Atualizar usuário unilevel
                            await prisma.unilevelUser.update({
                                where: { id: sponsor.id },
                                data: {
                                    totalPoints: sponsorTotal,
                                    careerLevelId: null // Explicitly set to null as per request
                                }
                            })
                            console.log(`   📈 Sponsor ${sponsor.user.id} totalPoints: ${sponsorTotal}`)
                            // Próximo sponsor na linha ascendente
                            currentSponsorId = sponsor.sponsorId
                        } else {
                            break
                        }
                    }

                    /*
                    results.usersUpdated++
                    results.details.push({
                        userId: user.id,
                        email: user.email,
                        name: user.name,
                        status: 'Atualizado',
                        packageValue: userPackageValue
                    })
                    */
                }
            } catch (error) {
                const errorMessage = `Erro ao processar usuário ${user.email}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
                console.error(errorMessage)
                results.errors.push(errorMessage)
                results.details.push({
                    userId: user.id,
                    email: user.email,
                    name: user.name,
                    status: 'Erro',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                })
            }
        }

        // 3. Log final
        console.log(`📈 Resumo da geração de pontos:`)
        console.log(`   - Total de usuários: ${results.totalUsers}`)
        console.log(`   - Processados: ${results.usersProcessed}`)
        console.log(`   - Atualizados: ${results.usersUpdated}`)
        console.log(`   - Erros: ${results.errors.length}`)

        if (dryRun) {
            console.log(`🔍 Modo de teste ativado - nenhuma alteração foi feita no banco de dados`)
        } else {
            console.log(`✅ Geração de pontos concluída com sucesso!`)
        }

        return NextResponse.json({
            success: true,
            message: dryRun
                ? 'Simulação de geração de pontos concluída'
                : 'Geração de pontos unilevel concluída com sucesso',
            dryRun,
            results
        })

    } catch (error) {
        console.error('❌ Erro durante a geração de pontos:', error)

        return NextResponse.json(
            {
                error: 'Erro interno do servidor',
                details: error instanceof Error ? error.message : 'Erro desconhecido'
            },
            { status: 500 }
        )
    }
}

// Endpoint GET para verificar status dos pontos
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

        // Estatísticas dos pontos
        const stats = await prisma.$transaction([
            // Total de usuários unilevel
            prisma.unilevelUser.count({
                where: { isActive: true }
            }),
            // Usuários com pontos > 0
            prisma.unilevelUser.count({
                where: {
                    isActive: true,
                    totalPoints: { gt: 0 }
                }
            }),
            // Usuários com nível de carreira
            prisma.unilevelUser.count({
                where: {
                    isActive: true,
                    careerLevelId: { not: null }
                }
            }),
            // Média de pontos
            prisma.unilevelUser.aggregate({
                where: { isActive: true },
                _avg: { totalPoints: true }
            })
        ])

        const [totalUsers, usersWithPoints, usersWithCareer, avgPoints] = stats

        return NextResponse.json({
            success: true,
            pointsStatus: {
                totalUsers,
                usersWithPoints,
                usersWithCareer,
                averagePoints: avgPoints._avg.totalPoints || 0,
                pointsProgress: totalUsers > 0 ? Math.round((usersWithPoints / totalUsers) * 100) : 0
            }
        })

    } catch (error) {
        console.error('❌ Erro ao verificar status dos pontos:', error)

        return NextResponse.json(
            {
                error: 'Erro interno do servidor',
                details: error instanceof Error ? error.message : 'Erro desconhecido'
            },
            { status: 500 }
        )
    }
}
