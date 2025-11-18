#!/usr/bin/env bun

/**
 * FluxStack Desktop - Example Usage
 *
 * This example demonstrates how to use the enhanced desktop utilities
 * that have been added to FluxStack Desktop.
 *
 * Usage: bun run example.ts
 */

import { open, createDesktopUtils } from './src'

async function main() {
  console.log('🚀 Starting FluxStack Desktop Example...')

  try {
    // Open a desktop window
    console.log('📱 Opening desktop window...')
    const browser = await open('http://localhost:3000', {
      windowSize: [1200, 800],
      forceBrowser: 'chrome'
    })

    console.log('✅ Desktop window opened successfully!')

    // Create enhanced desktop utilities
    const desktop = createDesktopUtils(browser)

    // Wait a moment for the page to load
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Example 1: Take a screenshot
    console.log('📸 Taking screenshot...')
    await desktop.screenshot({
      path: './example-screenshot.png',
      format: 'png'
    })
    console.log('✅ Screenshot saved to example-screenshot.png')

    // Example 2: Show notification
    console.log('🔔 Showing notification...')
    await desktop.showNotification({
      title: 'FluxStack Desktop',
      body: 'Example application is running!',
      requireInteraction: false
    })

    // Example 3: Window management
    console.log('🪟 Testing window management...')
    await new Promise(resolve => setTimeout(resolve, 1000))

    await desktop.maximize()
    console.log('✅ Window maximized')

    await new Promise(resolve => setTimeout(resolve, 2000))

    await desktop.setZoom(1.25)
    console.log('✅ Zoom set to 125%')

    // Example 4: Page manipulation
    console.log('🎨 Injecting custom CSS...')
    await desktop.injectCSS(`
      body {
        background: linear-gradient(45deg, #667eea 0%, #764ba2 100%) !important;
        color: white !important;
      }
      .container {
        border: 3px solid #fff;
        border-radius: 10px;
        padding: 20px;
        margin: 20px;
      }
    `)
    console.log('✅ Custom CSS injected')

    // Example 5: File operations using Bun
    console.log('📁 Testing file operations...')
    const exampleData = {
      timestamp: new Date().toISOString(),
      message: 'Hello from FluxStack Desktop!',
      version: desktop.getBunVersion()
    }

    await desktop.saveFile('./example-data.json', JSON.stringify(exampleData, null, 2))
    console.log('✅ Data saved to example-data.json')

    const savedData = await desktop.readJSONFile('./example-data.json')
    console.log('✅ Data loaded from file:', savedData.message)

    // Example 6: Clipboard operations
    console.log('📋 Testing clipboard...')
    await desktop.copyToClipboard('Hello from FluxStack Desktop clipboard!')
    console.log('✅ Text copied to clipboard')

    const clipboardContent = await desktop.readFromClipboard()
    console.log('✅ Clipboard content:', clipboardContent)

    // Example 7: System utilities
    console.log('🛠️ System information:')
    console.log(`   Bun version: ${desktop.getBunVersion()}`)
    console.log(`   NODE_ENV: ${desktop.getEnv('NODE_ENV') || 'not set'}`)

    const currentUrl = await desktop.getCurrentURL()
    console.log(`   Current URL: ${currentUrl}`)

    const windowBounds = await desktop.getWindowBounds()
    console.log(`   Window size: ${windowBounds.width}x${windowBounds.height}`)

    // Example 8: Export to PDF
    console.log('📄 Exporting to PDF...')
    await desktop.exportToPDF({
      path: './example-export.pdf',
      format: 'A4'
    })
    console.log('✅ PDF exported to example-export.pdf')

    console.log('\n🎉 All examples completed successfully!')
    console.log('\n📝 Files created:')
    console.log('   - example-screenshot.png')
    console.log('   - example-data.json')
    console.log('   - example-export.pdf')

    console.log('\n💡 You can now interact with the desktop window!')
    console.log('   The window will stay open for you to explore.')

  } catch (error) {
    console.error('❌ Error running example:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...')
  process.exit(0)
})

// Run the example
main().catch(console.error)