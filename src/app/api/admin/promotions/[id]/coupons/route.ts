import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import { issueManualCoupons } from '@/lib/promotion-service'
import { z } from 'zod'

const generateCouponsSchema = z.object({
  userId: z.string().min(1, 'ID do usuário é obrigatório'),
  quantity: z.number().int().min(1, 'Quantidade mínima é 1').max(100, 'Quantidade máxima é 100'),
  notes: z.string().optional()
})

/**
 * GET /api/admin/promotions/[id]/coupons
 * Listar cupons de uma promoção ou exportar em CSV para o sorteador externo
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'promotions.coupons')) {
      return NextResponse.json({ error: 'Sem permissão para visualizar cupons' }, { status: 403 })
    }

    const { id } = await params
    const promotionId = BigInt(id)

    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId }
    })

    if (!promotion) {
      return NextResponse.json({ error: 'Promoção não encontrada' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const exportCsv = searchParams.get('exportCsv') === 'true'

    // Exportação em formato CSV para o sorteador externo
    if (exportCsv) {
      const allCoupons = await prisma.coupon.findMany({
        where: { promotionId },
        select: {
          luckyNumber: true,
          sourceType: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
              cpf: true
            }
          }
        },
        orderBy: { luckyNumber: 'asc' }
      })

      // Prefixo \uFEFF (UTF-8 BOM) garante que o Excel no Windows abra com acentuação e 'ã' corretos
      let csvContent = '\uFEFFNumero_da_Sorte;Nome_Usuario;Email;CPF;Origem;Data_Emissao\n'
      allCoupons.forEach(c => {
        const dateStr = new Date(c.createdAt).toLocaleDateString('pt-BR')
        csvContent += `${c.luckyNumber};"${c.user.name}";"${c.user.email}";"${c.user.cpf || ''}";"${c.sourceType || 'AUTOMATIC'}";${dateStr}\n`
      })

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="cupons_promocao_${id}.csv"`
        }
      })
    }

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const showOnlyWinner = searchParams.get('showOnlyWinner') === 'true'
    const skip = (page - 1) * limit

    const where: any = { promotionId }

    if (showOnlyWinner) {
      where.isWinner = true
    }

    if (search.trim() !== '') {
      const searchNumber = parseInt(search.trim())
      const isNumber = !isNaN(searchNumber)

      const searchConditions: any[] = [
        { user: { name: { contains: search.trim(), mode: 'insensitive' } } },
        { user: { email: { contains: search.trim(), mode: 'insensitive' } } }
      ]

      if (isNumber) {
        searchConditions.push({ luckyNumber: searchNumber })
      }

      if (showOnlyWinner) {
        where.AND = [
          { isWinner: true },
          { OR: searchConditions }
        ]
        delete where.isWinner
      } else {
        where.OR = searchConditions
      }
    }

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        select: {
          id: true,
          promotionId: true,
          userId: true,
          luckyNumber: true,
          isWinner: true,
          wonAt: true,
          sourceType: true,
          notes: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              cpf: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.coupon.count({ where })
    ])

    const formattedCoupons = coupons.map(coupon => ({
      id: coupon.id.toString(),
      promotionId: coupon.promotionId.toString(),
      userId: coupon.userId.toString(),
      luckyNumber: coupon.luckyNumber,
      isWinner: coupon.isWinner,
      wonAt: coupon.wonAt ? coupon.wonAt.toISOString() : null,
      sourceType: coupon.sourceType || 'AUTOMATIC',
      notes: coupon.notes || null,
      createdAt: coupon.createdAt.toISOString(),
      user: {
        id: coupon.user.id.toString(),
        name: coupon.user.name,
        email: coupon.user.email,
        cpf: coupon.user.cpf
      }
    }))

    return NextResponse.json({
      success: true,
      data: formattedCoupons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    })

  } catch (error) {
    console.error('❌ Erro ao listar cupons:', error)
    return NextResponse.json(
      { error: 'Erro ao listar cupons', message: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/promotions/[id]/coupons
 * Emitir números da sorte manualmente pelo Admin
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'promotions.coupons')) {
      return NextResponse.json({ error: 'Sem permissão para emitir cupons' }, { status: 403 })
    }

    const { id } = await params
    const promotionId = BigInt(id)

    const body = await request.json()
    const data = generateCouponsSchema.parse(body)

    const result = await issueManualCoupons({
      promotionId,
      userId: BigInt(data.userId),
      quantity: data.quantity,
      notes: data.notes
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Erro ao gerar cupons' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `${result.generatedCoupons.length} número(s) da sorte gerado(s) com sucesso`,
      data: {
        luckyNumbers: result.generatedCoupons
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Dados inválidos',
        details: error.issues
      }, { status: 400 })
    }

    console.error('❌ Erro ao gerar cupons:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar cupons', message: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
