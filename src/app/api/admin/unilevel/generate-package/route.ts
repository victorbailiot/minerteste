import { NextRequest, NextResponse } from 'next/server'
import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createUserPackage } from '@/lib/business-logic'
import { markUplineForRecalc, recalculateUserPoints } from '@/lib/points-calculator'

const generatePackageSchema = z.object({
  userId: z.string().min(1, 'ID do usuário é obrigatório'),
  packageId: z.string().min(1, 'ID do pacote é obrigatório'),
  quantity: z.coerce.number().int().min(1, 'Quantidade mínima é 1').max(100, 'Quantidade máxima é 100').optional().default(1),
  excludeFromPoints: z.boolean().optional().default(false)
})

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { id: BigInt(session.user.id) },
      select: { role: true }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem executar esta operação.' },
        { status: 403 }
      )
    }

    // Validar dados de entrada
    const body = await request.json()
    const { userId, packageId, quantity, excludeFromPoints } = generatePackageSchema.parse(body)

    console.log(`🎁 Gerando pacote unilevel para usuário ${userId}, pacote ${packageId}, quantidade ${quantity}`)

    // Buscar dados do usuário
    const targetUser = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      include: {
        unilevelUser: true,
        packages: {
          where: { isActive: true },
          include: { package: true }
        }
      }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se já tem pacote ativo
    //if (targetUser.packages.length > 0) {
    //  return NextResponse.json(
    //    { error: 'Usuário já possui um pacote ativo' },
    //    { status: 400 }
    //  )
    //}

    // Buscar dados do pacote
    const packageData = await prisma.package.findUnique({
      where: { id: BigInt(packageId) }
    })

    if (!packageData || !packageData.isUnilevel) {
      return NextResponse.json(
        { error: 'Pacote unilevel não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se usuário já tem registro unilevel
    let unilevelUser = targetUser.unilevelUser

    if (!unilevelUser) {
      // Criar registro unilevel se não existir
      unilevelUser = await prisma.unilevelUser.create({
        data: {
          userId: BigInt(userId),
          sponsorId: targetUser.sponsorId,
          careerLevelId: null,
          totalPoints: 0,
          teamVolume: 0,
          isActive: true
        }
      })
      console.log(`✅ Registro unilevel criado para usuário ${userId}`)
    }

    // Calcular data de expiração (1 ano)
    const expirationDate = new Date()
    expirationDate.setFullYear(expirationDate.getFullYear() + 1)

    const unitPrice = new Decimal(packageData.price.toString())
    const totalAmount = unitPrice.mul(new Decimal(quantity))

    // Usar transação para garantir consistência
    const result = await prisma.$transaction(async (tx) => {
      // 1. Criar transação PIX_PAYMENT (simulando pagamento)
      const pixTransaction = await tx.transaction.create({
        data: {
          userId: BigInt(userId),
          type: 'PIX_PAYMENT',
          amount: totalAmount,
          status: 'COMPLETED',
          description:
            quantity === 1
              ? `Pagamento via PIX - Pacote ${packageData.name} (Gerado pelo Admin)`
              : `Pagamento via PIX - Pacote ${packageData.name} x${quantity} (Gerado pelo Admin)`,
          correlationID: `ADMIN_GENERATED_${Date.now()}_${quantity}`,
          quantity
        }
      })

      // 2. Criar transação PURCHASE - DESABILITADO (não gerar mais PURCHASE)
      // const purchaseTransaction = await tx.transaction.create({
      //   data: {
      //     userId: BigInt(userId),
      //     type: 'PURCHASE',
      //     amount: packageData.price,
      //     status: 'COMPLETED',
      //     description: `Compra do pacote ${packageData.name}`,
      //     correlationID: `ADMIN_GENERATED_${Date.now()}`,
      //     quantity: 1
      //   }
      // })
      console.log(`💳 Pulando criação de transação PURCHASE (desabilitado)`)

      return {
        pixTransaction,
        purchaseTransaction: null, // Não criado mais
        packageData
      }
    })

    // 3. Criar user_packages (um por unidade de quantidade)
    console.log(`🎯 Criando ${quantity} UserPackage(s) para pacote ${packageData.name} (ID: ${packageId})`)
    console.log(`   - Preço unitário: R$ ${packageData.price}`)
    console.log(`   - IsUnilevel: ${packageData.isUnilevel}`)

    let userPackage: Awaited<ReturnType<typeof createUserPackage>> | null = null
    for (let i = 0; i < quantity; i++) {
      userPackage = await createUserPackage(
        BigInt(userId),
        BigInt(packageId),
        true, // isActive
        new Date(), // activatedAt
        expirationDate, // expiresAt
        result.pixTransaction.id, // transactionId
        true, // isUnilevel - forçar como true para pacotes unilevel
        excludeFromPoints // excludeFromPointsCalculation
      )
    }

    // 4. Recalcular pontos do usuário e marcar linha ascendente para recálculo
    console.log(`🔄 Recalculando pontos do usuário e marcando linha ascendente para recálculo...`)
    try {
      // Recalcular pontos próprios do usuário (a função calculateOwnPoints já exclui pacotes marcados)
      await recalculateUserPoints(BigInt(userId))
      console.log(`✅ Pontos do usuário recalculados`)

      // Marcar toda a linha ascendente para recálculo
      const markedCount = await markUplineForRecalc(BigInt(userId))
      console.log(`✅ ${markedCount} usuários na linha ascendente marcados para recálculo`)
      console.log(`ℹ️  Recalculo da linha ascendente será processado pelo job em background`)
    } catch (error) {
      console.error(`⚠️  Erro ao processar recálculo de pontos:`, error)
      // Não falhar a criação do pacote por causa do recálculo
    }

    // 5. Verificar se o usuário foi adicionado ao Clube dos 300 (feito automaticamente pela função createUserPackage)
    let clube300Result: any = null
    const clube300Members = await prisma.clube300Member.findMany({
      where: { userId: BigInt(userId), isActive: true },
      include: {
        user: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 1
    })
    const clube300Member = clube300Members[0] ?? null
    
    if (clube300Member) {
      clube300Result = clube300Member
      console.log(`🏆 Usuário ${userId} é membro do Clube dos 300: #${clube300Member.memberNumber}`)
    }

    console.log(`✅ ${quantity} pacote(s) ${packageData.name} gerado(s) com sucesso para usuário ${userId}`)
    console.log(`   - PIX Transaction ID: ${result.pixTransaction.id}`)
    if (userPackage) {
      console.log(`   - Último User Package ID: ${userPackage.id}`)
    }
    console.log(`   - Expira em: ${expirationDate.toISOString()}`)

    if (clube300Result && clube300Result.isActive) {
      console.log(`   - Clube dos 300: Membro #${clube300Result.memberNumber}`)
    }

    const responseData: any = {
      user: {
        id: targetUser.id.toString(),
        name: targetUser.name,
        email: targetUser.email
      },
      package: {
        id: packageData.id.toString(),
        name: packageData.name,
        price: packageData.price.toString(),
        points: packageData.points
      },
      transactions: {
        pixId: result.pixTransaction.id.toString(),
      },
      quantity,
      userPackage: userPackage
        ? {
            id: userPackage.id.toString(),
            expiresAt: userPackage.expiresAt
          }
        : null
    }

    // Adicionar informações do Clube dos 300 se aplicável
    if (clube300Result && clube300Result.isActive) {
      responseData.clube300Member = {
        memberNumber: clube300Result.memberNumber,
        cotas: clube300Result.cotas,
        packageName: packageData.name
      }
    }

    const successMsgBase =
      quantity === 1
        ? `Pacote ${packageData.name} gerado com sucesso para ${targetUser.name}`
        : `${quantity} pacotes ${packageData.name} gerados com sucesso para ${targetUser.name}`
    return NextResponse.json({
      success: true,
      message:
        clube300Result && clube300Result.isActive
          ? `${successMsgBase} e adicionado ao Clube dos 300 como membro #${clube300Result.memberNumber}!`
          : `${successMsgBase}.`,
      data: responseData
    })

  } catch (error) {
    console.error('❌ Erro ao gerar pacote unilevel:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: error.issues.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
