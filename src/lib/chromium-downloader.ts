import { createWriteStream, existsSync, mkdirSync, chmodSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { get } from 'node:https';

interface PlatformInfo {
  platform: string;
  arch: string;
  downloadUrl: string;
  executablePath: string;
}

/**
 * Gets the platform-specific information for Chromium download
 */
const getPlatformInfo = (): PlatformInfo => {
  const platform = process.platform;
  const arch = process.arch;

  // Chromium for Testing versions (stable builds)
  // Using known-good versions from chromium.org
  const revision = '1368529'; // Chromium 130.0.6723.58

  let downloadUrl: string;
  let executablePath: string;

  if (platform === 'linux') {
    downloadUrl = `https://storage.googleapis.com/chromium-browser-snapshots/Linux_x64/${revision}/chrome-linux.zip`;
    executablePath = 'chrome-linux/chrome';
  } else if (platform === 'win32') {
    downloadUrl = `https://storage.googleapis.com/chromium-browser-snapshots/Win_x64/${revision}/chrome-win.zip`;
    executablePath = 'chrome-win/chrome.exe';
  } else if (platform === 'darwin') {
    if (arch === 'arm64') {
      downloadUrl = `https://storage.googleapis.com/chromium-browser-snapshots/Mac_Arm/${revision}/chrome-mac.zip`;
    } else {
      downloadUrl = `https://storage.googleapis.com/chromium-browser-snapshots/Mac/${revision}/chrome-mac.zip`;
    }
    executablePath = 'chrome-mac/Chromium.app/Contents/MacOS/Chromium';
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  return {
    platform,
    arch,
    downloadUrl,
    executablePath
  };
};

/**
 * Downloads a file from URL and saves it to destination
 */
const downloadFile = async (url: string, destination: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destination);

    const handleRedirect = (redirectUrl: string) => {
      get(redirectUrl, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          const location = response.headers.location;
          if (location) {
            handleRedirect(location);
          } else {
            reject(new Error('Redirect without location'));
          }
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        let lastProgress = 0;

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const progress = Math.floor((downloadedBytes / totalBytes) * 100);

          // Log progress every 10%
          if (progress >= lastProgress + 10) {
            log(`Downloading Chromium: ${progress}%`);
            lastProgress = progress;
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          log('Download complete');
          resolve();
        });
      }).on('error', (err) => {
        reject(err);
      });
    };

    handleRedirect(url);
  });
};

/**
 * Extracts a zip file to destination directory
 * Note: This is a simple implementation for cross-platform compatibility
 */
const extractZip = async (zipPath: string, destPath: string): Promise<void> => {
  // For simplicity, we'll use Bun's native unzip if available
  // Otherwise fall back to a basic implementation

  try {
    // Try using unzip command (available on most systems)
    const { spawn } = await import('node:child_process');

    return new Promise((resolve, reject) => {
      const unzip = spawn('unzip', ['-q', '-o', zipPath, '-d', destPath]);

      unzip.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Unzip failed with code ${code}`));
        }
      });

      unzip.on('error', (err) => {
        reject(err);
      });
    });
  } catch (error) {
    throw new Error('Failed to extract zip: unzip command not found');
  }
};

/**
 * Gets the local Chromium directory path
 */
const getChromiumDir = (): string => {
  return join(process.cwd(), '.chromium');
};

/**
 * Checks if local Chromium is already downloaded
 */
export const hasLocalChromium = async (): Promise<boolean> => {
  const chromiumDir = getChromiumDir();
  const platformInfo = getPlatformInfo();
  const executablePath = join(chromiumDir, platformInfo.executablePath);

  return existsSync(executablePath);
};

/**
 * Gets the path to local Chromium executable
 */
export const getLocalChromiumPath = (): string => {
  const chromiumDir = getChromiumDir();
  const platformInfo = getPlatformInfo();
  return join(chromiumDir, platformInfo.executablePath);
};

/**
 * Downloads and installs Chromium to local directory
 */
export const downloadChromium = async (): Promise<string> => {
  const platformInfo = getPlatformInfo();
  const chromiumDir = getChromiumDir();
  const zipPath = join(chromiumDir, 'chromium.zip');

  log('No browser found. Downloading Chromium...');
  log('This may take a few minutes on first run...');

  // Create chromium directory if it doesn't exist
  if (!existsSync(chromiumDir)) {
    mkdirSync(chromiumDir, { recursive: true });
  }

  // Clean up any previous incomplete downloads
  if (existsSync(zipPath)) {
    await rm(zipPath, { force: true });
  }

  try {
    // Download Chromium
    await downloadFile(platformInfo.downloadUrl, zipPath);

    // Extract
    log('Extracting Chromium...');
    await extractZip(zipPath, chromiumDir);

    // Clean up zip file
    await rm(zipPath, { force: true });

    const executablePath = join(chromiumDir, platformInfo.executablePath);

    // Make executable on Unix systems
    if (process.platform !== 'win32') {
      try {
        chmodSync(executablePath, 0o755);
      } catch (err) {
        log('Warning: Could not set executable permissions');
      }
    }

    log('Chromium downloaded successfully!');
    return executablePath;
  } catch (error) {
    // Clean up on error
    try {
      if (existsSync(zipPath)) {
        await rm(zipPath, { force: true });
      }
    } catch {
      // Ignore cleanup errors
    }

    throw new Error(`Failed to download Chromium: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Ensures Chromium is available, downloading if necessary
 */
export const ensureChromium = async (): Promise<string> => {
  if (await hasLocalChromium()) {
    log('Using local Chromium');
    return getLocalChromiumPath();
  }

  return await downloadChromium();
};
