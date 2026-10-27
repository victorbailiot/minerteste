import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Atualizando dados da tabela career_levels...')
    
    // Buscar todos os níveis de carreira
    const careerLevels = await prisma.careerLevel.findMany({
      orderBy: { requiredPoints: 'asc' }
    })
    
    console.log(`📊 Encontrados ${careerLevels.length} níveis de carreira`)
    
    const updates: any[] = []
    
    for (const level of careerLevels) {
      console.log(`\n   Nível: ${level.name}`)
      console.log(`     ID: ${Number(level.id)}`)
      console.log(`     requiredPoints: ${level.requiredPoints}`)
      console.log(`     maxTeamVolumePercent: ${level.maxTeamVolumePercent}`)
      console.log(`     requiredDirects atual: ${level.requiredDirects}`)
      
      // Verificar se requiredDirects é null ou undefined
      if (level.requiredDirects === null || level.requiredDirects === undefined) {
        console.log(`     ⚠️  requiredDirects está ${level.requiredDirects} - corrigindo...`)
        
        // Definir valores padrão baseados no nome do nível
        let defaultRequiredDirects = 0
        
        if (level.name.toLowerCase().includes('quartzo')) {
          defaultRequiredDirects = 0 // Soma total
        } else if (level.name.toLowerCase().includes('cobre')) {
          defaultRequiredDirects = 2 // 2 diretos
        } else if (level.name.toLowerCase().includes('ferro')) {
          defaultRequiredDirects = 3 // 3 diretos
        } else if (level.name.toLowerCase().includes('prata')) {
          defaultRequiredDirects = 4 // 4 diretos
        } else if (level.name.toLowerCase().includes('ouro')) {
          defaultRequiredDirects = 5 // 5 diretos
        } else if (level.name.toLowerCase().includes('diamante')) {
          defaultRequiredDirects = 6 // 6 diretos
        } else if (level.name.toLowerCase().includes('esmeralda')) {
          defaultRequiredDirects = 7 // 7 diretos
        }
        
        // Atualizar o registro
        const updatedLevel = await prisma.careerLevel.update({
          where: { id: level.id },
          data: { requiredDirects: defaultRequiredDirects }
        })
        
        updates.push({
          id: Number(level.id),
          name: level.name,
          oldValue: level.requiredDirects,
          newValue: defaultRequiredDirects
        })
        
        console.log(`     ✅ Atualizado requiredDirects para ${defaultRequiredDirects}`)
      } else {
        console.log(`     ✅ requiredDirects já está definido: ${level.requiredDirects}`)
      }
    }
    
    // Buscar todos os níveis atualizados para verificação
    const updatedCareerLevels = await prisma.careerLevel.findMany({
      orderBy: { requiredPoints: 'asc' }
    })
    
    console.log('\n✅ Atualização concluída!')
    
    return NextResponse.json({
      success: true,
      message: 'Dados da tabela career_levels atualizados com sucesso',
      updates,
      careerLevels: updatedCareerLevels.map(level => ({
        id: Number(level.id),
        name: level.name,
        requiredPoints: level.requiredPoints,
        maxTeamVolumePercent: level.maxTeamVolumePercent,
        requiredDirects: level.requiredDirects,
        isActive: level.isActive
      }))
    })
    
  } catch (error) {
    console.error('❌ Erro ao atualizar career_levels:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao atualizar dados da tabela career_levels',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
