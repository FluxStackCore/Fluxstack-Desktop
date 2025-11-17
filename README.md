# @fluxstack/desktop

**FluxDesktop** - Transforme aplicações web em aplicativos desktop nativos usando navegadores do sistema e runtime Bun.

Uma extensão do **[FluxStack](https://github.com/MarcosBrendonDePaula/FluxStack)** para desenvolvimento de aplicações desktop.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://choosealicense.com/licenses/mit/)

## 🚀 Características

- ✅ **Runtime Bun Nativo** - Performance otimizada sem transpilação
- ✅ **TypeScript Nativo** - Desenvolvimento direto em TS
- ✅ **Navegadores do Sistema** - Chrome, Firefox, Edge nativos
- ✅ **IPC Bidirecional** - Comunicação completa web ↔ desktop
- ✅ **Chrome DevTools Protocol** - Acesso total às APIs do browser
- ✅ **Type Safety** - Tipagem completa end-to-end
- ✅ **Hot Reload** - Desenvolvimento com `--watch`
- ✅ **FluxStack Integration** - Perfeito para apps FluxStack

## 📦 Instalação

```bash
# Clone do repositório
git clone https://github.com/MarcosBrendonDePaula/FluxStack.git
cd FluxStack/packages/desktop

# Instalar dependências
bun install
```

## 🎯 Uso Básico

```typescript
import { open } from '@fluxstack/desktop';

const app = await open('https://localhost:3000', {
  windowSize: [1200, 800],
  onLoad: () => {
    // JavaScript executado na página
    document.title = 'Minha App FluxStack';
    document.body.style.background = '#1a1a1a';
  }
});

// IPC: Desktop → Web
app.ipc.on('save-data', async (data) => {
  await Bun.write('data.json', JSON.stringify(data));
  return 'Dados salvos!';
});

// Avaliar código na página
const title = await app.window.eval('document.title');
console.log('Título:', title);

// Chrome DevTools Protocol
const screenshot = await app.cdp.send('Page.captureScreenshot');
```

## 🛠 Scripts Disponíveis

```bash
# Desenvolvimento com hot reload
bun run dev

# Teste rápido
bun run test

# Exemplo completo
bun run example

# Verificar tipos
bun run typecheck

# Build opcional (para distribuição)
bun run build
```

## 🌟 Integração FluxStack

### App FluxStack → Desktop

```typescript
// No seu projeto FluxStack
import { open } from '@fluxstack/desktop';

// Transformar sua app web em desktop
const desktopApp = await open('http://localhost:3000', {
  windowSize: [1400, 900],
  onLoad: () => {
    // Customizar para desktop
    document.documentElement.setAttribute('data-platform', 'desktop');
  }
});

// IPC para acessar APIs do sistema
desktopApp.ipc.on('access-filesystem', async (path) => {
  const data = await Bun.file(path).text();
  return data;
});

desktopApp.ipc.on('system-notification', (message) => {
  // Notificações do sistema
  console.log('📢', message);
});
```

### Frontend (React/FluxStack)

```typescript
// No componente React
const saveToDesktop = async (data: any) => {
  if (window.FluxDesktop) {
    const result = await window.FluxDesktop.ipc.send('save-data', data);
    console.log('Resultado:', result);
  }
};

const checkPlatform = () => {
  return window.FluxDesktop ? 'desktop' : 'web';
};
```

## 🔧 APIs Disponíveis

### Window API
```typescript
// Avaliar JavaScript na página
const result = await app.window.eval('Math.random()');

// Avaliar função
await app.window.eval(() => {
  document.body.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
});
```

### IPC API
```typescript
// Escutar eventos do frontend
app.ipc.on('event-type', (data) => {
  console.log('Recebido:', data);
  return 'Resposta do backend';
});

// Enviar para o frontend
await app.ipc.send('event-type', { message: 'Hello from Bun!' });
```

### CDP API
```typescript
// Screenshot
const { data } = await app.cdp.send('Page.captureScreenshot');

// Monitorar rede
await app.cdp.send('Network.enable');
app.cdp.onMessage(msg => {
  if (msg.method === 'Network.requestWillBeSent') {
    console.log('Request:', msg.params.request.url);
  }
});

// Simular clique
await app.cdp.send('Runtime.evaluate', {
  expression: 'document.querySelector("button").click()'
});
```

## 📁 Estrutura do Projeto

```
src/
├── index.ts              # API principal
├── browser/
│   ├── chromium.ts       # Configurações Chromium/Chrome
│   └── firefox.ts        # Configurações Firefox
├── launcher/
│   ├── start.ts          # Launcher do browser
│   └── inject.ts         # Sistema IPC
└── lib/
    ├── cdp.ts            # Chrome DevTools Protocol
    ├── ipc.ts            # Inter-Process Communication
    └── idle.ts           # Gestão de hibernação
```

## 🎮 Exemplos Avançados

### Desktop App Completa
```typescript
import { open } from '@fluxstack/desktop';

class FluxDesktopApp {
  private window: any;

  async initialize() {
    this.window = await open('http://localhost:3000', {
      windowSize: [1200, 800],
      onLoad: this.setupDesktopFeatures
    });

    this.setupHandlers();
  }

  private setupDesktopFeatures = () => {
    // Adicionar menu desktop
    const menu = document.createElement('div');
    menu.innerHTML = '🖥️ Modo Desktop Ativo';
    menu.style.cssText = 'position: fixed; top: 0; right: 0; background: #333; color: white; padding: 10px; z-index: 9999;';
    document.body.appendChild(menu);
  };

  private setupHandlers() {
    // Sistema de arquivos
    this.window.ipc.on('save-file', async ({ name, content }) => {
      await Bun.write(name, content);
      return `Arquivo ${name} salvo!`;
    });

    // Notificações
    this.window.ipc.on('notify', (message) => {
      console.log(`📢 [${new Date().toLocaleTimeString()}] ${message}`);
    });
  }
}

const app = new FluxDesktopApp();
await app.initialize();
```

## 🔐 Segurança

FluxDesktop roda em um ambiente sandboxed do browser, mas com acesso controlado ao sistema:

- ✅ **IPC Controlado** - Apenas comunicação autorizada
- ✅ **Browser Sandbox** - Isolamento nativo do browser
- ✅ **Type Safety** - Validação de tipos em runtime
- ⚠️ **Cuidado** - Não execute código não confiável via `window.eval`

## 📄 Licença

MIT - Veja [LICENSE](./LICENSE) para detalhes.

## 🤝 Contribuição

Contribuições são bem-vindas! Veja como contribuir para o [FluxStack](https://github.com/MarcosBrendonDePaula/FluxStack).

---

**FluxDesktop** é parte do ecossistema **FluxStack** 🚀