import { Writable, Readable } from 'node:stream';

interface CDPPipe {
  pipeWrite: Writable;
  pipeRead: Readable;
}

interface CDPConnectionOptions {
  pipe?: CDPPipe;
  port?: number;
}

interface CDPMessage {
  id: number;
  method: string;
  params?: Record<string, any>;
  sessionId?: string;
  result?: any;
}

type MessageCallback = (msg: CDPMessage) => void;

interface CDPConnection {
  onMessage: (callback: MessageCallback, once?: boolean) => void;
  sendMessage: (method: string, params?: Record<string, any>, sessionId?: string) => Promise<any>;
  close: () => void;
}

export default async ({ pipe, port }: CDPConnectionOptions): Promise<CDPConnection> => {
  const messageCallbacks: MessageCallback[] = [];
  const onReply: Record<number, (msg: CDPMessage) => void> = {};

  const onMessage = (msgStr: string): void => {
    if (closed) return; // closed, ignore

    const msg: CDPMessage = JSON.parse(msgStr);

    // log('received', msg);
    if (onReply[msg.id]) {
      onReply[msg.id]!(msg);
      delete onReply[msg.id];
      return;
    }

    for (const callback of messageCallbacks) {
      callback(msg);
    }
  };

  let closed = false;
  let _send: (data: string) => void;
  let _close: () => void;

  let msgId = 0;
  const sendMessage = async (
    method: string,
    params: Record<string, any> = {},
    sessionId?: string
  ): Promise<any> => {
    if (closed) throw new Error('CDP connection closed');

    const id = msgId++;

    const msg: CDPMessage = {
      id,
      method,
      params
    };

    if (sessionId) msg.sessionId = sessionId;

    _send(JSON.stringify(msg));

    // log('sent', msg);

    const reply = await new Promise<CDPMessage>(res => {
      onReply[id] = (msg: CDPMessage) => res(msg);
    });

    return reply.result;
  };

  if (port) {
    const continualTrying = async <T>(func: () => Promise<T>): Promise<T> => {
      return new Promise(resolve => {
        const attempt = async (): Promise<void> => {
          try {
            process.stdout.write('.');
            resolve(await func());
          } catch (e) {
            // fail, wait 200ms and try again
            await new Promise(res => setTimeout(res, 200));
            await attempt();
          }
        };

        attempt();
      });
    };

    const targets = await continualTrying(async () => {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      return response.json();
    });

    console.log();

    const target = targets[0];

    log('got target', target);

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(resolve => {
      ws.onopen = resolve;
    });

    _send = (data: string) => ws.send(data);
    ws.onmessage = ({ data }) => onMessage(data);
    _close = () => ws.close();
  } else if (pipe) {
    const { pipeWrite, pipeRead } = pipe;
    let pending = '';

    pipeRead.on('data', (buf: Buffer) => {
      if (closed) return; // closed, ignore

      let end = buf.indexOf(0); // messages are null separated

      if (end === -1) {
        // no complete message yet
        pending += buf.toString();
        return;
      }

      let start = 0;
      while (end !== -1) {
        // while we have pending complete messages, dispatch them
        const message = pending + buf.toString('utf8', start, end); // get next whole message
        onMessage(message);

        start = end + 1; // find next ending
        end = buf.indexOf(0, start);
        pending = '';
      }

      pending = buf.toString('utf8', start); // update pending with current pending
    });

    pipeRead.on('close', () => log('pipe read closed'));

    _send = (data: string) => {
      pipeWrite.write(data);
      pipeWrite.write('\0');
    };

    _close = () => {};
  } else {
    throw new Error('Either pipe or port must be provided');
  }

  return {
    onMessage: (callback: MessageCallback, once = false): void => {
      const wrappedCallback = once ? (msg: CDPMessage) => {
        callback(msg);
        messageCallbacks.splice(messageCallbacks.indexOf(wrappedCallback), 1); // remove self
      } : callback;

      messageCallbacks.push(wrappedCallback);
    },

    sendMessage,

    close: (): void => {
      closed = true;
      _close();
    }
  };
};