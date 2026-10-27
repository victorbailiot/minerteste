/**
 * Processador unificado para pagamentos de pacotes
 * Integra: upgrade automático + Clube dos 300 + bonificações
 */

import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from './prisma'
import { 
  processPackageUpgrade, 
  getUserActivePackagesForUpgrade, 
  getAllSystemPackages, 
  applyUpgradeResult 
} from './package-upgrade'
import { 
  PackageUpgradeInput, 
  PurchasePackageData 
} from '../types/package-upgrade'
import { processPackagePurchaseUnilevel } from './business-logic-unilevel'
import { addUserToClube300 } from './clube300-service'
import { userPackageCreate } from './payment-confirmation'
import { createCouponForUser, getActivePromotion, processAutomaticPromotionTriggers } from './promotion-service'
import { validatePackageForMinerPurchase } from './package-purchase-validator'

/**
 * Interface para dados de entrada do processamento
 */
export interface PackagePaymentData {
  /** ID do usuário */
  userId: bigint
  /** ID do pacote */
  packageId: bigint
  /** ID da mineradora escolhida */
  minerId: bigint
  /** Nome do pacote */
  packageName: string
  /** Preço do pacote */
  packagePrice: Decimal
  /** Quantidade comprada */
  quantity: number
  /** ID de correlação para rastreamento */
  correlationID: string
}

/**
 * Interface para resultado do processamento
 */
export interface PackagePaymentResult {
  /** Se o processamento foi bem-sucedido */
  success: boolean
  /** Tipo de processamento realizado */
  processingType: 'upgrade' | 'normal' | 'fallback'
  /** Detalhes do processamento */
  details: {
    /** Pacotes de upgrade criados */
    upgradedPackages: Array<{
      packageId: bigint
      packageName: string
      quantity: number
      isUpgrade: boolean
    }>
    /** Pacotes restantes criados */
    remainingPackages: Array<{
      packageId: bigint
      packageName: string
      quantity: number
      isUpgrade: boolean
    }>
    /** Pacotes antigos desativados */
    disabledPackageIds: bigint[]
    /** Se usuário foi adicionado ao Clube dos 300 */
    addedToClube300: boolean
    /** Número do membro no Clube dos 300 (se adicionado) */
    clube300MemberNumber?: number
  }
  /** Mensagem de resultado */
  message: string
  /** Erros ocorridos (se houver) */
  errors: string[]
}

/**
 * Processa um pagamento de pacote com todas as funcionalidades integradas:
 * - Verificação de upgrade automático
 * - Adição ao Clube dos 300 (se elegível)
 * - Execução de bonificações
 * 
 * @param paymentData Dados do pagamento
 * @returns Resultado do processamento
 */
