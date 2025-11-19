# Window Controls - FluxDesktop

> **Controle total sobre o comportamento da janela do browser**

Este documento explica como usar os controles de janela no FluxDesktop para gerenciar botões de minimizar/maximizar/fechar, menu de contexto, modo kiosk e mais.

## 📋 Índice

- [Configuração](#-configuração)
- [Uso Runtime](#-uso-runtime)
- [Exemplos](#-exemplos)
- [API Reference](#-api-reference)

---

## ⚙️ Configuração

### Via Arquivo de Configuração (.env)

```bash
# Habilitar/desabilitar botões de controle da janela
FLUXSTACK_DESKTOP_ENABLE_MINIMIZE=true   # Permitir minimizar
FLUXSTACK_DESKTOP_ENABLE_MAXIMIZE=true   # Permitir maximizar
FLUXSTACK_DESKTOP_ENABLE_CLOSE=true      # Permitir fechar

# Desabilitar menu de contexto (click direito)
FLUXSTACK_DESKTOP_DISABLE_CONTEXT_MENU=false

# Modo Kiosk (tela cheia sem controles)
FLUXSTACK_DESKTOP_KIOSK_MODE=false

# Janela sem frame (sem barra de título)
FLUXSTACK_DESKTOP_FRAMELESS=false

# Permitir redimensionamento da janela
FLUXSTACK_DESKTOP_RESIZABLE=true
```

### Via Código (Runtime)

```typescript
import { open } from '@fluxstack/desktop';

const browser = await open('http://localhost:3000', {
  windowSize: [1200, 800]
});

// Controles estão automaticamente disponíveis baseados na configuração
```

---

## 🎮 Uso Runtime

### No Frontend (Browser)

```javascript
// Acessar API de controles de janela
const controls = window.FluxDesktop.windowControls;

// Verificar configuração atual
console.log(controls.config);
// {
//   enableMinimize: true,
//   enableMaximize: true,
//   enableClose: true,
//   disableContextMenu: false,
//   resizable: true,
//   kioskMode: false,
//   frameless: false
// }

// Verificar se um controle específico está habilitado
if (controls.isEnabled('minimize')) {
  console.log('Minimize button is enabled');
}

// Minimizar janela
await controls.minimize();

// Maximizar janela
await controls.maximize();

// Fechar janela
await controls.close();

// Toggle fullscreen
await controls.toggleFullscreen();

// Verificar se está em fullscreen
if (controls.isFullscreen()) {
  console.log('Window is in fullscreen mode');
}
```

### No Backend (Bun/Node)

```typescript
import { open } from '@fluxstack/desktop';

const browser = await open('http://localhost:3000');

// Controles via CDP (Chrome DevTools Protocol)
await browser.cdp.send('Browser.setWindowBounds', {
  windowId: 1,
  bounds: { windowState: 'maximized' }
});

// Fechar janela programaticamente
browser.close();
```

---

## 📝 Exemplos

### Exemplo 1: Desabilitar Menu de Contexto

```bash
# .env
FLUXSTACK_DESKTOP_DISABLE_CONTEXT_MENU=true
```

```javascript
// No browser, o click direito será bloqueado automaticamente
document.addEventListener('contextmenu', (e) => {
  // Este evento será prevenido pelo FluxDesktop
  console.log('Context menu blocked');
});
```

### Exemplo 2: Modo Kiosk (Quiosque)

Perfeito para aplicações públicas, stands, totems:

```bash
# .env
FLUXSTACK_DESKTOP_KIOSK_MODE=true
```

```javascript
// No browser
console.log(window.FluxDesktop.windowControls.config.kioskMode); // true

// F11, Esc, Ctrl+Q são bloqueados automaticamente
// Janela fica em fullscreen sem controles
```

### Exemplo 3: Aplicação com Controles Customizados

```bash
# .env
FLUXSTACK_DESKTOP_FRAMELESS=true
FLUXSTACK_DESKTOP_ENABLE_MINIMIZE=true
FLUXSTACK_DESKTOP_ENABLE_MAXIMIZE=true
FLUXSTACK_DESKTOP_ENABLE_CLOSE=true
```

```html
<!-- Custom window controls -->
<div class="window-titlebar">
  <div class="window-title">My Application</div>
  <div class="window-controls">
    <button onclick="window.FluxDesktop.windowControls.minimize()">−</button>
    <button onclick="window.FluxDesktop.windowControls.maximize()">□</button>
    <button onclick="window.FluxDesktop.windowControls.close()">×</button>
  </div>
</div>

<style>
  .window-titlebar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 32px;
    background: #2c3e50;
    color: white;
    padding: 0 16px;
    -webkit-app-region: drag; /* Permitir drag da janela */
  }

  .window-controls {
    display: flex;
    gap: 8px;
    -webkit-app-region: no-drag; /* Botões não arrastam */
  }

  .window-controls button {
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: white;
    cursor: pointer;
    font-size: 20px;
  }

  .window-controls button:hover {
    background: rgba(255, 255, 255, 0.1);
  }
</style>
```

### Exemplo 4: Bloqueio de Redimensionamento

```bash
# .env
FLUXSTACK_DESKTOP_RESIZABLE=false
```

```javascript
// A janela não poderá ser redimensionada pelo usuário
console.log(window.FluxDesktop.windowControls.config.resizable); // false
```

### Exemplo 5: Aplicação Segura (Controles Restritos)

Útil para ambientes corporativos ou educacionais:

```bash
# .env
FLUXSTACK_DESKTOP_ENABLE_MINIMIZE=false
FLUXSTACK_DESKTOP_ENABLE_MAXIMIZE=false
FLUXSTACK_DESKTOP_ENABLE_CLOSE=false
FLUXSTACK_DESKTOP_DISABLE_CONTEXT_MENU=true
FLUXSTACK_DESKTOP_RESIZABLE=false
```

```javascript
// Usuário não consegue:
// - Minimizar ou maximizar a janela
// - Fechar a janela
// - Acessar menu de contexto
// - Redimensionar a janela

// Apenas admin pode fechar via backend
if (isAdmin) {
  browser.close();
}
```

---

## 🔧 API Reference

### `window.FluxDesktop.windowControls`

#### Propriedades

| Propriedade | Tipo | Descrição |
|------------|------|-----------|
| `config` | `WindowControlsConfig` | Configuração atual dos controles |

#### Métodos

| Método | Retorno | Descrição |
|--------|---------|-----------|
| `getConfig()` | `WindowControlsConfig` | Retorna configuração atual |
| `isEnabled(control)` | `boolean` | Verifica se controle está habilitado |
| `minimize()` | `Promise<boolean>` | Minimiza janela (se permitido) |
| `maximize()` | `Promise<boolean>` | Maximiza janela (se permitido) |
| `close()` | `Promise<boolean>` | Fecha janela (se permitido) |
| `toggleFullscreen()` | `Promise<void>` | Alterna modo fullscreen |
| `isFullscreen()` | `boolean` | Verifica se está em fullscreen |

#### `WindowControlsConfig`

```typescript
interface WindowControlsConfig {
  enableMinimize: boolean;      // Permitir minimizar
  enableMaximize: boolean;      // Permitir maximizar
  enableClose: boolean;         // Permitir fechar
  disableContextMenu: boolean;  // Desabilitar menu de contexto
  resizable: boolean;           // Permitir redimensionar
  kioskMode: boolean;          // Modo kiosk (fullscreen sem controles)
  frameless: boolean;          // Janela sem frame
}
```

---

## 🎯 Casos de Uso

### 1. **Aplicações Públicas (Kiosks/Totens)**
- `kioskMode: true`
- `disableContextMenu: true`
- Bloqueia saída acidental

### 2. **Aplicações Corporativas**
- `enableClose: false` (apenas admin fecha)
- `disableContextMenu: true`
- Controle total sobre comportamento

### 3. **Aplicações de Apresentação**
- `kioskMode: true` ou apenas fullscreen
- Interface limpa sem distrações

### 4. **Aplicações com UI Custom**
- `frameless: true`
- Criar próprios controles de janela
- Branding completo

### 5. **Aplicações de Segurança**
- Desabilitar todos os controles
- Apenas backend pode fechar
- Prevenir ações não autorizadas

---

## 🔒 Segurança

### Permissões de Controle

Os controles de janela respeitam as configurações:

```javascript
// Se minimize está desabilitado na config
await window.FluxDesktop.windowControls.minimize();
// ⚠️ Retorna false e loga warning no console
```

### Bypass Protection

⚠️ **IMPORTANTE**: Os controles de janela são aplicados via CDP e injeção de script. Usuários avançados podem contornar via DevTools. Para segurança real, combine com:

- Autenticação adequada
- Controles backend
- Monitoramento de sessão
- Process management (supervisor, systemd, etc.)

---

## 🐛 Troubleshooting

### Controles não funcionam

1. Verifique se a configuração está correta:
```javascript
console.log(window.FluxDesktop.windowControls.config);
```

2. Verifique console para erros:
```javascript
window.FluxDesktop.windowControls.minimize().then(success => {
  console.log('Minimize result:', success);
});
```

3. Certifique-se que o browser suporta CDP:
   - ✅ Chrome/Chromium/Edge
   - ❌ Firefox (suporte limitado)

### Menu de contexto ainda aparece

Verifique se `disableContextMenu: true` está configurado:

```bash
# .env
FLUXSTACK_DESKTOP_DISABLE_CONTEXT_MENU=true
```

Se ainda aparecer, pode ser devido a:
- Eventos capturados antes da injeção
- Extensions do browser interferindo
- DevTools aberto (bypass automático)

---

## 📚 Recursos Adicionais

- [CLAUDE.md](./CLAUDE.md) - Guia de desenvolvimento
- [README.md](./README.md) - Documentação geral
- [CDP Protocol](https://chromedevtools.github.io/devtools-protocol/) - Chrome DevTools Protocol

---

**FluxDesktop** - Transformando web apps em desktop apps nativos! 🚀
