/**
 * Native Window Controls - Bun Compatible Version
 * Uses PowerShell and Windows API without native Node.js bindings
 *
 * This approach works with Bun by using child_process to execute
 * PowerShell scripts that modify window properties directly.
 */

import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface WindowControlsConfig {
  disableContextMenu: boolean;
  resizable: boolean;
  kioskMode: boolean;
}

/**
 * PowerShell script to modify window styles
 * This uses Windows API via C# code executed in PowerShell
 */
const POWERSHELL_WINDOW_MODIFIER = `
Add-Type @"
using System;
using System.Runtime.InteropServices;

public class WindowAPI {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll")]
    public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter,
        int X, int Y, int cx, int cy, uint uFlags);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll")]
    public static extern IntPtr GetSystemMenu(IntPtr hWnd, bool bRevert);

    [DllImport("user32.dll")]
    public static extern bool EnableMenuItem(IntPtr hMenu, uint uIDEnableItem, uint uEnable);

    [DllImport("user32.dll")]
    public static extern bool DeleteMenu(IntPtr hMenu, uint uPosition, uint uFlags);

    [DllImport("user32.dll")]
    public static extern bool DrawMenuBar(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern IntPtr SetWindowsHookEx(int idHook, HookProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll")]
    public static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll")]
    public static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll")]
    public static extern IntPtr GetModuleHandle(string lpModuleName);

    public delegate IntPtr HookProc(int nCode, IntPtr wParam, IntPtr lParam);

    public const int GWL_STYLE = -16;
    public const int GWL_WNDPROC = -4;
    public const int WS_MINIMIZEBOX = 0x00020000;
    public const int WS_MAXIMIZEBOX = 0x00010000;
    public const int WS_SIZEBOX = 0x00040000;
    public const int WS_SYSMENU = 0x00080000;
    public const uint SWP_NOSIZE = 0x0001;
    public const uint SWP_NOMOVE = 0x0002;
    public const uint SWP_NOZORDER = 0x0004;
    public const uint SWP_FRAMECHANGED = 0x0020;
    public const uint MF_BYCOMMAND = 0x00000000;
    public const uint MF_GRAYED = 0x00000001;

    // Window message constants
    public const int WM_SYSCOMMAND = 0x0112;
    public const int SC_MINIMIZE = 0xF020;
    public const int SC_MAXIMIZE = 0xF030;
    public const int SC_SIZE = 0xF000;
    public const int SC_RESTORE = 0xF120;

    // Hook constants
    public const int WH_CALLWNDPROC = 4;
    public const int WH_GETMESSAGE = 3;
}
"@

function Modify-WindowStyle {
    param(
        [int]$ProcessId,
        [bool]$Resizable = $true
    )

    # Find ALL processes with this PID and any related processes (Edge is multi-process)
    $processes = Get-Process | Where-Object {
        ($_.Id -eq $ProcessId -or $_.ProcessName -like "*msedge*" -or $_.ProcessName -like "*chrome*") -and
        $_.MainWindowHandle -ne 0
    }

    if ($processes.Count -eq 0) {
        Write-Host "Window not found for process $ProcessId"
        return
    }

    foreach ($window in $processes) {
        $hwnd = $window.MainWindowHandle

        if ($hwnd -eq 0) {
            continue
        }

        # Skip if window title is empty (renderer processes)
        $title = $window.MainWindowTitle
        if ([string]::IsNullOrWhiteSpace($title)) {
            continue
        }

        Write-Host "Found window: $title (HWND: $hwnd, PID: $($window.Id))"

        if (-not $Resizable) {
            # Get current style
            $currentStyle = [WindowAPI]::GetWindowLong($hwnd, [WindowAPI]::GWL_STYLE)
            $newStyle = $currentStyle

            Write-Host "Current style: 0x$($currentStyle.ToString('X8'))"
            Write-Host "Removing WS_SIZEBOX to disable window resizing"

            # Remove resize capability
            $newStyle = $newStyle -band (-bnot [WindowAPI]::WS_SIZEBOX)

            # Apply new style
            $result = [WindowAPI]::SetWindowLong($hwnd, [WindowAPI]::GWL_STYLE, $newStyle)

            # Force redraw
            [WindowAPI]::SetWindowPos($hwnd, [IntPtr]::Zero, 0, 0, 0, 0,
                [WindowAPI]::SWP_NOSIZE -bor [WindowAPI]::SWP_NOMOVE -bor
                [WindowAPI]::SWP_NOZORDER -bor [WindowAPI]::SWP_FRAMECHANGED) | Out-Null

            Write-Host "New style: 0x$($newStyle.ToString('X8'))"
            Write-Host "Window resizing disabled successfully"
        } else {
            Write-Host "Window resizing is enabled (no changes needed)"
        }
    }
}
`;

