import React from 'react'

type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'

interface SupportTicketStatusBadgeProps {
  status: SupportTicketStatus
  className?: string
}

const statusConfig = {
  OPEN: {
    label: 'Aberto',
    className: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  IN_PROGRESS: {
    label: 'Em Análise',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  RESOLVED: {
    label: 'Resolvido',
    className: 'bg-green-100 text-green-800 border-green-200'
  },
  CLOSED: {
    label: 'Fechado',
    className: 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export const SupportTicketStatusBadge: React.FC<SupportTicketStatusBadgeProps> = ({
  status,
  className = ''
}) => {
  const config = statusConfig[status]

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
        ${config.className}
        ${className}
      `}
    >
      {config.label}
    </span>
  )
}

export default SupportTicketStatusBadge
