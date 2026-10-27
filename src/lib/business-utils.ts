import { Decimal } from "@prisma/client/runtime/library"
import { prisma } from "./prisma"
import { ParameterKeys } from "@/types/parameter-keys"


/**
 * Busca parâmetros de ativação da tabela parameters
 */
export async function getActivationParameters(): Promise<{
    pixAmount: Decimal
    bonusConversionPercent: Decimal
    durationDays: number
    enabled: boolean
}> {
    try {
        const [pixAmountParam, bonusPercentParam, durationParam, enabledParam] = await Promise.all([
            prisma.parameter.findUnique({ where: { key: ParameterKeys.ACTIVATION_PIX_AMOUNT } }),
            prisma.parameter.findUnique({ where: { key: ParameterKeys.ACTIVATION_BONUS_CONVERSION_PERCENT } }),
            prisma.parameter.findUnique({ where: { key: ParameterKeys.ACTIVATION_DURATION_DAYS } }),
            prisma.parameter.findUnique({ where: { key: ParameterKeys.ACTIVATION_ENABLED } })
        ])

        return {
            pixAmount: pixAmountParam ? new Decimal(pixAmountParam.value) : new Decimal(100),
            bonusConversionPercent: bonusPercentParam ? new Decimal(bonusPercentParam.value) : new Decimal(30),
            durationDays: durationParam ? parseInt(durationParam.value) : 30,
            enabled: enabledParam ? enabledParam.value === 'true' : true
        }
    } catch (error) {
        console.error('Erro ao buscar parâmetros de ativação:', error)
        return {
            pixAmount: new Decimal(100),
            bonusConversionPercent: new Decimal(30),
            durationDays: 30,
            enabled: true
        }
    }
}

/**
 * Retorna o pacote ativo do usuário com maior valor que ainda não expirou
 * @param userId - ID do usuário
 * @returns Objeto com dados do pacote ativo ou null se não houver pacote válido
 */
export async function getUserActivePackage(userId: bigint): Promise<{
    id: bigint
    name: string
    description: string | null
    price: Decimal
    points: number
    isActive: boolean
    profitSharePercent: Decimal
    boosted: Decimal
    isUnilevel: boolean
    directBonus: Decimal
    reactivationAmount: Decimal
    reactivationBonus: Decimal
    expiresAt: Date | null
    activatedAt: Date
} | null> {
    try {
        const now = new Date()

        // Buscar todos os pacotes ativos do usuário que não expiraram
        const activePackages = await prisma.userPackage.findMany({
            where: {
                userId,
                isActive: true,
                OR: [
                    { expiresAt: null }, // Pacotes que não expiram
                    { expiresAt: { gt: now } } // Pacotes que ainda não expiraram
                ]
            },
            include: {
                package: true
            },
            orderBy: {
                package: {
                    price: 'desc' // Ordenar por preço decrescente (maior valor primeiro)
                }
            }
        })

        if (activePackages.length === 0) {
            console.log(`❌ Usuário ${Number(userId)} não possui pacotes ativos válidos`)
            return null
        }

        // Retornar o pacote com maior valor (primeiro da lista ordenada)
        const activePackage = activePackages[0]

        console.log(`✅ Pacote ativo encontrado para usuário ${Number(userId)}: ${activePackage.package.name} - R$ ${activePackage.package.price}`)

        return {
            id: activePackage.package.id,
            name: activePackage.package.name,
            description: activePackage.package.description,
            price: activePackage.package.price,
            points: activePackage.package.points,
            isActive: activePackage.package.isActive,
            profitSharePercent: activePackage.package.profitSharePercent,
            boosted: activePackage.package.boosted,
            isUnilevel: activePackage.package.isUnilevel,
            directBonus: activePackage.package.directBonus,
            reactivationAmount: activePackage.package.reactivationAmount,
            reactivationBonus: activePackage.package.reactivationBonus,
            expiresAt: activePackage.expiresAt,
            activatedAt: activePackage.activatedAt,
        }
    } catch (error) {
        console.error(`❌ Erro ao buscar pacote ativo do usuário ${Number(userId)}:`, error)
        return null
    }
}

