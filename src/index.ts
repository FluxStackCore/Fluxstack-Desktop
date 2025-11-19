import { join, delimiter, sep } from 'node:path';
import { access, readdir } from 'node:fs/promises';

import Chromium from './browser/chromium';
import Firefox from './browser/firefox';
import { loadOnLoadWrapper } from './lib/scripts';
import FluxStackDesktopConfig from '../config';
import { ensureChromium, hasLocalChromium, getLocalChromiumPath } from './lib/chromium-downloader';
// import IdleAPI from './lib/idle';

// Global log function with colored output
const rgb = (r: number, g: number, b: number, msg: string): string =>
  `\x1b[38;2;${r};${g};${b}m${msg}\x1b[0m`;

declare global {
  // eslint-disable-next-line no-var
  var log: (...args: any[]) => void;
  namespace NodeJS {
    interface ProcessVersions {
      fluxdesktop: string;
    }
  }
}

global.log = (...args: any[]): void =>
  console.log(`[${rgb(88, 101, 242, 'FluxDesktop')}]`, ...args);

// Set FluxDesktop version
process.versions.fluxdesktop = '1.0.0';

// Browser types
type BrowserName =
  | 'chrome'
  | 'chrome_canary'
  | 'chromium'
  | 'chromium_snapshot'
  | 'edge'
  | 'firefox'
  | 'firefox_nightly';

type Platform = 'win32' | 'linux';

// Platform-specific browser paths
type BrowserPaths = {
  [K in Platform]: {
    [B in BrowserName]?: string | string[]
  }
}

