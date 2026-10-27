import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from './prisma'
import {
  UpgradeResult,
  PackageUpgrade,
  PackageUpgradeInput,
  UserPackageData,
  PurchasePackageData,
  SystemPackageData
} from '../types/package-upgrade'

type PackageMinerGroupKey = string

interface PackageMinerGroup {
  packageId: bigint
  minerId: bigint | null
}

const matchesMinerId = (a?: bigint | null, b?: bigint | null): boolean => {
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  return a === b
}

/**
 * Mineradora efetiva ao criar pacotes de upgrade.
 * Pacotes legados sem mineradora (null) herdam a mineradora da compra atual.
 */
const resolveUpgradeMinerId = (
  groupMinerId: bigint | null,
  packageId: bigint,
  newPurchasePackages: PurchasePackageData[],
  purchaseMinerId?: bigint
): bigint | null => {
  if (groupMinerId != null) {
    return groupMinerId
  }

  const fromSamePackagePurchase = newPurchasePackages.find(
    (pkg) => pkg.packageId === packageId && pkg.minerId != null
  )
  if (fromSamePackagePurchase?.minerId != null) {
    return fromSamePackagePurchase.minerId
  }

  if (purchaseMinerId != null) {
    return purchaseMinerId
  }

  const fromAnyPurchase = newPurchasePackages.find((pkg) => pkg.minerId != null)
  if (fromAnyPurchase?.minerId != null) {
    return fromAnyPurchase.minerId
  }

  return null
}

const buildMinerIdWhere = (minerId: bigint | null) => {
  if (minerId == null) {
    return { equals: null } as const
  }
  return minerId
}

const buildPackageMinerGroupKey = (packageId: bigint, minerId?: bigint | null): PackageMinerGroupKey => {
  return `${packageId.toString()}:${minerId?.toString() ?? 'null'}`
}

const parsePackageMinerGroupKey = (key: PackageMinerGroupKey): PackageMinerGroup => {
  const separatorIndex = key.indexOf(':')
  const packageIdStr = key.slice(0, separatorIndex)
  const minerIdStr = key.slice(separatorIndex + 1)

  return {
    packageId: BigInt(packageIdStr),
    minerId: minerIdStr === 'null' ? null : BigInt(minerIdStr)
  }
}

/**
 * Processa o upgrade automático de pacotes
 * Verifica se a soma dos pacotes atuais + novos pacotes permite upgrade para pacotes superiores
 * 
 * @param input - Dados de entrada contendo pacotes atuais, nova compra e pacotes do sistema
 * @returns Resultado do upgrade com pacotes a ativar/desativar
 */
