# FluxStack Desktop Plugin

Create native desktop applications from web apps using system browsers and Bun runtime.

## Overview

FluxStack Desktop transforms your web applications into native desktop applications using **system browsers** (Chrome, Firefox, Edge) as the runtime, eliminating the need for Electron. This approach provides:

- 🚀 **Zero overhead** - Uses system browsers instead of bundled Chromium
- ⚡ **Lightning fast** - Powered by Bun runtime
- 🔒 **Secure** - Sandboxed browser environment
- 🎯 **Native feel** - System-integrated windows and APIs
- 🛠️ **Developer friendly** - Hot reload and debugging support

## Installation

This plugin is already in your FluxStack project. No additional installation required.

## Configuration

Configure the plugin using environment variables or the config file:

```bash
# Enable/disable plugin
FLUXSTACK_DESKTOP_ENABLED=true

# Auto-open browser on server start
FLUXSTACK_DESKTOP_AUTO_OPEN=true

# Auto-shutdown server when browser window closes
FLUXSTACK_DESKTOP_AUTO_SHUTDOWN=true

# Force specific browser (optional)
FLUXSTACK_DESKTOP_BROWSER=chrome

# Window size
FLUXSTACK_DESKTOP_WINDOW_WIDTH=1200
FLUXSTACK_DESKTOP_WINDOW_HEIGHT=800

# Debug mode
FLUXSTACK_DESKTOP_DEBUG=false

# Target URL (default: FluxStack dev server)
FLUXSTACK_DESKTOP_URL=http://127.0.0.1:3000

# Shutdown delay in milliseconds (for graceful cleanup)
FLUXSTACK_DESKTOP_SHUTDOWN_DELAY=1000

# Custom data path for browser storage (optional)
FLUXSTACK_DESKTOP_DATA_PATH=/custom/path/to/browser-data

# Browser Selection and Customization
FLUXSTACK_DESKTOP_BROWSER=chrome                                    # Force specific browser
FLUXSTACK_DESKTOP_CUSTOM_BROWSER_PATH=/path/to/custom/browser.exe   # Custom browser executable
FLUXSTACK_DESKTOP_BROWSER_PRIORITY=chrome,firefox,edge              # Browser priority list
FLUXSTACK_DESKTOP_CUSTOM_BROWSER_ARGS="--disable-web-security --allow-running-insecure-content"
```

The plugin's configuration is located in `plugins/FluxStack-Desktop/config/index.ts`.

## Usage

### Automatic Desktop Mode

When enabled, the plugin automatically opens your FluxStack application in a desktop window when the server starts:

```bash
bun run dev
# Server starts + Desktop window opens automatically
# When you close the browser window, the server shuts down automatically (if auto-shutdown is enabled)
```

**Auto-shutdown behavior:**
- ✅ **Enabled by default** - Closing the browser window stops the FluxStack server
- 🎯 **Desktop-like experience** - Behaves like a native desktop application
- ⚙️ **Configurable** - Set `FLUXSTACK_DESKTOP_AUTO_SHUTDOWN=false` to disable
- 🕐 **Graceful shutdown** - 1-second delay allows for cleanup before server stops

### Basic Usage

```typescript
import { open } from '@fluxstack/desktop'

// Open a desktop window
const browser = await open('http://localhost:3000', {
  windowSize: [1200, 800],
  forceBrowser: 'chrome'
})

// With onLoad callback
const browser = await open('http://localhost:3000', {
  windowSize: [1200, 800],
  onLoad: () => {
    console.log('Desktop window loaded!')
  }
})
```

### Advanced Usage with Desktop Utilities

