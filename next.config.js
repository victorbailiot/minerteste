/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuração para permitir imagens de domínios externos (usar remotePatterns; domains está depreciado)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'tectonminer-20bb1.firebasestorage.app', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'images.pexels.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'images.pixabay.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'cdn.pixabay.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'api.pagar.me', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'www.minerstone.com.br', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'i.pravatar.cc', port: '', pathname: '/**' },
    ],
    // Desabilitar otimização para evitar problemas de pagamento na Vercel
    unoptimized: process.env.NODE_ENV === 'production',
  },
  // Configuração para permitir origens de desenvolvimento
  allowedDevOrigins: [
    '192.168.28.110',
    'localhost',
    '127.0.0.1'
  ],
  // Configuração para serialização de BigInt
  serverRuntimeConfig: {
    // Configurações disponíveis apenas no servidor
    setupBigIntSerialization: true,
  },
  // Configurações para o Prisma
  webpack: (config, { dev, isServer }) => {
    config.externals = [...config.externals, 'bcrypt']
    
    // Garantir resolução correta do next-auth
    if (!config.resolve) {
      config.resolve = {}
    }
    if (!config.resolve.alias) {
      config.resolve.alias = {}
    }
    if (!config.resolve.modules) {
      config.resolve.modules = ['node_modules']
    }

    // Evitar que um cache persistente corrompido do webpack (.next/cache/webpack) quebre a resolução de módulos no DEV.
    // Evidência: erros "invalid stored block lengths"/"unexpected end of file" na restauração do PackFileCacheStrategy antes do "Module not found".
    if (dev) {
      const cacheBefore = config.cache
      config.cache = false
    }
    
    try {
      // Evitar alias genérico "next-auth" (sem $), pois ele pode capturar subpaths como
      // "next-auth/react" e causar "Module not found".
      // Usar alias com "$" garante match exato.
      const path = require('path')
      const nextAuthReactPath = require.resolve('next-auth/react')
      
      config.resolve.alias['next-auth/react$'] = nextAuthReactPath
      
      // Garantir que os módulos sejam resolvidos a partir de node_modules
      config.resolve.modules = [
        ...(config.resolve.modules || []),
        path.resolve(__dirname, 'node_modules'),
      ]
      
      // Desabilitar exports fields para forçar resolução direta
      if (config.resolve.conditionNames) {
        config.resolve.conditionNames = [...config.resolve.conditionNames, 'require', 'node']
      }
      
      // Também adicionar aos fallbacks se necessário
      if (!config.resolve.fallback) {
        config.resolve.fallback = {}
      }
    } catch (e) {
      // Se não conseguir resolver, não adiciona o alias
      console.warn('Não foi possível resolver next-auth:', e)
    }
    
    // Otimizações para resolver problemas de chunks
    if (!isServer && !dev) {
      // Otimizar divisão de chunks
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Chunk para bibliotecas grandes
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          // Chunk para código comum
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      }
    }
    
    return config
  },
  // Configurações adicionais
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Configuração para evitar problemas de build
  output: 'standalone',
  // Configuração para evitar prerender de páginas dinâmicas
  experimental: {
    // Desabilitar prerender automático para páginas dinâmicas
    workerThreads: false,
    cpus: 1,
    // Otimizações para carregamento de chunks
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  // Configuração para páginas que devem ser renderizadas no servidor
  trailingSlash: false,
  // Configurações de performance
  poweredByHeader: false,
  compress: true,
  // Configuração para melhorar carregamento de chunks
  onDemandEntries: {
    // Período que uma página deve permanecer em buffer
    maxInactiveAge: 25 * 1000,
    // Número de páginas que devem ser mantidas simultaneamente
    pagesBufferLength: 2,
  },
}

module.exports = nextConfig 