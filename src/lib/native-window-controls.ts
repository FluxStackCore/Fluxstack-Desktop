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
  enableMinimize: boolean;
  enableMaximize: boolean;
  enableClose: boolean;
  disableContextMenu: boolean;
  resizable: boolean;
  kioskMode: boolean;
  frameless: boolean;
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

    public const int GWL_STYLE = -16;
    public const int WS_MINIMIZEBOX = 0x00020000;
    public const int WS_MAXIMIZEBOX = 0x00010000;
    public const int WS_SIZEBOX = 0x00040000;
    public const int WS_SYSMENU = 0x00080000;
    public const uint SWP_NOSIZE = 0x0001;
    public const uint SWP_NOMOVE = 0x0002;
    public const uint SWP_NOZORDER = 0x0004;
    public const uint SWP_FRAMECHANGED = 0x0020;
}
"@

function Modify-WindowStyle {
    param(
        [int]$ProcessId,
        [bool]$EnableMinimize = $true,
        [bool]$EnableMaximize = $true,
        [bool]$Resizable = $true
    )

    # Find all windows
    $windows = Get-Process | Where-Object { $_.Id -eq $ProcessId -and $_.MainWindowHandle -ne 0 }

    foreach ($window in $windows) {
        $hwnd = $window.MainWindowHandle

        if ($hwnd -eq 0) {
            Write-Host "Window not found for process $ProcessId"
            continue
        }

        Write-Host "Found window: $($window.MainWindowTitle) (HWND: $hwnd)"

        # Get current style
        $currentStyle = [WindowAPI]::GetWindowLong($hwnd, [WindowAPI]::GWL_STYLE)
        $newStyle = $currentStyle

        Write-Host "Current style: 0x$($currentStyle.ToString('X8'))"

        # Modify style based on parameters
        if (-not $EnableMinimize) {
            $newStyle = $newStyle -band (-bnot [WindowAPI]::WS_MINIMIZEBOX)
            Write-Host "Removing WS_MINIMIZEBOX"
        }

        if (-not $EnableMaximize) {
            $newStyle = $newStyle -band (-bnot [WindowAPI]::WS_MAXIMIZEBOX)
            Write-Host "Removing WS_MAXIMIZEBOX"
        }

        if (-not $Resizable) {
            $newStyle = $newStyle -band (-bnot [WindowAPI]::WS_SIZEBOX)
            Write-Host "Removing WS_SIZEBOX"
        }

        # Apply new style
        $result = [WindowAPI]::SetWindowLong($hwnd, [WindowAPI]::GWL_STYLE, $newStyle)

        # Force redraw
        [WindowAPI]::SetWindowPos($hwnd, [IntPtr]::Zero, 0, 0, 0, 0,
            [WindowAPI]::SWP_NOSIZE -bor [WindowAPI]::SWP_NOMOVE -bor
            [WindowAPI]::SWP_NOZORDER -bor [WindowAPI]::SWP_FRAMECHANGED) | Out-Null

        Write-Host "New style: 0x$($newStyle.ToString('X8'))"
        Write-Host "Applied window modifications successfully"
    }
}
`;

/**
 * Apply window controls to a browser process window using PowerShell
 */
export async function applyNativeWindowControls(
  proc: { pid?: number; killed?: boolean },
  config: WindowControlsConfig,
  browserName: string
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

  const modifications: string[] = [];
  if (!config.enableMinimize) modifications.push('minimize=OFF');
  if (!config.enableMaximize) modifications.push('maximize=OFF');
  if (!config.resizable) modifications.push('resizable=OFF');

  if (modifications.length === 0) {
    console.log('[FluxDesktop] No window control restrictions to apply');
    return;
  }

  console.log(`[FluxDesktop] Will apply: ${modifications.join(', ')}`);
  console.log(`[FluxDesktop] Process ID: ${proc.pid}`);

  // Try multiple times with increasing delays (browsers can be slow to create windows)
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const waitTime = 1000 + (attempt * 500); // 1.5s, 2s, 2.5s, 3s, 3.5s
    console.log(`[FluxDesktop] Attempt ${attempt}/${maxAttempts} - waiting ${waitTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));

    try {
      // Build PowerShell command (escape properly for command line)
      const psScript = `
${POWERSHELL_WINDOW_MODIFIER}

Modify-WindowStyle -ProcessId ${proc.pid} -EnableMinimize $${config.enableMinimize} -EnableMaximize $${config.enableMaximize} -Resizable $${config.resizable}
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

        // Check if output indicates success
        if (stdout.includes('Applied window modifications successfully')) {
          console.log('[FluxDesktop] ✅ Native window controls applied successfully');
          return; // Success! Exit function
        } else if (stdout.includes('Window not found')) {
          console.warn(`[FluxDesktop] ⚠️ Window not found for process (attempt ${attempt}/${maxAttempts})`);
          if (attempt < maxAttempts) {
            console.log('[FluxDesktop] Retrying...');
            continue; // Try again
          } else {
            console.error('[FluxDesktop] ❌ Failed to find window after all attempts');
            console.error('[FluxDesktop] The browser window might not have a valid MainWindowHandle yet');
            return;
          }
        } else {
          console.warn('[FluxDesktop] ⚠️ Unexpected PowerShell output, controls might not be applied');
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
  if (!config.resizable || !config.enableMinimize || !config.enableMaximize) {
    // Re-apply controls every 10 seconds
    const interval = setInterval(async () => {
      if (!proc.killed && proc.exitCode === null) {
        await applyNativeWindowControls(proc, config, browserName);
      } else {
        clearInterval(interval);
      }
    }, 10000);
  }
}