export async function processPackageUpgrade(
  input: PackageUpgradeInput
): Promise<UpgradeResult> {
  console.log('🔄 Iniciando processamento de upgrade automático de pacotes')
  
  try {
    // 1. Validar dados de entrada
    validateUpgradeInput(input)
    
    // 2. CASO ESPECIAL: Primeira compra (usuário sem pacotes atuais)
    if (!input.currentUserPackages || input.currentUserPackages.length === 0) {
      console.log('🆕 Primeira compra detectada - usuário não possui pacotes anteriores')
      console.log('✅ Criando pacotes diretamente sem processamento de upgrade')
      
      const result: UpgradeResult = {
        upgradedPackages: [],
        remainingPackages: [],
        disabledPackageIds: [],
        totalValueUsed: new Decimal(0),
        remainingValue: new Decimal(0)
      }
      
      // Adicionar todos os pacotes novos aos remainingPackages
      for (const pkg of input.newPurchasePackages) {
        console.log(`   📦 Adicionando ${pkg.quantity}x ${pkg.name} (R$ ${pkg.price})${pkg.minerId ? ` - Mineradora ${Number(pkg.minerId)}` : ''}`)
        result.remainingPackages.push({
          packageId: pkg.packageId,
          minerId: resolveUpgradeMinerId(
            pkg.minerId ?? null,
            pkg.packageId,
            input.newPurchasePackages,
            input.purchaseMinerId
          ),
          name: pkg.name,
          price: pkg.price,
          quantity: pkg.quantity,
          isUpgrade: false
        })
      }
      
      console.log(`🎉 ${result.remainingPackages.length} tipo(s) de pacote(s) para criar`)
      return result
    }
    
    // 3. Agrupar pacotes por tipo e mineradora (upgrades só combinam mesma mineradora)
    const groupedPackages = groupPackagesByTypeAndMiner(input.currentUserPackages, input.newPurchasePackages)
    console.log(`📊 Pacotes agrupados: ${Object.keys(groupedPackages).length} grupos (tipo + mineradora)`)
    
    // 4. Calcular valor total por tipo de pacote
    const packageTotals = calculatePackageTotals(groupedPackages)
    console.log(`💰 Totais calculados: ${Object.keys(packageTotals).length} tipos`)
    
    // 5. Ordenar pacotes do sistema por valor (hierarquia)
    const sortedSystemPackages = sortPackagesByPrice(input.allPackages)
    console.log(`📋 Pacotes do sistema ordenados: ${sortedSystemPackages.length} pacotes`)
    
    // 6. Processar upgrade para cada tipo de pacote
    const upgradeResults: UpgradeResult = {
      upgradedPackages: [],
      remainingPackages: [],
      disabledPackageIds: [],
      totalValueUsed: new Decimal(0),
      remainingValue: new Decimal(0)
    }
    
    for (const [groupKey, totals] of packageTotals) {
      const { packageId, minerId: groupMinerId } = parsePackageMinerGroupKey(groupKey)
      const outputMinerId = resolveUpgradeMinerId(
        groupMinerId,
        packageId,
        input.newPurchasePackages,
        input.purchaseMinerId
      )
      const currentPackage = findPackageById(packageId, input.allPackages)
      if (!currentPackage) continue
      
      const minerLabel = outputMinerId
        ? `Mineradora ${Number(outputMinerId)}`
        : groupMinerId
          ? `Mineradora ${Number(groupMinerId)}`
          : 'Sem mineradora'
      console.log(`🔍 Processando upgrade para pacote ${currentPackage.name} (${minerLabel})`)
      console.log(`   - Quantidade total: ${totals.totalQuantity}`)
      console.log(`   - Preço unitário: R$ ${totals.unitPrice}`)
      console.log(`   - Valor total: R$ ${totals.totalValue}`)
      
      // Encontrar próximo pacote na hierarquia
      const nextPackage = findNextPackage(currentPackage, sortedSystemPackages)
      
      if (nextPackage) {
        console.log(`⬆️ Upgrade possível para ${nextPackage.name} (R$ ${nextPackage.price})`)
        
        // Calcular quantos pacotes superiores podem ser criados
        const upgradeCalculation = calculateUpgrade(
          currentPackage, 
          nextPackage, 
          totals.totalValue, 
          totals.totalQuantity,
          input.currentUserPackages,
          groupMinerId,
          outputMinerId
        )
        
        if (upgradeCalculation.canUpgrade) {
          console.log(`🐛 DEBUG: upgradeCalculation.remainingPackages ANTES de adicionar:`)
          console.log(`   ${JSON.stringify(upgradeCalculation.remainingPackages)}`)
          
          // Adicionar pacotes de upgrade
          upgradeResults.upgradedPackages.push(...upgradeCalculation.upgradedPackages)
          
          // Adicionar pacotes restantes (se houver)
          upgradeResults.remainingPackages.push(...upgradeCalculation.remainingPackages)
          
          console.log(`🐛 DEBUG: upgradeResults.remainingPackages DEPOIS de adicionar:`)
          console.log(`   ${JSON.stringify(upgradeResults.remainingPackages)}`)
          
          // Adicionar IDs dos pacotes a desativar
          upgradeResults.disabledPackageIds.push(...upgradeCalculation.disabledPackageIds)
          
          // Atualizar valores totais
          upgradeResults.totalValueUsed = upgradeResults.totalValueUsed.add(upgradeCalculation.valueUsed)
          upgradeResults.remainingValue = upgradeResults.remainingValue.add(upgradeCalculation.remainingValue)
          
          console.log(`✅ Upgrade processado: ${upgradeCalculation.upgradedPackages.length} pacotes superiores, ${upgradeCalculation.remainingPackages.length} restantes`)
        } else {
          console.log(`⚠️ Upgrade não possível para ${currentPackage.name}`)
          
          // Verificar se há pacotes NOVOS sendo comprados deste tipo e mineradora
          const newPurchaseCount = input.newPurchasePackages
            .filter(pkg => pkg.packageId === packageId && matchesMinerId(pkg.minerId, groupMinerId))
            .reduce((sum, pkg) => sum + pkg.quantity, 0)
          
          const existingCount = input.currentUserPackages
            .filter(pkg => pkg.packageId === packageId && matchesMinerId(pkg.minerId, groupMinerId) && pkg.isActive)
            .length
          
          console.log(`   📊 Existentes (${minerLabel}): ${existingCount}, Novos: ${newPurchaseCount}, Total: ${totals.totalQuantity}`)
          
          // Se há pacotes NOVOS sendo comprados, precisamos criá-los
          if (newPurchaseCount > 0) {
            console.log(`   ✅ Criando ${newPurchaseCount} ${currentPackage.name} novos (${minerLabel})`)
            upgradeResults.remainingPackages.push({
              packageId: currentPackage.id,
              minerId: outputMinerId,
              name: currentPackage.name,
              price: currentPackage.price,
              quantity: newPurchaseCount,
              isUpgrade: false,
              directBonus: currentPackage.directBonus
            })
          }
          
          // Os pacotes que JÁ EXISTIAM permanecem inalterados no banco (não desativar nem recriar)
          if (existingCount > 0) {
            console.log(`   ✅ Mantendo ${existingCount} ${currentPackage.name} existentes (${minerLabel}, sem modificação)`)
          }
        }
      } else {
        console.log(`🔝 Pacote ${currentPackage.name} já é o mais alto da hierarquia (${minerLabel})`)
        
        // Verificar se há pacotes NOVOS sendo comprados deste tipo e mineradora
        const newPurchaseCount = input.newPurchasePackages
          .filter(pkg => pkg.packageId === packageId && matchesMinerId(pkg.minerId, groupMinerId))
          .reduce((sum, pkg) => sum + pkg.quantity, 0)
        
        const existingCount = input.currentUserPackages
          .filter(pkg => pkg.packageId === packageId && matchesMinerId(pkg.minerId, groupMinerId) && pkg.isActive)
          .length
        
        console.log(`   📊 Existentes (${minerLabel}): ${existingCount}, Novos: ${newPurchaseCount}, Total: ${totals.totalQuantity}`)
        
        // Se há pacotes NOVOS sendo comprados, precisamos criá-los
        if (newPurchaseCount > 0) {
          console.log(`   ✅ Criando ${newPurchaseCount} ${currentPackage.name} novos (${minerLabel})`)
          upgradeResults.remainingPackages.push({
            packageId: currentPackage.id,
            minerId: outputMinerId,
            name: currentPackage.name,
            price: currentPackage.price,
            quantity: newPurchaseCount,
            isUpgrade: false,
            directBonus: currentPackage.directBonus
          })
        }
        
        // Os pacotes que JÁ EXISTIAM permanecem inalterados no banco (não desativar nem recriar)
        if (existingCount > 0) {
          console.log(`   ✅ Mantendo ${existingCount} ${currentPackage.name} existentes (${minerLabel}, sem modificação)`)
        }
      }
    }
    
    console.log(`🎉 Upgrade processado com sucesso:`)
    console.log(`   - ${upgradeResults.upgradedPackages.length} pacotes para upgrade`)
    console.log(`   - ${upgradeResults.remainingPackages.length} pacotes restantes`)
    console.log(`   - ${upgradeResults.disabledPackageIds.length} pacotes a desativar`)
    console.log(`   - Valor usado: R$ ${upgradeResults.totalValueUsed}`)
    console.log(`   - Valor restante: R$ ${upgradeResults.remainingValue}`)
    
    return upgradeResults
    
  } catch (error) {
    console.error('❌ Erro ao processar upgrade de pacotes:', error)
    throw error
  }
}

