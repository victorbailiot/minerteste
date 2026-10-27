import { prisma } from '../src/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { ParameterKeys } from '../src/types/parameter-keys'

async function main() {
  console.log('🌱 Iniciando seed do sistema unilevel...')

  // ====================================
  // CRIAR PACOTES UNILEVEL
  // ====================================
  
  console.log('📦 Criando pacotes unilevel...')
  
  const packages = [
    {
      name: 'Átomo',
      price: new Decimal(99),
      points: 99,
      isUnilevel: true,
      cycleBonus: new Decimal(0),
      dailyCycles: 0,
      totalCycles: 0,
      profitSharePercent: new Decimal(0.5),
      binaryBonusPercent: new Decimal(0),
      binaryBonusDailyLimit: new Decimal(0),
      directBonus: new Decimal(30),
      reactivationAmount: new Decimal(29.90),
      reactivationBonus: new Decimal(2)
    },
    {
      name: 'Núcleo',
      price: new Decimal(999),
      points: 999,
      isUnilevel: true,
      cycleBonus: new Decimal(0),
      dailyCycles: 0,
      totalCycles: 0,
      profitSharePercent: new Decimal(4),
      binaryBonusPercent: new Decimal(0),
      binaryBonusDailyLimit: new Decimal(0),
      directBonus: new Decimal(200),
      reactivationAmount: new Decimal(69.90),
      reactivationBonus: new Decimal(3)
    },
    {
      name: 'Tecton',
      price: new Decimal(4999),
      points: 4999,
      isUnilevel: true,
      cycleBonus: new Decimal(0),
      dailyCycles: 0,
      totalCycles: 0,
      profitSharePercent: new Decimal(10),
      binaryBonusPercent: new Decimal(0),
      binaryBonusDailyLimit: new Decimal(0),
      directBonus: new Decimal(899),
      reactivationAmount: new Decimal(99.90),
      reactivationBonus: new Decimal(5)
    }
  ]

  for (const pkg of packages) {
    const existingPackage = await prisma.package.findFirst({
      where: { 
        name: pkg.name,
        isUnilevel: true
      }
    })

    if (!existingPackage) {
      await prisma.package.create({
        data: pkg
      })
      console.log(`   ✅ Pacote ${pkg.name} criado`)
    } else {
      console.log(`   ⏭️  Pacote ${pkg.name} já existe`)
    }
  }

  // ====================================
  // CRIAR NÍVEIS DE CARREIRA
  // ====================================
  
  console.log('🏆 Criando níveis de carreira...')
  
  const careerLevels = [
    {
      name: 'Cobre',
      requiredPoints: 500,
      maxTeamVolumePercent: new Decimal(60),
      indirectBonusLevels: 1,
      reactivationLevels: 1,
      extraProfitPercent: new Decimal(0),
      travelBonus: null,
      travelValue: null
    },
    {
      name: 'Prata',
      requiredPoints: 6000,
      maxTeamVolumePercent: new Decimal(50),
      indirectBonusLevels: 2,
      reactivationLevels: 2,
      extraProfitPercent: new Decimal(0),
      travelBonus: null,
      travelValue: null
    },
    {
      name: 'Ouro',
      requiredPoints: 35000,
      maxTeamVolumePercent: new Decimal(50),
      indirectBonusLevels: 3,
      reactivationLevels: 3,
      extraProfitPercent: new Decimal(0),
      travelBonus: null,
      travelValue: null
    },
    {
      name: 'Esmeralda',
      requiredPoints: 180000,
      maxTeamVolumePercent: new Decimal(40),
      indirectBonusLevels: 4,
      reactivationLevels: 4,
      extraProfitPercent: new Decimal(0),
      travelBonus: null,
      travelValue: null
    },
    {
      name: 'Safira',
      requiredPoints: 900000,
      maxTeamVolumePercent: new Decimal(40),
      indirectBonusLevels: 5,
      reactivationLevels: 5,
      extraProfitPercent: new Decimal(1),
      travelBonus: 'Viagem Nacional para casal',
      travelValue: new Decimal(12000)
    },
    {
      name: 'Nióbio',
      requiredPoints: 4000000,
      maxTeamVolumePercent: new Decimal(30),
      indirectBonusLevels: 6,
      reactivationLevels: 6,
      extraProfitPercent: new Decimal(2),
      travelBonus: 'Viagem Internacional para casal',
      travelValue: new Decimal(40000)
    },
    {
      name: 'Diamante',
      requiredPoints: 10000000,
      maxTeamVolumePercent: new Decimal(30),
      indirectBonusLevels: 7,
      reactivationLevels: 7,
      extraProfitPercent: new Decimal(3),
      travelBonus: 'Viagem de Luxo (Internacional)',
      travelValue: new Decimal(90000)
    }
  ]

  for (const level of careerLevels) {
    const existingLevel = await prisma.careerLevel.findFirst({
      where: { name: level.name }
    })

    if (!existingLevel) {
      await prisma.careerLevel.create({
        data: level
      })
      console.log(`✅ Nível ${level.name} criado`)
    } else {
      console.log(`⚠️  Nível ${level.name} já existe`)
    }
  }

  // ====================================
  // CRIAR PARÂMETROS UNILEVEL
  // ====================================
  
  console.log('⚙️  Criando parâmetros unilevel...')
  
  const parameters = [
    {
      key: ParameterKeys.UNILEVEL_INDIRECT_LEVEL_2_PERCENT,
      value: '5',
      type: 'PERCENTUAL' as const,
      description: 'Percentual de bônus indireto nível 2'
    },
    {
      key: ParameterKeys.UNILEVEL_INDIRECT_LEVEL_3_PERCENT,
      value: '4',
      type: 'PERCENTUAL' as const,
      description: 'Percentual de bônus indireto nível 3'
    },
    {
      key: ParameterKeys.UNILEVEL_INDIRECT_LEVEL_4_PERCENT,
      value: '3',
      type: 'PERCENTUAL' as const,
      description: 'Percentual de bônus indireto nível 4'
    },
    {
      key: ParameterKeys.UNILEVEL_INDIRECT_LEVEL_5_PERCENT,
      value: '2',
      type: 'PERCENTUAL' as const,
      description: 'Percentual de bônus indireto nível 5'
    },
    {
      key: ParameterKeys.UNILEVEL_INDIRECT_LEVEL_6_PERCENT,
      value: '1',
      type: 'PERCENTUAL' as const,
      description: 'Percentual de bônus indireto nível 6'
    },
    {
      key: ParameterKeys.UNILEVEL_INDIRECT_LEVEL_7_PERCENT,
      value: '1',
      type: 'PERCENTUAL' as const,
      description: 'Percentual de bônus indireto nível 7'
    },
    {
      key: ParameterKeys.UNILEVEL_MAX_INDIRECT_LEVELS,
      value: '7',
      type: 'INTEIRO' as const,
      description: 'Número máximo de níveis para bônus indireto'
    },
    {
      key: ParameterKeys.UNILEVEL_DIRECT_BONUS_ENABLED,
      value: 'true',
      type: 'BOOLEANO' as const,
      description: 'Habilitar bônus de indicação direta'
    },
    {
      key: ParameterKeys.UNILEVEL_INDIRECT_BONUS_ENABLED,
      value: 'true',
      type: 'BOOLEANO' as const,
      description: 'Habilitar bônus de indicação indireta'
    },
    {
      key: ParameterKeys.UNILEVEL_REACTIVATION_BONUS_ENABLED,
      value: 'true',
      type: 'BOOLEANO' as const,
      description: 'Habilitar bônus de reativação'
    },
    {
      key: ParameterKeys.UNILEVEL_CAREER_PROGRESSION_ENABLED,
      value: 'true',
      type: 'BOOLEANO' as const,
      description: 'Habilitar progressão de carreira'
    },
    {
      key: ParameterKeys.UNILEVEL_PROFIT_DISTRIBUTION_ENABLED,
      value: 'true',
      type: 'BOOLEANO' as const,
      description: 'Habilitar distribuição de lucros'
    },
    {
      key: ParameterKeys.UNILEVEL_TRAVEL_BONUS_ENABLED,
      value: 'true',
      type: 'BOOLEANO' as const,
      description: 'Habilitar bônus de viagem'
    },
    {
      key: ParameterKeys.BOOTED_BONUS,
      value: 'false',
      type: 'BOOLEANO' as const,
      description: 'Habilita o pagamento do bônus de indicação turbinada'
    }
  ]

  for (const param of parameters) {
    const existingParam = await prisma.parameter.findUnique({
      where: { key: param.key }
    })

    if (!existingParam) {
      await prisma.parameter.create({
        data: param
      })
      console.log(`✅ Parâmetro ${param.key} criado`)
    } else {
      console.log(`⚠️  Parâmetro ${param.key} já existe`)
    }
  }

  console.log('🎉 Seed do sistema unilevel concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 