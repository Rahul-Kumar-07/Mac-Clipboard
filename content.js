// Content Script for ClipBoarder

// Helper to show non-intrusive floating toast notifications
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('clipboarder-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'clipboarder-toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    `;
    document.documentElement.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bgColor = type === 'success' ? '#10B981' : (type === 'error' ? '#EF4444' : '#1F2937');
  toast.style.cssText = `
    background-color: ${bgColor};
    color: #FFFFFF;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 320px;
    pointer-events: auto;
  `;

  toast.innerHTML = `
    <span style="font-size: 15px;">${type === 'success' ? '📋' : 'ℹ️'}</span>
    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${message}</span>
  `;

  toastContainer.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  // Fade out and remove
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => {
      toast.remove();
      if (toastContainer && toastContainer.children.length === 0) {
        toastContainer.remove();
      }
    }, 250);
  }, 2200);
}

// Extract selected text from active DOM element or page selection
function getSelectedText() {
  let selectedText = '';

  // 1. Standard window selection
  const selection = window.getSelection();
  if (selection && selection.toString().trim()) {
    selectedText = selection.toString();
  }

  // 2. Focused input or textarea
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

// Safely insert text into the focused target element
function insertTextAtCursor(text) {
  if (!text) return false;
  const activeEl = document.activeElement;

  if (!activeEl) return false;

  // Try document.execCommand first for undo-history compatibility
  let inserted = false;
  try {
    inserted = document.execCommand('insertText', false, text);
  } catch (e) {
    inserted = false;
  }

  if (inserted) {
    showToast('Pasted from ClipBoarder', 'success');
    return true;
  }

  // Fallback for standard input / textarea
  if (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') {
    const start = activeEl.selectionStart ?? activeEl.value.length;
    const end = activeEl.selectionEnd ?? activeEl.value.length;

    if (typeof activeEl.setRangeText === 'function') {
      activeEl.setRangeText(text, start, end, 'end');
    } else {
      activeEl.value = activeEl.value.slice(0, start) + text + activeEl.value.slice(end);
      activeEl.selectionStart = activeEl.selectionEnd = start + text.length;
    }

    // Dispatch input and change events for framework binding (React, Vue, etc.)
    activeEl.dispatchEvent(new Event('input', { bubbles: true }));
    activeEl.dispatchEvent(new Event('change', { bubbles: true }));

    showToast('Pasted from ClipBoarder', 'success');
    return true;
  }

  // Fallback for contenteditable elements
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
      showToast('Pasted from ClipBoarder', 'success');
      return true;
    }
  }

  showToast('Focus an editable field to paste', 'error');
  return false;
}

// Perform copy action
function performCopy() {
  const selectedText = getSelectedText();
  if (selectedText) {
    chrome.runtime.sendMessage(
      { action: 'SAVE_CLIP', text: selectedText },
      (response) => {
        if (response && response.success) {
          const preview = selectedText.length > 25 ? `${selectedText.substring(0, 25)}...` : selectedText;
          showToast(`Copied: "${preview}"`, 'success');
        }
      }
    );
  } else {
    showToast('No text selected to copy', 'error');
  }
}

// Perform paste action of most recent clip
function performPaste(specifiedText) {
  if (specifiedText) {
    insertTextAtCursor(specifiedText);
    return;
  }

  chrome.storage.local.get({ clips: [] }, (data) => {
    const clips = data.clips || [];
    if (clips.length > 0) {
      insertTextAtCursor(clips[0].text);
    } else {
      showToast('ClipBoarder is empty', 'info');
    }
  });
}

// Direct keyboard shortcuts listener (Alt+Shift+C & Alt+Shift+V)
window.addEventListener(
  'keydown',
  (e) => {
    // Check for Alt + Shift + C
    if (e.altKey && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.code === 'KeyC')) {
      e.preventDefault();
      performCopy();
      return;
    }

    // Check for Alt + Shift + V
    if (e.altKey && e.shiftKey && (e.key === 'V' || e.key === 'v' || e.code === 'KeyV')) {
      e.preventDefault();
      performPaste();
      return;
    }
  },
  true // Capturing phase
);

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'TRIGGER_COPY') {
    performCopy();
    sendResponse({ success: true });
  } else if (request.action === 'TRIGGER_PASTE') {
    performPaste(request.text);
    sendResponse({ success: true });
  }
});
