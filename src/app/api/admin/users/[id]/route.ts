import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFinancialData } from '@/lib/business-logic'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import { logAdminAction } from '@/lib/admin-audit'
import { getAdminPackageInsights } from '@/lib/admin-package-tools'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const currentUserId = BigInt(user.id)
    if (!await hasPermission(currentUserId, 'users.update')) {
      return NextResponse.json({ error: 'Sem permissão para editar usuários' }, { status: 403 })
    }

    const { id } = await params
    const userId = BigInt(id)
    // Restringir edição dos usuários ID 1 e 2 para somente os próprios (1 e 2)
    const protectedIdsForEdit = [BigInt(1), BigInt(2)]
    if (protectedIdsForEdit.includes(userId) && !protectedIdsForEdit.includes(currentUserId)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
    const body = await request.json()
    const { isActive, role, name, email, cpf, phone, country, documentType, documentNumber, phoneCountryCode, phoneNumber } = body

    // Verificar se o usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado'
      }, { status: 404 })
    }

    // Preparar dados para atualização
    const updateData: any = {}
    
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive
    }
    
    if (role && ['USER', 'ADMIN'].includes(role)) {
      updateData.role = role
    }

    // Validações para campos de edição de perfil
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return NextResponse.json({
          success: false,
          error: 'Nome deve ter pelo menos 2 caracteres'
        }, { status: 400 })
      }
      updateData.name = name.trim()
    }

    if (email !== undefined) {
      if (typeof email !== 'string' || !email.includes('@')) {
        return NextResponse.json({
          success: false,
          error: 'Email inválido'
        }, { status: 400 })
      }

      // Verificar se o email já está em uso por outro usuário
      const emailExists = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          id: {
            not: userId
          }
        }
      })

      if (emailExists) {
        return NextResponse.json({
          success: false,
          error: 'Este email já está em uso por outro usuário'
        }, { status: 400 })
      }

      updateData.email = email.toLowerCase()
    }

    if (cpf !== undefined) {
      // Remover formatação do CPF
      const cleanCpf = cpf ? cpf.replace(/\D/g, '') : null
      
      if (cleanCpf && cleanCpf.length !== 11) {
        return NextResponse.json({
          success: false,
          error: 'CPF inválido'
        }, { status: 400 })
      }

      // Verificar se o CPF já está em uso por outro usuário
      if (cleanCpf) {
        const cpfExists = await prisma.user.findFirst({
          where: {
            cpf: cleanCpf,
            id: {
              not: userId
            }
          }
        })

        if (cpfExists) {
          return NextResponse.json({
            success: false,
            error: 'Este CPF já está em uso por outro usuário'
          }, { status: 400 })
        }
      }

      updateData.cpf = cleanCpf
    }

    if (phone !== undefined) {
      // Remover formatação do telefone
      const cleanPhone = phone ? phone.replace(/\D/g, '') : null
      
      if (cleanPhone && (cleanPhone.length < 10 || cleanPhone.length > 11)) {
        return NextResponse.json({
          success: false,
          error: 'Telefone inválido'
        }, { status: 400 })
      }

      updateData.phone = cleanPhone
    }

    // Campos internacionais
    if (country !== undefined) {
      updateData.country = country
    }

    if (documentType !== undefined) {
      updateData.documentType = documentType
    }

    if (documentNumber !== undefined) {
      const cleanDocumentNumber = documentNumber ? documentNumber.replace(/\D/g, '') : null
      
      // Verificar se o documento já está em uso por outro usuário
      if (cleanDocumentNumber && documentType) {
        const documentExists = await prisma.user.findFirst({
          where: {
            documentType: documentType,
            documentNumber: cleanDocumentNumber,
            id: {
              not: userId
            }
          }
        })

        if (documentExists) {
          return NextResponse.json({
            success: false,
            error: 'Este documento já está em uso por outro usuário'
          }, { status: 400 })
        }
      }
      
      updateData.documentNumber = cleanDocumentNumber
    }

    if (phoneCountryCode !== undefined) {
      updateData.phoneCountryCode = phoneCountryCode
    }

    if (phoneNumber !== undefined) {
      const cleanPhoneNumber = phoneNumber ? phoneNumber.replace(/\D/g, '') : null
      updateData.phoneNumber = cleanPhoneNumber
    }

    // Atualizar usuário
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        phone: true,
        country: true,
        documentType: true,
        documentNumber: true,
        phoneCountryCode: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    })

    // Auditoria
    try {
      await logAdminAction({
        actionType: 'USER_UPDATED',
        performedBy: currentUserId,
        targetUserId: userId,
        resourceType: 'USER',
        resourceId: userId,
        oldValue: { id: Number(existingUser.id), name: existingUser.name, email: existingUser.email, phone: existingUser.phone, cpf: existingUser.cpf, role: existingUser.role, isActive: existingUser.isActive },
        newValue: { id: Number(updatedUser.id), name: updatedUser.name, email: updatedUser.email, phone: updatedUser.phone, cpf: updatedUser.cpf, role: updatedUser.role, isActive: updatedUser.isActive },
        description: `Usuário ${id} atualizado por admin ${user.id}`,
      })
    } catch (e) {
      console.error('Falha ao auditar atualização de usuário:', e)
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updatedUser,
        id: Number(updatedUser.id)
      }
    })

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = BigInt(id)
    // Verificar autenticação
    const authUser = await getAuthenticatedUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    // Restringir visualização dos usuários ID 1 e 2 para somente os próprios (1 e 2)
    const currentUserId = BigInt(authUser.id)
    const protectedIdsForView = [BigInt(1), BigInt(2)]
    if (protectedIdsForView.includes(userId) && !protectedIdsForView.includes(currentUserId)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpf: true,
        country: true,
        documentType: true,
        documentNumber: true,
        phoneCountryCode: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        autoActivation: true,
        sponsorId: true,
        parentId: true,
        position: true,
        preferredSide: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
        referralCode: true,
        profilePhotos: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          select: {
            photoUrl: true
          }
        },
        packages: {
          select: {
            id: true,
            isActive: true,
            excludeFromPointsCalculation: true,
            package: {
              select: {
                name: true,
                price: true,
                directBonus: true
              }
            },
            transaction: {
              select: {
                description: true
              }
            },
            miner: {
              select: {
                id: true,
                name: true
              }
            },
            activatedAt: true,
            expiresAt: true,
            completedCycles: true
          },
          orderBy: {
            activatedAt: 'desc'
          }
        },
        _count: {
          select: {
            referrals: true,
            children: true,
            cycles: true,
            transactions: true,
            withdrawals: true,
            contracts: true,
            profitDistributions: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado'
      }, { status: 404 })
    }

    // Calcular dados financeiros
    const financialData = await getUserFinancialData(userId)

    // Calcular pontos LEFT e RIGHT
    const pointsHistory = await prisma.userPointsHistory.findMany({
      where: { userId: userId },
      select: {
        points: true,
        side: true
      }
    })

    let leftPoints = 0
    let rightPoints = 0

    for (const record of pointsHistory) {
      if (record.side === 'LEFT') {
        leftPoints += record.points
      } else {
        rightPoints += record.points
      }
    }

    // Verificar se tem ativação ativa
    const activeActivation = await prisma.userActivation.findFirst({
      where: {
        userId: userId,
        status: 'ACTIVE',
        expiresAt: {
          gt: new Date()
        }
      }
    })

    // Buscar pacote ativo
    const activePackage = user.packages.find(pkg => pkg.isActive)

    // Bônus gerados pela compra e upgrade disponível de cada pacote
    const packageInsights = await getAdminPackageInsights(userId)

    // Determinar status do usuário
    let status = 'inactive'
    if (!user.isActive) {
      status = 'banned'
    } else if (activeActivation || activePackage) {
      status = 'active'
    }

    return NextResponse.json({
      success: true,
      data: {
        id: Number(user.id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        cpf: user.cpf,
        country: user.country,
        documentType: user.documentType,
        documentNumber: user.documentNumber,
        phoneCountryCode: user.phoneCountryCode,
        phoneNumber: user.phoneNumber,
        photoUrl: user.profilePhotos[0]?.photoUrl || null,
        status,
        package: activePackage?.package.name || null,
        registeredAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        leftPoints,
        rightPoints,
        totalEarnings: Number(financialData.totalEarned),
        balance: Number(financialData.balance),
        referrals: user._count.referrals,
        role: user.role,
        isActive: user.isActive,
        autoActivation: user.autoActivation,
        lastLogin: user.lastLogin?.toISOString() || null,
        referralCode: user.referralCode,
        position: user.position,
        sponsorId: user.sponsorId ? Number(user.sponsorId) : null,
        parentId: user.parentId ? Number(user.parentId) : null,
        packages: user.packages.map(pkg => {
          // Calcular se pode deletar (menos de 1 hora desde a ativação)
          const activatedAt = new Date(pkg.activatedAt)
          const now = new Date()
          const timeDiff = now.getTime() - activatedAt.getTime()
          const hoursDiff = timeDiff / (1000 * 3600) // Converter para horas
          const canDelete = hoursDiff < 1

          return {
            id: Number(pkg.id),
            name: pkg.package.name,
            price: Number(pkg.package.price),
            isActive: pkg.isActive,
            activatedAt: pkg.activatedAt.toISOString(),
            expiresAt: pkg.expiresAt?.toISOString() || null,
            excludeFromPointsCalculation: pkg.excludeFromPointsCalculation ?? false,
            transactionDescription: pkg.transaction?.description ?? null,
            minerId: pkg.miner?.id ? Number(pkg.miner.id) : null,
            minerName: pkg.miner?.name ?? null,
            canDelete,
            directBonus: Number(pkg.package.directBonus),
            generatedBonuses: packageInsights.get(pkg.id.toString())?.generatedBonuses ?? null,
            upgrade: packageInsights.get(pkg.id.toString())?.upgrade ?? null
          }
        }),
        _count: user._count
      }
    })

  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
} 