/**
 * Apply window controls to a browser process window using PowerShell
 */
export async function applyNativeWindowControls(
  proc: { pid?: number; killed?: boolean },
  config: WindowControlsConfig,
  browserName: string,
  silent: boolean = false // Silent mode for monitoring (less logging)
): Promise<void> {
  if (process.platform !== 'win32') {
    console.warn('[FluxDesktop] Native window controls only supported on Windows');
    console.warn('[FluxDesktop] For Linux, use: wmctrl, xdotool, or xprop');
    console.warn('[FluxDesktop] For macOS, use: AppleScript or Hammerspoon');
    return;
  }

  if (!proc.pid) {
    console.warn('[FluxDesktop] Cannot apply window controls: no process PID');
    return;
  }

  if (config.resizable) {
    if (!silent) {
      console.log('[FluxDesktop] Window is resizable - no restrictions to apply');
    }
    return;
  }

  console.log('[FluxDesktop] Will disable window resizing');

  if (!silent) {
    console.log(`[FluxDesktop] Process ID: ${proc.pid}`);
  }

  // Try multiple times with increasing delays (browsers can be slow to create windows)
  // In silent mode (monitoring), only try once with no delay
  const maxAttempts = silent ? 1 : 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (!silent) {
      const waitTime = 1000 + (attempt * 500); // 1.5s, 2s, 2.5s, 3s, 3.5s
      console.log(`[FluxDesktop] Attempt ${attempt}/${maxAttempts} - waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    try {
      // Build PowerShell command (escape properly for command line)
      const psScript = `
${POWERSHELL_WINDOW_MODIFIER}

Modify-WindowStyle -ProcessId ${proc.pid} -Resizable $${config.resizable}
`;

      // Save script to temp file to avoid escaping issues
      const tempFile = `${process.env.TEMP || 'C:\\Windows\\Temp'}\\fluxdesktop-window-${proc.pid}.ps1`;
      await Bun.write(tempFile, psScript);

      try {
        // Execute PowerShell script from file
        const { stdout, stderr } = await execAsync(
          `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${tempFile}"`,
          { timeout: 10000 }
        );

        if (!silent) {
          console.log('[FluxDesktop] === PowerShell Output ===');
          if (stdout && stdout.trim()) {
            console.log(stdout.trim());
          } else {
            console.log('(no output)');
          }

          if (stderr && stderr.trim()) {
            console.log('[FluxDesktop] === PowerShell Errors ===');
            console.warn(stderr.trim());
          }
        }

        // Check if output indicates success
        if (stdout.includes('Applied window modifications successfully')) {
          if (!silent) {
            console.log('[FluxDesktop] ✅ Native window controls applied successfully');
          }
          return; // Success! Exit function
        } else if (stdout.includes('Window not found')) {
          if (!silent) {
            console.warn(`[FluxDesktop] ⚠️ Window not found for process (attempt ${attempt}/${maxAttempts})`);
          }
          if (attempt < maxAttempts) {
            if (!silent) console.log('[FluxDesktop] Retrying...');
            continue; // Try again
          } else {
            if (!silent) {
              console.error('[FluxDesktop] ❌ Failed to find window after all attempts');
              console.error('[FluxDesktop] The browser window might not have a valid MainWindowHandle yet');
            }
            return;
          }
        } else {
          if (!silent) {
            console.warn('[FluxDesktop] ⚠️ Unexpected PowerShell output, controls might not be applied');
          }
          return;
        }
      } finally {
        // Clean up temp file
        try {
          await Bun.write(tempFile, ''); // Clear it
        } catch (e) {
          // Ignore cleanup errors
        }
      }

    } catch (error: any) {
      console.error(`[FluxDesktop] Error on attempt ${attempt}:`, error.message);

      if (error.message.includes('powershell.exe')) {
        console.error('[FluxDesktop] PowerShell not found. Make sure you are running on Windows.');
        return;
      }

      if (attempt < maxAttempts) {
        console.log('[FluxDesktop] Retrying...');
        continue;
      }
    }
  }

  console.error('[FluxDesktop] ❌ Failed to apply native window controls after all attempts');
}

/**
 * Monitor window and reapply controls if needed
 * Some applications might reset window styles, so we monitor and reapply
 */
export function monitorWindowControls(
  proc: { pid?: number; killed?: boolean; exitCode?: number | null },
  config: WindowControlsConfig,
  browserName: string
): void {
  if (!config.resizable) {
    // Re-apply controls every 10 seconds
    const interval = setInterval(async () => {
      if (!proc.killed && proc.exitCode === null) {
        await applyNativeWindowControls(proc, config, browserName, true);
      } else {
        clearInterval(interval);
      }
    }, 10000);
  }
}
