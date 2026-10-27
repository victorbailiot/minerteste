import DashboardLayout from '@/components/DashboardLayout'
import { StoreCartProvider } from '@/lib/context/StoreCartContext'

export default function DashboardLayoutPage({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <StoreCartProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </StoreCartProvider>
  )
} 