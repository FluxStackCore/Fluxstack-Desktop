import { exec } from 'node:child_process';

interface ProcessInfo {
  0: number | string; // PID
  1: string; // Command line
}

interface CDPConnection {
  send: (method: string, params?: Record<string, any>) => Promise<any>;
}

interface IdleOptions {
  browserType: string;
  dataPath: string;
}

interface AutoIdleOptions {
  timeMinimizedToHibernate: number;
}

interface IdleAPI {
  hibernate: () => Promise<void>;
  sleep: () => void;
  wake: () => Promise<void>;
  auto: (enabled: boolean, options?: Partial<AutoIdleOptions>) => void;
}

const getProcesses = async (containing: string): Promise<ProcessInfo[]> => {
  if (process.platform !== 'win32') return Promise.resolve([]);

  return new Promise(resolve => {
    exec('wmic process get Commandline,ProcessID /format:csv', (_e, out) => {
      const processes = out.toString()
        .split('\r\n')
        .slice(2)
        .map(x => {
          const parsed = x.trim().split(',').slice(1).reverse();
          return [
            parseInt(parsed[0]!) || parsed[0]!, // pid to int
            parsed.slice(1).join(',')
          ] as ProcessInfo;
        })
        .filter(x => x[1] && x[1].includes(containing));

      resolve(processes);
    });
  });
};

const killProcesses = async (pids: (number | string)[]): Promise<string> => {
  if (process.platform !== 'win32') return Promise.resolve('');

  return new Promise(resolve => {
    const pidArgs = pids.map(x => `/PID ${x}`).join(' ');
    exec(`taskkill /F ${pidArgs}`, (_e, out) => resolve(out || ''));
  });
};

export default async (CDP: CDPConnection, { browserType, dataPath }: IdleOptions): Promise<IdleAPI> => {
  if (browserType !== 'chromium') {
    // current implementation is for chromium-based only
    const warning = (): void => {
      log(`Warning: Idle API is currently only for Chromium (running on ${browserType})`);
    };

    return {
      hibernate: async () => warning(),
      sleep: warning,
      wake: async () => warning(),
      auto: warning as any
    };
  }

  const killNonCrit = async (): Promise<void> => {
    const procs = await getProcesses(dataPath);
    const nonCriticalProcs = procs.filter(x => x[1].includes('type='));

    await killProcesses(nonCriticalProcs.map(x => x[0]));
    log(`killed ${nonCriticalProcs.length} processes`);
  };

  let hibernating = false;

  const hibernate = async (): Promise<void> => {
    hibernating = true;

    const startTime = performance.now();

    await killNonCrit();
    // await killNonCrit();

    log(`hibernated in ${(performance.now() - startTime).toFixed(2)}ms`);
  };

  const wake = async (): Promise<void> => {
    const startTime = performance.now();

    await CDP.send('Page.reload');

    log(`began wake in ${(performance.now() - startTime).toFixed(2)}ms`);

    hibernating = false;
  };

  const { windowId } = await CDP.send('Browser.getWindowForTarget');

  let autoEnabled = process.argv.includes('--force-auto-idle');
  let autoOptions: AutoIdleOptions = {
    timeMinimizedToHibernate: 5
  };

  let autoInterval: NodeJS.Timeout | null = null;

  const startAuto = (): void => {
    if (autoInterval) return; // already started

    let lastState = '';
    let lastStateWhen = performance.now();

    autoInterval = setInterval(async () => {
      const response = await CDP.send('Browser.getWindowBounds', { windowId });
      const { bounds: { windowState } } = response;

      if (windowState !== lastState) {
        lastState = windowState;
        lastStateWhen = performance.now();
      }

      const timeSinceStateChange = performance.now() - lastStateWhen;
      const hibernateThreshold = autoOptions.timeMinimizedToHibernate * 1000;

      if (!hibernating && windowState === 'minimized' && timeSinceStateChange > hibernateThreshold) {
        await hibernate();
      } else if (hibernating && windowState !== 'minimized') {
        await wake();
      }
    }, 200);

    log('started auto idle');
  };

  const stopAuto = (): void => {
    if (!autoInterval) return; // already stopped

    clearInterval(autoInterval);
    autoInterval = null;

    log('stopped auto idle');
  };

  log(`idle API active (window id: ${windowId})`);
  if (autoEnabled) startAuto();

  return {
    hibernate,
    sleep: (): void => {},
    wake,

    auto: (enabled: boolean, options?: Partial<AutoIdleOptions>): void => {
      autoEnabled = enabled;

      autoOptions = {
        ...autoOptions,
        ...options
      };

      if (enabled) {
        startAuto();
      } else {
        stopAuto();
      }
    }
  };
};