import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ParameterKeys } from '@/types/parameter-keys'

// Endpoint para popular a tabela Parameters com dados iniciais
export async function POST(request: NextRequest) {
  try {
    const initialParameters = [
      {
        key: ParameterKeys.DIRECT_COMMISSION_PERCENTAGE,
        value: '10',
        type: 'PERCENTUAL',
        description: 'Percentual de comissão para indicação direta',
        status: 'ATIVO'
      },
      {
        key: ParameterKeys.INDIRECT_COMMISSION_LEVEL_1,
        value: '5',
        type: 'PERCENTUAL',
        description: 'Percentual de comissão para indicação indireta - Nível 1',
        status: 'ATIVO'
      },
      {
        key: ParameterKeys.INDIRECT_COMMISSION_LEVEL_2,
        value: '3',
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
        value: 'false',
        type: 'BOOLEANO',
        description: 'Ativar ou desativar bônus de ciclo',
        status: 'INATIVO'
      },
      {
        key: ParameterKeys.USER_ACTIVATION_MIN_POINTS_PERCENTAGE,
        value: '50',
        type: 'PERCENTUAL',
        description: 'Percentual mínimo de pontos para ativação do usuário',
        status: 'ATIVO'
      },
      {
        key: ParameterKeys.COMMISSION_LEVELS_CONFIG,
        value: JSON.stringify({
          level_1: { percentage: 5, description: 'Primeiro nível de indicação indireta' },
          level_2: { percentage: 3, description: 'Segundo nível de indicação indireta' },
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
      }
    ]
    
    const createdParameters: any[] = []
    
    // Inserir parâmetros apenas se não existirem
    for (const paramData of initialParameters) {
      const existingParam = await prisma.parameter.findUnique({
        where: { key: paramData.key }
      })
      
      if (!existingParam) {
        const newParam = await prisma.parameter.create({
          data: paramData as any
        })
        createdParameters.push(newParam)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `${createdParameters.length} parâmetros criados com sucesso`,
      data: createdParameters
    })
  } catch (error) {
    console.error('Erro ao popular parâmetros:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 