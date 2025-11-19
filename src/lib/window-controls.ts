/**
 * Window Controls API
 * Manages window behavior, controls, and context menu
 */

export interface WindowControlsConfig {
  enableMinimize: boolean;
  enableMaximize: boolean;
  enableClose: boolean;
  disableContextMenu: boolean;
  resizable: boolean;
  kioskMode: boolean;
  frameless: boolean;
}

/**
 * Generate client-side script to control window behavior
 * This script is injected into the browser context
 */
export function generateWindowControlsScript(config: WindowControlsConfig): string {
  return `
(function() {
  'use strict';

  const windowControls = ${JSON.stringify(config)};

  // Disable context menu (right-click)
  if (windowControls.disableContextMenu) {
    document.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      return false;
    }, { capture: true });

    console.log('[FluxDesktop] Context menu disabled');
  }

  // Prevent window resizing (CSS-based approach)
  if (!windowControls.resizable) {
    document.addEventListener('DOMContentLoaded', function() {
      const style = document.createElement('style');
      style.textContent = \`
        * {
          -webkit-user-select: none !important;
          user-select: none !important;
          resize: none !important;
        }
      \`;
      document.head.appendChild(style);
    });

    console.log('[FluxDesktop] Window resizing disabled');
  }

  // Kiosk mode helpers
  if (windowControls.kioskMode) {
    // Prevent F11 fullscreen exit
    document.addEventListener('keydown', function(e) {
      if (e.key === 'F11' || (e.ctrlKey && e.key === 'q')) {
        e.preventDefault();
        return false;
      }
    }, { capture: true });

    // Prevent Esc key from exiting fullscreen
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        return false;
      }
    }, { capture: true });

    console.log('[FluxDesktop] Kiosk mode active');
  }

  // Create FluxDesktop.windowControls API
  if (!window.FluxDesktop) {
    window.FluxDesktop = {};
  }

  window.FluxDesktop.windowControls = {
    config: windowControls,

    // Get current window controls configuration
    getConfig: function() {
      return { ...windowControls };
    },

    // Check if a specific control is enabled
    isEnabled: function(control) {
      switch (control) {
        case 'minimize':
          return windowControls.enableMinimize;
        case 'maximize':
          return windowControls.enableMaximize;
        case 'close':
          return windowControls.enableClose;
        case 'contextMenu':
          return !windowControls.disableContextMenu;
        case 'resizable':
          return windowControls.resizable;
        default:
          return false;
      }
    },

    // Request to minimize window (if enabled)
    minimize: async function() {
      if (!windowControls.enableMinimize && !windowControls.kioskMode) {
        console.warn('[FluxDesktop] Minimize is disabled');
        return false;
      }

      // Use FluxDesktop IPC if available
      if (window.FluxDesktop && window.FluxDesktop.ipc) {
        try {
          await window.FluxDesktop.ipc.send('window:minimize');
          return true;
        } catch (err) {
          console.error('[FluxDesktop] Failed to minimize:', err);
          return false;
        }
      }

      return false;
    },

    // Request to maximize window (if enabled)
    maximize: async function() {
      if (!windowControls.enableMaximize && !windowControls.kioskMode) {
        console.warn('[FluxDesktop] Maximize is disabled');
        return false;
      }

      // Use FluxDesktop IPC if available
      if (window.FluxDesktop && window.FluxDesktop.ipc) {
        try {
          await window.FluxDesktop.ipc.send('window:maximize');
          return true;
        } catch (err) {
          console.error('[FluxDesktop] Failed to maximize:', err);
          return false;
        }
      }

      return false;
    },

    // Request to close window (if enabled)
    close: async function() {
      if (!windowControls.enableClose && !windowControls.kioskMode) {
        console.warn('[FluxDesktop] Close is disabled');
        return false;
      }

      // Use FluxDesktop IPC if available
      if (window.FluxDesktop && window.FluxDesktop.ipc) {
        try {
          await window.FluxDesktop.ipc.send('window:close');
          return true;
        } catch (err) {
          console.error('[FluxDesktop] Failed to close:', err);
          return false;
        }
      }

      return false;
    },

    // Toggle fullscreen
    toggleFullscreen: async function() {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    },

    // Check if window is in fullscreen
    isFullscreen: function() {
      return !!document.fullscreenElement;
    }
  };

  // Expose to global scope
  if (typeof window !== 'undefined') {
    window.__fluxDesktopWindowControls = window.FluxDesktop.windowControls;
  }

  console.log('[FluxDesktop] Window controls initialized:', windowControls);
})();
`;
}

/**
 * Setup backend IPC handlers for window control operations
 */
export function setupWindowControlHandlers(
  browser: any,
  config: WindowControlsConfig
): void {
  // Handle minimize request
  browser.ipc.on('window:minimize', async () => {
    if (!config.enableMinimize && !config.kioskMode) {
      console.warn('[FluxDesktop] Minimize blocked by configuration');
      return { success: false, reason: 'disabled' };
    }

    try {
      // Use CDP to minimize (Browser-level, not always supported)
      await browser.cdp.send('Browser.setWindowBounds', {
        windowId: 1,
        bounds: { windowState: 'minimized' }
      });
      return { success: true };
    } catch (error) {
      console.error('[FluxDesktop] Failed to minimize window:', error);
      return { success: false, error: String(error) };
    }
  });

  // Handle maximize request
  browser.ipc.on('window:maximize', async () => {
    if (!config.enableMaximize && !config.kioskMode) {
      console.warn('[FluxDesktop] Maximize blocked by configuration');
      return { success: false, reason: 'disabled' };
    }

    try {
      // Use CDP to maximize
      await browser.cdp.send('Browser.setWindowBounds', {
        windowId: 1,
        bounds: { windowState: 'maximized' }
      });
      return { success: true };
    } catch (error) {
      console.error('[FluxDesktop] Failed to maximize window:', error);
      return { success: false, error: String(error) };
    }
  });

  // Handle close request
  browser.ipc.on('window:close', async () => {
    if (!config.enableClose && !config.kioskMode) {
      console.warn('[FluxDesktop] Close blocked by configuration');
      return { success: false, reason: 'disabled' };
    }

    try {
      browser.close();
      return { success: true };
    } catch (error) {
      console.error('[FluxDesktop] Failed to close window:', error);
      return { success: false, error: String(error) };
    }
  });

  console.log('[FluxDesktop] Window control handlers registered');
}
