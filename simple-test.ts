import { open } from './src/index.js';

console.log('🚀 Testando FluxDesktop com TypeScript nativo...');

try {
  const window = await open('https://www.google.com');
  console.log('✅ Janela deveria ter aberto!');
} catch (error) {
  console.error('❌ Erro:', error.message);
}