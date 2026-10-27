import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({ 
      message: 'API de suporte funcionando',
      timestamp: new Date().toISOString(),
      status: 'ok'
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Erro interno',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}