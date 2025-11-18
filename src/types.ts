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
}

export {};