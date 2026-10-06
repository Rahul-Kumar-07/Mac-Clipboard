// Page Hook Script - Runs in MAIN world to intercept programmatic website copy calls
(function () {
  if (window.__clipboarder_hook_installed) return;
  window.__clipboarder_hook_installed = true;

  // Intercept navigator.clipboard.writeText (e.g. "Copy Code" or "Copy Link" buttons)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    const originalWriteText = navigator.clipboard.writeText;
    navigator.clipboard.writeText = async function (text) {
      try {
        if (typeof text === 'string' && text.trim().length > 0) {
          window.postMessage({ source: 'CLIPBOARDER_PAGE_COPY', text }, '*');
        }
      } catch (e) {
        console.warn('ClipBoarder hook error:', e);
      }
      return originalWriteText.apply(this, arguments);
    };
  }

  // Intercept navigator.clipboard.write (e.g. rich content, images, blobs)
  if (navigator.clipboard && navigator.clipboard.write) {
    const originalWrite = navigator.clipboard.write;
    navigator.clipboard.write = async function (data) {
      try {
        window.postMessage({ source: 'CLIPBOARDER_PAGE_WRITE_EVENT' }, '*');
      } catch (e) {
        console.warn('ClipBoarder hook error:', e);
      }
      return originalWrite.apply(this, arguments);
    };
  }
})();
