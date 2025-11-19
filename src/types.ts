/**
 * TypeScript type definitions for Bun APIs used in FluxStack Desktop
 */

declare global {
  const Bun: {
    version: string;
    env: Record<string, string | undefined>;
    write: (path: string, data: string | Buffer | ArrayBuffer) => Promise<number>;
    file: (path: string) => {
      text: () => Promise<string>;
      json: () => Promise<any>;
      exists: () => Promise<boolean>;
      size: Promise<number>;
    };
    spawn?: (options: any) => any;
    [key: string]: any;
  };

  interface Window {
    /** FluxDesktop global API */
    FluxDesktop: {
      /** IPC communication API */
      ipc: {
        /** Send IPC message to backend */
        send(channel: string, ...args: any[]): Promise<any>;
        /** Register IPC message handler */
        on(channel: string, callback: (...args: any[]) => any): void;
        /** Remove IPC message handler */
        off(channel: string, callback: (...args: any[]) => any): void;
      };

      /** Window controls API */
      windowControls: {
        /** Get current window controls configuration */
        config: {
          enableMinimize: boolean;
          enableMaximize: boolean;
          enableClose: boolean;
          disableContextMenu: boolean;
          resizable: boolean;
          kioskMode: boolean;
          frameless: boolean;
        };

        /** Get current configuration */
        getConfig(): {
          enableMinimize: boolean;
          enableMaximize: boolean;
          enableClose: boolean;
          disableContextMenu: boolean;
          resizable: boolean;
          kioskMode: boolean;
          frameless: boolean;
        };

        /** Check if a specific control is enabled */
        isEnabled(control: 'minimize' | 'maximize' | 'close' | 'contextMenu' | 'resizable'): boolean;

        /** Minimize window (if enabled) */
        minimize(): Promise<boolean>;

        /** Maximize window (if enabled) */
        maximize(): Promise<boolean>;

        /** Close window (if enabled) */
        close(): Promise<boolean>;

        /** Toggle fullscreen mode */
        toggleFullscreen(): Promise<void>;

        /** Check if window is in fullscreen */
        isFullscreen(): boolean;
      };

      /** Desktop utilities (added via createDesktopUtils) */
      utils?: any;
    };

    /** Internal FluxDesktop window controls (for direct access) */
    __fluxDesktopWindowControls?: any;

    /** Internal IPC send function */
    _fluxDesktopSend?: (data: string) => void;
  }
}

export {};