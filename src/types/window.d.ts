/**
 * TypeScript type definitions for FluxDesktop window API
 * This file defines the global window.FluxDesktop object and its APIs
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

export interface WindowControlsAPI {
  /** Get current window controls configuration */
  config: WindowControlsConfig;

  /** Get current configuration */
  getConfig(): WindowControlsConfig;

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
}

export interface FluxDesktopIPC {
  /** Send IPC message to backend */
  send(channel: string, ...args: any[]): Promise<any>;

  /** Register IPC message handler */
  on(channel: string, callback: (...args: any[]) => any): void;

  /** Remove IPC message handler */
  off(channel: string, callback: (...args: any[]) => any): void;
}

export interface FluxDesktopAPI {
  /** IPC communication API */
  ipc: FluxDesktopIPC;

  /** Window controls API */
  windowControls: WindowControlsAPI;

  /** Desktop utilities (added via createDesktopUtils) */
  utils?: any;
}

declare global {
  interface Window {
    /** FluxDesktop global API */
    FluxDesktop: FluxDesktopAPI;

    /** Internal FluxDesktop window controls (for direct access) */
    __fluxDesktopWindowControls?: WindowControlsAPI;

    /** Internal IPC send function */
    _fluxDesktopSend?: (data: string) => void;
  }
}

export {};
