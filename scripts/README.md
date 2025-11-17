# FluxDesktop Injection Scripts

This directory contains JavaScript files that are injected into web pages by FluxDesktop.

## Structure

### `ipc-injection.js`
Main IPC (Inter-Process Communication) script that creates the `window.FluxDesktop` API in the browser.

**Template Variables:**
- `{{FLUXDESKTOP_VERSION}}` - FluxDesktop version
- `{{BUN_VERSION}}` - Bun runtime version
- `{{BROWSER_VERSION}}` - Browser version
- `{{BROWSER_TYPE}}` - Browser type (firefox/chromium)
- `{{PRODUCT_NAME}}` - Browser product name
- `{{BUN_JS_VERSION}}` - Bun JavaScript engine version
- `{{BROWSER_JS_VERSION}}` - Browser JavaScript engine version

### `onload-wrapper.js`
Wrapper script for user-provided `onLoad` functions.

**Template Variables:**
- `{{ONLOAD_FUNCTION}}` - User function to be executed on page load

## Usage

These scripts are loaded and processed by `src/lib/scripts.ts`:

```typescript
import { loadIPCInjection, loadOnLoadWrapper } from './lib/scripts';

// Load IPC injection with proper variables
const injection = await loadIPCInjection(browserInfo, browserName);

// Load onLoad wrapper
const wrapper = await loadOnLoadWrapper(userFunction);
```

## Development

When modifying these scripts:

1. **Keep JavaScript pure** - No TypeScript syntax
2. **Use template variables** for dynamic content
3. **Test thoroughly** - These run in the browser context
4. **Maintain compatibility** - Consider different browser engines

## Security

- Scripts run in the browser context with page privileges
- IPC communication is validated and sandboxed
- No arbitrary code execution without proper validation