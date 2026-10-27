import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema para validação de criação de parâmetros
const createParameterSchema = z.object({
  key: z.string().min(1, 'Key é obrigatório'),
  value: z.string().min(1, 'Value é obrigatório'),
  type: z.enum(['PERCENTUAL', 'INTEIRO', 'BOOLEANO', 'JSON']),
  description: z.string().min(1, 'Description é obrigatório'),
  status: z.enum(['ATIVO', 'INATIVO']).optional().default('ATIVO')
})

// GET /api/admin/parameters - Listar todos os parâmetros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    
    const parameters = await prisma.parameter.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json({
      success: true,
      data: parameters
    })
  } catch (error) {
    console.error('Erro ao buscar parâmetros:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/admin/parameters - Criar novo parâmetro
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar dados
    const validatedData = createParameterSchema.parse(body)
    
    // Verificar se a key já existe
    const existingParameter = await prisma.parameter.findUnique({
      where: { key: validatedData.key }
    })
    
    if (existingParameter) {
      return NextResponse.json(
        { success: false, error: 'Já existe um parâmetro com essa chave' },
        { status: 400 }
      )
    }
    
    // Validar valor baseado no tipo
    if (!validateParameterValue(validatedData.value, validatedData.type)) {
      return NextResponse.json(
        { success: false, error: 'Valor inválido para o tipo especificado' },
        { status: 400 }
      )
    }
    
    // Criar parâmetro
    const parameter = await prisma.parameter.create({
      data: validatedData
    })
    
    return NextResponse.json({
      success: true,
      data: parameter
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues && error.issues.length > 0 
        ? error.issues[0].message 
        : 'Dados inválidos'
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      )
    }
    
    console.error('Erro ao criar parâmetro:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Função auxiliar para validar valor baseado no tipo
function validateParameterValue(value: string, type: string): boolean {
  switch (type) {
    case 'PERCENTUAL':
      // Deve ser um número entre 0 e 100
      const percentValue = parseFloat(value)
      return !isNaN(percentValue) && percentValue >= 0 && percentValue <= 100
    
    case 'INTEIRO':
      // Deve ser um número inteiro
      const intValue = parseInt(value)
      return !isNaN(intValue) && intValue.toString() === value
    
    case 'BOOLEANO':
      // Deve ser true ou false
      return value === 'true' || value === 'false'
    
    case 'JSON':
      // Deve ser um JSON válido
      try {
        JSON.parse(value)
        return true
      } catch {
        return false
      }
    
    default:
      return false
  }
} 