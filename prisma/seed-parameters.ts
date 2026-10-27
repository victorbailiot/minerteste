import { PrismaClient } from '../src/generated/prisma'
import { ParameterKeys } from '../src/types/parameter-keys'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Iniciando seed dos parâmetros de sistema...')

  const initialParameters = [
    {
      key: ParameterKeys.DIRECT_COMMISSION_PERCENTAGE,
      value: '7',
      type: 'PERCENTUAL',
      description: 'Percentual de comissão para indicação direta',
      status: 'ATIVO'
    },
    {
      key: ParameterKeys.INDIRECT_COMMISSION_LEVEL_1,
      value: '2',
      type: 'PERCENTUAL',
      description: 'Percentual de comissão para indicação indireta - Nível 1',
      status: 'ATIVO'
    },
    {
      key: ParameterKeys.INDIRECT_COMMISSION_LEVEL_2,
      value: '1',
      type: 'PERCENTUAL',
      description: 'Percentual de comissão para indicação indireta - Nível 2',
      status: 'ATIVO'
    },
    {
      key: ParameterKeys.CYCLE_POINTS_MAJOR_LEG,
      value: '900',
      type: 'INTEIRO',
      description: 'Pontuação necessária na perna maior para formar ciclo',
      status: 'ATIVO'
    },
    {
      key: ParameterKeys.CYCLE_POINTS_MINOR_LEG,
      value: '300',
      type: 'INTEIRO',
      description: 'Pontuação necessária na perna menor para formar ciclo',
      status: 'ATIVO'
    },
    {
      key: ParameterKeys.BONUS_CYCLE_ENABLED,
      value: 'true',
      type: 'BOOLEANO',
      description: 'Ativar ou desativar bônus de ciclo',
      status: 'INATIVO'
    },
    {
      key: ParameterKeys.USER_ACTIVATION_MIN_POINTS_PERCENTAGE,
      value: '10',
      type: 'PERCENTUAL',
      description: 'Percentual mínimo de pontos para ativação do usuário',
      status: 'ATIVO'
    },
    {
      key: ParameterKeys.COMMISSION_LEVELS_CONFIG,
      value: JSON.stringify({
        level_1: { percentage: 7, description: 'Primeiro nível de indicação indireta' },
        level_2: { percentage: 2, description: 'Segundo nível de indicação indireta' },
        level_3: { percentage: 1, description: 'Terceiro nível de indicação indireta' }
      }),
      type: 'JSON',
      description: 'Configuração completa dos níveis de comissão indireta',
      status: 'ATIVO'
    },
    {
      key: ParameterKeys.PACKAGE_MULTIPLIERS,
      value: JSON.stringify({
        adcentral: { multiplier: 1, min_points: 100 },
        family: { multiplier: 2, min_points: 500 },
        tbuild: { multiplier: 3, min_points: 1000 }
      }),
      type: 'JSON',
      description: 'Multiplicadores e pontos mínimos por tipo de pacote',
      status: 'ATIVO'
    },
    {
      key: ParameterKeys.PROFIT_DISTRIBUTION_ENABLED,
      value: 'true',
      type: 'BOOLEANO',
      description: 'Ativar ou desativar distribuição de lucros',
      status: 'ATIVO'
    },
    {
      key: ParameterKeys.WITHDRAWAL_MIN_AMOUNT,
      value: '50',
      type: 'INTEIRO',
      description: 'Valor mínimo para solicitação de saque',
      status: 'ATIVO'
    },
    {
      key: ParameterKeys.WITHDRAWAL_FEE_PERCENTAGE,
      value: '4.99',
      type: 'PERCENTUAL',
      description: 'Taxa percentual sobre saques',
      status: 'ATIVO'
    },
    {
      key: ParameterKeys.CYCLE_BONUS_AMOUNT,
      value: '50',
      type: 'INTEIRO',
      description: 'Valor do bônus por ciclo completado em USD',
      status: 'ATIVO'
    },
    {
      key: ParameterKeys.MAX_CYCLES_PER_PACKAGE,
      value: '10',
      type: 'INTEIRO',
      description: 'Número máximo de ciclos por pacote',
      status: 'ATIVO'
    },
    {
      key: ParameterKeys.ACTIVATION_PIX_AMOUNT,
      value: '100.00',
      type: 'PERCENTUAL',
      description: 'Valor em R$ para ativação mensal via PIX',
      status: 'ATIVO'
    },
    {
      key: ParameterKeys.ACTIVATION_BONUS_CONVERSION_PERCENT,
      value: '10.00',
      type: 'PERCENTUAL',
      description: 'Percentual do bônus total convertido para ativação (30%)',
      status: 'ATIVO'
    },
    {
      key: ParameterKeys.ACTIVATION_DURATION_DAYS,
      value: '30',
      type: 'INTEIRO',
      description: 'Duração da ativação em dias',
      status: 'ATIVO'
    },
    {
      key: ParameterKeys.ACTIVATION_ENABLED,
      value: 'true',
      type: 'BOOLEANO',
      description: 'Se o sistema de ativação está habilitado',
      status: 'ATIVO'
    },
    {
      key: ParameterKeys.VALUE_TO_POINT_CONVERSION,
      value: '0.15',
      type: 'PERCENTUAL',
      description: 'Valor em R$ que equivale a 1 ponto na rede (R$ 20 = 1 ponto)',
      status: 'ATIVO'
    },
  ]

  let createdCount = 0
  let existingCount = 0

  console.log(`📝 Processando ${initialParameters.length} parâmetros...`)

  for (const paramData of initialParameters) {
    try {
      // Verificar se o parâmetro já existe
      const existingParam = await prisma.parameter.findUnique({
        where: { key: paramData.key }
      })

      if (!existingParam) {
        // Criar novo parâmetro
        await prisma.parameter.create({
          data: {
            key: paramData.key,
            value: paramData.value,
            type: paramData.type as any,
            description: paramData.description,
            status: paramData.status as any
          }
        })
        createdCount++
        console.log(`  ✅ Criado: ${paramData.key}`)
      } else {
        existingCount++
        console.log(`  ⏭️  Já existe: ${paramData.key}`)
      }
    } catch (error) {
      console.error(`  ❌ Erro ao processar ${paramData.key}:`, error)
    }
  }

  console.log('\n📊 Resumo do seed de parâmetros:')
  console.log(`  • Parâmetros criados: ${createdCount}`)
  console.log(`  • Parâmetros existentes: ${existingCount}`)
  console.log(`  • Total processados: ${initialParameters.length}`)

  // Verificar total de parâmetros no banco
  const totalParams = await prisma.parameter.count()
  const activeParams = await prisma.parameter.count({
    where: { status: 'ATIVO' }
  })

  console.log(`\n🎯 Status final:`)
  console.log(`  • Total de parâmetros no banco: ${totalParams}`)
  console.log(`  • Parâmetros ativos: ${activeParams}`)
  console.log(`  • Parâmetros inativos: ${totalParams - activeParams}`)

  console.log('\n🎉 Seed de parâmetros concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed de parâmetros:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 