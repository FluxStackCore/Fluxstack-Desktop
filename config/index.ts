/**
 * FluxStack Desktop Plugin Configuration
 * Declarative config using FluxStack config system
 */

import { defineConfig, config } from '@/core/utils/config-schema'

const FluxStackDesktopConfigSchema = {
  // Enable/disable plugin
  enabled: config.boolean('FLUXSTACK_DESKTOP_ENABLED', true),

  // Auto-open browser on server start
  autoOpen: config.boolean('FLUXSTACK_DESKTOP_AUTO_OPEN', true),

  // Auto-shutdown server when window closes
  autoShutdown: config.boolean('FLUXSTACK_DESKTOP_AUTO_SHUTDOWN', true),

  // Default browser to use (name or path)
  forceBrowser: config.string('FLUXSTACK_DESKTOP_BROWSER', '', false),

  // Custom browser executable path (overrides detection)
  customBrowserPath: config.string('FLUXSTACK_DESKTOP_CUSTOM_BROWSER_PATH', '', false),

  // Browser priority list (comma-separated, e.g., "chrome,firefox,edge")
  browserPriority: config.string('FLUXSTACK_DESKTOP_BROWSER_PRIORITY', '', false),

  // Custom browser arguments (space-separated additional flags)
  customBrowserArgs: config.string('FLUXSTACK_DESKTOP_CUSTOM_BROWSER_ARGS', '', false),

  // Default window size [width, height]
  windowWidth: config.number('FLUXSTACK_DESKTOP_WINDOW_WIDTH', 1200),
  windowHeight: config.number('FLUXSTACK_DESKTOP_WINDOW_HEIGHT', 800),

  // Debug mode
  debug: config.boolean('FLUXSTACK_DESKTOP_DEBUG', false),

  // URL to open (default: FluxStack dev server)
  targetUrl: config.string('FLUXSTACK_DESKTOP_URL', 'http://127.0.0.1:3000', false),

  // Shutdown delay in milliseconds (to allow graceful cleanup)
  shutdownDelay: config.number('FLUXSTACK_DESKTOP_SHUTDOWN_DELAY', 1000),

  // Custom data path for browser storage (optional - defaults to process.cwd()/chrome_data)
  dataPath: config.string('FLUXSTACK_DESKTOP_DATA_PATH', '', false),

  // Window Controls
  // Note: minimize/maximize buttons CANNOT be disabled in Chrome/Edge --app mode
  // Use kioskMode instead for full control

  // Resizable - Allow window resizing (WORKS)
  resizable: config.boolean('FLUXSTACK_DESKTOP_RESIZABLE', true),

  // Context Menu - Disable right-click context menu (WORKS)
  disableContextMenu: config.boolean('FLUXSTACK_DESKTOP_DISABLE_CONTEXT_MENU', false),

  // Kiosk mode - Full kiosk mode: fullscreen, no controls, locked (RECOMMENDED)
  kioskMode: config.boolean('FLUXSTACK_DESKTOP_KIOSK_MODE', false),
} as const

export const FluxStackDesktopConfig = defineConfig(FluxStackDesktopConfigSchema)

export type FluxStackDesktopConfig = typeof FluxStackDesktopConfig
export default FluxStackDesktopConfig