```typescript
import { open, createDesktopUtils, type DesktopUtils } from '@fluxstack/desktop'

// Open desktop window and create utilities
const browser = await open('http://localhost:3000', {
  windowSize: [1200, 800],
  forceBrowser: 'chrome'
})

// Create enhanced desktop utilities
const desktop: DesktopUtils = createDesktopUtils(browser)

// 📸 Screenshots and PDF export
await desktop.screenshot({
  path: './app-screenshot.png',
  fullPage: true,
  format: 'png'
})

await desktop.exportToPDF({
  path: './app-export.pdf',
  format: 'A4',
  landscape: false
})

// 🪟 Window management
await desktop.maximize()
await desktop.minimize()
await desktop.toggleFullscreen()
await desktop.setZoom(1.25)

const bounds = await desktop.getWindowBounds()
console.log('Window position:', bounds.x, bounds.y)

// Close window only (keeps server running)
await desktop.closeWindow(false)

// Close window and shutdown server
await desktop.quitApplication()

// 🔔 System notifications
await desktop.showNotification({
  title: 'FluxStack Desktop',
  body: 'Task completed successfully!',
  icon: '/assets/icon.png',
  requireInteraction: true
})

// 📋 Clipboard operations
await desktop.copyToClipboard('Hello from FluxStack!')
const clipboardText = await desktop.readFromClipboard()

// 📁 File system operations (Bun native APIs)
await desktop.saveFile('./data.json', JSON.stringify({ status: 'ready' }))
const userData = await desktop.readJSONFile('./user-data.json')
const configText = await desktop.readTextFile('./config.txt')

const exists = await desktop.fileExists('./important-file.txt')
const fileSize = await desktop.getFileSize('./large-file.zip')

// 🎨 Page manipulation
await desktop.injectCSS(`
  body {
    background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
    transition: all 0.3s ease;
  }
`)

await desktop.executeScript(`
  document.querySelector('.header').style.display = 'none'
`)

// 🌐 Navigation
await desktop.navigate('https://example.com')
await desktop.goBack()
await desktop.goForward()
await desktop.reload(true) // ignore cache

// 🛠️ System utilities
const bunVersion = desktop.getBunVersion()
const nodeEnv = desktop.getEnv('NODE_ENV')

// 🖨️ Print and export
await desktop.print()

// 🎯 File dialogs
const selectedFiles = await desktop.showOpenDialog({
  title: 'Select images',
  filters: [
    { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif'] },
    { name: 'All Files', extensions: ['*'] }
  ],
  properties: ['multiSelections']
})

const savePath = await desktop.showSaveDialog({
  title: 'Save project',
  defaultPath: './my-project.json',
  filters: [
    { name: 'JSON Files', extensions: ['json'] }
  ]
})

// 🔍 Direct access to underlying APIs
await desktop.cdp.send('Network.enable')
await desktop.window.eval('console.log("Direct browser access")')
desktop.ipc.send('custom-message', { data: 'example' })
```

## Supported Browsers

- **Chrome/Chromium** - Best performance and feature support
- **Firefox** - Good alternative with different engine
- **Microsoft Edge** - Windows-optimized experience

The plugin automatically detects and uses the best available browser on your system.

## Browser Data Storage

The plugin stores browser profile data with flexible location options to suit your needs:

### **🎯 Storage Options:**

1. **📁 Default Location** (automatic):
   ```bash
   your-fluxstack-project/chrome_data/
   ```

2. **🎨 Custom Location** (configurable):
   ```bash
   # Set via environment variable
   FLUXSTACK_DESKTOP_DATA_PATH=/path/to/custom/browser-data

   # Or via .env file
   FLUXSTACK_DESKTOP_DATA_PATH=./my-browser-data
   FLUXSTACK_DESKTOP_DATA_PATH=C:\MyApp\BrowserData  # Windows absolute path
   FLUXSTACK_DESKTOP_DATA_PATH=/home/user/app-data   # Linux absolute path
   ```

### **✅ Benefits:**

- **✅ Persistent browser data** - User preferences, cookies, and cache are preserved
- **✅ Executable-friendly** - Works correctly when running from executables or temporary directories
- **✅ Project-specific** - Each project can have its own isolated browser data
- **✅ Custom storage** - Define your own path for data organization
- **✅ Easy cleanup** - Simply delete the data folder to reset browser state

