/**
 * Test script for Chromium fallback download
 * This simulates a system with no browsers installed
 */

import { join, delimiter, sep } from 'node:path';
import { access, readdir } from 'node:fs/promises';

import Chromium from './src/browser/chromium';
import { loadOnLoadWrapper } from './src/lib/scripts';
import { ensureChromium, hasLocalChromium, getLocalChromiumPath } from './src/lib/chromium-downloader';

// Global log function with colored output
const rgb = (r: number, g: number, b: number, msg: string): string =>
  `\x1b[38;2;${r};${g};${b}m${msg}\x1b[0m`;

declare global {
  // eslint-disable-next-line no-var
  var log: (...args: any[]) => void;
}

global.log = (...args: any[]): void =>
  console.log(`[${rgb(88, 101, 242, 'FluxDesktop-Test')}]`, ...args);

const getDataPath = (): string => {
  return join(process.cwd(), 'chrome_data');
};

const getFriendlyName = (whichBrowser: string): string =>
  whichBrowser[0]!.toUpperCase() +
  whichBrowser.slice(1).replace(/[a-z]_[a-z]/g, match =>
    match[0]! + ' ' + match[2]!.toUpperCase()
  );

const testChromiumFallback = async () => {
  log('='.repeat(60));
  log('Testing Chromium Fallback Download');
  log('='.repeat(60));
  log('');

  try {
    // Check if already downloaded
    if (await hasLocalChromium()) {
      log('✓ Local Chromium already exists at:', getLocalChromiumPath());
      log('  Skipping download...');
    } else {
      log('✗ No local Chromium found');
      log('  Will download Chromium now...');
      log('');
    }

    // Ensure Chromium is available (download if needed)
    const chromiumPath = await ensureChromium();

    log('');
    log('='.repeat(60));
    log('✓ Chromium ready at:', chromiumPath);
    log('='.repeat(60));
    log('');

    // Now try to launch it with a test page
    log('Attempting to launch Chromium...');

    const dataPath = getDataPath();
    const browserName = 'Chromium';
    const browserFriendlyName = getFriendlyName(browserName);

    const Browser = await Chromium({
      browserName: browserFriendlyName,
      dataPath,
      browserPath: chromiumPath,
      customArgs: []
    }, {
      url: 'data:text/html,<h1>FluxDesktop Test</h1><p>Chromium fallback is working!</p>',
      windowSize: [800, 600]
    });

    log('✓ Browser launched successfully!');
    log('');
    log('Browser info:');
    log('  - Type:', browserFriendlyName);
    log('  - Path:', chromiumPath);
    log('  - Data:', dataPath);
    log('');
    log('Press Ctrl+C to exit...');

    // Keep the process alive
    process.on('SIGINT', () => {
      log('');
      log('Shutting down...');
      process.exit(0);
    });

  } catch (error) {
    log('');
    log('='.repeat(60));
    log('✗ Test failed:', error instanceof Error ? error.message : String(error));
    log('='.repeat(60));
    process.exit(1);
  }
};

// Run the test
testChromiumFallback();
