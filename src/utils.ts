/**
 * FluxStack Desktop Utilities
 * High-level functions for desktop application development
 */

import './types';
import './types/window';

// Browser instance type from inject.ts
interface FluxDesktopWindow {
  window: {
    eval: (func: string | Function) => Promise<any>;
  };
  ipc: any;
  cdp: {
    send: (method: string, params?: Record<string, any>) => Promise<any>;
  };
  close: () => void;
}

/**
 * Screenshot options
 */
export interface ScreenshotOptions {
  /** Output file path (optional - returns base64 if not provided) */
  path?: string;
  /** Image format */
  format?: 'png' | 'jpeg' | 'webp';
  /** Image quality (0-100, only for jpeg/webp) */
  quality?: number;
  /** Capture full page (scrollable content) */
  fullPage?: boolean;
  /** Clip area */
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Window state management
 */
export interface WindowState {
  minimized: boolean;
  maximized: boolean;
  fullscreen: boolean;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Notification options
 */
export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

/**
 * File dialog options
 */
export interface FileDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  properties?: ('openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles')[];
}

/**
 * Create enhanced FluxDesktop utilities for a browser instance
 */
export function createDesktopUtils(browser: FluxDesktopWindow) {

  /**
   * Take a screenshot of the current page
   */
  async function screenshot(options: ScreenshotOptions = {}): Promise<string> {
    const {
      format = 'png',
      quality = 90,
      fullPage = false,
      clip,
      path
    } = options;

    // Get viewport dimensions if fullPage is true
    if (fullPage) {
      const { result } = await browser.cdp.send('Runtime.evaluate', {
        expression: `({
          width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
          height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
        })`
      });

      if (result.value) {
        const viewport = result.value;
        await browser.cdp.send('Emulation.setDeviceMetricsOverride', {
          width: viewport.width,
          height: viewport.height,
          deviceScaleFactor: 1,
          mobile: false
        });
      }
    }

    const screenshotParams: any = {
      format,
      ...(format !== 'png' && { quality }),
      ...(clip && { clip })
    };

    const { data } = await browser.cdp.send('Page.captureScreenshot', screenshotParams);

    // Reset viewport if it was changed
    if (fullPage) {
      await browser.cdp.send('Emulation.clearDeviceMetricsOverride');
    }

    // Save to file if path is provided
    if (path) {
      const buffer = Buffer.from(data, 'base64');
      await Bun.write(path, buffer);
      return path;
    }

    return data; // Return base64 string
  }

  /**
   * Minimize the window
   */
  async function minimize(): Promise<void> {
    await browser.window.eval(() => {
      if ((window as any).electronAPI?.minimize) {
        (window as any).electronAPI.minimize();
      }
    });
  }

  /**
   * Maximize the window
   */
  async function maximize(): Promise<void> {
    await browser.window.eval(() => {
      if ((window as any).electronAPI?.maximize) {
        (window as any).electronAPI.maximize();
      }
    });
  }

  /**
   * Toggle fullscreen mode
   */
  async function toggleFullscreen(): Promise<void> {
    await browser.window.eval(() => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    });
  }

  /**
   * Set zoom level (1.0 = 100%)
   */
  async function setZoom(level: number): Promise<void> {
    await browser.cdp.send('Emulation.setPageScaleFactor', {
      pageScaleFactor: level
    });
  }

  /**
   * Get current zoom level
   */
  async function getZoom(): Promise<number> {
    const { result } = await browser.window.eval(() => window.devicePixelRatio);
    return result?.value || 1.0;
  }

  /**
   * Show system notification
   */
  async function showNotification(options: NotificationOptions): Promise<void> {
    const optionsJson = JSON.stringify(options);
    await browser.window.eval(`
      (function(opts) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(opts.title, {
            body: opts.body,
            icon: opts.icon,
            tag: opts.tag,
            requireInteraction: opts.requireInteraction,
            silent: opts.silent
          });
        } else if ('Notification' in window) {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification(opts.title, {
                body: opts.body,
                icon: opts.icon,
                tag: opts.tag,
                requireInteraction: opts.requireInteraction,
                silent: opts.silent
              });
            }
          });
        }
      })(${optionsJson})
    `);
  }

  /**
   * Open DevTools
   */
  async function openDevTools(): Promise<void> {
    await browser.cdp.send('Runtime.evaluate', {
      expression: 'console.log("DevTools opened via CDP")'
    });
  }

  /**
   * Close DevTools
   */
  async function closeDevTools(): Promise<void> {
    // DevTools closing is browser-dependent
    await browser.window.eval(() => {
      console.log('DevTools close requested');
    });
  }

  /**
   * Execute JavaScript in the browser context
   */
  async function executeScript(script: string | Function): Promise<any> {
    const result = await browser.window.eval(script);
    return result?.result?.value;
  }

