import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Aguardar params conforme Next.js 15
    const { id } = await params

    // Verificar autenticação e permissão no sistema novo
    const authUser = await getAuthenticatedUser(request)
    if (!authUser) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }
    const currentUserId = BigInt(authUser.id)
    if (!await hasPermission(currentUserId, 'users.read')) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const userId = BigInt(id)

    // Buscar informações de rede do usuário
    const networkInfo = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        sponsorId: true,
        parentId: true,
        position: true,
        preferredSide: true,
        sponsor: {
          select: {
            id: true,
            name: true,
            email: true,
            referralCode: true,
            isActive: true
          }
        },
        parent: {
          select: {
            id: true,
            name: true,
            email: true,
            referralCode: true,
            isActive: true
          }
        },
        children: {
          select: {
            id: true,
            name: true,
            email: true,
            referralCode: true,
            position: true,
            isActive: true,
            createdAt: true
          },
          orderBy: { createdAt: 'asc' }
        },
        referrals: {
          select: {
            id: true,
            name: true,
            email: true,
            referralCode: true,
            isActive: true,
            createdAt: true,
            packages: {
              select: {
                package: {
                  select: {
                    name: true,
                    price: true
                  }
                }
              },
              where: { isActive: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!networkInfo) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Aplicar mascaramento para proteger dados dos usuários 1 e 2
    const protectedIds = [BigInt(1), BigInt(2)]
    const canSeeProtected = protectedIds.includes(currentUserId)

    const sponsorMasked = networkInfo.sponsor && protectedIds.includes(networkInfo.sponsor.id) && !canSeeProtected
      ? null
      : networkInfo.sponsor

    const parentMasked = networkInfo.parent && protectedIds.includes(networkInfo.parent.id) && !canSeeProtected
      ? null
      : networkInfo.parent

    return NextResponse.json({
      success: true,
      data: {
        id: Number(networkInfo.id),
        sponsorId: networkInfo.sponsorId ? Number(networkInfo.sponsorId) : null,
        parentId: networkInfo.parentId ? Number(networkInfo.parentId) : null,
        position: networkInfo.position,
        preferredSide: networkInfo.preferredSide,
        sponsor: sponsorMasked ? {
          id: Number(sponsorMasked.id),
          name: sponsorMasked.name,
          email: sponsorMasked.email,
          referralCode: sponsorMasked.referralCode,
          isActive: sponsorMasked.isActive
        } : null,
        parent: parentMasked ? {
          id: Number(parentMasked.id),
          name: parentMasked.name,
          email: parentMasked.email,
          referralCode: parentMasked.referralCode,
          isActive: parentMasked.isActive
        } : null,
        children: networkInfo.children.map(child => ({
          id: Number(child.id),
          name: child.name,
          email: child.email,
          referralCode: child.referralCode,
          position: child.position,
          isActive: child.isActive,
          createdAt: child.createdAt.toISOString()
        })),
        referrals: networkInfo.referrals.map(referral => ({
          id: Number(referral.id),
          name: referral.name,
          email: referral.email,
          referralCode: referral.referralCode,
          isActive: referral.isActive,
          createdAt: referral.createdAt.toISOString(),
          packages: referral.packages.map(pkg => ({
            package: {
              name: pkg.package.name,
              price: pkg.package.price
            }
          }))
        }))
      }
    })

  } catch (error) {
    console.error('Erro ao buscar informações de rede:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 