import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import { logAdminAction } from '@/lib/admin-audit'

// Schema para validação de atualização de parâmetros
const updateParameterSchema = z.object({
  value: z.string().min(1, 'Value é obrigatório'),
  type: z.enum(['PERCENTUAL', 'INTEIRO', 'BOOLEANO', 'JSON']).optional(),
  description: z.string().min(1, 'Description é obrigatório').optional(),
  status: z.enum(['ATIVO', 'INATIVO']).optional()
})

// GET /api/admin/parameters/[key] - Buscar parâmetro específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
): Promise<NextResponse> {
  try {
    const { key } = await params
    
    const parameter = await prisma.parameter.findUnique({
      where: { key: decodeURIComponent(key) }
    })
    
    if (!parameter) {
      return NextResponse.json(
        { success: false, error: 'Parâmetro não encontrado' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: parameter
    })
  } catch (error) {
    console.error('Erro ao buscar parâmetro:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/parameters/[key] - Atualizar parâmetro
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
): Promise<NextResponse> {
  try {
    const authed = await getAuthenticatedUser(request)
    if (!authed) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }
    const adminId = BigInt(authed.id)
    if (!await hasPermission(adminId, 'parameters.update')) {
      return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })
    }
    const { key } = await params
    const body = await request.json()
    
    // Validar dados
    const validatedData = updateParameterSchema.parse(body)
    
    // Verificar se o parâmetro existe
    const existingParameter = await prisma.parameter.findUnique({
      where: { key: decodeURIComponent(key) }
    })
    
    if (!existingParameter) {
      return NextResponse.json(
        { success: false, error: 'Parâmetro não encontrado' },
        { status: 404 }
      )
    }
    
    // Usar o tipo existente se não fornecido
    const type = validatedData.type || existingParameter.type
    
    // Validar valor baseado no tipo
    if (!validateParameterValue(validatedData.value, type)) {
      return NextResponse.json(
        { success: false, error: 'Valor inválido para o tipo especificado' },
        { status: 400 }
      )
    }
    
    // Atualizar parâmetro
    const parameter = await prisma.parameter.update({
      where: { key: decodeURIComponent(key) },
      data: {
        ...validatedData,
        type: type
      }
    })

    // Auditoria
    try {
      await logAdminAction({
        actionType: 'PARAMETER_UPDATED',
        performedBy: adminId,
        resourceType: 'PARAMETER',
        resourceId: parameter.id,
        oldValue: existingParameter,
        newValue: parameter,
        description: `Parâmetro ${key} atualizado por admin ${authed.id}`,
      })
    } catch (e) {
      console.error('Falha ao auditar atualização de parâmetro:', e)
    }
    
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
    
    console.error('Erro ao atualizar parâmetro:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/parameters/[key] - Deletar parâmetro
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
): Promise<NextResponse> {
  try {
    const authed = await getAuthenticatedUser(request)
    if (!authed) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }
    const adminId = BigInt(authed.id)
    if (!await hasPermission(adminId, 'parameters.update')) {
      return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })
    }
    const { key } = await params
    
    // Verificar se o parâmetro existe
    const existingParameter = await prisma.parameter.findUnique({
      where: { key: decodeURIComponent(key) }
    })
    
    if (!existingParameter) {
      return NextResponse.json(
        { success: false, error: 'Parâmetro não encontrado' },
        { status: 404 }
      )
    }
    
    // Deletar parâmetro
    await prisma.parameter.delete({
      where: { key: decodeURIComponent(key) }
    })

    // Auditoria
    try {
      await logAdminAction({
        actionType: 'PARAMETER_UPDATED',
        performedBy: adminId,
        resourceType: 'PARAMETER',
        resourceId: existingParameter.id,
        oldValue: existingParameter,
        newValue: null,
        description: `Parâmetro ${key} deletado por admin ${authed.id}`,
      })
    } catch (e) {
      console.error('Falha ao auditar deleção de parâmetro:', e)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Parâmetro deletado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao deletar parâmetro:', error)
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