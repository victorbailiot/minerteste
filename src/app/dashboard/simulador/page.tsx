import MinerProfitSimulator from '@/components/MinerProfitSimulator'

export default function SimuladorPage() {
  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Simulador
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">
          Escolha a mineradora e simule como um valor de lucro seria distribuído entre as cotas e o Clube dos 300
        </p>
      </div>

      <MinerProfitSimulator />
    </div>
  )
}
