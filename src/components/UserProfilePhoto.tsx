'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface UserProfilePhotoProps {
  userName?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const UserProfilePhoto: React.FC<UserProfilePhotoProps> = ({
  userName,
  size = 'sm',
  className = ''
}) => {
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Marcar como cliente após hidratação
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Carregar foto de perfil do usuário
  useEffect(() => {
    if (!isClient) return

    const loadUserProfilePhoto = async () => {
      try {
        const response = await fetch('/api/profile/photo')
        if (response.ok) {
          const data = await response.json()
          setProfilePhotoUrl(data.photoUrl)
        }
      } catch (error) {
        console.error('Erro ao carregar foto de perfil:', error)
      }
    }

    loadUserProfilePhoto()
  }, [isClient])

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-lg'
  }

  const imageSizes = {
    sm: 32,
    md: 48,
    lg: 64
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-gray-200 ${className}`}>
      {isClient && profilePhotoUrl ? (
        <Image
          src={profilePhotoUrl}
          alt="Foto de perfil"
          width={imageSizes[size]}
          height={imageSizes[size]}
          className="w-full h-full object-cover"
          unoptimized={true}
        />
      ) : (
        <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-semibold">
          {userName?.charAt(0).toUpperCase() || 'U'}
        </div>
      )}
    </div>
  )
}

export default UserProfilePhoto
