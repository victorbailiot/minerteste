'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Gift, DollarSign, Clock, CheckCircle } from 'lucide-react'

interface CareerPrize {
  id: string
  type: 'CAREER_BONUS' | 'CAREER_PRIZE'
  amount: number
  description: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  createdAt: string
}

interface CareerPrizesProps {
  prizes: CareerPrize[]
}

export default function CareerPrizes({ prizes }: CareerPrizesProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'FAILED':
        return <CheckCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="default" className="bg-green-400 text-green-800">Entregue</Badge>
      case 'PENDING':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pendente</Badge>
      case 'FAILED':
        return <Badge variant="destructive">Falhou</Badge>
      default:
        return <Badge variant="outline">Desconhecido</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CAREER_BONUS':
        return <DollarSign className="h-5 w-5 text-green-600" />
      case 'CAREER_PRIZE':
        return <Gift className="h-5 w-5 text-purple-600" />
      default:
        return <Gift className="h-5 w-5 text-gray-600" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'CAREER_BONUS':
        return 'Bônus em Dinheiro'
      case 'CAREER_PRIZE':
        return 'Prêmio Físico'
      default:
        return 'Prêmio'
    }
  }

  if (prizes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Prêmios de Carreira
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Gift className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Você ainda não recebeu nenhum prêmio de carreira.</p>
            <p className="text-sm mt-2">Continue progredindo para desbloquear prêmios!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Prêmios de Carreira
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {prizes.map((prize) => (
            <div
              key={prize.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {getTypeIcon(prize.type)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{prize.description}</span>
                    {getStatusIcon(prize.status)}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-600">
                      {getTypeLabel(prize.type)}
                    </span>
                    {prize.amount > 0 && (
                      <span className="text-sm font-medium text-green-600">
                        R$ {prize.amount.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(prize.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(prize.status)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