/**
 * Valida os dados de entrada do upgrade
 */
function validateUpgradeInput(input: PackageUpgradeInput): void {
  // ✅ PERMITIR usuários sem pacotes atuais (primeira compra)
  // Não validar currentUserPackages - pode ser vazio em primeira compra
  
  if (!input.newPurchasePackages || input.newPurchasePackages.length === 0) {
    throw new Error('Pacotes da nova compra não fornecidos')
  }
  
  if (!input.allPackages || input.allPackages.length === 0) {
    throw new Error('Pacotes do sistema não fornecidos')
  }
}

/**
 * Agrupa pacotes por tipo (packageId) e mineradora
 * Upgrades só combinam pacotes da mesma mineradora
 */
function groupPackagesByTypeAndMiner(
  currentPackages: UserPackageData[],
  newPackages: PurchasePackageData[]
): Map<PackageMinerGroupKey, Array<{ packageId: bigint; minerId: bigint | null; name: string; price: Decimal; quantity: number }>> {
  const grouped = new Map<PackageMinerGroupKey, Array<{ packageId: bigint; minerId: bigint | null; name: string; price: Decimal; quantity: number }>>()
  
  const addToGroup = (
    packageId: bigint,
    minerId: bigint | null | undefined,
    name: string,
    price: Decimal,
    quantity: number
  ) => {
    const normalizedMinerId = minerId ?? null
    const groupKey = buildPackageMinerGroupKey(packageId, normalizedMinerId)

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, [])
    }

    grouped.get(groupKey)!.push({
      packageId,
      minerId: normalizedMinerId,
      name,
      price,
      quantity
    })
  }
  
  // Adicionar pacotes atuais (cada um conta como 1 unidade)
  for (const pkg of currentPackages) {
    addToGroup(pkg.packageId, pkg.minerId, pkg.name, pkg.price, 1)
  }
  
  // Adicionar pacotes da nova compra (com suas quantidades)
  for (const pkg of newPackages) {
    addToGroup(pkg.packageId, pkg.minerId, pkg.name, pkg.price, pkg.quantity)
  }
  
  return grouped
}

/**
 * Calcula o valor total por tipo de pacote
 * IMPORTANTE: Calcula baseado na QUANTIDADE TOTAL de pacotes × preço unitário
 */
