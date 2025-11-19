/**
 * Teste simples do fallback do Chrome
 */
import { open } from './src/index';

console.log('Testando fallback do Chrome for Testing...\n');

const browser = await open('data:text/html,<h1 style="font-family:Arial;text-align:center;margin-top:100px">✅ FluxDesktop Funcionando!</h1><p style="text-align:center">Chrome for Testing foi baixado e iniciado com sucesso!</p>', {
  windowSize: [800, 600]
});

if (browser) {
  console.log('✓ Browser iniciado com sucesso!');
  console.log('\nPressione Ctrl+C para sair...\n');
}
