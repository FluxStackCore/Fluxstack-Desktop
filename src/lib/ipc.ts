interface BrowserInfo {
  product?: string;
  jsVersion?: string;
  [key: string]: any;
}

interface IPCSetupOptions {
  browserName: string;
  browserInfo: BrowserInfo;
}

interface EvalContext {
  evalInWindow: (code: string | Function) => Promise<any>;
  evalOnNewDocument: (source: string) => Promise<any>;
  pageLoadPromise: Promise<any>;
}

interface IPCMessage {
  id: string;
  type: string;
  data: any;
}

type IPCCallback = (data: any) => any | Promise<any>;

interface IPCApi {
  on: (type: string, callback: IPCCallback) => void;
  removeListener: (type: string, callback: IPCCallback) => boolean;
  send: (type: string, data: any, id?: string) => Promise<any>;
}

type OnWindowMessageCallback = (msg: IPCMessage) => Promise<void>;
type InjectIPCFunction = () => Promise<any>;

type IPCReturnTuple = [OnWindowMessageCallback, InjectIPCFunction, IPCApi];

export default (
  { browserName, browserInfo }: IPCSetupOptions,
  { evalInWindow, evalOnNewDocument, pageLoadPromise }: EvalContext
): Promise<IPCReturnTuple> => {
  return new Promise((resolve) => {
    const injection = `(() => {
if (window.FluxDesktop) return;
let onIPCReply = {}, ipcListeners = {};
window.FluxDesktop = {
  versions: {
    fluxdesktop: '${process.versions.fluxdesktop}',
    framework: 'FluxStack',
    bun: '${Bun.version}',
    browser: '${browserInfo?.product?.split('/')[1] || 'unknown'}',
    browserType: '${browserName.startsWith('Firefox') ? 'firefox' : 'chromium'}',
    product: '${browserName}',

    js: {
      bun: '${process.versions.webkit?.slice(0, 7) || 'unknown'}',
      browser: '${browserInfo?.jsVersion || 'unknown'}'
    },

    embedded: {
      bun: false,
      browser: false
    }
  },

  ipc: {
    send: async (type, data, id = undefined) => {
      const isReply = !!id;
      id = id ?? Math.random().toString().split('.')[1];

      window.FluxDesktop.ipc._send(JSON.stringify({
        id,
        type,
        data
      }));

      if (isReply) return;

      const reply = await new Promise(res => {
        onIPCReply[id] = msg => res(msg);
      });

      return reply.data;
    },

    on: (type, cb) => {
      if (!ipcListeners[type]) ipcListeners[type] = [];
      ipcListeners[type].push(cb);
    },

    removeListener: (type, cb) => {
      if (!ipcListeners[type]) return false;
      ipcListeners[type].splice(ipcListeners[type].indexOf(cb), 1);
    },

    _receive: async msg => {
      const { id, type, data } = msg;

      if (onIPCReply[id]) {
        onIPCReply[id]({ type, data });
        delete onIPCReply[id];
        return;
      }

      if (ipcListeners[type]) {
        let reply;

        for (const cb of ipcListeners[type]) {
          const ret = await cb(data);
          if (!reply) reply = ret; // use first returned value as reply
        }

        if (reply) return FluxDesktop.ipc.send('reply', reply, id); // reply with wanted reply
      }

      FluxDesktop.ipc.send('pong', null, id);
    },

    _send: window._fluxDesktopSend
  },
};

delete window._fluxDesktopSend;
})();`;

    evalInWindow(injection);
    evalOnNewDocument(injection);

    const onIPCReply: Record<string, (msg: IPCMessage) => void> = {};
    const ipcListeners: Record<string, IPCCallback[]> = {};

    const sendToWindow = async (type: string, data: any, id?: string): Promise<any> => {
      const isReply = !!id;
      id = id ?? Math.random().toString().split('.')[1];

      await pageLoadPromise; // wait for page to load before sending, otherwise messages won't be heard
      evalInWindow(`window.FluxDesktop.ipc._receive(${JSON.stringify({
        id,
        type,
        data
      })})`);

      if (isReply) return; // we are replying, don't expect reply back

      const reply = await new Promise<IPCMessage>(res => {
        onIPCReply[id!] = msg => res(msg);
      });

      return reply.data;
    };

    const onWindowMessage: OnWindowMessageCallback = async ({ id, type, data }: IPCMessage): Promise<void> => {
      if (onIPCReply[id]) {
        onIPCReply[id]({ id, type, data });
        delete onIPCReply[id];
        return;
      }

      if (ipcListeners[type]) {
        let reply: any;

        for (const cb of ipcListeners[type]!) {
          const ret = await cb(data);
          if (!reply) reply = ret; // use first returned value as reply
        }

        if (reply) return sendToWindow('reply', reply, id); // reply with wanted reply
      }

      sendToWindow('pong', null, id); // send simple pong to confirm
    };

    const ipcApi: IPCApi = {
      on: (type: string, cb: IPCCallback): void => {
        if (!ipcListeners[type]) ipcListeners[type] = [];
        ipcListeners[type]!.push(cb);
      },

      removeListener: (type: string, cb: IPCCallback): boolean => {
        if (!ipcListeners[type]) return false;
        const index = ipcListeners[type]!.indexOf(cb);
        if (index > -1) {
          ipcListeners[type]!.splice(index, 1);
          return true;
        }
        return false;
      },

      send: sendToWindow,
    };

    resolve([
      onWindowMessage,
      () => evalInWindow(injection),
      ipcApi
    ]);
  });
};