function calculatePackageTotals(
  groupedPackages: Map<PackageMinerGroupKey, Array<{ packageId: bigint; minerId: bigint | null; name: string; price: Decimal; quantity: number }>>
): Map<PackageMinerGroupKey, { totalValue: Decimal; totalQuantity: number; unitPrice: Decimal }> {
  const totals = new Map<PackageMinerGroupKey, { totalValue: Decimal; totalQuantity: number; unitPrice: Decimal }>()
  
  for (const [groupKey, packages] of groupedPackages) {
    let totalQuantity = 0
    let unitPrice = new Decimal(0)
    
    // Somar quantidades totais
    for (const pkg of packages) {
      totalQuantity += pkg.quantity
      unitPrice = pkg.price // Pegar preço unitário (todos devem ser iguais)
    }
    
    // Calcular valor total: quantidade × preço unitário
    const totalValue = unitPrice.mul(totalQuantity)
    const { packageId, minerId } = parsePackageMinerGroupKey(groupKey)
    
    console.log(`📊 Pacote ID ${packageId} (${minerId ? `Mineradora ${Number(minerId)}` : 'Sem mineradora'}): ${totalQuantity} unidades × R$ ${unitPrice} = R$ ${totalValue}`)
    
    totals.set(groupKey, { totalValue, totalQuantity, unitPrice })
  }
  
  return totals
}

/**
 * Ordena pacotes do sistema por preço (hierarquia crescente)
 */
function sortPackagesByPrice(packages: SystemPackageData[]): SystemPackageData[] {
  return [...packages].sort((a, b) => {
    return a.price.comparedTo(b.price)
  })
}

/**
 * Encontra pacote por ID
 */
function findPackageById(packageId: bigint, packages: SystemPackageData[]): SystemPackageData | null {
  return packages.find(pkg => pkg.id === packageId) || null
}

/**
 * Encontra o próximo pacote na hierarquia (próximo valor mais alto)
 */
function findNextPackage(
  currentPackage: SystemPackageData,
  sortedPackages: SystemPackageData[]
): SystemPackageData | null {
  const currentIndex = sortedPackages.findIndex(pkg => pkg.id === currentPackage.id)
  
  if (currentIndex === -1 || currentIndex === sortedPackages.length - 1) {
    return null // Pacote não encontrado ou já é o mais alto
  }
  
  return sortedPackages[currentIndex + 1]
}

/**
 * Calcula o upgrade para um tipo de pacote específico
 * @param currentPackage Pacote atual
 * @param nextPackage Próximo pacote na hierarquia
 * @param totalValue Valor total dos pacotes (quantidade × preço)
 * @param totalQuantity Quantidade total de pacotes (antigos + novos)
 * @param currentUserPackages Pacotes que o usuário JÁ TEM (para desativar)
 */
