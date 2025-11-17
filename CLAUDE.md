# FluxDesktop - Developer Guide

> **Claude Development Documentation**
> Este documento explica a arquitetura, funcionamento e regras de modificação do FluxDesktop.

## 🏗️ Arquitetura do Sistema

### Visão Geral
FluxDesktop é uma biblioteca que transforma aplicações web em aplicativos desktop nativos usando **navegadores do sistema** (Chrome, Firefox, Edge) como runtime, com **Bun** como backend JavaScript/TypeScript.

### Componentes Principais

```
src/
├── index.ts              # 🚀 API principal e ponto de entrada
├── browser/              # 🌐 Configurações específicas de browsers
│   ├── chromium.ts       # Chrome/Chromium/Edge
│   └── firefox.ts        # Firefox/Firefox Nightly
├── launcher/             # 🔧 Sistema de inicialização
│   ├── start.ts          # Launcher principal dos browsers
│   └── inject.ts         # Injeção de IPC e APIs
└── lib/                  # 📚 Bibliotecas core
    ├── cdp.ts            # Chrome DevTools Protocol
    ├── ipc.ts            # Inter-Process Communication
    └── idle.ts           # Gestão de hibernação/idle
```

## 🔧 Como Funciona

### 1. **Inicialização (src/index.ts)**
- Detecta browsers instalados no sistema
- Seleciona o melhor browser disponível
- Inicia processo do browser com flags específicas
- Estabelece conexão CDP (Chrome DevTools Protocol)

### 2. **Browser Launch (src/launcher/start.ts)**
- Spawna processo do browser com argumentos otimizados
- Configura conexão CDP via WebSocket ou stdio pipe
- Injeta sistema IPC na página web

### 3. **Comunicação IPC (src/lib/ipc.ts)**
- **Desktop → Web**: Via CDP `Runtime.evaluate`
- **Web → Desktop**: Via CDP `Runtime.bindingCalled`
- API global `window.FluxDesktop` injetada no browser
- Comunicação bidirecional assíncrona

### 4. **CDP Integration (src/lib/cdp.ts)**
- Cliente do Chrome DevTools Protocol
- Suporte a WebSocket e stdio pipe
- Permite controle total do browser (screenshots, DOM, network, etc.)

## 🛠️ Regras de Modificação

### ✅ **Pode Fazer:**

#### **Novos Recursos**
- ✅ Adicionar novos métodos à API `window.FluxDesktop`
- ✅ Criar novos handlers IPC
- ✅ Adicionar suporte a novos browsers
- ✅ Melhorar detecção de browsers
- ✅ Otimizar performance
- ✅ Adicionar utilitários para integração FluxStack

#### **Melhorias de Código**
- ✅ Refatorar para melhor type safety
- ✅ Adicionar testes automatizados
- ✅ Melhorar documentação inline
- ✅ Otimizar bundling/building
- ✅ Adicionar logging/debugging

#### **Integrações FluxStack**
- ✅ Auto-detecção de projetos FluxStack
- ✅ Hot reload sync com dev server FluxStack
- ✅ Helpers específicos para React/FluxStack
- ✅ Sistema de plugins FluxStack

### ❌ **NÃO Deve Fazer:**

#### **Breaking Changes**
- ❌ Mudar API pública sem deprecation
- ❌ Remover `window.FluxDesktop` ou alterar estrutura
- ❌ Quebrar compatibilidade com versões existentes
- ❌ Mudar nomes de eventos IPC já estabelecidos

#### **Arquitetura**
- ❌ Bundlar navegadores (manter uso de browsers do sistema)
- ❌ Adicionar dependências pesadas desnecessárias
- ❌ Quebrar suporte ao Bun runtime
- ❌ Remover suporte TypeScript nativo

#### **Segurança**
- ❌ Expor APIs perigosas sem sandboxing
- ❌ Permitir execução de código arbitrário sem validação
- ❌ Quebrar isolamento entre web e desktop

## 📋 Processo de Desenvolvimento

### **1. Setup Desenvolvimento**
```bash
# Clone e setup
git clone https://github.com/MarcosBrendonDePaula/FluxStack.git
cd FluxStack/packages/desktop  # (quando movido)

# Instalar dependências
bun install

# Verificar tipos
bun run typecheck
```

### **2. Testing**
```bash
# Teste rápido
bun run test

# Demo interativo
bun run demo

# Exemplo completo
bun run example
```

