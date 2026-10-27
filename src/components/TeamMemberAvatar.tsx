'use client'

import Image from 'next/image'

interface TeamMemberAvatarProps {
  name: string
  photoUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const TeamMemberAvatar: React.FC<TeamMemberAvatarProps> = ({
  name,
  photoUrl,
  size = 'sm'
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base'
  }

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  }

  const imageSizes = {
    sm: 32,
    md: 48,
    lg: 64
  }

  const getInitials = (fullName: string): string => {
    const names = fullName.trim().split(' ')
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase()
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase()
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-gray-200 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0`}
    >
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={`Foto de ${name}`}
          width={imageSizes[size]}
          height={imageSizes[size]}
          className="w-full h-full object-cover"
          unoptimized={true}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white font-bold">
          {getInitials(name)}
        </div>
      )}
    </div>
  )
}

export default TeamMemberAvatar