function calculateUpgrade(
  currentPackage: SystemPackageData,
  nextPackage: SystemPackageData,
  totalValue: Decimal,
  totalQuantity: number,
  currentUserPackages: UserPackageData[],
  groupMinerId: bigint | null,
  outputMinerId: bigint | null
): {
  canUpgrade: boolean
  upgradedPackages: PackageUpgrade[]
  remainingPackages: PackageUpgrade[]
  disabledPackageIds: bigint[]
  valueUsed: Decimal
  remainingValue: Decimal
} {
  console.log(`🧮 Calculando upgrade:`)
  console.log(`   - De: ${currentPackage.name} (${totalQuantity} unidades = R$ ${totalValue})`)
  console.log(`   - Para: ${nextPackage.name} (R$ ${nextPackage.price})`)
  console.log(`   - Mineradora (grupo): ${groupMinerId ? Number(groupMinerId) : 'Sem mineradora'}`)
  console.log(`   - Mineradora (saída): ${outputMinerId ? Number(outputMinerId) : 'Sem mineradora'}`)
  
  const result = {
    canUpgrade: false,
    upgradedPackages: [] as PackageUpgrade[],
    remainingPackages: [] as PackageUpgrade[],
    disabledPackageIds: [] as bigint[],
    valueUsed: new Decimal(0),
    remainingValue: totalValue
  }
  
  // Verificar se o valor total permite pelo menos um upgrade
  // Com os valores corretos (99.99, 999.90, 4999.50), os upgrades são EXATOS:
  // - 10 Átomos = R$ 999.90 = 1 Núcleo ✅
  // - 5 Núcleos = R$ 4.999,50 = 1 Tecton ✅
  
  if (totalValue.lt(nextPackage.price)) {
    const diffFromNextPackage = nextPackage.price.sub(totalValue)
    console.log(`❌ Valor insuficiente: R$ ${totalValue} < R$ ${nextPackage.price} (faltam R$ ${diffFromNextPackage})`)
    return result
  }
  
  // Calcular quantos pacotes superiores podem ser criados
  const upgradeCount = Math.floor(totalValue.div(nextPackage.price).toNumber())
  
  if (upgradeCount === 0) {
    console.log(`❌ Quantidade insuficiente para upgrade`)
    return result
  }
  
  // Calcular valores
  const valueUsedForUpgrades = nextPackage.price.mul(upgradeCount)
  const remainingValue = totalValue.sub(valueUsedForUpgrades)
  
  console.log(`📊 Upgrade calculado: ${upgradeCount} pacotes de R$ ${nextPackage.price} = R$ ${valueUsedForUpgrades}`)
  console.log(`💰 Valor restante: R$ ${remainingValue}`)
  
  if (upgradeCount > 0) {
    result.canUpgrade = true
    result.valueUsed = valueUsedForUpgrades
    result.remainingValue = remainingValue
    
    // Criar pacotes de upgrade
    result.upgradedPackages.push({
      packageId: nextPackage.id,
      minerId: outputMinerId,
      name: nextPackage.name,
      price: nextPackage.price,
      quantity: upgradeCount,
      isUpgrade: true,
      directBonus: nextPackage.directBonus
    })
    
    // Se sobrou valor, criar pacotes do tipo atual
    // Exemplo: 12 Átomos = R$ 1.199,88 → 1 Núcleo (R$ 999.90) + 2 Átomos restantes (R$ 199.98)
    if (remainingValue.gte(currentPackage.price)) {
      const remainingCount = Math.floor(remainingValue.div(currentPackage.price).toNumber())
      
      if (remainingCount > 0) {
        console.log(`   📦 Sobrou valor para ${remainingCount} ${currentPackage.name}`)
        
        result.remainingPackages.push({
          packageId: currentPackage.id,
          minerId: outputMinerId,
          name: currentPackage.name,
          price: currentPackage.price,
          quantity: remainingCount,
          isUpgrade: false,
          directBonus: currentPackage.directBonus
        })

        // Recalcular valor final após criar pacotes restantes
        const valueUsedForRemaining = currentPackage.price.mul(remainingCount)
        result.remainingValue = remainingValue.sub(valueUsedForRemaining)
        console.log(`   💰 Valor final desperdiçado (< 1 pacote): R$ ${result.remainingValue}`)
      }
    } else {
      result.remainingValue = remainingValue
      console.log(`   ⚠️  Sobrou R$ ${remainingValue} (não dá para criar 1 ${currentPackage.name})`)
    }
    
    // Marcar pacotes atuais deste tipo e mineradora para desativação
    const currentPackageIds = currentUserPackages
      .filter(pkg =>
        pkg.packageId === currentPackage.id &&
        pkg.isActive &&
        matchesMinerId(pkg.minerId, groupMinerId)
      )
      .map(pkg => pkg.id)
    
    result.disabledPackageIds.push(...currentPackageIds)
    
    console.log(`✅ Upgrade aprovado:`)
    console.log(`   - ${upgradeCount} ${nextPackage.name} criados`)
    console.log(`   - ${result.remainingPackages.length > 0 ? result.remainingPackages[0].quantity : 0} ${currentPackage.name} restantes`)
    console.log(`   - ${currentPackageIds.length} pacotes antigos desativados`)
  }
  
  // 🐛 DEBUG: Log completo do resultado
  console.log(`\n🔍 DEBUG calculateUpgrade RESULTADO:`)
  console.log(`   canUpgrade: ${result.canUpgrade}`)
  console.log(`   upgradedPackages: ${JSON.stringify(result.upgradedPackages)}`)
  console.log(`   remainingPackages: ${JSON.stringify(result.remainingPackages)}`)
  console.log(`   disabledPackageIds: ${result.disabledPackageIds.length} IDs`)
  console.log(`   valueUsed: R$ ${result.valueUsed}`)
  console.log(`   remainingValue: R$ ${result.remainingValue}\n`)
  
  return result
}

/**
 * Busca pacotes ativos do usuário para processamento de upgrade
 */
export async function getUserActivePackagesForUpgrade(userId: bigint): Promise<UserPackageData[]> {
  console.log(`🔍 Buscando pacotes ativos do usuário ${Number(userId)} para upgrade...`)
  
  const userPackages = await prisma.userPackage.findMany({
    where: {
      userId,
      isActive: true,
      isUnilevel: true,  // ← Apenas pacotes unilevel para upgrade
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    },
    include: {
      package: true
    },
    orderBy: {
      package: {
        price: 'asc'
      }
    }
  })
  
  console.log(`✅ Encontrados ${userPackages.length} pacotes ativos para upgrade`)
  userPackages.forEach(up => {
    console.log(`   - ${up.package.name} (ID: ${Number(up.id)}, PackageID: ${Number(up.packageId)}, Mineradora: ${up.minerId ? Number(up.minerId) : 'N/A'}, Active: ${up.isActive}, Unilevel: ${up.isUnilevel})`)
  })
  
  return userPackages.map(up => ({
    id: up.id,
    packageId: up.packageId,
    minerId: up.minerId,
    name: up.package.name,
    price: up.package.price,
    isActive: up.isActive,
    activatedAt: up.activatedAt
  }))
}

