(() => {
  if (window.self !== window.top) return; // inside frame

  ({{ONLOAD_FUNCTION}})();
})();