export async function processPackagePayment(
  paymentData: PackagePaymentData
): Promise<PackagePaymentResult> {
  console.log('🔄 INICIANDO processamento unificado de pacote')
  console.log(`   Usuário: ${Number(paymentData.userId)}`)
  console.log(`   Pacote: ${paymentData.packageName} (R$ ${paymentData.packagePrice})`)
  console.log(`   Quantidade: ${paymentData.quantity}`)
  console.log(`   CorrelationID: ${paymentData.correlationID}`)

  const result: PackagePaymentResult = {
    success: false,
    processingType: 'normal',
    details: {
      upgradedPackages: [],
      remainingPackages: [],
      disabledPackageIds: [],
      addedToClube300: false
    },
    message: '',
    errors: []
  }

  try {
    // 1. Verificar se há upgrade automático disponível
    console.log('🔍 Verificando possibilidade de upgrade automático...')
    
    try {
      // Buscar pacotes ativos do usuário
      const currentUserPackages = await getUserActivePackagesForUpgrade(paymentData.userId)
      console.log(`📦 Pacotes ativos encontrados para upgrade: ${currentUserPackages.length}`)
      console.log(`📋 Detalhes:`, currentUserPackages.map(p => `${p.name} (ID: ${Number(p.id)})`).join(', '))
      
      // Buscar todos os pacotes do sistema
      const allSystemPackages = await getAllSystemPackages()
      
      // Criar dados da nova compra
      const newPurchasePackages: PurchasePackageData[] = [{
        packageId: paymentData.packageId,
        minerId: paymentData.minerId,
        name: paymentData.packageName,
        price: paymentData.packagePrice,
        quantity: paymentData.quantity
      }]
      
      // Preparar dados para upgrade
      const upgradeInput: PackageUpgradeInput = {
        currentUserPackages,
        newPurchasePackages,
        allPackages: allSystemPackages,
        purchaseMinerId: paymentData.minerId
      }
      
      // Processar upgrade
      const upgradeResult = await processPackageUpgrade(upgradeInput)
      
      if (upgradeResult.upgradedPackages.length > 0) {
        console.log('⬆️ Upgrade automático detectado! Aplicando...')
        result.processingType = 'upgrade'
        
        // Buscar transação criada para usar o ID
        let transaction = await prisma.transaction.findFirst({
          where: {
            OR: [
              { chargeId: paymentData.correlationID },
              { correlationID: paymentData.correlationID }
            ],
            status: 'COMPLETED'
          }
        })
        
        // Fallback: criar transação para correlação (ex.: crédito minerador via voucher)
        if (!transaction) {
          console.log('ℹ️ Transação não encontrada para correlação. Criando transação de fallback (DEPOSIT)...')
          const totalAmount = paymentData.packagePrice.toNumber() * paymentData.quantity
          transaction = await prisma.transaction.create({
            data: {
              userId: paymentData.userId,
              type: 'DEPOSIT',
              amount: totalAmount,
              description: `Compra via crédito minerador (correlation ${paymentData.correlationID})`,
              correlationID: paymentData.correlationID,
              status: 'COMPLETED',
              quantity: paymentData.quantity
            }
          })
        }

        if (transaction) {
          // IMPORTANTE: Calcular quantos pacotes da compra vão para upgrade vs. ficam ativos
          const packageData = await prisma.package.findUnique({
            where: { id: paymentData.packageId }
          })
          
          if (!packageData) {
            throw new Error('Pacote não encontrado')
          }
          
          // Calcular quantos da compra atual serão consumidos no upgrade
          let quantityForUpgrade = 0
          let quantityToStayActive = paymentData.quantity
          
          for (const upgradedPkg of upgradeResult.upgradedPackages) {
            const totalNeededForUpgrade = upgradedPkg.quantity * Math.floor(
              Number(upgradedPkg.price) / Number(paymentData.packagePrice)
            )
            
            const existingActiveCount = currentUserPackages.filter(p => 
              p.packageId === paymentData.packageId &&
              p.isActive &&
              p.minerId === paymentData.minerId
            ).length
            
            quantityForUpgrade = Math.max(0, totalNeededForUpgrade - existingActiveCount)
            quantityToStayActive = paymentData.quantity - quantityForUpgrade
            
            console.log(`📊 Análise de upgrade:`)
            console.log(`   - Total necessário: ${totalNeededForUpgrade} pacotes`)
            console.log(`   - Já existentes: ${existingActiveCount} pacotes`)
            console.log(`   - Da compra para upgrade (INATIVOS): ${quantityForUpgrade} pacotes`)
            console.log(`   - Da compra ficam ATIVOS: ${quantityToStayActive} pacotes`)
          }
          
          // Criar pacotes da compra que vão pro upgrade (INATIVOS)
          if (quantityForUpgrade > 0) {
            console.log(`📦 Criando ${quantityForUpgrade} UserPackages INATIVOS (para upgrade)...`)
            for (let i = 0; i < quantityForUpgrade; i++) {
              await prisma.userPackage.create({
                data: {
                  userId: paymentData.userId,
                  packageId: paymentData.packageId,
                  minerId: paymentData.minerId,
                  isActive: false,  // JÁ INATIVO!
                  isUnilevel: true,
                  activatedAt: new Date(),
                  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                  transactionId: transaction.id,
                  directBonusSnapshot: packageData.directBonus,
                  priceSnapshot: packageData.price
                }
              })
            }
            console.log(`✅ ${quantityForUpgrade} UserPackages INATIVOS criados`)
          }
          
          // Criar pacotes restantes que ficam ATIVOS
          if (quantityToStayActive > 0) {
            console.log(`📦 Criando ${quantityToStayActive} UserPackages ATIVOS (restantes)...`)
            await userPackageCreate(paymentData.userId, packageData, transaction.id, quantityToStayActive, paymentData.minerId)
            console.log(`✅ ${quantityToStayActive} UserPackages ATIVOS criados`)
          }
          
          // Aplicar resultado do upgrade (apenas desativa antigos e cria upgraded)
          const upgradeApplication = await applyUpgradeResult(
            paymentData.userId,
            upgradeResult,
            transaction.id,
            true, // skipRemainingCreation = true (já foram criados acima)
            paymentData.minerId
          )
          
          console.log(`✅ Upgrade aplicado com sucesso:`)
          console.log(`   - ${upgradeApplication.upgradedUserPackages.length} pacotes de upgrade criados`)
          console.log(`   - ${upgradeApplication.remainingUserPackages.length} pacotes restantes criados`)
          console.log(`   - ${upgradeApplication.disabledCount} pacotes antigos desativados`)
          
          // Mapear resultados para o formato de retorno
          result.details.upgradedPackages = upgradeResult.upgradedPackages.map(pkg => ({
            packageId: pkg.packageId,
            packageName: pkg.name,
            quantity: pkg.quantity,
            isUpgrade: pkg.isUpgrade
          }))
          
          result.details.remainingPackages = upgradeResult.remainingPackages.map(pkg => ({
            packageId: pkg.packageId,
            packageName: pkg.name,
            quantity: pkg.quantity,
            isUpgrade: pkg.isUpgrade
          }))
          
          result.details.disabledPackageIds = upgradeResult.disabledPackageIds
          
          // IMPORTANTE: Verificar e criar cupom baseado no pacote COMPRADO original (não o resultante do upgrade)
          // Isso garante que mesmo quando há upgrade, o cupom seja criado se o pacote comprado era elegível
          // IMPORTANTE: Criar cupons baseado na quantidade TOTAL comprada, não apenas os que ficaram ativos
          console.log('🎟️  Verificando elegibilidade para cupom baseado no pacote COMPRADO original...')
          await checkAndCreateCouponForPackage(paymentData.userId, paymentData.packageId, paymentData.quantity)
          
          // Verificar Clube dos 300 para os novos pacotes criados (ANTES das bonificações)
          console.log('🏆 Verificando elegibilidade para Clube dos 300...')
          
          // Verificar Clube dos 300 para pacotes de upgrade
          for (const upgradedPkg of upgradeResult.upgradedPackages) {
            await checkAndAddToClube300(paymentData.userId, upgradedPkg.packageId, paymentData.minerId, result)
          }

          // Verificar Clube dos 300 para pacotes restantes
          for (const remainingPkg of upgradeResult.remainingPackages) {
            await checkAndAddToClube300(paymentData.userId, remainingPkg.packageId, paymentData.minerId, result)
          }
          
          // Executar bonificações para os novos pacotes criados
          console.log('🎁 Executando bonificações para os novos pacotes...')
          console.log(`💰 IMPORTANTE: Bonificações baseadas no valor PAGO (R$ ${paymentData.packagePrice}), não no valor do upgrade`)
          
          // IMPORTANTE: Em caso de upgrade, bonificar sobre o valor PAGO, não sobre o valor do upgrade
          // Exemplo: Comprou 1 Átomo (R$ 99.90), fez upgrade para 1 Núcleo (R$ 999.90)
          // - Bônus direto: R$ 30 (do Átomo que foi comprado)
          // - Bônus indireto: Calculado sobre R$ 99.90 (o que foi pago)
          // - Pontos: 999 pontos (do Núcleo que foi criado)
          
          // Bonificações para pacotes de upgrade — usa quantityForUpgrade (não total comprado)
          console.log(`\n🎁 Processando bônus para ${upgradeResult.upgradedPackages.length} pacotes de UPGRADE...`)
          for (const upgradedPkg of upgradeResult.upgradedPackages) {
            await processPackagePurchaseUnilevel(
              paymentData.userId,
              upgradedPkg.packageId,         // ← Pacote RESULTANTE (Núcleo) - para os pontos
              paymentData.packagePrice,      // ← Valor PAGO (R$ 99.90) - para bônus indireto
              undefined,
              paymentData.correlationID,
              quantityForUpgrade,            // ← Apenas os que foram pro upgrade (não total)
              paymentData.packageId,         // ← Pacote ORIGINAL (Átomo) - para bônus direto
              transaction.id                 // ← transactionId para excluir pacotes desta compra do histórico
            )
          }
          
          // Bonificações para pacotes restantes
          // CorrelationID diferente para evitar dedup com o bônus de upgrade
          console.log(`\n🎁 Processando bônus para ${upgradeResult.remainingPackages.length} pacotes RESTANTES...`)
          
          for (const remainingPkg of upgradeResult.remainingPackages) {
            await processPackagePurchaseUnilevel(
              paymentData.userId,
              remainingPkg.packageId,        // ← Pacote restante (Átomo)
              paymentData.packagePrice,      // ← Valor PAGO
              undefined,
              `${paymentData.correlationID}-remaining`,  // ← CorrelationID diferente para evitar duplicata
              remainingPkg.quantity,         // ← Quantidade RESTANTE
              paymentData.packageId,         // ← Pacote ORIGINAL (Átomo)
              transaction.id                 // ← transactionId para excluir pacotes desta compra do histórico
            )
          }
          
          result.message = `Upgrade automático aplicado com sucesso: ${upgradeResult.upgradedPackages.length} pacotes de upgrade, ${upgradeResult.remainingPackages.length} pacotes restantes`
          console.log('✅ Todas as bonificações executadas com sucesso após upgrade')

          // Processar gatilhos da nova central de promoções para UPGRADE
          await processAutomaticPromotionTriggers({
            userId: paymentData.userId,
            type: 'UPGRADE',
            toPackageId: upgradeResult.upgradedPackages[0]?.packageId || paymentData.packageId,
            packagePrice: paymentData.packagePrice,
            transactionId: transaction.id
          })
          
        } else {
          console.error('❌ Falha ao obter/criar transação para aplicar upgrade')
          throw new Error('Transação não encontrada')
        }
        
      } else {
        console.log('ℹ️ Nenhum upgrade disponível, processando compra normal...')
        result.processingType = 'normal'
        
        // Buscar transação para criar UserPackages
        let transaction = await prisma.transaction.findFirst({
          where: {
            OR: [
              { chargeId: paymentData.correlationID },
              { correlationID: paymentData.correlationID }
            ],
            status: 'COMPLETED'
          }
        })

        // Fallback: criar transação quando for fluxo de crédito de minerador (voucher)
        if (!transaction) {
          console.log('ℹ️ Transação não encontrada. Criando transação de fallback (DEPOSIT) para vincular UserPackages...')
          const totalAmount = paymentData.packagePrice.toNumber() * paymentData.quantity
          transaction = await prisma.transaction.create({
            data: {
              userId: paymentData.userId,
              type: 'DEPOSIT',
              amount: totalAmount,
              description: `Compra via crédito minerador (correlation ${paymentData.correlationID})`,
              correlationID: paymentData.correlationID,
              status: 'COMPLETED',
              quantity: paymentData.quantity
            }
          })
        }
        
        // Buscar dados do pacote para criar UserPackages
        const packageData = await prisma.package.findUnique({
          where: { id: paymentData.packageId }
        })
        
        if (!packageData) {
          console.error('❌ Pacote não encontrado para criar UserPackages')
          throw new Error('Pacote não encontrado')
        }
        
        // Criar UserPackages usando função reutilizável
        console.log(`📦 Criando ${paymentData.quantity} UserPackages de ${paymentData.packageName}...`)
        await userPackageCreate(paymentData.userId, packageData, transaction.id, paymentData.quantity, paymentData.minerId)
        console.log(`✅ ${paymentData.quantity} UserPackages criados`)
        
        // IMPORTANTE: Verificar e criar cupom baseado no pacote COMPRADO
        // IMPORTANTE: Criar cupons baseado na quantidade comprada
        console.log('🎟️  Verificando elegibilidade para cupom baseado no pacote comprado...')
        await checkAndCreateCouponForPackage(paymentData.userId, paymentData.packageId, paymentData.quantity)
        
        // Executar bonificações normalmente (sem upgrade)
        await processPackagePurchaseUnilevel(
          paymentData.userId,
          paymentData.packageId,
          paymentData.packagePrice,
          undefined,
          paymentData.correlationID,
          paymentData.quantity,
          undefined,
          transaction.id
        )
        
        // Verificar se deve adicionar ao Clube dos 300
        await checkAndAddToClube300(paymentData.userId, paymentData.packageId, paymentData.minerId, result)

        // Processar gatilhos da nova central de promoções para COMPRA DIRETA
        await processAutomaticPromotionTriggers({
          userId: paymentData.userId,
          type: 'PURCHASE',
          toPackageId: paymentData.packageId,
          packagePrice: paymentData.packagePrice,
          transactionId: transaction.id
        })

        console.log(`\n✅ Pontuação será atualizada automaticamente pelo sistema de cache`)

        result.details.remainingPackages = [{
          packageId: paymentData.packageId,
          packageName: paymentData.packageName,
          quantity: paymentData.quantity,
          isUpgrade: false
        }]

        result.message = `Compra processada normalmente: ${paymentData.quantity} × ${paymentData.packageName}`
        console.log('✅ Compra normal processada com sucesso')
      }
      
    } catch (upgradeError) {
      console.error('❌ Erro no processamento de upgrade:', upgradeError)
      console.log('🔄 Tentando processamento normal como fallback...')
      result.processingType = 'fallback'
      
      // Buscar transação para criar UserPackages
      let transaction = await prisma.transaction.findFirst({
        where: {
          OR: [
            { chargeId: paymentData.correlationID },
            { correlationID: paymentData.correlationID }
          ],
          status: 'COMPLETED'
        }
      })
      
      if (!transaction) {
        console.log('ℹ️ Transação não encontrada no fallback. Criando transação de fallback (DEPOSIT)...')
        const totalAmount = paymentData.packagePrice.toNumber() * paymentData.quantity
        transaction = await prisma.transaction.create({
          data: {
            userId: paymentData.userId,
            type: 'DEPOSIT',
            amount: totalAmount,
            description: `Compra via crédito minerador (correlation ${paymentData.correlationID})`,
            correlationID: paymentData.correlationID,
            status: 'COMPLETED',
            quantity: paymentData.quantity
          }
        })
      }

      if (transaction) {
        // Buscar dados do pacote para criar UserPackages
        const packageData = await prisma.package.findUnique({
          where: { id: paymentData.packageId }
        })
        
        if (packageData) {
          // Criar UserPackages usando função reutilizável (fallback)
          console.log(`📦 Criando ${paymentData.quantity} UserPackages de ${paymentData.packageName} (fallback)...`)
          await userPackageCreate(paymentData.userId, packageData, transaction.id, paymentData.quantity, paymentData.minerId)
          console.log(`✅ ${paymentData.quantity} UserPackages criados (fallback)`)
          
          // IMPORTANTE: Verificar e criar cupom baseado no pacote COMPRADO (fallback)
          // IMPORTANTE: Criar cupons baseado na quantidade comprada
          console.log('🎟️  Verificando elegibilidade para cupom baseado no pacote comprado (fallback)...')
          await checkAndCreateCouponForPackage(paymentData.userId, paymentData.packageId, paymentData.quantity)
        }
      }
      
      // Fallback: processar normalmente sem upgrade
      await processPackagePurchaseUnilevel(
        paymentData.userId,
        paymentData.packageId,
        paymentData.packagePrice,
        undefined,
        paymentData.correlationID,
        paymentData.quantity,
        undefined,
        transaction?.id
      )
      
      // Verificar se deve adicionar ao Clube dos 300
      await checkAndAddToClube300(paymentData.userId, paymentData.packageId, paymentData.minerId, result)

      console.log(`\n✅ Pontuação será atualizada automaticamente pelo sistema de cache`)
      
      result.details.remainingPackages = [{
        packageId: paymentData.packageId,
        packageName: paymentData.packageName,
        quantity: paymentData.quantity,
        isUpgrade: false
      }]
      
      result.message = `Processamento normal executado com sucesso (fallback)`
      result.errors.push(`Erro no upgrade: ${upgradeError instanceof Error ? upgradeError.message : 'Erro desconhecido'}`)
      console.log('✅ Processamento normal executado com sucesso (fallback)')
    }
    
    result.success = true
    
    // Log final
    console.log(`🎉 Processamento unificado concluído:`)
    console.log(`   - Tipo: ${result.processingType}`)
    console.log(`   - Pacotes de upgrade: ${result.details.upgradedPackages.length}`)
    console.log(`   - Pacotes restantes: ${result.details.remainingPackages.length}`)
    console.log(`   - Pacotes desativados: ${result.details.disabledPackageIds.length}`)
    console.log(`   - Clube dos 300: ${result.details.addedToClube300 ? 'Adicionado' : 'Não elegível'}`)
    
    return result
    
  } catch (error) {
    console.error('❌ Erro geral no processamento de pacote:', error)
    result.success = false
    result.message = 'Erro no processamento do pacote'
    result.errors.push(error instanceof Error ? error.message : 'Erro desconhecido')
    return result
  }
}