  /**
   * Inject CSS into the page
   */
  async function injectCSS(css: string): Promise<void> {
    await browser.window.eval(`
      const style = document.createElement('style');
      style.textContent = ${JSON.stringify(css)};
      document.head.appendChild(style);
    `);
  }

  /**
   * Navigate to URL
   */
  async function navigate(url: string): Promise<void> {
    await browser.cdp.send('Page.navigate', { url });
  }

  /**
   * Go back in history
   */
  async function goBack(): Promise<void> {
    const { result } = await browser.window.eval(() => {
      window.history.back();
      return true;
    });
    return result?.value;
  }

  /**
   * Go forward in history
   */
  async function goForward(): Promise<void> {
    const { result } = await browser.window.eval(() => {
      window.history.forward();
      return true;
    });
    return result?.value;
  }

  /**
   * Reload the page
   */
  async function reload(ignoreCache: boolean = false): Promise<void> {
    await browser.cdp.send('Page.reload', { ignoreCache });
  }

  /**
   * Get current URL
   */
  async function getCurrentURL(): Promise<string> {
    const { result } = await browser.window.eval(() => window.location.href);
    return result?.value || '';
  }

  /**
   * Set window title
   */
  async function setTitle(title: string): Promise<void> {
    await browser.window.eval(`document.title = ${JSON.stringify(title)};`);
  }

  /**
   * Get page title
   */
  async function getTitle(): Promise<string> {
    const { result } = await browser.window.eval(() => document.title);
    return result?.value || '';
  }

  /**
   * Print page
   */
  async function print(): Promise<void> {
    await browser.window.eval(() => {
      window.print();
    });
  }

  /**
   * Get page metrics (performance)
   */
  async function getMetrics(): Promise<any> {
    const metrics = await browser.cdp.send('Performance.getMetrics');
    return metrics;
  }

  /**
   * Monitor console messages
   */
  function onConsoleMessage(callback: (message: any) => void): void {
    // This would need to be implemented with CDP Runtime.consoleAPICalled
    browser.cdp.send('Runtime.enable').then(() => {
      // Setup console monitoring
      console.log('Console monitoring setup (implementation needed)');
    });
  }

  /**
   * Monitor network requests
   */
  function onNetworkRequest(callback: (request: any) => void): void {
    browser.cdp.send('Network.enable').then(() => {
      // Setup network monitoring
      console.log('Network monitoring setup (implementation needed)');
    });
  }

  /**
   * Get current window bounds
   */
  async function getWindowBounds(): Promise<{ x: number; y: number; width: number; height: number }> {
    const { result } = await browser.window.eval(() => ({
      x: window.screenX,
      y: window.screenY,
      width: window.outerWidth,
      height: window.outerHeight
    }));
    return result?.value || { x: 0, y: 0, width: 800, height: 600 };
  }

  /**
   * Check if window is focused
   */
  async function isFocused(): Promise<boolean> {
    const { result } = await browser.window.eval(() => document.hasFocus());
    return result?.value || false;
  }

  /**
   * Focus the window
   */
  async function focus(): Promise<void> {
    await browser.window.eval(() => {
      window.focus();
    });
  }

  /**
   * Close the browser window and optionally shutdown the server
   */
  async function closeWindow(shutdownServer: boolean = false): Promise<void> {
    if (shutdownServer) {
      // First show notification that server is shutting down
      await showNotification({
        title: 'FluxStack Desktop',
        body: 'Server shutting down...',
        silent: true
      });

      // Give a moment for notification to show
      setTimeout(() => {
        browser.close();
        // Shutdown server
        setTimeout(() => {
          process.exit(0);
        }, 500);
      }, 1000);
    } else {
      browser.close();
    }
  }

  /**
   * Quit application completely (close window and shutdown server)
   */
  async function quitApplication(): Promise<void> {
    await closeWindow(true);
  }

  /**
   * Save data to file using Bun's native API
   */
  async function saveFile(path: string, data: string | Buffer | ArrayBuffer): Promise<number> {
    return await Bun.write(path, data);
  }

  /**
   * Read text file using Bun's native API
   */
  async function readTextFile(path: string): Promise<string> {
    return await Bun.file(path).text();
  }

  /**
   * Read JSON file using Bun's native API
   */
  async function readJSONFile(path: string): Promise<any> {
    return await Bun.file(path).json();
  }

  /**
   * Check if file exists using Bun's native API
   */
  async function fileExists(path: string): Promise<boolean> {
    return await Bun.file(path).exists();
  }

  /**
   * Get file size using Bun's native API
   */
  async function getFileSize(path: string): Promise<number> {
    return await Bun.file(path).size;
  }

  /**
   * Get environment variable
   */
  function getEnv(key: string): string | undefined {
    return Bun.env[key];
  }

