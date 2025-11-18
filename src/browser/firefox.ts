import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import StartBrowser from '../launcher/start';

interface BrowserConfig {
  browserName: string;
  browserPath: string;
  dataPath: string;
  onBrowserExit?: () => void;
  customArgs?: string[];
}

interface WindowConfig {
  url: string;
  windowSize?: [number, number] | undefined;
}

export default async (
  { browserName, browserPath, dataPath, onBrowserExit, customArgs = [] }: BrowserConfig,
  { url, windowSize }: WindowConfig
) => {
  await mkdir(dataPath, { recursive: true });

  const userPrefs = `
user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);
user_pref('devtools.chrome.enabled', true);
user_pref('devtools.debugger.prompt-connection', false);
user_pref('devtools.debugger.remote-enabled', true);
user_pref('toolkit.telemetry.reportingpolicy.firstRun', false);
user_pref('browser.shell.checkDefaultBrowser', false);
${!windowSize ? '' : `user_pref('privacy.window.maxInnerWidth', ${windowSize[0]});
user_pref('privacy.window.maxInnerHeight', ${windowSize[1]});`}
user_pref('privacy.resistFingerprinting', true);
user_pref('fission.bfcacheInParent', false);
user_pref('fission.webContentIsolationStrategy', 0);
`;

  await writeFile(join(dataPath, 'user.js'), userPrefs);

  await mkdir(join(dataPath, 'chrome'), { recursive: true });

  const userChromeCSS = `
.titlebar-spacer, #firefox-view-button, #alltabs-button, #tabbrowser-arrowscrollbox-periphery, .tab-close-button {
  display: none;
}

#nav-bar, #urlbar-container, #searchbar { visibility: collapse !important; }

.tab-background, .tab-content, #tabbrowser-tabs {
  background: none !important;
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
  box-shadow: none !important;
}

#tabbrowser-tabs {
  margin: 0 6px !important;
}

.tab-icon-image {
  width: 16px;
  height: 16px;
}

.tabbrowser-tab { /* Stop being able to drag around tab like browser, acts as part of titlebar */
  pointer-events: none;
}

#titlebar, .tabbrowser-tab {
  height: 20px;
}

.tab-content {
  height: 42px;
}

html:not([tabsintitlebar="true"]) #titlebar,
html:not([tabsintitlebar="true"]) .tabbrowser-tab,
html:not([tabsintitlebar="true"]) .tab-background,
html:not([tabsintitlebar="true"]) .tab-content,
html:not([tabsintitlebar="true"]) #tabbrowser-tabs,
html:not([tabsintitlebar="true"]) .tab-icon-image {
  display: none !important;
}
`;

  await writeFile(join(dataPath, 'chrome', 'userChrome.css'), userChromeCSS);

  const args: string[] = [
    ...(!windowSize ? [] : [ '-window-size', windowSize.join(',') ]),
    '-profile', dataPath,
    '-new-window', url,
    '-new-instance',
    '-no-remote',
    ...customArgs // Add custom arguments at the end
  ];

  return await StartBrowser(browserPath, args, 'websocket', { browserName, onBrowserExit });
};