### **📂 Data Structure:**
```bash
# Default location example
your-fluxstack-project/
├── src/
├── package.json
└── chrome_data/              # Created automatically here
    ├── Default/              # Browser profile
    ├── Local Storage/        # Web storage data
    ├── Cache/               # Browser cache
    └── ...                  # Other browser data

# Custom location example
/custom/browser/path/
├── Default/                  # Browser profile
├── Local Storage/           # Web storage data
├── Cache/                   # Browser cache
└── ...                     # Other browser data
```

### **🎨 Use Cases for Custom Paths:**

```bash
# Shared data across multiple projects
FLUXSTACK_DESKTOP_DATA_PATH=/shared/browser-data

# User-specific data directory
FLUXSTACK_DESKTOP_DATA_PATH=/home/user/.myapp-browser

# Temporary data directory
FLUXSTACK_DESKTOP_DATA_PATH=/tmp/browser-session

# Windows AppData directory
FLUXSTACK_DESKTOP_DATA_PATH=%APPDATA%\MyApp\BrowserData
```

**Note**: If no custom path is specified, the plugin defaults to `process.cwd()/chrome_data`.

## Features

### Advanced Browser Selection

The plugin offers multiple sophisticated methods for browser selection and customization:

#### **🎯 Selection Priority Order:**
1. **Custom Browser Path** - `FLUXSTACK_DESKTOP_CUSTOM_BROWSER_PATH` (highest priority)
2. **Force Browser Config** - `FLUXSTACK_DESKTOP_BROWSER`
3. **Function Parameter** - `forceBrowser` in API calls
4. **Browser Priority List** - `FLUXSTACK_DESKTOP_BROWSER_PRIORITY`
5. **Command Line Arguments** - `--chrome`, `--firefox`, etc.
6. **Auto-Detection** - Automatic detection with priority: **Edge → Chrome → Firefox** (fallback)

#### **🎨 Browser Selection Examples:**

**Force Specific Browser:**
```bash
# Use Chrome specifically
FLUXSTACK_DESKTOP_BROWSER=chrome

# Use Firefox specifically
FLUXSTACK_DESKTOP_BROWSER=firefox

# Use Edge specifically
FLUXSTACK_DESKTOP_BROWSER=edge
```

**Custom Browser Executable:**
```bash
# Use custom Chrome build
FLUXSTACK_DESKTOP_CUSTOM_BROWSER_PATH=/opt/google/chrome-dev/chrome

# Use Brave browser
FLUXSTACK_DESKTOP_CUSTOM_BROWSER_PATH="C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"

# Use Chromium dev build
FLUXSTACK_DESKTOP_CUSTOM_BROWSER_PATH=/usr/bin/chromium-dev
```

**Browser Priority Fallbacks:**
```bash
# Try Chrome first, then Firefox, then Edge
FLUXSTACK_DESKTOP_BROWSER_PRIORITY=chrome,firefox,edge

# Prefer Firefox development versions
FLUXSTACK_DESKTOP_BROWSER_PRIORITY=firefox_nightly,firefox,chrome

# Custom priority for development
FLUXSTACK_DESKTOP_BROWSER_PRIORITY=chrome_canary,chromium,chrome
```

**Custom Browser Arguments:**
```bash
# Development flags
FLUXSTACK_DESKTOP_CUSTOM_BROWSER_ARGS="--disable-web-security --disable-features=VizDisplayCompositor"

# Performance optimization
FLUXSTACK_DESKTOP_CUSTOM_BROWSER_ARGS="--enable-gpu-rasterization --enable-zero-copy"

# Debug mode
FLUXSTACK_DESKTOP_CUSTOM_BROWSER_ARGS="--remote-debugging-port=9222 --disable-extensions"
```

#### **🔍 Browser Detection Features:**
- **Smart detection** of installed browsers across platforms
- **Optimized priority order**: **Edge → Chrome → Firefox** for best compatibility
- **Platform-specific path resolution** (Windows, Linux, macOS)
- **Automatic fallback** to alternative browsers if primary choice unavailable
- **Command-line override** support (`--chrome`, `--firefox`, etc.)
- **Path validation** to ensure browsers exist before launching
- **Custom browser support** for non-standard installations

