(() => {
if (window.FluxDesktop) return;
let onIPCReply = {}, ipcListeners = {};
window.FluxDesktop = {
  versions: {
    fluxdesktop: '{{FLUXDESKTOP_VERSION}}',
    framework: 'FluxStack',
    bun: '{{BUN_VERSION}}',
    browser: '{{BROWSER_VERSION}}',
    browserType: '{{BROWSER_TYPE}}',
    product: '{{PRODUCT_NAME}}',

    js: {
      bun: '{{BUN_JS_VERSION}}',
      browser: '{{BROWSER_JS_VERSION}}'
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
})();