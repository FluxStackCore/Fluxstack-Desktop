import { spawn } from 'node:child_process';
import { Writable, Readable } from 'node:stream';

import ConnectCDP from '../lib/cdp';
import InjectInto from './inject';

// Make the CDP connection compatible with inject expectations
type StartCDPConnection = Awaited<ReturnType<typeof ConnectCDP>>;

const portRange: [number, number] = [10000, 60000];

type Transport = 'websocket' | 'stdio';

interface WindowControlsConfig {
  enableMinimize: boolean;
  enableMaximize: boolean;
  enableClose: boolean;
  disableContextMenu: boolean;
  resizable: boolean;
  kioskMode: boolean;
  frameless: boolean;
}

interface ExtraOptions {
  browserName?: string;
  onBrowserExit?: () => void;
  windowControls?: WindowControlsConfig;
  [key: string]: any;
}

export default async (
  browserPath: string,
  args: string[],
  transport: Transport,
  extra: ExtraOptions
): Promise<any> => {
  const port = transport === 'websocket'
    ? Math.floor(Math.random() * (portRange[1] - portRange[0] + 1)) + portRange[0]
    : null;

  const spawnArgs = [
    transport === 'stdio' ? '--remote-debugging-pipe' : `--remote-debugging-port=${port}`,
    ...args
  ].filter((x): x is string => Boolean(x));

  const proc = spawn(browserPath, spawnArgs, {
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe', 'pipe', 'pipe']
  });

  log(`connecting to CDP over ${transport === 'stdio' ? 'stdio pipe' : `websocket (${port})`}...`);

  let CDP: StartCDPConnection;
  switch (transport) {
    case 'websocket':
      if (!port) throw new Error('Port is required for websocket transport');
      CDP = await ConnectCDP({ port });
      break;

    case 'stdio':
      const stdio = proc.stdio as [any, any, any, Writable, Readable];
      const pipeWrite = stdio[3];
      const pipeRead = stdio[4];
      CDP = await ConnectCDP({ pipe: { pipeWrite, pipeRead } });
      break;

    default:
      throw new Error(`Unknown transport: ${transport}`);
  }

  return await InjectInto(CDP as any, proc, transport === 'stdio' ? 'browser' : 'target', {
    browserName: extra.browserName,
    onBrowserExit: extra.onBrowserExit,
    windowControls: extra.windowControls
  });
};