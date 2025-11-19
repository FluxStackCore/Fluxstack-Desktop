/**
 * Script para testar a detecção de navegadores
 */
import { join, delimiter } from 'node:path';
import { access, readdir } from 'node:fs/promises';

const rgb = (r: number, g: number, b: number, msg: string): string =>
  `\x1b[38;2;${r};${g};${b}m${msg}\x1b[0m`;

console.log('='.repeat(60));
console.log(rgb(88, 101, 242, 'Teste de Detecção de Navegadores'));
console.log('='.repeat(60));
console.log('');

// Check PATH
const pathDirs = (process.env['PATH'] || '').split(':').filter(Boolean);
console.log(`📁 Diretórios no PATH: ${pathDirs.length}`);
console.log('');

// Check for browsers in PATH
console.log('🔍 Procurando navegadores no sistema...');
console.log('');

const browserNames = [
  'chrome',
  'google-chrome',
  'google-chrome-stable',
  'chromium',
  'chromium-browser',
  'firefox',
  'firefox-nightly',
  'msedge'
];

const found: string[] = [];

for (const dir of pathDirs.slice(0, 10)) {
  try {
    const files = await readdir(dir);
    for (const browser of browserNames) {
      if (files.includes(browser)) {
        found.push(`${browser} → ${dir}/${browser}`);
      }
    }
  } catch {
    // Ignore errors
  }
}

if (found.length > 0) {
  console.log('✅ Navegadores encontrados:');
  found.forEach(f => console.log(`   ${f}`));
} else {
  console.log('❌ Nenhum navegador encontrado no sistema');
  console.log('');
  console.log('📥 Por isso o Chrome for Testing será baixado automaticamente');
}

console.log('');
console.log('='.repeat(60));
console.log('Comportamento esperado:');
console.log('  1️⃣  Tenta detectar navegadores do sistema');
console.log('  2️⃣  Se encontrar → Usa o navegador do sistema');
console.log('  3️⃣  Se NÃO encontrar → Baixa Chrome for Testing');
console.log('='.repeat(60));
