import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const categorySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional()
})

// PUT - Atualizar categoria
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = categorySchema.parse(body)

    const categoryId = parseInt(params.id)
    if (isNaN(categoryId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Verificar se categoria existe
    const existingCategory = await prisma.storeCategory.findUnique({
      where: { id: categoryId }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    // Gerar slug a partir do nome
    const slug = validatedData.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    // Atualizar categoria
    const updatedCategory = await prisma.storeCategory.update({
      where: { id: categoryId },
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        slug
      }
    })

    return NextResponse.json({
      success: true,
      category: {
        id: updatedCategory.id.toString(),
        name: updatedCategory.name,
        description: updatedCategory.description,
        slug: updatedCategory.slug
      }
    })
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao atualizar categoria' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir categoria
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const categoryId = parseInt(params.id)
    if (isNaN(categoryId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Verificar se categoria existe
    const category = await prisma.storeCategory.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: { products: true }
        }
      }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se categoria tem produtos
    if (category._count.products > 0) {
      return NextResponse.json(
        { 
          error: 'Não é possível excluir categoria com produtos',
          message: `Esta categoria possui ${category._count.products} produto(s) vinculado(s). Remova os produtos antes de excluir a categoria.`
        },
        { status: 400 }
      )
    }

    // Excluir categoria
    await prisma.storeCategory.delete({
      where: { id: categoryId }
    })

    return NextResponse.json({
      success: true,
      message: 'Categoria excluída com sucesso'
    })
  } catch (error) {
    console.error('Erro ao excluir categoria:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir categoria' },
      { status: 500 }
    )
  }
}
