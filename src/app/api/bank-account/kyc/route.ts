import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pagarMeAPI } from '@/lib/pagarme/pagarme'

export async function POST(request: NextRequest) {
    try {
        // Verificar autenticação
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Usuário não autenticado' },
                { status: 401 }
            )
        }

        const userId = BigInt(session.user.id)

        const userBankAccount = await prisma.bankAccount.findFirst({
            where: { userId, excludedAt: null }
        })

        if (!userBankAccount) {
            return NextResponse.json(
                { error: 'Conta bancária não encontrada' },
                { status: 404 }
            )
        }

        // Verificar se o status é 'affiliation'
        if (userBankAccount.recipientStatus !== 'affiliation') {
            return NextResponse.json(
                { error: 'Link de KYC só pode ser gerado para status de afiliação' },
                { status: 400 }
            )
        }

        // Verificar se a API do Pagar.me está configurada
        if (!pagarMeAPI) {
            return NextResponse.json(
                { error: 'API do Pagar.me não configurada' },
                { status: 500 }
            )
        }

        try {
            // Primeiro, buscar informações detalhadas do recebedor
            const recipientDetails = await pagarMeAPI.getRecipient(userBankAccount.recipientId)
            console.log('Detalhes do recebedor:', recipientDetails)

            // Verificar gateway recipients para ver se está pronto para KYC
            const gatewayRecipients = (recipientDetails as any).gateway_recipients || []
            const hasActiveGateway = gatewayRecipients.some((gateway: any) =>
                gateway.status === 'affiliation'
            )

            if (!hasActiveGateway) {
                return NextResponse.json(
                    {
                        error: 'Recebedor ainda não foi processado pelos gateways de pagamento. Aguarde alguns minutos e tente novamente.',
                        needsProcessing: true
                    },
                    { status: 400 }
                )
            }

            // Gerar link de KYC usando a API do Pagar.me
            const kycResponse = await pagarMeAPI.createKycLink(userBankAccount.recipientId)
            console.log('****Link de KYC completo:', kycResponse)
            console.log('****URL:', kycResponse.url)
            console.log('****QR Code base64:', kycResponse.base64_qrcode ? 'Presente' : 'Ausente')
            console.log('****QR Code length:', kycResponse.base64_qrcode?.length || 0)

            return NextResponse.json({
                ...kycResponse,
                success: true
            })

        } catch (apiError: any) {
            console.error('Erro ao gerar link KYC:', apiError)

            // Se for erro da API do Pagar.me, retornar erro específico
            if (apiError.message?.includes('403')) {
                return NextResponse.json(
                    {
                        error: 'Recebedor não completou as etapas prévias necessárias. Verifique se todos os dados foram preenchidos corretamente e aguarde a aprovação.',
                        needsApproval: true
                    },
                    { status: 400 }
                )
            }

            if (apiError.message?.includes('400')) {
                return NextResponse.json(
                    {
                        error: 'Dados do recebedor incompletos. Verifique se todas as informações bancárias estão corretas.',
                        needsDataUpdate: true
                    },
                    { status: 400 }
                )
            }

            return NextResponse.json(
                { error: 'Erro ao gerar link de validação: ' + (apiError.message || 'Erro desconhecido') },
                { status: 500 }
            )
        }

    } catch (error) {
        console.error('Erro na API de KYC:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}