const browserPaths: BrowserPaths = {
  win32: {
    chrome: join(process.env['PROGRAMFILES'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    chrome_canary: join(process.env['LOCALAPPDATA'] || '', 'Google', 'Chrome SxS', 'Application', 'chrome.exe'),
    edge: join(process.env['PROGRAMFILES(x86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    firefox: join(process.env['PROGRAMFILES'] || '', 'Mozilla Firefox', 'firefox.exe'),
    firefox_nightly: join(process.env['PROGRAMFILES'] || '', 'Firefox Nightly', 'firefox.exe'),
  },

  linux: {
    chrome: ['chrome', 'google-chrome', 'chrome-browser', 'google-chrome-stable'],
    chrome_canary: ['chrome-canary', 'google-chrome-canary', 'google-chrome-unstable', 'chrome-unstable'],
    chromium: ['chromium', 'chromium-browser'],
    chromium_snapshot: ['chromium-snapshot', 'chromium-snapshot-bin'],
    firefox: 'firefox',
    firefox_nightly: 'firefox-nightly'
  }
};

let _binariesInPath: string[] | undefined; // cache as to avoid excessive reads

const getBinariesInPath = async (): Promise<string[]> => {
  if (_binariesInPath) return _binariesInPath;

  return _binariesInPath = (await Promise.all(
    (process.env['PATH'] || '')
      .replaceAll('\"', '')
      .split(delimiter)
      .filter(Boolean)
      .map(x => readdir(x.replace(/\"+/g, '')).catch(() => []))
  )).flat();
};

const exists = async (path: string): Promise<boolean> => {
  if (path.includes(sep)) {
    return await access(path).then(() => true).catch(() => false);
  }

  // just binary name, so check path
  return (await getBinariesInPath()).includes(path);
};

const getBrowserPath = async (browser: BrowserName): Promise<string | null> => {
  const platformPaths = browserPaths[process.platform as Platform];
  if (!platformPaths) return null;

  const paths = platformPaths[browser];
  if (!paths) return null;

  const pathArray = Array.isArray(paths) ? paths : [paths];

  for (const path of pathArray) {
    log('checking if ' + browser + ' exists:', path, await exists(path));

    if (await exists(path)) return path;
  }

  return null;
};

const findBrowserPath = async (forceBrowser?: BrowserName): Promise<[string, BrowserName] | null> => {
  // 1. Check for custom browser path first (highest priority)
  const customPath = FluxStackDesktopConfig.customBrowserPath;
  if (customPath && customPath.trim() !== '') {
    if (await exists(customPath)) {
      log('using custom browser path:', customPath);
      return [customPath, 'chrome']; // Default to chrome type for custom browsers
    } else {
      log('custom browser path not found:', customPath);
    }
  }

  // 2. Check for force browser config
  const configBrowser = FluxStackDesktopConfig.forceBrowser;
  if (configBrowser && configBrowser.trim() !== '') {
    // Try as browser name first
    if (Object.keys(browserPaths[process.platform as Platform] || {}).includes(configBrowser)) {
      const path = await getBrowserPath(configBrowser as BrowserName);
      if (path) {
        log('using config force browser:', configBrowser, 'at:', path);
        return [path, configBrowser as BrowserName];
      }
    }
    // Try as direct path
    if (await exists(configBrowser)) {
      log('using config browser path:', configBrowser);
      return [configBrowser, 'chrome']; // Default to chrome type for custom paths
    }
  }

  // 3. Check for function parameter forceBrowser
  if (forceBrowser) {
    const path = await getBrowserPath(forceBrowser);
    return path ? [path, forceBrowser] : null;
  }

  // 4. Check browser priority list
  const priorityList = FluxStackDesktopConfig.browserPriority;
  if (priorityList && priorityList.trim() !== '') {
    const browsers = priorityList.split(',').map(b => b.trim()).filter(Boolean);
    for (const browserName of browsers) {
      if (Object.keys(browserPaths[process.platform as Platform] || {}).includes(browserName)) {
        const path = await getBrowserPath(browserName as BrowserName);
        if (path) {
          log('using priority browser:', browserName, 'at:', path);
          return [path, browserName as BrowserName];
        }
      }
    }
  }

  // 5. Check command line arguments
  const platformPaths = browserPaths[process.platform as Platform];
  if (platformPaths) {
    for (const browserName of Object.keys(platformPaths) as BrowserName[]) {
      if (process.argv.includes('--' + browserName) ||
          process.argv.includes('--' + browserName.split('_')[0]!)) {
        const path = await getBrowserPath(browserName);
        if (path) return [path, browserName];
      }
    }

    // 6. Auto-detect available browser (fallback) - Priority: Edge > Chrome > Firefox
    const browserPriority: BrowserName[] = [
      'edge',
      'chrome', 'chrome_canary', 'chromium', 'chromium_snapshot',
      'firefox', 'firefox_nightly'
    ];

    for (const browserName of browserPriority) {
      if (browserName in platformPaths) {
        const path = await getBrowserPath(browserName);
        if (path) return [path, browserName];
      }
    }
  }

  // 7. Fallback: Try local Chromium first, then download if needed
  try {
    if (await hasLocalChromium()) {
      const chromiumPath = getLocalChromiumPath();
      log('using local Chromium:', chromiumPath);
      return [chromiumPath, 'chromium'];
    }

    // No browser found anywhere, download Chromium
    log('no browser found in system, will download Chromium');
    const chromiumPath = await ensureChromium();
    return [chromiumPath, 'chromium'];
  } catch (error) {
    log('failed to ensure Chromium:', error instanceof Error ? error.message : String(error));
    return null;
  }
};

const getFriendlyName = (whichBrowser: string): string =>
  whichBrowser[0]!.toUpperCase() +
  whichBrowser.slice(1).replace(/[a-z]_[a-z]/g, match =>
    match[0]! + ' ' + match[2]!.toUpperCase()
  );

const getDataPath = (): string => {
  // Use custom path if provided in config, otherwise default to current working directory
  const customPath = FluxStackDesktopConfig.dataPath;
  return customPath && customPath.trim() !== ''
    ? customPath
    : join(process.cwd(), 'chrome_data');
};

const getCustomBrowserArgs = (): string[] => {
  const customArgsString = FluxStackDesktopConfig.customBrowserArgs;
  if (!customArgsString || customArgsString.trim() === '') {
    return [];
  }

  // Split by spaces but preserve quoted arguments
  const args: string[] = [];
  const matches = customArgsString.match(/(?:[^\s"]+|"[^"]*")+/g) || [];

  for (const match of matches) {
    // Remove surrounding quotes if present
    const arg = match.replace(/^"(.*)"$/, '$1');
    if (arg.trim()) {
      args.push(arg);
    }
  }

  return args;
};

// Window size interface (browsers expect [width, height] tuple)
type WindowSize = [number, number];

// Browser options interface
interface BrowserOptions {
  windowSize?: WindowSize;
  forceBrowser?: BrowserName;
}

// Internal browser start options
interface StartBrowserOptions {
  windowSize?: WindowSize | undefined;
  forceBrowser?: BrowserName | undefined;
  onBrowserExit?: () => void;
}

const startBrowser = async (url: string, { windowSize, forceBrowser, onBrowserExit }: StartBrowserOptions) => {
  const dataPath = getDataPath();
  const browserInfo = await findBrowserPath(forceBrowser);

  if (!browserInfo) {
    log('failed to find a good browser install');
    return null;
  }

  const [browserPath, browserName] = browserInfo;
  const browserFriendlyName = getFriendlyName(browserName);

  log('browser path:', browserPath);
  log('data path:', dataPath);

  const browserType = browserName.startsWith('firefox') ? 'firefox' : 'chromium';
  const customArgs = getCustomBrowserArgs();

  if (customArgs.length > 0) {
    log('using custom browser args:', customArgs);
  }

  const Browser = await (browserType === 'firefox' ? Firefox : Chromium)({
    browserName: browserFriendlyName,
    dataPath,
    browserPath,
    onBrowserExit,
    customArgs
  }, {
    url,
    windowSize
  });

  // TODO: Re-enable idle API when ready
  // Browser.idle = await IdleAPI(Browser.cdp, { browserType, dataPath });

  return Browser;
};

// Public API options interface
export interface OpenOptions extends BrowserOptions {
  /** Function to evaluate in the web context once loaded. */
  onLoad?: Function;
  /** Callback when browser process exits/closes. */
  onBrowserExit?: () => void;
}

/**
 * Open a new FluxDesktop window.
 */
export const open = async (
  url: string,
  { windowSize, onLoad, forceBrowser, onBrowserExit }: OpenOptions = {}
): Promise<any> => {
  log('starting browser...');

  const Browser = await startBrowser(url, { windowSize, forceBrowser, onBrowserExit });

  if (!Browser) {
    throw new Error('Failed to start browser');
  }

  if (onLoad) {
    const toRun = await loadOnLoadWrapper(onLoad);

    Browser.window.eval(toRun);

    await Browser.cdp.send('Page.enable');
    await Browser.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: toRun
    });
  }

  return Browser;
};

// Export utility functions and types
export { createDesktopUtils, type DesktopUtils } from './utils';
export type {
  ScreenshotOptions,
  WindowState,
  NotificationOptions,
  FileDialogOptions
} from './utils';