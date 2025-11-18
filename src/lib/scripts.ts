import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = join(__dirname, '..', '..', 'scripts');

/**
 * Load and process a script template with variable replacements
 * @param filename - Script filename in the scripts/ directory
 * @param replacements - Object with template variable replacements
 * @returns Processed script content
 */
export async function loadScript(
  filename: string,
  replacements: Record<string, string> = {}
): Promise<string> {
  const scriptPath = join(SCRIPTS_DIR, filename);
  let content = await Bun.file(scriptPath).text();

  // Replace template variables
  for (const [key, value] of Object.entries(replacements)) {
    const placeholder = `{{${key}}}`;
    content = content.replace(new RegExp(placeholder, 'g'), value);
  }

  return content;
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