### **3. Estrutura de Commits**
```
feat: add new IPC handler for file operations
fix: resolve Chrome detection issue on Linux
docs: update API documentation
refactor: improve TypeScript types for CDP
test: add integration tests for Firefox support
```

### **4. Pull Request Guidelines**
1. **Testes**: Todos os PRs devem incluir testes
2. **Tipos**: Manter type safety completo
3. **Docs**: Atualizar documentação quando necessário
4. **Compatibilidade**: Não quebrar APIs existentes
5. **Performance**: Considerar impacto na performance

## 🧩 Extending FluxDesktop

### **Adicionando Novo Browser Support**
```typescript
// src/browser/new-browser.ts
export default async (
  { browserName, browserPath, dataPath }: BrowserConfig,
  { url, windowSize }: WindowConfig
) => {
  const args = [
    // Browser-specific flags
  ];

  return await StartBrowser(browserPath, args, 'websocket', { browserName });
};
```

### **Novo Handler IPC**
```typescript
// No backend (Node.js/Bun)
window.ipc.on('new-feature', async (data) => {
  // Lógica do backend
  return result;
});

// No frontend (Browser)
const result = await FluxDesktop.ipc.send('new-feature', data);
```

### **Novo Método CDP**
```typescript
// Usando CDP diretamente
const result = await window.cdp.send('Domain.method', {
  parameter: 'value'
});
```

## 🔒 Regras de Segurança

### **IPC Security**
- ✅ Validar todos os dados de entrada
- ✅ Sanitizar strings antes de `eval`
- ✅ Usar allowlist para métodos expostos
- ❌ Nunca executar código arbitrário sem validação

### **CDP Security**
- ✅ Limitar métodos CDP expostos
- ✅ Validar parâmetros CDP
- ❌ Não expor métodos destrutivos por padrão

### **File System**
- ✅ Sandboxing para operações de arquivo
- ✅ Validar caminhos de arquivo
- ❌ Não permitir acesso irrestrito ao sistema

## 📊 Performance Guidelines

### **Memory Management**
- ✅ Limpar event listeners ao fechar
- ✅ Gerenciar conexões CDP adequadamente
- ✅ Evitar memory leaks em IPC

### **Startup Performance**
- ✅ Browser detection lazy quando possível
- ✅ Minimizar flags de browser desnecessárias
- ✅ Otimizar tempo de conexão CDP

### **Runtime Performance**
- ✅ Batch IPC calls quando possível
- ✅ Usar workers para operações pesadas
- ✅ Implementar connection pooling para múltiplas janelas

## 🚀 FluxStack Integration

### **Filosofia**
FluxDesktop deve ser uma extensão **natural** do FluxStack, não um fork separado:

- ✅ **Zero Config**: Apps FluxStack devem funcionar automaticamente
- ✅ **Type Safety**: Tipagem compartilhada entre web e desktop
- ✅ **Hot Reload**: Sync automático com dev server
- ✅ **Plugin System**: Extensibilidade via plugins FluxStack

### **Integração Futura**
```typescript
// Visão futura da API
import { createDesktopApp } from '@fluxstack/desktop';

// Auto-detecta projeto FluxStack local
const app = await createDesktopApp({
  autostart: true,  // Inicia dev server automaticamente
  hotReload: true,  // Sync com mudanças
  plugins: ['@fluxstack/desktop-notifications']
});
```

## 📝 Code Style

### **TypeScript**
- Use strict mode
- Explicit return types para APIs públicas
- Prefer interfaces over types para objetos
- Use enums para constantes relacionadas

### **Naming**
- `camelCase` para funções e variáveis
- `PascalCase` para classes e interfaces
- `UPPER_CASE` para constantes
- Prefixo `_` para métodos internos

### **Error Handling**
```typescript
// ✅ Bom
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  log('Error in operation:', error.message);
  throw new Error(`Operation failed: ${error.message}`);
}

// ❌ Ruim
const result = await riskyOperation().catch(() => null);
```

---

## 🤝 Contribuição

Para contribuir com FluxDesktop:

1. **Fork** do repositório FluxStack
2. **Create branch** para sua feature
3. **Seguir** as regras deste documento
4. **Testar** completamente
5. **Submit PR** com descrição detalhada

**FluxDesktop é parte do ecossistema FluxStack - vamos construir o futuro do desenvolvimento desktop juntos!** 🚀