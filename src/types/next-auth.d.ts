
import { Position, Package } from '@/generated/prisma'

// Tipo otimizado para pacotes na sessão
interface SessionPackage {
  id: string
  isActive: boolean
  activatedAt: string
  package: {
    id: string
    name: string
    price: number
    points: number
    isUnilevel: boolean
  }
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      phone: string
      role: string
      referralCode: string
      sponsorId?: string
      parentId?: string
      position: string
      preferredSide: string
      createdAt: string
      packages: SessionPackage[]
      balance?: number
      totalEarned?: number
      cpf?: string
      systemRoles?: string[]
      country?: string
      documentType?: string
      documentNumber?: string
      phoneCountryCode?: string
      phoneNumber?: string
    }
  }

  interface User {
    id: string
    name: string
    email: string
    phone: string
    role: string
    referralCode: string
    sponsorId?: string
    parentId?: string
    position: string
    preferredSide: string
    createdAt: string
    packages: SessionPackage[]
    balance?: number
    totalEarned?: number
    cpf?: string
    country?: string
    documentType?: string
    documentNumber?: string
    phoneCountryCode?: string
    phoneNumber?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    phone: string
    referralCode: string
    sponsorId?: string
    parentId?: string
    position: string
    preferredSide: string
    createdAt: string
    packages: SessionPackage[]
    balance?: number
    totalEarned?: number
    cpf?: string
    systemRoles?: string[]
    country?: string
    documentType?: string
    documentNumber?: string
    phoneCountryCode?: string
    phoneNumber?: string
  }
} 