#### **🎯 Why Edge First?**
- **Modern Edge** is Chromium-based with excellent CDP support
- **Native Windows integration** for better desktop experience
- **Performance optimized** for Windows applications
- **Automatic updates** ensure latest web standards
- **Fallback to Chrome/Firefox** if Edge not available

### Window Management
- Configurable window size
- Custom browser selection
- Debug mode for development

### FluxStack Integration
- Hot reload support
- Automatic server detection
- Plugin lifecycle hooks
- Type-safe configuration

### Auto-Shutdown Behavior
- **Smart shutdown**: When enabled, closing the browser window automatically shuts down the FluxStack server
- **Graceful cleanup**: Configurable delay allows for proper resource cleanup
- **Desktop-like experience**: Behaves like a native desktop application
- **Configurable**: Can be disabled for traditional web development

### IPC Communication (Future)
- Bidirectional communication between web and desktop
- Native API access (file system, notifications, etc.)
- Chrome DevTools Protocol integration

## API Reference

### Core Functions

#### `open(url, options): Promise<FluxDesktopWindow>`

Opens a new desktop window.

**Parameters:**
- `url: string` - URL to open
- `options: OpenOptions` - Configuration options
  - `windowSize?: [number, number]` - Window dimensions `[width, height]`
  - `forceBrowser?: BrowserName` - Force specific browser
  - `onLoad?: Function` - Callback when page loads

#### `createDesktopUtils(browser): DesktopUtils`

Creates enhanced desktop utilities for a browser instance.

**Parameters:**
- `browser: FluxDesktopWindow` - Browser instance from `open()`

### Desktop Utilities API

#### Window Management
- `minimize()` - Minimize the window
- `maximize()` - Maximize the window
- `toggleFullscreen()` - Toggle fullscreen mode
- `focus()` - Focus the window
- `getWindowBounds()` - Get window position and size
- `isFocused()` - Check if window is focused
- `closeWindow(shutdownServer?)` - Close browser window, optionally shutdown server
- `quitApplication()` - Close window and shutdown server completely

#### Screenshots & Export
- `screenshot(options?)` - Take screenshot with options:
  - `path?: string` - Save to file path
  - `format?: 'png' | 'jpeg' | 'webp'` - Image format
  - `quality?: number` - Quality 0-100 (JPEG/WebP only)
  - `fullPage?: boolean` - Capture full scrollable page
  - `clip?: {x, y, width, height}` - Clip specific area
- `exportToPDF(options?)` - Export page to PDF:
  - `path?: string` - Save to file path
  - `format?: 'A4' | 'Letter'` - Paper format
  - `landscape?: boolean` - Landscape orientation

#### Navigation
- `navigate(url)` - Navigate to URL
- `goBack()` - Go back in history
- `goForward()` - Go forward in history
- `reload(ignoreCache?)` - Reload page
- `getCurrentURL()` - Get current URL

#### Page Manipulation
- `setTitle(title)` - Set window title
- `getTitle()` - Get page title
- `executeScript(script)` - Execute JavaScript
- `injectCSS(css)` - Inject CSS styles
- `print()` - Print page

#### Zoom & Display
- `setZoom(level)` - Set zoom level (1.0 = 100%)
- `getZoom()` - Get current zoom level

#### System Integration
- `showNotification(options)` - Show system notification:
  - `title: string` - Notification title
  - `body?: string` - Notification body
  - `icon?: string` - Icon URL
  - `tag?: string` - Notification tag
  - `requireInteraction?: boolean` - Require user interaction
  - `silent?: boolean` - Silent notification
- `copyToClipboard(text)` - Copy text to clipboard
- `readFromClipboard()` - Read text from clipboard

#### File System (Bun Native APIs)
- `saveFile(path, data)` - Save data to file
- `readTextFile(path)` - Read text file
- `readJSONFile(path)` - Read and parse JSON file
- `fileExists(path)` - Check if file exists
- `getFileSize(path)` - Get file size in bytes

