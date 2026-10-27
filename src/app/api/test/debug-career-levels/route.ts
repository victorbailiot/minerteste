import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debugando consulta dos níveis de carreira...')
    
    // Testar consulta direta
    const careerLevels = await prisma.careerLevel.findMany({
      where: { isActive: true },
      orderBy: { requiredPoints: 'asc' }
    })
    
    console.log(`📊 Encontrados ${careerLevels.length} níveis`)
    
    const debugInfo: any[] = []
    
    for (const level of careerLevels) {
      const levelInfo = {
        name: level.name,
        id: Number(level.id),
        requiredPoints: level.requiredPoints,
        maxTeamVolumePercent: level.maxTeamVolumePercent,
        requiredDirects: level.requiredDirects,
        requiredDirectsType: typeof level.requiredDirects,
        isActive: level.isActive
      }
      
      debugInfo.push(levelInfo)
      
      console.log(`   ${level.name}: requiredDirects = ${level.requiredDirects} (tipo: ${typeof level.requiredDirects})`)
    }
    
    // Testar consulta SQL direta
    console.log('\n🔍 Testando consulta SQL direta...')
    const rawResult = await prisma.$queryRaw`
      SELECT id, name, "requiredPoints", "maxTeamVolumePercent", "requiredDirects", "isActive"
      FROM career_levels 
      WHERE "isActive" = true 
      ORDER BY "requiredPoints" ASC
    `
    
    console.log('\n📊 Resultado da consulta SQL direta:')
    for (const row of rawResult as any[]) {
      console.log(`   ${row.name}: requiredDirects = ${row.requiredDirects} (tipo: ${typeof row.requiredDirects})`)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Debug concluído',
      careerLevels: debugInfo,
      rawResult: rawResult
    })
    
  } catch (error) {
    console.error('❌ Erro ao debugar career_levels:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao debugar dados da tabela career_levels',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
