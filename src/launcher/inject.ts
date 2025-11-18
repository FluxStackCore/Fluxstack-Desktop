import { ChildProcess } from 'node:child_process';
import IPCApi from '../lib/ipc';

interface InjectCDPMessage {
  method: string;
  params: {
    name?: string;
    payload?: string;
    [key: string]: any;
  };
}

interface BrowserInfo {
  product: string;
  [key: string]: any;
}

interface CDPConnection {
  onMessage: (callback: (msg: InjectCDPMessage) => void) => void;
  sendMessage: (method: string, params?: Record<string, any>, sessionId?: string) => Promise<any>;
  close: () => void;
}

interface InjectOptions {
  browserName?: string;
  onBrowserExit?: () => void;
}

type InjectionType = 'browser' | 'target';

interface WindowAPI {
  eval: (func: string | Function) => Promise<any>;
}

interface CDPAPI {
  send: (method: string, params?: Record<string, any>) => Promise<any>;
}

interface FluxDesktopWindow {
  window: WindowAPI;
  ipc: any; // IPC API type from ipc.js
  cdp: CDPAPI;
  close: () => void;
}

export default async (
  CDP: CDPConnection,
  proc: ChildProcess,
  injectionType: InjectionType = 'browser',
  { browserName = 'unknown', onBrowserExit }: InjectOptions = {}
): Promise<FluxDesktopWindow> => {
  let pageLoadCallback = (_params?: any) => {};
  let onWindowMessage = (_msg: any) => {};
  let injectIPCFunction: (() => void) | null = null;

  // Setup browser process exit detection
  if (onBrowserExit) {
    proc.on('exit', (code, signal) => {
      console.log(`[FluxStack Desktop] Browser process exited with code: ${code}, signal: ${signal}`);
      onBrowserExit();
    });

    proc.on('close', (code, signal) => {
      console.log(`[FluxStack Desktop] Browser process closed with code: ${code}, signal: ${signal}`);
      if (!proc.killed) {
        onBrowserExit();
      }
    });

    proc.on('error', (error) => {
      console.error(`[FluxStack Desktop] Browser process error:`, error);
      onBrowserExit();
    });
  }

  CDP.onMessage(msg => {
    if (msg.method === 'Runtime.bindingCalled' && msg.params.name === '_fluxDesktopSend') {
      onWindowMessage(JSON.parse(msg.params.payload || '{}'));
    }
    if (msg.method === 'Page.frameStoppedLoading') {
      pageLoadCallback(msg.params);
    }
    if (msg.method === 'Runtime.executionContextCreated') {
      if (injectIPCFunction) {
        injectIPCFunction(); // ensure IPC injection again
      }
    }
  });

  let browserInfo: BrowserInfo | undefined;
  let sessionId: string | undefined;

  if (injectionType === 'browser') {
    // connected to browser itself, need to get and attach to a target
    const targetsResponse = await CDP.sendMessage('Target.getTargets');
    const target = targetsResponse.targetInfos[0];

    const attachResponse = await CDP.sendMessage('Target.attachToTarget', {
      targetId: target.targetId,
      flatten: true
    });
    sessionId = attachResponse.sessionId;

    // Get browser info after attaching
    browserInfo = await CDP.sendMessage('Browser.getVersion');
    console.log('browser:', browserInfo?.product);
  } else {
    // already attached to target
    browserInfo = await CDP.sendMessage('Browser.getVersion');
    console.log('browser:', browserInfo?.product);
  }

  await CDP.sendMessage('Runtime.enable', {}, sessionId); // enable runtime API

  await CDP.sendMessage('Runtime.addBinding', {
    // setup sending from window to Node via Binding
    name: '_fluxDesktopSend'
  }, sessionId);

  const evalInWindow = async (func: string | Function): Promise<any> => {
    return await CDP.sendMessage('Runtime.evaluate', {
      expression: typeof func === 'string' ? func : `(${func.toString()})()`
    }, sessionId);
  };

  const [ipcMessageCallback, injectIPC, IPC] = await IPCApi({
    browserName,
    browserInfo: browserInfo!
  }, {
    evalInWindow,
    evalOnNewDocument: (source: string) =>
      CDP.sendMessage('Page.addScriptToEvaluateOnNewDocument', { source }, sessionId),
    pageLoadPromise: new Promise(res => {
      pageLoadCallback = (params?: any) => res(params);
    })
  });

  onWindowMessage = ipcMessageCallback;
  injectIPCFunction = injectIPC;

  console.log('finished setup');

  // CDP Health Check - Fundamental validation
  try {
    const healthCheck = await CDP.sendMessage('Runtime.evaluate', {
      expression: 'typeof window'
    }, sessionId);

    if (healthCheck?.result?.value === 'object') {
      console.log('✅ CDP connection validated');
    } else {
      console.warn('⚠️ CDP health check returned unexpected result');
    }
  } catch (error) {
    console.error('❌ Critical: CDP validation failed:', error);
    throw new Error('FluxDesktop requires functioning CDP connection');
  }

  return {
    window: {
      eval: evalInWindow,
    },

    ipc: IPC,

    cdp: {
      send: (method: string, params?: Record<string, any>) =>
        CDP.sendMessage(method, params, sessionId)
    },

    close: (): void => {
      CDP.close();
      proc.kill();
    }
  };
};