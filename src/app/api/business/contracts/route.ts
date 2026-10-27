import { NextRequest, NextResponse } from 'next/server'
import { validateUserNetworkParticipation } from '@/lib/business-logic'
import { prisma } from '@/lib/prisma'

// Criar ou assinar contrato
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, packageId, action, version = '1.0' } = body

    if (!userId || !packageId || !action) {
      return NextResponse.json({ 
        success: false, 
        error: 'userId, packageId e action são obrigatórios' 
      }, { status: 400 })
    }

    if (action === 'create') {
      const packageData = await prisma.package.findUnique({
        where: { id: BigInt(packageId) }
      })

      if (!packageData) {
        return NextResponse.json({
          success: false,
          error: 'Pacote não encontrado'
        }, { status: 400 })
      }

      // Buscar percentuais de indicação indireta da tabela Parameter
      const indirectParams = await prisma.parameter.findMany({
        where: {
          key: {
            in: [
              'UNILEVEL_INDIRECT_LEVEL_2_PERCENT',
              'UNILEVEL_INDIRECT_LEVEL_3_PERCENT',
              'UNILEVEL_INDIRECT_LEVEL_4_PERCENT',
              'UNILEVEL_INDIRECT_LEVEL_5_PERCENT',
              'UNILEVEL_INDIRECT_LEVEL_6_PERCENT',
              'UNILEVEL_INDIRECT_LEVEL_7_PERCENT'
            ]
          }
        }
      })
      const indirectByLevel: Record<number, string> = {}
      indirectParams.forEach(p => {
        const match = p.key.match(/LEVEL_(\d+)_PERCENT/)
        if (match) indirectByLevel[parseInt(match[1])] = p.value
      })

      const contractContent = generateContractContent(packageData, indirectByLevel)

      const contract = await prisma.contract.create({
        data: {
          userId: BigInt(userId),
          packageId: BigInt(packageId),
          title: `Contrato de Adesão - ${packageData.name}`,
          content: contractContent,
          version,
          status: 'PENDING'
        }
      })

      return NextResponse.json({ 
        success: true, 
        data: contract
      })

    } else if (action === 'sign') {
      // Assinar contrato existente
      const contractId = body.contractId

      if (!contractId) {
        return NextResponse.json({ 
          success: false, 
          error: 'contractId é obrigatório para assinar' 
        }, { status: 400 })
      }

      const contract = await prisma.contract.update({
        where: { id: BigInt(contractId) },
        data: {
          status: 'SIGNED',
          signedAt: new Date()
        }
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Contrato assinado com sucesso',
        data: contract
      })

    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Ação inválida. Use "create" ou "sign"' 
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Erro ao processar contrato:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

// Obter contratos de um usuário
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'ID do usuário é obrigatório' 
      }, { status: 400 })
    }

    const where: any = { userId: BigInt(userId) }
    if (status) {
      where.status = status
    }

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Verificar se pode participar da rede
    const canParticipate = await validateUserNetworkParticipation(BigInt(userId))

    return NextResponse.json({ 
      success: true, 
      data: {
        contracts,
        canParticipateInNetwork: canParticipate
      }
    })

  } catch (error) {
    console.error('Erro ao obter contratos:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

// Função para gerar conteúdo do contrato
function generateContractContent(
  packageData: any,
  indirectByLevel: Record<number, string> = {}
): string {
  const directBonusValue = Number(packageData.directBonus ?? 0)
  const directBonusLine = directBonusValue > 0
    ? `R$ ${directBonusValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por indicação direta`
    : 'Conforme tabela vigente'

  const indirectLevels = [2, 3, 4, 5, 6, 7]
  const indirectLines = indirectLevels
    .map(lvl => {
      const pct = indirectByLevel[lvl]
      return pct ? `    - Nível ${lvl}: ${pct}%` : null
    })
    .filter(Boolean)
    .join('\n')

  return `
CONTRATO DE ADESÃO À MINERADORA DE COBRE

IDENTIFICAÇÃO DO PACOTE:
Nome: ${packageData.name}
Valor: R$ ${Number(packageData.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Descrição: ${packageData.description || 'Pacote de investimento em mineração de cobre'}

CLÁUSULAS CONTRATUAIS:

1. OBJETO DO CONTRATO
Este contrato estabelece as condições para participação como acionista da mineradora de cobre, através da aquisição do pacote "${packageData.name}".

2. DIREITOS E OBRIGAÇÕES
2.1. O contratante terá direito a participação nos lucros da mineradora conforme percentual estabelecido.
2.2. As ações são hereditárias, passando de pais para filhos e netos.
2.3. O contratante compromete-se a seguir as regras da rede de marketing multinível.

4. SISTEMA DE INDICAÇÕES
4.1. Bônus de indicação direta: ${directBonusLine}
4.2. Bônus de indicação indireta (a partir do nível 2):
${indirectLines || '    - Conforme tabela vigente no plano de negócios'}

5. DIVISÃO DE LUCROS
5.1. Distribuição baseada nos resultados reais da mineradora
5.2. Percentual de participação deste pacote: ${Number(packageData.profitSharePercent)}%

6. TRANSPARÊNCIA
A mineradora preza pela transparência total em todas as suas operações.

7. VIGÊNCIA
Este contrato entra em vigor na data da assinatura digital e permanece válido enquanto o pacote estiver ativo.

Data: ${new Date().toLocaleDateString('pt-BR')}
Versão: 2.0
  `.trim()
} 