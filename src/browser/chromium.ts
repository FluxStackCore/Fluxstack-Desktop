import StartBrowser from '../launcher/start';
import FluxStackDesktopConfig from '../../config';

interface BrowserConfig {
  browserName: string;
  browserPath: string;
  dataPath: string;
  onBrowserExit?: () => void;
  customArgs?: string[];
}

interface WindowConfig {
  url: string;
  windowSize?: [number, number] | undefined;
}

type PresetName = 'base' | 'perf' | 'battery' | 'memory';

const presets: Record<PresetName, string> = {
  // Presets from OpenAsar
  'base': '--autoplay-policy=no-user-gesture-required --disable-features=WinRetrieveSuggestionsOnlyOnDemand,HardwareMediaKeyHandling,MediaSessionService', // Base Discord
  'perf': '--enable-gpu-rasterization --enable-zero-copy --ignore-gpu-blocklist --enable-hardware-overlays=single-fullscreen,single-on-top,underlay --enable-features=EnableDrDc,CanvasOopRasterization,BackForwardCache:TimeToLiveInBackForwardCacheInSeconds/300/should_ignore_blocklists/true/enable_same_site/true,ThrottleDisplayNoneAndVisibilityHiddenCrossOriginIframes,UseSkiaRenderer,WebAssemblyLazyCompilation --disable-features=Vulkan --force_high_performance_gpu', // Performance
  'battery': '--enable-features=TurnOffStreamingMediaCachingOnBattery --force_low_power_gpu', // Known to have better battery life for Chromium?
  'memory': '--in-process-gpu --js-flags="--lite-mode --optimize_for_size --wasm_opt --wasm_lazy_compilation --wasm_lazy_validation --always_compact" --renderer-process-limit=2 --enable-features=QuickIntensiveWakeUpThrottlingAfterLoading' // Less (?) memory usage
};

export default async (
  { browserName, browserPath, dataPath, onBrowserExit, customArgs = [] }: BrowserConfig,
  { url, windowSize }: WindowConfig
) => {
  // Build base args
  const baseArgs = [
    `--app=${url}`,
    `--remote-debugging-pipe`,
    `--user-data-dir=${dataPath}`,
    windowSize ? `--window-size=${windowSize.join(',')}` : '',
    ...`--new-window --disable-extensions --disable-default-apps --disable-breakpad --disable-crashpad --disable-background-networking --disable-domain-reliability --disable-component-update --disable-sync --disable-features=AutofillServerCommunication ${presets.perf}`.split(' ')
  ];

  // Window control flags based on config
  const windowControlArgs: string[] = [];

  // Kiosk mode (overrides all other window settings)
  if (FluxStackDesktopConfig.kioskMode) {
    windowControlArgs.push('--kiosk');
    windowControlArgs.push('--kiosk-printing');
  } else {
    // Frameless window
    if (FluxStackDesktopConfig.frameless) {
      // Note: Chromium doesn't have a direct --frameless flag
      // This needs to be handled at the OS window manager level
      // or via custom window chrome in the app itself
      log('Frameless mode requested (requires custom implementation)');
    }
  }

  const args: string[] = [
    ...baseArgs,
    ...windowControlArgs,
    ...customArgs // Add custom arguments at the end (so they can override defaults)
  ].filter(Boolean);

  // Pass window control config to be injected
  return await StartBrowser(browserPath, args, 'websocket', {
    browserName,
    onBrowserExit,
    windowControls: {
      disableContextMenu: FluxStackDesktopConfig.disableContextMenu,
      resizable: FluxStackDesktopConfig.resizable,
      kioskMode: FluxStackDesktopConfig.kioskMode
    }
  });
};