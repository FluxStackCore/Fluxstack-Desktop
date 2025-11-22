import type { ErrorContext, FluxStack, PluginContext, RequestContext, ResponseContext } from "@/core/plugins/types"
// ✅ Plugin imports its own configuration
import { FluxStackDesktopConfig } from './config'
// Import the desktop functionality
import { open } from './src'

// Browser types (copied from src for type checking)
type BrowserName =
  | 'chrome'
  | 'chrome_canary'
  | 'chromium'
  | 'chromium_snapshot'
  | 'edge'
  | 'firefox'
  | 'firefox_nightly'

// Type guard for valid browser names
function isBrowserName(value: string): value is BrowserName {
  const validBrowsers: BrowserName[] = [
    'chrome',
    'chrome_canary',
    'chromium',
    'chromium_snapshot',
    'edge',
    'firefox',
    'firefox_nightly'
  ]
  return validBrowsers.includes(value as BrowserName)
}

/**
 * FluxStack Desktop Plugin
 * Create native desktop applications from web apps using system browsers and Bun runtime.
 */
export class FluxStackDesktopPlugin implements FluxStack.Plugin {
  name = 'fluxstack-desktop'
  version = '1.0.0'
  description = 'Create native desktop applications from web apps using system browsers and Bun runtime.'
  author = 'FluxStack Team'
  category = 'desktop'
  tags = ['desktop', 'browser', 'electron-alternative']

  /**
   * Setup hook - called when plugin is loaded
   */
  async setup(context: PluginContext): Promise<void> {
    // Check if plugin is enabled
    if (!FluxStackDesktopConfig.enabled) {
      context.logger.info(`[FluxStack Desktop] Plugin disabled by configuration`)
      return
    }

    context.logger.info(`[FluxStack Desktop] Plugin initialized`)
    context.logger.info(`[FluxStack Desktop] Auto-open: ${FluxStackDesktopConfig.autoOpen}`)
    context.logger.info(`[FluxStack Desktop] Auto-shutdown: ${FluxStackDesktopConfig.autoShutdown}`)
    context.logger.info(`[FluxStack Desktop] Window size: ${FluxStackDesktopConfig.windowWidth}x${FluxStackDesktopConfig.windowHeight}`)

    // Store plugin info for display
    if (!(global as any).__fluxstackPlugins) {
      (global as any).__fluxstackPlugins = []
    }
    (global as any).__fluxstackPlugins.push({
      name: 'FluxStack Desktop',
      status: 'Active',
      details: `Auto-open: ${FluxStackDesktopConfig.autoOpen ? 'Yes' : 'No'}, Auto-shutdown: ${FluxStackDesktopConfig.autoShutdown ? 'Yes' : 'No'}`
    })
  }

  /**
   * Server start hook - called when server starts
   * Opens desktop window if auto-open is enabled
   */
  async onServerStart?(context: PluginContext): Promise<void> {
    if (!FluxStackDesktopConfig.enabled) return

    if (FluxStackDesktopConfig.autoOpen) {
      const maxRetries = 3
      const retryDelay = 2000 // 2 seconds

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          context.logger.info(`[FluxStack Desktop] Opening desktop window at ${FluxStackDesktopConfig.targetUrl}${attempt > 1 ? ` (attempt ${attempt}/${maxRetries})` : ''}`)

          const windowSize: [number, number] = [
            FluxStackDesktopConfig.windowWidth,
            FluxStackDesktopConfig.windowHeight
          ]

          const forceBrowserConfig = FluxStackDesktopConfig.forceBrowser
          const forceBrowser = forceBrowserConfig && isBrowserName(forceBrowserConfig)
            ? forceBrowserConfig
            : undefined

          // Setup auto-shutdown callback if enabled
          const onBrowserExit = FluxStackDesktopConfig.autoShutdown
            ? () => {
                context.logger.info(`[FluxStack Desktop] Browser window closed, shutting down server...`)

                // Add shutdown delay for graceful cleanup
                setTimeout(() => {
                  context.logger.info(`[FluxStack Desktop] Initiating graceful server shutdown`)
                  process.exit(0)
                }, FluxStackDesktopConfig.shutdownDelay)
              }
            : undefined

          const browser = await open(FluxStackDesktopConfig.targetUrl, {
            windowSize,
            ...(forceBrowser && { forceBrowser }),
            ...(onBrowserExit && { onBrowserExit })
          })

          if (browser) {
            context.logger.info(`[FluxStack Desktop] Desktop window opened successfully`)

            if (FluxStackDesktopConfig.autoShutdown) {
              context.logger.info(`[FluxStack Desktop] Auto-shutdown enabled - server will close when browser window closes`)
            }
            return // Success, exit the retry loop
          }
        } catch (error) {
          context.logger.error(`[FluxStack Desktop] Failed to open desktop window (attempt ${attempt}/${maxRetries}):`, error)

          if (attempt < maxRetries) {
            context.logger.info(`[FluxStack Desktop] Retrying in ${retryDelay / 1000} seconds...`)
            await new Promise(resolve => setTimeout(resolve, retryDelay))
          } else {
            context.logger.error(`[FluxStack Desktop] All ${maxRetries} attempts failed. Desktop window could not be opened.`)
          }
        }
      }
    }
  }

  /**
   * Request hook - called on each request
   */
  async onRequest?(context: RequestContext): Promise<void> {
    if (!FluxStackDesktopConfig.enabled) return

    // Optional: Log desktop-related requests if debug is enabled
    if (FluxStackDesktopConfig.debug) {
      const userAgent = (context as any).headers?.['user-agent'] || ''
      if (userAgent.includes('Chrome') || userAgent.includes('Firefox') || userAgent.includes('Edge')) {
        console.debug(`[FluxStack Desktop] Request from desktop browser: ${context.method} ${context.path}`)
      }
    }
  }

  /**
   * Response hook - called on each response
   */
  async onResponse?(context: ResponseContext): Promise<void> {
    if (!FluxStackDesktopConfig.enabled || !FluxStackDesktopConfig.debug) return

    // Optional: Log desktop-related responses if debug is enabled
    const userAgent = (context as any).headers?.['user-agent'] || ''
    if (userAgent.includes('Chrome') || userAgent.includes('Firefox') || userAgent.includes('Edge')) {
      console.debug(`[FluxStack Desktop] Response to desktop browser: ${context.statusCode} ${context.path}`)
    }
  }

  /**
   * Error hook - called when errors occur
   */
  async onError?(context: ErrorContext): Promise<void> {
    console.error(`[FluxStack Desktop] Error:`, context.error)

    // Optionally handle desktop-specific errors here
  }
}

// Export plugin instance
export default new FluxStackDesktopPlugin()

// Re-export the open function and utilities for external use
export { open, createDesktopUtils, type DesktopUtils } from './src'
export type {
  ScreenshotOptions,
  WindowState,
  NotificationOptions,
  FileDialogOptions
} from './src'
