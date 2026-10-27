import { prisma } from '@/lib/prisma'

interface ValidatePackageForMinerParams {
  packageId: bigint
  minerId: bigint
  userId?: bigint
}

interface ValidatePackageForMinerResult {
  valid: boolean
  error?: string
  packageData?: {
    id: bigint
    name: string
    price: any
    isActive: boolean
    visibleOnlyForActiveUsers: boolean
  }
  miner?: {
    id: bigint
    name: string
  }
}

export const validatePackageForMinerPurchase = async (
  params: ValidatePackageForMinerParams
): Promise<ValidatePackageForMinerResult> => {
  const { packageId, minerId, userId } = params

  const miner = await prisma.miner.findUnique({
    where: { id: minerId },
    select: {
      id: true,
      name: true
    }
  })

  if (!miner) {
    return {
      valid: false,
      error: 'Mineradora selecionada não foi encontrada'
    }
  }

  const packageData = await prisma.package.findFirst({
    where: {
      id: packageId,
      isActive: true,
      packageMiners: {
        some: {
          minerId
        }
      }
    },
    select: {
      id: true,
      name: true,
      price: true,
      isActive: true,
      visibleOnlyForActiveUsers: true
    }
  })

  if (!packageData) {
    return {
      valid: false,
      error: 'Pacote não está disponível para a mineradora selecionada'
    }
  }

  if (packageData.visibleOnlyForActiveUsers && userId) {
    const hasActivePackage = await prisma.userPackage.findFirst({
      where: {
        userId,
        isActive: true
      },
      select: { id: true }
    })

    if (!hasActivePackage) {
      return {
        valid: false,
        error: 'Este pacote está disponível apenas para usuários com pacote ativo'
      }
    }
  }

  return {
    valid: true,
    packageData,
    miner
  }
}
