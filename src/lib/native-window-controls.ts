/**
 * Native Window Controls
 * Uses OS-native APIs to control window buttons (minimize, maximize, close, resize)
 *
 * This is required because Chromium doesn't have command-line flags to disable
 * window controls. We need to modify the window after it's created using OS APIs.
 */

import { windowManager, Window } from 'node-window-manager';
import { ChildProcess } from 'node:child_process';

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
 * Apply window controls to a browser process window
 * This finds the window created by the process and modifies its native properties
 */
export async function applyNativeWindowControls(
  proc: ChildProcess,
  config: WindowControlsConfig,
  browserName: string
): Promise<void> {
  if (!proc.pid) {
    console.warn('[FluxDesktop] Cannot apply window controls: no process PID');
    return;
  }

  // Wait for window to be created (Chromium takes some time to create the window)
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    // Try to find the window by process ID
    let browserWindow: Window | null = null;

    // Try multiple times (window might take time to appear)
    for (let attempt = 0; attempt < 10; attempt++) {
      const windows = windowManager.getWindows();

      // Find window by process ID
      browserWindow = windows.find(win => {
        try {
          return win.processId === proc.pid;
        } catch (err) {
          return false;
        }
      }) || null;

      if (browserWindow) {
        break;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!browserWindow) {
      console.warn('[FluxDesktop] Could not find browser window to apply controls');
      return;
    }

    console.log(`[FluxDesktop] Found browser window: "${browserWindow.getTitle()}" (PID: ${proc.pid})`);

    // Apply window control configurations
    const modifications: string[] = [];

    // Resizable
    if (!config.resizable) {
      try {
        browserWindow.setResizable(false);
        modifications.push('resizable=false');
      } catch (err) {
        console.warn('[FluxDesktop] Could not disable resizing:', err);
      }
    }

    // Note: node-window-manager doesn't have direct methods for minimize/maximize/close buttons
    // These need to be done via platform-specific APIs (Windows API, X11, etc.)
    // On Windows, this requires SetWindowLong with GWL_STYLE

    if (modifications.length > 0) {
      console.log(`[FluxDesktop] Applied native window controls: ${modifications.join(', ')}`);
    }

    // For Windows-specific controls, we need to use Windows API directly
    if (process.platform === 'win32') {
      await applyWindowsSpecificControls(browserWindow, config);
    } else {
      console.warn('[FluxDesktop] Native window control modification is only fully supported on Windows');
      console.warn('[FluxDesktop] For Linux/macOS, use window manager tools (wmctrl, xdotool, etc.)');
    }

  } catch (error) {
    console.error('[FluxDesktop] Error applying native window controls:', error);
  }
}

/**
 * Apply Windows-specific window controls using Win32 API
 * This uses Windows API to modify window styles (WS_MINIMIZEBOX, WS_MAXIMIZEBOX, etc.)
 */
async function applyWindowsSpecificControls(
  browserWindow: Window,
  config: WindowControlsConfig
): Promise<void> {
  try {
    // Dynamic import for Windows-only module
    const { user32, windef } = await import('win32-api');
    const { U } = user32;

    // Get all windows and find HWND by title (node-window-manager limitation)
    const title = browserWindow.getTitle();
    const hwnd = U.FindWindowExW(null, null, null, title);

    if (!hwnd || hwnd === 0) {
      console.warn('[FluxDesktop] Could not get window handle (HWND)');
      return;
    }

    console.log('[FluxDesktop] Got window handle (HWND):', hwnd);

    // Windows style constants
    const GWL_STYLE = -16;
    const WS_MINIMIZEBOX = 0x00020000;
    const WS_MAXIMIZEBOX = 0x00010000;
    const WS_SIZEBOX = 0x00040000;  // Resizable border
    const WS_SYSMENU = 0x00080000;  // System menu (includes close button)

    // Get current window style
    let style = U.GetWindowLongW(hwnd, GWL_STYLE);

    if (!style) {
      console.warn('[FluxDesktop] Could not get window style');
      return;
    }

    console.log('[FluxDesktop] Current window style:', style.toString(16));

    const modifications: string[] = [];

    // Modify minimize button
    if (!config.enableMinimize) {
      style = style & ~WS_MINIMIZEBOX;
      modifications.push('minimize=OFF');
    }

    // Modify maximize button
    if (!config.enableMaximize) {
      style = style & ~WS_MAXIMIZEBOX;
      modifications.push('maximize=OFF');
    }

    // Modify resizable border
    if (!config.resizable) {
      style = style & ~WS_SIZEBOX;
      modifications.push('resizable=OFF');
    }

    // Close button is part of WS_SYSMENU, but removing it removes the entire system menu
    // So we can't easily disable just the close button without custom implementation
    if (!config.enableClose) {
      // style = style & ~WS_SYSMENU;  // This would remove the entire title bar menu
      console.warn('[FluxDesktop] Disabling close button requires removing system menu (not recommended)');
      modifications.push('close=SKIP (would remove entire system menu)');
    }

    // Apply the new style
    const result = U.SetWindowLongW(hwnd, GWL_STYLE, style);

    if (!result && modifications.length > 0) {
      console.warn('[FluxDesktop] SetWindowLong returned 0, style might not have changed');
    }

    // Force window to redraw with new style
    U.SetWindowPos(
      hwnd,
      null,
      0, 0, 0, 0,
      0x0001 | 0x0002 | 0x0004 | 0x0020  // SWP_NOSIZE | SWP_NOMOVE | SWP_NOZORDER | SWP_FRAMECHANGED
    );

    if (modifications.length > 0) {
      console.log(`[FluxDesktop] ✅ Applied Windows native controls: ${modifications.join(', ')}`);
    }

    // Verify the change
    const newStyle = U.GetWindowLongW(hwnd, GWL_STYLE);
    console.log('[FluxDesktop] New window style:', newStyle.toString(16));

  } catch (error) {
    console.error('[FluxDesktop] Error applying Windows-specific controls:', error);
    console.error('[FluxDesktop] win32-api might not be available or not on Windows platform');
  }
}

/**
 * Monitor window and reapply controls if needed
 * Some applications might reset window styles, so we monitor and reapply
 */
export function monitorWindowControls(
  proc: ChildProcess,
  config: WindowControlsConfig,
  browserName: string
): void {
  if (!config.resizable && !config.enableMinimize && !config.enableMaximize) {
    // No monitoring needed if no restrictions
    return;
  }

  // Re-apply controls every 5 seconds
  const interval = setInterval(async () => {
    if (!proc.killed && proc.exitCode === null) {
      await applyNativeWindowControls(proc, config, browserName);
    } else {
      clearInterval(interval);
    }
  }, 5000);

  // Clean up on process exit
  proc.on('exit', () => {
    clearInterval(interval);
  });
}
