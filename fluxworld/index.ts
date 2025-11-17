import * as FluxDesktop from '../src/index.ts';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const __dirname = import.meta.dir;

async function startFluxWorld() {
  console.log('🚀 Starting FluxWorld demo...');

  try {
    const Browser = await FluxDesktop.open(pathToFileURL(join(__dirname, 'index.html')).href, {
      windowSize: [1000, 800],
      onLoad: () => {
        console.log('📱 FluxWorld loaded successfully!');

        // Add FluxDesktop branding
        document.documentElement.setAttribute('data-fluxdesktop', 'true');

        // Add custom styles for demo
        const style = document.createElement('style');
        style.textContent = `
          .fluxdesktop-badge {
            position: fixed;
            top: 10px;
            right: 10px;
            background: #28a745;
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 0.8rem;
            z-index: 10000;
          }
        `;
        document.head.appendChild(style);

        const badge = document.createElement('div');
        badge.className = 'fluxdesktop-badge';
        badge.textContent = '🚀 FluxDesktop Active';
        document.body.appendChild(badge);
      }
    });

    // Setup IPC handlers for demo
    Browser.ipc.on('test-message', (data) => {
      console.log('📨 Received test message:', data);
      return {
        status: 'success',
        timestamp: Date.now(),
        echo: data,
        message: 'Hello from FluxDesktop backend!'
      };
    });

    Browser.ipc.on('get-system-info', () => {
      console.log('📊 System info requested');
      return {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        bunVersion: Bun.version,
        fluxdesktopVersion: process.versions.fluxdesktop,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      };
    });

    // Demo CDP usage
    setTimeout(async () => {
      try {
        console.log('🔧 Testing CDP integration...');
        const result = await Browser.cdp.send('Runtime.evaluate', {
          expression: 'document.title'
        });
        console.log('📄 Page title via CDP:', result.result.value);
      } catch (error) {
        console.error('❌ CDP Error:', error);
      }
    }, 2000);

    console.log('✅ FluxWorld demo is running!');
    console.log('🌐 Open the browser window to interact with the demo');

    return Browser;

  } catch (error) {
    console.error('❌ Error starting FluxWorld:', error);
    process.exit(1);
  }
}

// Auto-start if this is the main module
if (import.meta.main) {
  startFluxWorld();
}

export { startFluxWorld };