/**
 * Verifica se o usuário está ativo pelo primeiro pacote adquirido (31 dias de graça)
 */
export async function isUserActiveByFirstPackage(userId: bigint): Promise<{
    isActive: boolean
    dateActivation: Date | null
    daysSinceFirstPackage: number
    expiresAt: Date | null
}> {
    // Verificar se o primeiro pacote foi adquirido em menos de 31 dias
    const firstPackage = await prisma.userPackage.findFirst({
        where: {
            userId,
            isActive: true
        },
        orderBy: {
            activatedAt: 'asc'
        }
    })

    if (firstPackage) {
        const now = new Date()
        const daysSinceFirstPackage = Math.floor((now.getTime() - firstPackage.activatedAt.getTime()) / (1000 * 60 * 60 * 24))
        const expiresAt = new Date(firstPackage.activatedAt.getTime() + 31 * 24 * 60 * 60 * 1000)

        console.log(`🔍 Verificando período de graça para usuário ${Number(userId)}:`)
        console.log(`   - Primeiro pacote adquirido em: ${firstPackage.activatedAt.toISOString()}`)
        console.log(`   - Dias desde primeiro pacote: ${daysSinceFirstPackage}`)
        console.log(`   - Data de expiração: ${expiresAt.toISOString()}`)
        console.log(`   - Condição (daysSinceFirstPackage < 31): ${daysSinceFirstPackage < 31}`)

        // Se o primeiro pacote foi adquirido em menos de 31 dias, usuário está ativo
        if (daysSinceFirstPackage < 31) {
            console.log(`✅ Usuário ${Number(userId)} está ativo - primeiro pacote adquirido há ${daysSinceFirstPackage} dias`)
            return {
                isActive: true,
                dateActivation: firstPackage.activatedAt,
                daysSinceFirstPackage: daysSinceFirstPackage,
                expiresAt
            }
        } else {
            console.log(`❌ Usuário ${Number(userId)} não está ativo - período de graça expirado (${daysSinceFirstPackage} dias)`)
        }
    }

    return {
        isActive: false,
        dateActivation: null,
        daysSinceFirstPackage: 0,
        expiresAt: null
    }
}

/**
 * Verifica se o usuário está ativo (tem ativação válida)
 * ATUALIZADO: Considera ativo se o primeiro pacote foi adquirido em menos de 32 dias
 * ATUALIZADO: Considera ativo se não recebeu divisões de lucro que somem o dobro do valor da reativação
 */
export async function isUserActive(userId: bigint): Promise<boolean> {
    console.log('----------isUserActive-------------')
    const params = await getActivationParameters()
    if (!params.enabled) return true // Se sistema desabilitado, todos ativos

    const activeActivation = await prisma.userActivation.findFirst({
        where: {
            userId,
            status: 'ACTIVE',
            expiresAt: {
                gt: new Date()
            }
        }
    })
    console.log('----------activeActivation', activeActivation)

    // Se tem ativação ativa, está ativo
    if (activeActivation) {
        return true
    }

    const isActiveByPackage = await isUserActiveByFirstPackage(userId)
    console.log('----------isActiveByPackage', isActiveByPackage)
    if (isActiveByPackage.isActive) {
        return true
    }

    // Buscar o pacote ativo do usuário para obter o valor da reativação
    const userPackage = await prisma.userPackage.findFirst({
        where: {
            userId,
            isActive: true
        },
        orderBy: {
            package: {
                price: 'desc'
            }
        },
        include: {
            package: true
        }
    })
    console.log('----------userPackage', userPackage)
    if (!userPackage) {
        // Se não tem pacote ativo, não está ativo
        return false
    }

    const reactivationAmount = userPackage.package.reactivationAmount

    // Buscar todas as divisões de lucro completadas do usuário
    const profitDistributions = await prisma.profitDistribution.findMany({
        where: {
            userId,
            status: 'PROCESSED'
        },
        select: {
            amount: true
        }
    })
    console.log('----------profitDistributions', profitDistributions)
    // Calcular o total de divisões de lucro recebidas
    const totalProfitReceived = profitDistributions.reduce((sum, dist) => {
        return sum + parseFloat(dist.amount.toString())
    }, 0)
    console.log('----------totalProfitReceived', totalProfitReceived)
    // Calcular o dobro do valor da reativação
    const doubleReactivationAmount = parseFloat(reactivationAmount.toString()) * 2
    console.log('----------doubleReactivationAmount', doubleReactivationAmount) 
    // Se não recebeu divisões de lucro que somem o dobro da reativação, está ativo
    if (totalProfitReceived < doubleReactivationAmount) {
        console.log(`✅ Usuário ${Number(userId)} está ativo - recebeu R$ ${totalProfitReceived.toFixed(2)} de lucro (limite: R$ ${doubleReactivationAmount.toFixed(2)})`)
        return true
    }
    console.log('----------false')
    console.log(`❌ Usuário ${Number(userId)} inativo - recebeu R$ ${totalProfitReceived.toFixed(2)} de lucro (limite: R$ ${doubleReactivationAmount.toFixed(2)})`)
    return false
}

