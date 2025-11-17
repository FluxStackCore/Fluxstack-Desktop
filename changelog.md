# FluxDesktop Changelog

## v1.0.0 [2024-11-17] - FluxStack Integration
- ✅ Complete TypeScript rewrite with native Bun support
- ✅ Renamed from Gluon to FluxDesktop for FluxStack ecosystem integration
- ✅ Updated global API from `window.Gluon` to `window.FluxDesktop`
- ✅ Full type safety with modern TypeScript configuration
- ✅ Hot reload development experience
- ✅ Maintained full compatibility with Chrome DevTools Protocol
- ✅ Enhanced IPC system with better error handling
- ✅ Updated documentation and examples

## v0.8.0 [2022-12-30] - Legacy Gluon
- Rewrote browser detection to support more setups
- Added `Window.close()` API to close windows gracefully

## 0.7.0 [2022-12-20]
- Added typedef
- Added async IPC listener support
- Added Idle API (WIP)
- Changed default IPC replies to `null` instead of `{}`
- Fixed misnamed IPC binding handler
- Fixed some IPC parsing
- Cleaned up some IPC internals