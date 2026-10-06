// Content Script for ClipBoarder - Text, Image, PDF, and Page Button Support

// Helper to show non-intrusive floating glassmorphic toast in top-right
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('clipboarder-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'clipboarder-toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
    `;
    document.documentElement.appendChild(toastContainer);
  }

  const toast = document.createElement('div');

  let accentGradient = 'linear-gradient(135deg, rgba(30, 41, 59, 0.72) 0%, rgba(15, 23, 42, 0.82) 100%)';
  let borderColor = 'rgba(255, 255, 255, 0.16)';
  let glowColor = 'rgba(0, 0, 0, 0.25)';

  if (type === 'success') {
    accentGradient = 'linear-gradient(135deg, rgba(6, 78, 59, 0.75) 0%, rgba(4, 47, 46, 0.85) 100%)';
    borderColor = 'rgba(52, 211, 153, 0.35)';
    glowColor = 'rgba(16, 185, 129, 0.2)';
  } else if (type === 'error') {
    accentGradient = 'linear-gradient(135deg, rgba(127, 29, 29, 0.75) 0%, rgba(69, 10, 10, 0.85) 100%)';
    borderColor = 'rgba(248, 113, 113, 0.35)';
    glowColor = 'rgba(239, 68, 68, 0.2)';
  }

  toast.style.cssText = `
    background: ${accentGradient};
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid ${borderColor};
    border-top: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 8px 32px 0 ${glowColor}, inset 0 1px 1px rgba(255, 255, 255, 0.2);
    color: #F8FAFC;
    padding: 10px 16px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 500;
    opacity: 0;
    transform: translateY(-12px) scale(0.96);
    transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: 360px;
    pointer-events: auto;
  `;

  toast.innerHTML = `
    <span style="font-size: 16px; line-height: 1;">${type === 'success' ? '📋' : (type === 'error' ? '⚠️' : 'ℹ️')}</span>
    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; letter-spacing: -0.01em;">${message}</span>
  `;

  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0) scale(1)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px) scale(0.95)';
    setTimeout(() => {
      toast.remove();
      if (toastContainer && toastContainer.children.length === 0) {
        toastContainer.remove();
      }
    }, 250);
  }, 2300);
}

// Extract selected text from DOM
function getSelectedText() {
  let selectedText = '';
  const selection = window.getSelection();
  if (selection && selection.toString().trim()) {
    selectedText = selection.toString();
  }

  const activeEl = document.activeElement;
  if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
    const start = activeEl.selectionStart;
    const end = activeEl.selectionEnd;
    if (typeof start === 'number' && typeof end === 'number' && start !== end) {
      selectedText = activeEl.value.substring(start, end);
    }
  }

  return selectedText.trim();
}

// Read system clipboard items (supports both Images and Text)
async function syncFromClipboard(showSuccessToast = false) {
  try {
    if (!navigator.clipboard) return false;

    // 1. Try reading clipboard items (images & rich content)
    if (navigator.clipboard.read) {
      try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              const reader = new FileReader();
              reader.onload = () => {
                const dataUrl = reader.result;
                chrome.runtime.sendMessage({
                  action: 'SAVE_IMAGE_CLIP',
                  dataUrl,
                  mimeType: type,
                  sizeBytes: blob.size,
                });
                if (showSuccessToast) {
                  showToast('Copied Image to ClipBoarder', 'success');
                }
              };
              reader.readAsDataURL(blob);
              return true;
            }
          }
        }
      } catch (e) {
        // Fall through to text read
      }
    }

    // 2. Read text from clipboard
    if (navigator.clipboard.readText) {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        chrome.runtime.sendMessage({ action: 'SAVE_CLIP', text: text.trim() });
        if (showSuccessToast) {
          const preview = text.length > 22 ? `${text.substring(0, 22)}...` : text;
          showToast(`Copied: "${preview}"`, 'success');
        }
        return true;
      }
    }
  } catch (err) {
    // Permission or focus issue
  }
  return false;
}

// Perform copy action (works on Webpages, PDFs, and embedded controls)
async function performCopy() {
  let selectedText = getSelectedText();

  // 1. Normal DOM text selection
  if (selectedText) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(selectedText).catch(() => {
        try { document.execCommand('copy'); } catch (e) {}
      });
    }
    chrome.runtime.sendMessage({ action: 'SAVE_CLIP', text: selectedText });
    const preview = selectedText.length > 22 ? `${selectedText.substring(0, 22)}...` : selectedText;
    showToast(`Copied: "${preview}"`, 'success');
    return;
  }

  // 2. PDF / Iframe / Shadow DOM fallback:
  // Trigger standard copy command on focused element (triggers PDF viewer's native copy)
  try {
    document.execCommand('copy');
  } catch (e) {}

  // Allow browser tick to update clipboard
  await new Promise((resolve) => setTimeout(resolve, 80));

  // Sync from clipboard (reads PDF copied text or image)
  const success = await syncFromClipboard(true);
  if (!success) {
    showToast('No text or image selected', 'error');
  }
}

// Safely insert text or image at cursor
function insertTextAtCursor(text, clip = null) {
  const activeEl = document.activeElement;
  if (!activeEl) return false;

  // Handle image insertion
  if (clip && clip.type === 'image') {
    if (activeEl.isContentEditable) {
      const img = document.createElement('img');
      img.src = clip.dataUrl;
      img.style.maxWidth = '100%';
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(img);
        showToast('Pasted image into editor', 'success');
        return true;
      }
    }
    showToast('Focus a rich-text editor to paste images (or use Cmd+V)', 'info');
    return false;
  }

  // Handle text insertion
  if (!text) return false;

  let inserted = false;
  try {
    inserted = document.execCommand('insertText', false, text);
  } catch (e) {
    inserted = false;
  }

  if (inserted) {
    showToast('Pasted into active input', 'success');
    return true;
  }

  if (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') {
    const start = activeEl.selectionStart ?? activeEl.value.length;
    const end = activeEl.selectionEnd ?? activeEl.value.length;

    if (typeof activeEl.setRangeText === 'function') {
      activeEl.setRangeText(text, start, end, 'end');
    } else {
      activeEl.value = activeEl.value.slice(0, start) + text + activeEl.value.slice(end);
      activeEl.selectionStart = activeEl.selectionEnd = start + text.length;
    }

    activeEl.dispatchEvent(new Event('input', { bubbles: true }));
    activeEl.dispatchEvent(new Event('change', { bubbles: true }));

    showToast('Pasted into active input', 'success');
    return true;
  }

  if (activeEl.isContentEditable) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);

      activeEl.dispatchEvent(new Event('input', { bubbles: true }));
      showToast('Pasted into active input', 'success');
      return true;
    }
  }

  showToast('Focus an input field to paste', 'error');
  return false;
}

// Perform paste action of most recent clip
function performPaste(specifiedText, clip = null) {
  if (specifiedText || clip) {
    insertTextAtCursor(specifiedText, clip);
    return;
  }

  chrome.storage.local.get({ clips: [] }, (data) => {
    const clips = data.clips || [];
    if (clips.length > 0) {
      const topClip = clips[0];
      insertTextAtCursor(topClip.text || '', topClip);
    } else {
      showToast('ClipBoarder history is empty', 'info');
    }
  });
}

// 1. Direct keyboard shortcuts listener (Alt+Shift+C & Alt+Shift+V)
window.addEventListener(
  'keydown',
  (e) => {
    if (e.altKey && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.code === 'KeyC')) {
      e.preventDefault();
      performCopy();
      return;
    }

    if (e.altKey && e.shiftKey && (e.key === 'V' || e.key === 'v' || e.code === 'KeyV')) {
      e.preventDefault();
      performPaste();
      return;
    }
  },
  true
);

// 2. Automatically sync standard Cmd+C / Ctrl+C or context-menu copy events into history
document.addEventListener('copy', () => {
  setTimeout(() => {
    syncFromClipboard(false);
  }, 40);
});

// 3. Listen for programmatic copy events intercepted from page buttons (via page_hook.js)
window.addEventListener('message', async (e) => {
  if (e.source !== window || !e.data) return;
  if (e.data.source === 'CLIPBOARDER_PAGE_COPY' && e.data.text) {
    chrome.runtime.sendMessage({ action: 'SAVE_CLIP', text: e.data.text });
    const preview = e.data.text.length > 22 ? `${e.data.text.substring(0, 22)}...` : e.data.text;
    showToast(`Copied from page: "${preview}"`, 'success');
  } else if (e.data.source === 'CLIPBOARDER_PAGE_WRITE_EVENT') {
    setTimeout(() => {
      syncFromClipboard(false);
    }, 40);
  }
});

// 4. Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'TRIGGER_COPY') {
    performCopy();
    sendResponse({ success: true });
  } else if (request.action === 'TRIGGER_PASTE') {
    performPaste(request.text, request.clip);
    sendResponse({ success: true });
  }
});
