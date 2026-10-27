'use client'

import { formatCurrency } from '@/lib/utils'

interface FinancialChartData {
  month: string
  income: number
  expense: number
  balance: number
}

interface FinancialChartProps {
  data: FinancialChartData[]
}

export const FinancialChart: React.FC<FinancialChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Nenhum dado disponível
      </div>
    )
  }

  // Garantir que todos os valores numéricos são válidos
  const safeData = data.map(item => ({
    ...item,
    income: Number(item.income) || 0,
    expense: Number(item.expense) || 0,
    balance: Number(item.balance) || 0
  }))

  const maxValue = Math.max(...safeData.flatMap(d => [d.income, d.expense, Math.abs(d.balance)]))
  const chartHeight = 200
  const chartWidth = 400
  const barWidth = Math.floor(chartWidth / safeData.length) - 10
  const spacing = 10

  return (
    <div className="w-full">
      <div className="flex justify-center mb-4">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm">Entradas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm">Saídas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm">Saldo</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <svg width={chartWidth} height={chartHeight + 60} className="w-full">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <g key={ratio}>
              <line
                x1={0}
                y1={chartHeight * ratio}
                x2={chartWidth}
                y2={chartHeight * ratio}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
              <text
                x={-5}
                y={chartHeight * ratio + 5}
                textAnchor="end"
                className="text-xs fill-gray-500"
              >
                {formatCurrency(maxValue * (1 - ratio))}
              </text>
            </g>
          ))}

          {/* Bars */}
          {safeData.map((item, index) => {
            const x = index * (barWidth + spacing)
            const incomeHeight = (item.income / maxValue) * chartHeight
            const expenseHeight = (item.expense / maxValue) * chartHeight
            const balanceHeight = Math.abs(item.balance / maxValue) * chartHeight

            return (
              <g key={item.month}>
                {/* Income bar */}
                <rect
                  x={x}
                  y={chartHeight - incomeHeight}
                  width={barWidth / 3}
                  height={incomeHeight}
                  fill="#10b981"
                  className="hover:opacity-80 transition-opacity"
                />

                {/* Expense bar */}
                <rect
                  x={x + barWidth / 3}
                  y={chartHeight - expenseHeight}
                  width={barWidth / 3}
                  height={expenseHeight}
                  fill="#ef4444"
                  className="hover:opacity-80 transition-opacity"
                />

                {/* Balance bar */}
                <rect
                  x={x + (barWidth * 2) / 3}
                  y={item.balance >= 0 ? chartHeight - balanceHeight : chartHeight}
                  width={barWidth / 3}
                  height={balanceHeight}
                  fill={item.balance >= 0 ? "#3b82f6" : "#f59e0b"}
                  className="hover:opacity-80 transition-opacity"
                />

                {/* Month label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-700"
                >
                  {item.month}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Data table */}
      <div className="mt-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Mês</th>
              <th className="text-right p-2">Entradas</th>
              <th className="text-right p-2">Saídas</th>
              <th className="text-right p-2">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {safeData.map((item, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="p-2 font-medium">{item.month}</td>
                <td className="p-2 text-right text-green-600">
                  {formatCurrency(item.income)}
                </td>
                <td className="p-2 text-right text-red-600">
                  {formatCurrency(item.expense)}
                </td>
                <td className={`p-2 text-right font-medium ${
                  item.balance >= 0 ? 'text-blue-600' : 'text-orange-600'
                }`}>
                  {formatCurrency(item.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 