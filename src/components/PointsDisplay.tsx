'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  Zap, 
  Target, 
  DollarSign, 
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface CyclePointsData {
  leftPoints: number
  rightPoints: number
  majorSide: number
  minorSide: number
  canFormCycle: boolean
  cyclesAvailable: number
  nextCycleProgress: number
}


interface PointsDisplayProps {
  userId: string
}

export default function PointsDisplay({ userId }: PointsDisplayProps) {
  const [cycleData, setCycleData] = useState<CyclePointsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPointsData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/business/points-display?userId=${userId}`)
        
        if (!response.ok) {
          throw new Error('Erro ao carregar dados de pontos')
        }

        const result = await response.json()
        
        if (result.success) {
          setCycleData(result.data.cycle)
        } else {
          throw new Error(result.error || 'Erro desconhecido')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchPointsData()
    }
  }, [userId])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Pontuação para Ciclos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Pontuação para Bônus Binário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <XCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Pontuação para Ciclos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Pontuação para Ciclos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {cycleData?.leftPoints.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">LEFT</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {cycleData?.rightPoints.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">RIGHT</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso para próximo ciclo:</span>
              <span>{cycleData?.nextCycleProgress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${cycleData?.nextCycleProgress || 0}%` }}
              ></div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {cycleData?.canFormCycle ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="text-sm">
                {cycleData?.canFormCycle ? 'Pode formar ciclos' : 'Não pode formar ciclos'}
              </span>
            </div>
            {cycleData && cycleData.cyclesAvailable > 0 && (
              <Badge variant="secondary">
                {cycleData.cyclesAvailable} ciclos disponíveis
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  )
} 