/**
 * Busca todos os pacotes do sistema ordenados por preço
 */
export async function getAllSystemPackages(): Promise<SystemPackageData[]> {
  const packages = await prisma.package.findMany({
    where: {
      isActive: true
    },
    orderBy: {
      price: 'asc'
    }
  })
  
  return packages.map((pkg, index) => ({
    id: pkg.id,
    name: pkg.name,
    price: pkg.price,
    hierarchyOrder: index + 1,
    directBonus: pkg.directBonus
  }))
}

/**
 * Processa upgrades em cascata recursivamente
 * Verifica se os pacotes recém-criados podem fazer upgrade novamente
 * 
 * @param userId - ID do usuário
 * @param newlyCreatedPackages - Pacotes que foram criados no upgrade atual
 * @param transactionId - ID da transação
 * @returns Resultado com novos upgrades processados
 */
async function processCascadeUpgrades(
  userId: bigint,
  newlyCreatedPackages: any[],
  transactionId: bigint,
  fallbackMinerId?: bigint
): Promise<{
  upgradedUserPackages: any[]
  disabledCount: number
}> {
  const result = {
    upgradedUserPackages: [] as any[],
    disabledCount: 0
  }
  
  if (newlyCreatedPackages.length === 0) {
    return result
  }
  
  try {
    // 1. Buscar todos os pacotes do sistema ordenados
    const allSystemPackages = await getAllSystemPackages()
    const sortedSystemPackages = sortPackagesByPrice(allSystemPackages)
    
    // 2. Agrupar pacotes criados por tipo e mineradora
    const packagesByTypeAndMiner = new Map<PackageMinerGroupKey, { packageId: bigint; minerId: bigint | null; quantity: number }>()
    for (const pkg of newlyCreatedPackages) {
      const groupKey = buildPackageMinerGroupKey(pkg.packageId, pkg.minerId ?? null)
      const current = packagesByTypeAndMiner.get(groupKey)

      if (current) {
        current.quantity += 1
        continue
      }

      packagesByTypeAndMiner.set(groupKey, {
        packageId: pkg.packageId,
        minerId: pkg.minerId ?? null,
        quantity: 1
      })
    }
    
    // 3. Para cada grupo (tipo + mineradora), verificar se pode fazer upgrade
    for (const [groupKey, groupData] of packagesByTypeAndMiner) {
      const { packageId, minerId } = groupData
      const currentPackage = findPackageById(packageId, sortedSystemPackages)
      if (!currentPackage) {
        console.log(`⚠️  Pacote ${Number(packageId)} não encontrado no sistema, pulando verificação`)
        continue
      }
      
      const minerLabel = minerId ? `Mineradora ${Number(minerId)}` : 'Sem mineradora'
      console.log(`\n🔍 Verificando upgrade em cascata para ${currentPackage.name} (${minerLabel})...`)
      
      // 4. Buscar pacotes ativos deste tipo e mineradora (incluindo os recém-criados)
      const allActivePackages = await prisma.userPackage.findMany({
        where: {
          userId,
          packageId,
          minerId: buildMinerIdWhere(minerId),
          isActive: true,
          isUnilevel: true
        },
        include: {
          package: {
            select: {
              id: true,
              name: true,
              price: true
            }
          }
        }
      })
      
      const totalQuantity = allActivePackages.length
      const totalValue = currentPackage.price.mul(totalQuantity)
      
      console.log(`   📊 Total de ${currentPackage.name} ativos (${minerLabel}): ${totalQuantity}`)
      console.log(`   💰 Valor total: R$ ${totalValue} (${totalQuantity} × R$ ${currentPackage.price})`)
      
      // 5. Encontrar próximo pacote na hierarquia
      const nextPackage = findNextPackage(currentPackage, sortedSystemPackages)
      
      if (!nextPackage) {
        console.log(`   🔝 ${currentPackage.name} já é o pacote mais alto, sem upgrade possível`)
        continue
      }
      
      console.log(`   ⬆️  Próximo pacote: ${nextPackage.name} (R$ ${nextPackage.price})`)
      
      // 6. Verificar se o valor total permite upgrade
      if (totalValue.lt(nextPackage.price)) {
        const diff = nextPackage.price.sub(totalValue)
        console.log(`   ❌ Valor insuficiente: faltam R$ ${diff} para upgrade`)
        continue
      }
      
      // 7. Calcular quantos pacotes superiores podem ser criados
      const upgradeCount = Math.floor(totalValue.div(nextPackage.price).toNumber())
      
      if (upgradeCount === 0) {
        console.log(`   ❌ Quantidade insuficiente para upgrade`)
        continue
      }
      
      const valueUsedForUpgrades = nextPackage.price.mul(upgradeCount)
      const remainingValue = totalValue.sub(valueUsedForUpgrades)
      
      console.log(`   ✅ Upgrade possível: ${upgradeCount} ${nextPackage.name}(s)`)
      console.log(`   💰 Valor usado: R$ ${valueUsedForUpgrades}`)
      console.log(`   💰 Valor restante: R$ ${remainingValue}`)
      
      // 8. Desativar todos os pacotes ativos deste tipo
      const packageIdsToDisable = allActivePackages.map(pkg => pkg.id)
      
      await prisma.userPackage.updateMany({
        where: {
          id: { in: packageIdsToDisable },
          userId
        },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      })
      
      result.disabledCount += packageIdsToDisable.length
      console.log(`   🗑️  ${packageIdsToDisable.length} pacotes desativados`)
      
      const effectiveMinerId = minerId ?? fallbackMinerId ?? null

      // 9. Criar pacotes de upgrade
      const newUpgradedPackages: any[] = []
      for (let i = 0; i < upgradeCount; i++) {
        const newUserPackage = await prisma.userPackage.create({
          data: {
            userId,
            packageId: nextPackage.id,
            minerId: effectiveMinerId,
            isActive: true,
            isUnilevel: true,
            activatedAt: new Date(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
            transactionId,
            directBonusSnapshot: nextPackage.directBonus,
            priceSnapshot: nextPackage.price
          }
        })
        
        newUpgradedPackages.push(newUserPackage)
        result.upgradedUserPackages.push(newUserPackage)
      }
      
      console.log(`   ✅ ${upgradeCount} ${nextPackage.name}(s) criados`)
      
      // 10. Se sobrou valor suficiente, criar pacotes restantes do tipo atual
      if (remainingValue.gte(currentPackage.price)) {
        const remainingCount = Math.floor(remainingValue.div(currentPackage.price).toNumber())
        
        if (remainingCount > 0) {
          console.log(`   📦 Criando ${remainingCount} ${currentPackage.name}(s) restantes...`)
          
          for (let i = 0; i < remainingCount; i++) {
            const remainingPackage = await prisma.userPackage.create({
              data: {
                userId,
                packageId: currentPackage.id,
                minerId: effectiveMinerId,
                isActive: true,
                isUnilevel: true,
                activatedAt: new Date(),
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
                transactionId,
                directBonusSnapshot: currentPackage.directBonus,
                priceSnapshot: currentPackage.price
              }
            })
            
            console.log(`   ✅ Pacote restante ${i+1}/${remainingCount} criado`)
          }
        }
      }
      
      // 11. RECURSÃO: Verificar se os novos pacotes criados podem fazer upgrade novamente
      if (newUpgradedPackages.length > 0) {
        console.log(`\n🔄 Verificando upgrade recursivo para ${nextPackage.name}...`)
        const recursiveResult = await processCascadeUpgrades(
          userId,
          newUpgradedPackages,
          transactionId,
          fallbackMinerId
        )
        
        result.upgradedUserPackages.push(...recursiveResult.upgradedUserPackages)
        result.disabledCount += recursiveResult.disabledCount
      }
    }
    
    return result
    
  } catch (error) {
    console.error('❌ Erro ao processar upgrades em cascata:', error)
    throw error
  }
}

/**
 * Aplica o resultado do upgrade no banco de dados
 */
export async function applyUpgradeResult(
  userId: bigint,
  upgradeResult: UpgradeResult,
  transactionId: bigint,
  skipRemainingCreation: boolean = false,
  fallbackMinerId?: bigint
): Promise<{
  upgradedUserPackages: any[]
  remainingUserPackages: any[]
  disabledCount: number
  packagesBeforeDisable: Array<{ packageId: bigint; count: number }>
}> {
  console.log('🔧 Aplicando resultado do upgrade no banco de dados')
  if (skipRemainingCreation) {
    console.log('⚠️  MODO: Pular criação de remainingPackages (já foram criados anteriormente)')
  }
  
  const result = {
    upgradedUserPackages: [] as any[],
    remainingUserPackages: [] as any[],
    disabledCount: 0,
    packagesBeforeDisable: [] as Array<{ packageId: bigint; count: number }>
  }
  
  try {
    // 1. CAPTURAR INFORMAÇÕES DOS PACOTES ANTES DE DESATIVAR (para cálculo de histórico)
    if (upgradeResult.disabledPackageIds.length > 0) {
      console.log('📊 Capturando informações dos pacotes ANTES de desativar...')
      
      const packagesToDisable = await prisma.userPackage.findMany({
        where: {
          id: { in: upgradeResult.disabledPackageIds },
          userId,
          isActive: true
        },
        select: {
          id: true,
          packageId: true
        }
      })
      
      // Agrupar por packageId e contar
      const packageCounts = new Map<bigint, number>()
      for (const pkg of packagesToDisable) {
        const current = packageCounts.get(pkg.packageId) || 0
        packageCounts.set(pkg.packageId, current + 1)
      }
      
      // Converter para array de resultado
      result.packagesBeforeDisable = Array.from(packageCounts.entries()).map(([packageId, count]) => ({
        packageId,
        count
      }))
      
      console.log(`📦 Pacotes que serão desativados:`)
      for (const info of result.packagesBeforeDisable) {
        console.log(`   - PackageId ${Number(info.packageId)}: ${info.count} pacote(s)`)
      }
    }
    
    // 2. Desativar pacotes antigos
    if (upgradeResult.disabledPackageIds.length > 0) {
      const disabledResult = await prisma.userPackage.updateMany({
        where: {
          id: { in: upgradeResult.disabledPackageIds },
          userId
        },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      })
      
      result.disabledCount = disabledResult.count
      console.log(`✅ ${disabledResult.count} pacotes desativados`)
    }
    
    // 3. Criar pacotes de upgrade
    for (const upgradePkg of upgradeResult.upgradedPackages) {
      for (let i = 0; i < upgradePkg.quantity; i++) {
        const newUserPackage = await prisma.userPackage.create({
          data: {
            userId,
            packageId: upgradePkg.packageId,
            minerId: upgradePkg.minerId ?? fallbackMinerId ?? null,
            isActive: true,
            isUnilevel: true,
            activatedAt: new Date(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
            transactionId,
            directBonusSnapshot: upgradePkg.directBonus ?? new Decimal(0),
            priceSnapshot: upgradePkg.price
          }
        })
        
        result.upgradedUserPackages.push(newUserPackage)
      }
    }
    
    // 4. Criar pacotes restantes (se não foi pulado)
    if (!skipRemainingCreation) {
      console.log(`🐛 DEBUG: upgradeResult.remainingPackages.length = ${upgradeResult.remainingPackages.length}`)
      for (const remainingPkg of upgradeResult.remainingPackages) {
        console.log(`🐛 DEBUG: Criando ${remainingPkg.quantity} pacotes restantes de ${remainingPkg.name}`)
        
        for (let i = 0; i < remainingPkg.quantity; i++) {
          const newUserPackage = await prisma.userPackage.create({
            data: {
              userId,
              packageId: remainingPkg.packageId,
              minerId: remainingPkg.minerId ?? fallbackMinerId ?? null,
              isActive: true,
              isUnilevel: true,
              activatedAt: new Date(),
              expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
              transactionId,
              directBonusSnapshot: remainingPkg.directBonus ?? new Decimal(0),
              priceSnapshot: remainingPkg.price
            }
          })
          
          result.remainingUserPackages.push(newUserPackage)
          console.log(`   ✅ Pacote restante ${i+1}/${remainingPkg.quantity} criado`)
        }
      }
    } else {
      console.log(`⏭️  Pulando criação de remainingPackages (${upgradeResult.remainingPackages.length} pacotes já foram criados anteriormente)`)
    }
    
    console.log(`✅ Upgrade aplicado com sucesso:`)
    console.log(`   - ${result.upgradedUserPackages.length} pacotes de upgrade criados`)
    console.log(`   - ${result.remainingUserPackages.length} pacotes restantes criados`)
    console.log(`   - ${result.disabledCount} pacotes desativados`)
    
    // 5. VERIFICAÇÃO RECURSIVA: Verificar se os pacotes criados podem fazer upgrade novamente
    console.log(`\n🔄 Verificando upgrades em cascata para pacotes recém-criados...`)
    const cascadeUpgradeResult = await processCascadeUpgrades(
      userId,
      result.upgradedUserPackages,
      transactionId,
      fallbackMinerId
    )
    
    // Atualizar contadores com os upgrades em cascata
    result.upgradedUserPackages.push(...cascadeUpgradeResult.upgradedUserPackages)
    result.disabledCount += cascadeUpgradeResult.disabledCount
    
    if (cascadeUpgradeResult.upgradedUserPackages.length > 0) {
      console.log(`✅ Upgrades em cascata processados:`)
      console.log(`   - ${cascadeUpgradeResult.upgradedUserPackages.length} novos pacotes de upgrade criados`)
      console.log(`   - ${cascadeUpgradeResult.disabledCount} pacotes desativados no processo`)
    } else {
      console.log(`ℹ️  Nenhum upgrade em cascata necessário`)
    }
    
    // OTIMIZAÇÃO: Não é mais necessário recalcular pontuação manualmente
    // A nova estratégia de pontos já atualiza automaticamente via processPackagePurchaseUnilevel()
    console.log(`\n✅ Pontuação será atualizada automaticamente pelo sistema de cache`)
    console.log(`   ℹ️  Os pontos serão recalculados em background pelo job assíncrono`)
    
    return result
    
  } catch (error) {
    console.error('❌ Erro ao aplicar upgrade no banco de dados:', error)
    throw error
  }
}
