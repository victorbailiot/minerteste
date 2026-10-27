#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Iniciando build para Vercel...');

// Configurar variáveis de ambiente para o Prisma
process.env.PRISMA_CLI_QUERY_ENGINE_TYPE = 'library';

try {
  // 1. Gerar o cliente Prisma
  console.log('📦 Gerando cliente Prisma...');
  execSync('npx prisma generate', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      PRISMA_CLI_QUERY_ENGINE_TYPE: 'library'
    }
  });
  
  // 2. Tentar db push primeiro (mais rápido)
  console.log('🔄 Sincronizando schema do banco...');
  try {
    execSync('npx prisma db push --accept-data-loss', { 
      stdio: 'inherit',
      timeout: 30000, // 30 segundos
      env: {
        ...process.env,
        PRISMA_CLI_QUERY_ENGINE_TYPE: 'library'
      }
    });
    console.log('✅ Schema sincronizado com sucesso!');
  } catch (error) {
    console.log('⚠️  db push falhou, tentando migrate deploy...');
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      timeout: 60000, // 60 segundos
      env: {
        ...process.env,
        PRISMA_CLI_QUERY_ENGINE_TYPE: 'library'
      }
    });
    console.log('✅ Migrações aplicadas com sucesso!');
  }
  
  // 3. Build do Next.js
  console.log('🏗️  Construindo aplicação Next.js...');
  execSync('npx next build', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      PRISMA_CLI_QUERY_ENGINE_TYPE: 'library'
    }
  });
  
  console.log('🎉 Build concluído com sucesso!');
  
} catch (error) {
  console.error('❌ Erro durante o build:', error.message);
  process.exit(1);
}
