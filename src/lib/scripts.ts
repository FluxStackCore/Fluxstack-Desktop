import '../types';

// Inline scripts to be included in the compiled executable
const IPC_INJECTION_SCRIPT = `(() => {
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
})();`;

const ONLOAD_WRAPPER_SCRIPT = `(() => {
  if (window.self !== window.top) return; // inside frame

  ({{ONLOAD_FUNCTION}})();
})();`;

/**
 * Process a script template with variable replacements
 * @param content - Script content
 * @param replacements - Object with template variable replacements
 * @returns Processed script content
 */
function processScript(
  content: string,
  replacements: Record<string, string> = {}
): string {
  let processed = content;

  // Replace template variables
  for (const [key, value] of Object.entries(replacements)) {
    const placeholder = `{{${key}}}`;
    processed = processed.replace(new RegExp(placeholder, 'g'), value);
  }

  return processed;
}

/**
 * Load and process a script template with variable replacements
 * @param filename - Script filename
 * @param replacements - Object with template variable replacements
 * @returns Processed script content
 */
export async function loadScript(
  filename: string,
  replacements: Record<string, string> = {}
): Promise<string> {
  let content: string;

  // Use inline scripts instead of loading from files
  switch (filename) {
    case 'ipc-injection.js':
      content = IPC_INJECTION_SCRIPT;
      break;
    case 'onload-wrapper.js':
      content = ONLOAD_WRAPPER_SCRIPT;
      break;
    default:
      throw new Error(`Unknown script: ${filename}`);
  }

  return processScript(content, replacements);
}

/**
 * Load the IPC injection script with proper variable replacements
 * @param browserInfo - Browser information for template variables
 * @param browserName - Browser name
 * @returns IPC injection script
 */
export async function loadIPCInjection(
  browserInfo: { product?: string; jsVersion?: string },
  browserName: string
): Promise<string> {
  return await loadScript('ipc-injection.js', {
    FLUXDESKTOP_VERSION: process.versions.fluxdesktop || '1.0.0',
    BUN_VERSION: Bun.version,
    BROWSER_VERSION: browserInfo?.product?.split('/')[1] || 'unknown',
    BROWSER_TYPE: browserName.startsWith('Firefox') ? 'firefox' : 'chromium',
    PRODUCT_NAME: browserName,
    BUN_JS_VERSION: process.versions.webkit?.slice(0, 7) || 'unknown',
    BROWSER_JS_VERSION: browserInfo?.jsVersion || 'unknown'
  });
}

/**
 * Load the onLoad wrapper script
 * @param onLoadFunction - Function to be wrapped and executed
 * @returns OnLoad wrapper script
 */
export async function loadOnLoadWrapper(onLoadFunction: Function): Promise<string> {
  return await loadScript('onload-wrapper.js', {
    ONLOAD_FUNCTION: onLoadFunction.toString()
  });
}
