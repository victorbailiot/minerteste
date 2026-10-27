/**
 * API para buscar dados de endereço pelo CEP
 * Integração com ViaCEP
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cep = searchParams.get('cep')

    if (!cep) {
      return NextResponse.json({
        success: false,
        error: 'CEP é obrigatório'
      }, { status: 400 })
    }

    // Limpar CEP (remover caracteres não numéricos)
    const cleanCep = cep.replace(/\D/g, '')

    // Validar formato do CEP
    if (cleanCep.length !== 8) {
      return NextResponse.json({
        success: false,
        error: 'CEP deve ter 8 dígitos'
      }, { status: 400 })
    }

    // Buscar dados no ViaCEP
    const viaCepUrl = `https://viacep.com.br/ws/${cleanCep}/json/`
    
    const response = await fetch(viaCepUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`ViaCEP API error: ${response.status}`)
    }

    const data = await response.json()

    // Verificar se o CEP foi encontrado
    if (data.erro) {
      return NextResponse.json({
        success: false,
        error: 'CEP não encontrado'
      }, { status: 404 })
    }

    // Retornar dados formatados
    return NextResponse.json({
      success: true,
      data: {
        cep: data.cep,
        street: data.logradouro,
        neighborhood: data.bairro,
        city: data.localidade,
        state: data.uf,
        ibge: data.ibge,
        gia: data.gia,
        ddd: data.ddd,
        siafi: data.siafi
      }
    })

  } catch (error) {
    console.error('Erro ao buscar CEP:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar dados do CEP'
    }, { status: 500 })
  }
}