/**
 * Verifica se o pacote comprado é elegível para cupom e cria os cupons
 * IMPORTANTE: Verifica sempre o pacote COMPRADO original, não o resultante do upgrade
 * IMPORTANTE: Cria a mesma quantidade de cupons que a quantidade de pacotes comprados
 * @param userId ID do usuário
 * @param purchasedPackageId ID do pacote comprado original
 * @param quantity Quantidade de pacotes comprados (determina quantos cupons criar)
 */
async function checkAndCreateCouponForPackage(
  userId: bigint,
  purchasedPackageId: bigint,
  quantity: number = 1
): Promise<void> {
  try {
    const packageData = await prisma.package.findUnique({
      where: { id: purchasedPackageId },
      select: { generatesCouponOnPurchase: true, name: true }
    })

    if (!packageData?.generatesCouponOnPurchase) {
      console.log(`ℹ️  Pacote "${packageData?.name ?? purchasedPackageId}" não gera cupom na compra`)
      return
    }

    console.log(`🎟️  Pacote "${packageData.name}" gera cupom - criando ${quantity} cupom(ns)...`)

    const activePromotion = await getActivePromotion()

    if (!activePromotion) {
      console.log(`ℹ️  Nenhuma promoção ativa encontrada para criar cupom`)
      return
    }

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < quantity; i++) {
      try {
        const coupon = await createCouponForUser(userId, activePromotion.id)
        if (coupon) {
          successCount++
          console.log(`✅ Cupom ${i + 1}/${quantity} criado - número ${coupon.luckyNumber}`)
        } else {
          failCount++
          console.log(`⚠️  Cupom ${i + 1}/${quantity} não criado (limite atingido ou fora de validade)`)
        }
      } catch (error) {
        failCount++
        console.error(`❌ Erro ao criar cupom ${i + 1}/${quantity}:`, error)
      }
    }

    console.log(`🎟️  Resumo: ${successCount} criados, ${failCount} falhas de ${quantity} tentativas`)
  } catch (error) {
    console.error(`❌ Erro ao verificar/criar cupom para usuário ${Number(userId)}:`, error)
  }
}