#### File Dialogs
- `showOpenDialog(options?)` - Show open file dialog:
  - `title?: string` - Dialog title
  - `defaultPath?: string` - Default path
  - `filters?: Array<{name, extensions}>` - File filters
  - `properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>` - Dialog properties
- `showSaveDialog(options?)` - Show save file dialog (same options as open)

#### System Utilities
- `getEnv(key)` - Get environment variable
- `getBunVersion()` - Get Bun runtime version
- `runCommand(command, args?)` - Run shell command (placeholder)

#### Performance & Debugging
- `getMetrics()` - Get page performance metrics
- `openDevTools()` - Open developer tools
- `closeDevTools()` - Close developer tools

#### Event Monitoring
- `onConsoleMessage(callback)` - Monitor console messages (placeholder)
- `onNetworkRequest(callback)` - Monitor network requests (placeholder)

#### Direct API Access
- `browser` - Original browser instance
- `cdp` - Chrome DevTools Protocol API
- `window` - Window evaluation API
- `ipc` - Inter-process communication API

### Type Definitions

```typescript
type BrowserName =
  | 'chrome'
  | 'chrome_canary'
  | 'chromium'
  | 'edge'
  | 'firefox'
  | 'firefox_nightly'

interface ScreenshotOptions {
  path?: string
  format?: 'png' | 'jpeg' | 'webp'
  quality?: number
  fullPage?: boolean
  clip?: { x: number; y: number; width: number; height: number }
}

interface NotificationOptions {
  title: string
  body?: string
  icon?: string
  tag?: string
  requireInteraction?: boolean
  silent?: boolean
}

interface FileDialogOptions {
  title?: string
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
  properties?: ('openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles')[]
}
```

## Development

### Plugin Structure

```
plugins/FluxStack-Desktop/
├── config/
│   └── index.ts          # Configuration schema
├── src/
│   ├── browser/          # Browser-specific implementations
│   │   ├── chromium.ts   # Chrome/Chromium/Edge
│   │   └── firefox.ts    # Firefox support
│   ├── launcher/         # Browser launching logic
│   │   ├── start.ts      # Main launcher
│   │   └── inject.ts     # Script injection
│   ├── lib/              # Core libraries
│   │   ├── cdp.ts        # Chrome DevTools Protocol
│   │   ├── ipc.ts        # Inter-Process Communication
│   │   └── idle.ts       # Idle state management
│   └── index.ts          # Main desktop API
├── index.ts              # Plugin entry point
├── package.json          # Plugin metadata
└── README.md             # Documentation

# Browser Data Storage (created automatically)
your-project-directory/
└── chrome_data/          # Browser profile data (created in project root)
    ├── Default/          # Browser profile
    └── ...               # Browser cache and settings
```

### Testing

```bash
# Test desktop functionality
cd plugins/FluxStack-Desktop
bun run dev

# Type checking
bun run typecheck

# Run specific browser
bun src/index.ts --chrome
bun src/index.ts --firefox
```

### Adding New Browser Support

1. Create browser implementation in `src/browser/`
2. Add browser paths in `src/index.ts`
3. Update `BrowserName` type
4. Test on target platform

## Hooks Used

- `setup`: Initialize desktop plugin and detect browsers
- `onServerStart`: Auto-open desktop window if enabled
- `onRequest`: Optional debug logging for desktop requests
- `onResponse`: Optional debug logging for desktop responses
- `onError`: Handle desktop-related errors

## Troubleshooting

### Browser Not Found
- Install Chrome, Firefox, or Edge
- Check browser installation paths
- Use `forceBrowser` option to specify browser

### Window Not Opening
- Check if server is running
- Verify target URL is accessible
- Enable debug mode for detailed logs
- Check browser permissions

### Performance Issues
- Use Chrome for best performance
- Disable debug mode in production
- Check system resources

## License

MIT - See LICENSE file for details
