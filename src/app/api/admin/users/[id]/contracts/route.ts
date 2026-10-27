import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = parseInt(id)

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'ID de usuário inválido' },
        { status: 400 }
      )
    }

    const contracts = await prisma.contract.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        packageId: true,
        title: true,
        content: true,
        version: true,
        status: true,
        signedAt: true,
        pdfPath: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Buscar informações dos pacotes separadamente
    const packageIds = [...new Set(contracts.map(contract => contract.packageId))]
    const packages = await prisma.package.findMany({
      where: { id: { in: packageIds } },
      select: {
        id: true,
        name: true,
        price: true
      }
    })

    const packagesMap = new Map(packages.map(pkg => [pkg.id, pkg]))

    const formattedContracts = contracts.map(contract => ({
      ...contract,
      id: Number(contract.id),
      packageId: Number(contract.packageId),
      package: packagesMap.get(contract.packageId) ? {
        name: packagesMap.get(contract.packageId)!.name,
        price: Number(packagesMap.get(contract.packageId)!.price)
      } : null,
      signedAt: contract.signedAt?.toISOString() || null,
      createdAt: contract.createdAt.toISOString(),
      updatedAt: contract.updatedAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      data: formattedContracts
    })

  } catch (error) {
    console.error('Erro ao buscar contratos:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 