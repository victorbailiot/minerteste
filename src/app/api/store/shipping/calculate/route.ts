/**
 * API para cálculo de frete via Melhor Envio
 * POST /api/store/shipping/calculate
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcularFrete } from '@/lib/melhor-envio'
import { z } from 'zod'

const calculateSchema = z.object({
  cepDestino: z.string().min(8, 'CEP inválido').max(9)
})

const DEFAULTS = {
  weight: 1,
  width: 16,
  height: 11,
  length: 2,
  insuranceValue: 0
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { cepDestino } = calculateSchema.parse(body)

    const cepDestinoClean = cepDestino.replace(/\D/g, '')

    if (cepDestinoClean.length !== 8) {
      return NextResponse.json(
        { error: 'CEP deve ter 8 dígitos' },
        { status: 400 }
      )
    }

    // Buscar carrinho do usuário com produtos e dimensões
    const cart = await prisma.storeCart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            product: true,
            variant: {
              select: {
                id: true,
                price: true
              }
            }
          }
        }
      }
    })

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { error: 'Carrinho vazio' },
        { status: 400 }
      )
    }

    // Definir CEP de origem: usar o CEP do primeiro produto que tiver originZipCode,
    // ou fallback para variável de ambiente / padrão
    const produtoComCep = cart.items.find(
      (item) => item.product.originZipCode && item.product.originZipCode.replace(/\D/g, '').length === 8
    )
    const cepOrigem =
      produtoComCep?.product.originZipCode?.replace(/\D/g, '') ||
      process.env.STORE_SHIPPING_ORIGIN_CEP?.replace(/\D/g, '') ||
      '01310100'

    // Montar produtos para a API Melhor Envio
    const products = cart.items.map((item) => {
      const product = item.product
      const variant = item.variant
      const price = variant ? Number(variant.price) : Number(product.price)
      const weight = product.weight ? Number(product.weight) : DEFAULTS.weight
      const width = product.width ? Number(product.width) : DEFAULTS.width
      const height = product.height ? Number(product.height) : DEFAULTS.height
      const length = product.length ? Number(product.length) : DEFAULTS.length
      const insuranceValue = Math.max(price * item.quantity, DEFAULTS.insuranceValue)

      return {
        id: String(product.id),
        width: Math.max(1, Math.round(width)),
        height: Math.max(1, Math.round(height)),
        length: Math.max(1, Math.round(length)),
        weight: Math.max(0.1, weight),
        insurance_value: insuranceValue,
        quantity: item.quantity
      }
    })

    // Fallback padrão se token não configurado ou se houver erro na API externa
    const fallbackOptions = [
      {
        id: 'standard-pac',
        name: 'PAC (Envio Padrão)',
        price: '24.90',
        currency: 'R$',
        delivery_time: 7,
        delivery_range: { min: 5, max: 7 },
        company: { id: 1, name: 'Correios', picture: 'https://cdn.melhorenvio.com.br/companies/correios.png' }
      },
      {
        id: 'express-sedex',
        name: 'SEDEX (Expresso)',
        price: '48.50',
        currency: 'R$',
        delivery_time: 3,
        delivery_range: { min: 2, max: 3 },
        company: { id: 2, name: 'Correios', picture: 'https://cdn.melhorenvio.com.br/companies/correios.png' }
      }
    ]

    let cotacoes: any[] = []
    try {
      if (process.env.MELHOR_ENVIO_TOKEN) {
        cotacoes = await calcularFrete({
          from: { postal_code: cepOrigem },
          to: { postal_code: cepDestinoClean },
          products,
          options: { receipt: false, own_hand: false }
        })
      } else {
        console.log('[Frete] MELHOR_ENVIO_TOKEN não configurado. Utilizando frete padrão de fallback.')
        cotacoes = fallbackOptions
      }
    } catch (melhorEnvioErr) {
      console.warn('[Frete] Falha na API Melhor Envio, utilizando fallback:', melhorEnvioErr)
      cotacoes = fallbackOptions
    }

    // Filtrar opções com erro (algumas transportadoras podem retornar erro)
    const opcoesValidas = cotacoes.filter(
      (opcao: { error?: string }) => !opcao.error
    )

    return NextResponse.json({
      success: true,
      options: opcoesValidas.length > 0 ? opcoesValidas : fallbackOptions
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro ao calcular frete:', error)

    return NextResponse.json({
      success: true,
      options: [
        {
          id: 'standard-pac',
          name: 'PAC (Envio Padrão)',
          price: '24.90',
          currency: 'R$',
          delivery_time: 7,
          delivery_range: { min: 5, max: 7 },
          company: { id: 1, name: 'Correios', picture: 'https://cdn.melhorenvio.com.br/companies/correios.png' }
        }
      ]
    })
  }
}