  /**
   * Get Bun version
   */
  function getBunVersion(): string {
    return Bun.version;
  }

  /**
   * Run shell command using Bun's spawn API
   */
  async function runCommand(command: string, args: string[] = []): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    // This would require Bun.spawn which might need to be declared
    try {
      // Placeholder for Bun.spawn implementation
      console.log(`Would run: ${command} ${args.join(' ')}`);
      return {
        stdout: '',
        stderr: '',
        exitCode: 0
      };
    } catch (error) {
      return {
        stdout: '',
        stderr: String(error),
        exitCode: 1
      };
    }
  }

  /**
   * Show native file picker dialog
   */
  async function showOpenDialog(options: FileDialogOptions = {}): Promise<string[] | null> {
    // This would integrate with system file dialogs
    // For now, use HTML5 file input
    const optionsJson = JSON.stringify(options);
    const { result } = await browser.window.eval(`
      (function(opts) {
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.style.display = 'none';

          if (opts.properties?.includes('multiSelections')) {
            input.multiple = true;
          }

          if (opts.properties?.includes('openDirectory')) {
            input.webkitdirectory = true;
          }

          if (opts.filters && opts.filters.length > 0) {
            const accept = opts.filters.map(filter =>
              filter.extensions.map(ext => "." + ext).join(',')
            ).join(',');
            input.accept = accept;
          }

          input.onchange = (e) => {
            const files = Array.from(e.target.files || []).map((file) => file.name);
            resolve(files.length > 0 ? files : null);
            document.body.removeChild(input);
          };

          input.oncancel = () => {
            resolve(null);
            document.body.removeChild(input);
          };

          document.body.appendChild(input);
          input.click();
        });
      })(${optionsJson})
    `);

    return result?.value || null;
  }

  /**
   * Show native save dialog
   */
  async function showSaveDialog(options: FileDialogOptions = {}): Promise<string | null> {
    // This would integrate with system save dialogs
    // For now, trigger download
    const optionsJson = JSON.stringify(options);
    const { result } = await browser.window.eval(`
      (function(opts) {
        const filename = opts.defaultPath || 'download.txt';
        return filename;
      })(${optionsJson})
    `);

    return result?.value || null;
  }

  /**
   * Copy text to clipboard
   */
  async function copyToClipboard(text: string): Promise<void> {
    await browser.window.eval(`
      (function(textToCopy) {
        if (navigator.clipboard && window.isSecureContext) {
          return navigator.clipboard.writeText(textToCopy);
        } else {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = textToCopy;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          textArea.remove();
        }
      })(${JSON.stringify(text)})
    `);
  }

  /**
   * Read text from clipboard
   */
  async function readFromClipboard(): Promise<string> {
    const { result } = await browser.window.eval(async () => {
      if (navigator.clipboard && window.isSecureContext) {
        return await navigator.clipboard.readText();
      }
      return '';
    });

    return result?.value || '';
  }

  /**
   * Take full page PDF
   */
  async function exportToPDF(options: { path?: string; format?: 'A4' | 'Letter'; landscape?: boolean } = {}): Promise<string> {
    const {
      format = 'A4',
      landscape = false,
      path
    } = options;

    const { data } = await browser.cdp.send('Page.printToPDF', {
      paperWidth: format === 'A4' ? 8.27 : 8.5,
      paperHeight: format === 'A4' ? 11.7 : 11,
      landscape,
      printBackground: true,
      preferCSSPageSize: true
    });

    if (path) {
      const buffer = Buffer.from(data, 'base64');
      await Bun.write(path, buffer);
      return path;
    }

    return data;
  }

  return {
    // Window management
    minimize,
    maximize,
    toggleFullscreen,
    focus,
    getWindowBounds,
    isFocused,
    closeWindow,
    quitApplication,

    // Navigation
    navigate,
    goBack,
    goForward,
    reload,
    getCurrentURL,

    // Page manipulation
    setTitle,
    getTitle,
    executeScript,
    injectCSS,
    screenshot,
    print,
    exportToPDF,

    // Zoom and display
    setZoom,
    getZoom,

    // System integration
    showNotification,
    copyToClipboard,
    readFromClipboard,

    // File system (Bun native APIs)
    saveFile,
    readTextFile,
    readJSONFile,
    fileExists,
    getFileSize,

    // File dialogs
    showOpenDialog,
    showSaveDialog,

    // DevTools
    openDevTools,
    closeDevTools,

    // Performance
    getMetrics,

    // Events
    onConsoleMessage,
    onNetworkRequest,

    // System utilities
    getEnv,
    getBunVersion,
    runCommand,

    // Direct access to underlying APIs
    browser,
    cdp: browser.cdp,
    window: browser.window,
    ipc: browser.ipc
  };
}

export type DesktopUtils = ReturnType<typeof createDesktopUtils>;