/**
 * Verifica se o usuário deve ser adicionado ao Clube dos 300 da mineradora e o adiciona
 * @param userId ID do usuário
 * @param packageId ID do pacote (verifica clube300Eligible no banco)
 * @param minerId ID da mineradora
 * @param result Resultado do processamento (para atualizar)
 */
async function checkAndAddToClube300(
  userId: bigint,
  packageId: bigint,
  minerId: bigint,
  result: PackagePaymentResult
): Promise<void> {
  try {
    const added = await addUserToClube300(userId, packageId, minerId)

    if (added) {
      result.details.addedToClube300 = true

      const member = await prisma.clube300Member.findFirst({
        where: { userId, minerId },
        select: { memberNumber: true }
      })

      if (member) {
        result.details.clube300MemberNumber = member.memberNumber
        console.log(`🎉 Usuário ${Number(userId)} adicionado ao Clube dos 300 da mineradora ${Number(minerId)} como membro #${member.memberNumber}`)
      }
    } else {
      console.log(`ℹ️ Usuário ${Number(userId)} não foi adicionado ao Clube dos 300 da mineradora ${Number(minerId)} (já é membro ou não elegível)`)
    }
  } catch (error) {
    console.error(`❌ Erro ao verificar Clube dos 300 para usuário ${Number(userId)}:`, error)
    result.errors.push(`Erro no Clube dos 300: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Cria dados de pagamento a partir dos parâmetros básicos
 * @param userId ID do usuário
 * @param packageId ID do pacote
 * @param correlationID ID de correlação
 * @param quantity Quantidade
 * @returns Dados de pagamento prontos para processamento
 */
export async function createPackagePaymentData(
  userId: bigint,
  packageId: bigint,
  correlationID: string,
  quantity: number = 1,
  minerId?: bigint
): Promise<PackagePaymentData | null> {
  try {
    if (!minerId) {
      console.error('❌ Mineradora é obrigatória para compra de pacote')
      return null
    }

    const validation = await validatePackageForMinerPurchase({
      userId,
      packageId,
      minerId
    })

    if (!validation.valid || !validation.packageData) {
      console.error(`❌ Compra inválida para pacote ${Number(packageId)} e mineradora ${Number(minerId)}: ${validation.error}`)
      return null
    }
    
    return {
      userId,
      packageId,
      minerId,
      packageName: validation.packageData.name,
      packagePrice: validation.packageData.price,
      quantity,
      correlationID
    }
  } catch (error) {
    console.error('❌ Erro ao criar dados de pagamento:', error)
    return null
  }
}
