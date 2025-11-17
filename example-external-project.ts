// Exemplo de como usar FluxDesktop TS em outro projeto

// exemplo-projeto/
// ├── package.json
// ├── src/
// │   └── app.ts  <-- Este arquivo
// └── node_modules/
//     └── fluxstack-desktop/  <-- Link para seu projeto FluxDesktop TS

import { open, type OpenOptions, type Window } from '../fluxstack-desktop/src/index.js';

interface MyAppConfig {
  title: string;
  url: string;
  width: number;
  height: number;
}

class MyApp {
  private window: Window | null = null;
  private config: MyAppConfig;

  constructor(config: MyAppConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    console.log(`🚀 Iniciando ${this.config.title}...`);

    const options: OpenOptions = {
      windowSize: [this.config.width, this.config.height],
      onLoad: this.setupPageFeatures.bind(this)
    };

    this.window = await open(this.config.url, options);

    // Configurar handlers IPC
    this.setupIPC();

    console.log(`✅ ${this.config.title} iniciado com sucesso!`);
  }

  private setupPageFeatures(): void {
    // Customizar a página
    document.title = this.config.title;
    document.body.style.fontFamily = 'Arial, sans-serif';

    // Adicionar CSS customizado
    const style = document.createElement('style');
    style.textContent = `
      .my-app-header {
        background: linear-gradient(45deg, #667eea, #764ba2);
        color: white;
        padding: 20px;
        text-align: center;
        margin-bottom: 20px;
      }
      .my-app-content {
        padding: 20px;
        max-width: 800px;
        margin: 0 auto;
      }
    `;
    document.head.appendChild(style);

    // Adicionar header customizado
    const header = document.createElement('div');
    header.className = 'my-app-header';
    header.innerHTML = `
      <h1>${this.config.title}</h1>
      <p>Powered by FluxDesktop + TypeScript + Bun</p>
    `;
    document.body.insertBefore(header, document.body.firstChild);
  }

  private setupIPC(): void {
    if (!this.window) return;

    // Handler para obter dados do sistema
    this.window.ipc.on('get-system-info', () => {
      return {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        bunVersion: Bun.version,
        fluxdesktopVersion: process.versions.fluxdesktop,
        uptime: process.uptime()
      };
    });

    // Handler para notificações
    this.window.ipc.on('show-notification', (message: string) => {
      console.log(`📢 Notificação: ${message}`);
      // Aqui você poderia mostrar notificações do sistema
      return 'Notificação processada';
    });

    // Handler para salvar dados
    this.window.ipc.on('save-data', async (data: any) => {
      // Aqui você poderia salvar no banco de dados, arquivo, etc.
      console.log('💾 Salvando dados:', data);
      await Bun.write('app-data.json', JSON.stringify(data, null, 2));
      return 'Dados salvos com sucesso!';
    });
  }

  async addInteractiveFeatures(): Promise<void> {
    if (!this.window) return;

    // Adicionar features interativas após 2 segundos
    setTimeout(async () => {
      await this.window?.window.eval(`
        // Adicionar painel de controles
        const panel = document.createElement('div');
        panel.className = 'my-app-content';
        panel.innerHTML = \`
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>🎮 Controles da Aplicação</h3>

            <button onclick="getSystemInfo()" style="margin: 5px; padding: 10px 15px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
              📊 Info do Sistema
            </button>

            <button onclick="showNotification()" style="margin: 5px; padding: 10px 15px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
              🔔 Enviar Notificação
            </button>

            <button onclick="saveData()" style="margin: 5px; padding: 10px 15px; background: #ffc107; color: black; border: none; border-radius: 4px; cursor: pointer;">
              💾 Salvar Dados
            </button>

            <div id="output" style="background: white; padding: 15px; margin-top: 15px; border-radius: 4px; font-family: monospace; white-space: pre-wrap; min-height: 100px;"></div>
          </div>
        \`;
        document.body.appendChild(panel);

        // Funções JavaScript para a página
        window.getSystemInfo = async () => {
          try {
            const info = await FluxDesktop.ipc.send('get-system-info');
            document.getElementById('output').textContent =
              'Sistema:\\n' + JSON.stringify(info, null, 2);
          } catch (error) {
            document.getElementById('output').textContent = 'Erro: ' + error.message;
          }
        };

        window.showNotification = async () => {
          try {
            const response = await FluxDesktop.ipc.send('show-notification', 'Hello from the browser!');
            document.getElementById('output').textContent = 'Resposta: ' + response;
          } catch (error) {
            document.getElementById('output').textContent = 'Erro: ' + error.message;
          }
        };

        window.saveData = async () => {
          try {
            const data = {
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent,
              url: window.location.href,
              randomId: Math.random().toString(36).substr(2, 9)
            };
            const response = await FluxDesktop.ipc.send('save-data', data);
            document.getElementById('output').textContent =
              'Dados salvos:\\n' + JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('output').textContent = 'Erro: ' + error.message;
          }
        };
      `);
    }, 2000);
  }

  async close(): Promise<void> {
    this.window?.close();
    this.window = null;
  }
}

// Uso da aplicação
async function main() {
  const app = new MyApp({
    title: 'Minha App com FluxDesktop TS',
    url: 'https://example.com',
    width: 1000,
    height: 700
  });

  try {
    await app.start();
    await app.addInteractiveFeatures();

    // A aplicação fica rodando...
    // Para fechar: app.close()
  } catch (error) {
    console.error('❌ Erro na aplicação:', error);
  }
}

// Executar se for o arquivo principal
if (import.meta.main) {
  main();
}

export { MyApp };
export type { MyAppConfig };