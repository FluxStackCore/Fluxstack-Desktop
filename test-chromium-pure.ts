/**
 * Test script for pure Chromium download
 */
import { ensureChromium, hasLocalChromium, getLocalChromiumPath } from './src/lib/chromium-downloader';

const rgb = (r: number, g: number, b: number, msg: string): string =>
  `\x1b[38;2;${r};${g};${b}m${msg}\x1b[0m`;

declare global {
  // eslint-disable-next-line no-var
  var log: (...args: any[]) => void;
}

global.log = (...args: any[]): void =>
  console.log(`[${rgb(88, 101, 242, 'Chromium-Test')}]`, ...args);

const testChromium = async () => {
  log('='.repeat(60));
  log('Testing Pure Chromium Download');
  log('='.repeat(60));
  log('');

  try {
    // Check if already downloaded
    if (await hasLocalChromium()) {
      log('✓ Chromium already exists at:', getLocalChromiumPath());
    } else {
      log('✗ No Chromium found, will download now...');
      log('');
    }

    // Ensure Chromium is available (download if needed)
    const chromiumPath = await ensureChromium();

    log('');
    log('='.repeat(60));
    log('✓ Chromium ready at:', chromiumPath);
    log('='.repeat(60));
    log('');
    log('SUCCESS! Pure Chromium downloaded and ready to use.');
    log('This is the open-source Chromium (not Chrome for Testing)');
    log('');

  } catch (error) {
    log('');
    log('='.repeat(60));
    log('✗ Test failed:', error instanceof Error ? error.message : String(error));
    log('='.repeat(60));
    process.exit(1);
  }
};

// Run the test
testChromium();