/**
 * Retorna todos os pacotes ativos do usuário ordenados por preço (menor para maior)
 * @param userId - ID do usuário
 * @returns Array com todos os pacotes ativos válidos ordenados por preço
 */
/**
 * Retorna todos os pacotes ativos do usuário ordenados por preço (menor para maior)
 * @param userId - ID do usuário
 * @returns Array com todos os pacotes ativos válidos ordenados por preço
 */
export async function getAllUserActivePackages(userId: bigint): Promise<{
    id: bigint
    packageId: bigint
    name: string
    description: string | null
    price: Decimal
    purchasePrice: Decimal
    points: number
    isActive: boolean
    profitSharePercent: Decimal
    boosted: Decimal
    isUnilevel: boolean
    directBonus: Decimal
    reactivationAmount: Decimal
    reactivationBonus: Decimal
    expiresAt: Date | null
    activatedAt: Date
    miner: {
        id: bigint
        name: string
        city: string
        state: string
    } | null
}[]> {
    try {
        const now = new Date()

        // Buscar todos os pacotes ativos do usuário que não expiraram
        const activePackages = await prisma.userPackage.findMany({
            where: {
                userId,
                isActive: true,
                OR: [
                    { expiresAt: null }, // Pacotes que não expiram
                    { expiresAt: { gt: now } } // Pacotes que ainda não expiraram
                ]
            },
            include: {
                package: true,
                miner: true
            },
            orderBy: {
                package: {
                    price: 'asc' // Ordenar por preço crescente (menor valor primeiro)
                }
            }
        })

        if (activePackages.length === 0) {
            console.log(`❌ Usuário ${Number(userId)} não possui pacotes ativos válidos`)
            return []
        }

        console.log(`✅ Encontrados ${activePackages.length} pacotes ativos para usuário ${Number(userId)}`)

        // Mapear e retornar todos os pacotes ativos
        return activePackages.map(activePackage => ({
            id: activePackage.id,
            packageId: activePackage.packageId,
            name: activePackage.package.name,
            description: activePackage.package.description,
            price: activePackage.package.price,
            purchasePrice: activePackage.priceSnapshot.gt(0)
                ? activePackage.priceSnapshot
                : activePackage.package.price,
            points: activePackage.package.points,
            isActive: activePackage.isActive,
            profitSharePercent: activePackage.package.profitSharePercent,
            boosted: activePackage.package.boosted,
            isUnilevel: activePackage.package.isUnilevel,
            directBonus: activePackage.package.directBonus,
            reactivationAmount: activePackage.package.reactivationAmount,
            reactivationBonus: activePackage.package.reactivationBonus,
            expiresAt: activePackage.expiresAt,
            activatedAt: activePackage.activatedAt,
            miner: activePackage.miner
                ? {
                    id: activePackage.miner.id,
                    name: activePackage.miner.name,
                    city: activePackage.miner.city,
                    state: activePackage.miner.state
                }
                : null
        }))
    } catch (error) {
        console.error(`❌ Erro ao buscar todos os pacotes ativos do usuário ${Number(userId)}:`, error)
        return []
    }
}