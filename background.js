// Background Service Worker for ClipBoarder - Text & Image Support

const MAX_CLIPS = 100;

// Helper to save a text clip
async function saveClip(text) {
  if (!text || !text.trim()) return null;
  const cleanText = text.trim();

  const data = await chrome.storage.local.get({ clips: [] });
  let clips = data.clips || [];

  const existingIndex = clips.findIndex((c) => c.type !== 'image' && c.text === cleanText);
  let newClip;

  if (existingIndex !== -1) {
    newClip = { ...clips[existingIndex], timestamp: Date.now() };
    clips.splice(existingIndex, 1);
  } else {
    newClip = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type: 'text',
      text: cleanText,
      timestamp: Date.now(),
      pinned: false,
    };
  }

  clips.unshift(newClip);

  // Trim to MAX_CLIPS while keeping pinned items
  if (clips.length > MAX_CLIPS) {
    const unpinned = clips.filter((c) => !c.pinned);
    if (unpinned.length > 0) {
      const toRemove = unpinned[unpinned.length - 1];
      clips = clips.filter((c) => c.id !== toRemove.id);
    }
  }

  await chrome.storage.local.set({ clips });

  chrome.action.setBadgeText({ text: '✓' });
  chrome.action.setBadgeBackgroundColor({ color: '#10B981' });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 1500);

  return newClip;
}

// Helper to save an image clip
async function saveImageClip(dataUrl, mimeType = 'image/png', sizeBytes = 0) {
  if (!dataUrl) return null;

  const data = await chrome.storage.local.get({ clips: [] });
  let clips = data.clips || [];

  const existingIndex = clips.findIndex((c) => c.type === 'image' && c.dataUrl === dataUrl);
  let newClip;

  if (existingIndex !== -1) {
    newClip = { ...clips[existingIndex], timestamp: Date.now() };
    clips.splice(existingIndex, 1);
  } else {
    newClip = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type: 'image',
      dataUrl,
      mimeType,
      sizeBytes,
      timestamp: Date.now(),
      pinned: false,
    };
  }

  clips.unshift(newClip);

  if (clips.length > MAX_CLIPS) {
    const unpinned = clips.filter((c) => !c.pinned);
    if (unpinned.length > 0) {
      const toRemove = unpinned[unpinned.length - 1];
      clips = clips.filter((c) => c.id !== toRemove.id);
    }
  }

  await chrome.storage.local.set({ clips });

  chrome.action.setBadgeText({ text: '🖼️' });
  chrome.action.setBadgeBackgroundColor({ color: '#3B82F6' });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 1500);

  return newClip;
}

// Handle shortcuts registered in manifest commands
chrome.commands.onCommand.addListener(async (command) => {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab || !activeTab.id) return;

  if (command === 'copy-selection') {
    try {
      await chrome.tabs.sendMessage(activeTab.id, { action: 'TRIGGER_COPY' });
    } catch (e) {
      console.warn('Could not communicate with tab:', e);
    }
  } else if (command === 'paste-recent') {
    const data = await chrome.storage.local.get({ clips: [] });
    const clips = data.clips || [];
    if (clips.length > 0) {
      const topClip = clips[0];
      try {
        await chrome.tabs.sendMessage(activeTab.id, {
          action: 'TRIGGER_PASTE',
          clip: topClip,
          text: topClip.text || '',
        });
      } catch (e) {
        console.warn('Could not communicate with tab:', e);
      }
    }
  }
});

// Handle runtime messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SAVE_CLIP') {
    saveClip(request.text).then((clip) => {
      sendResponse({ success: true, clip });
    });
    return true;
  }

  if (request.action === 'SAVE_IMAGE_CLIP') {
    saveImageClip(request.dataUrl, request.mimeType, request.sizeBytes).then((clip) => {
      sendResponse({ success: true, clip });
    });
    return true;
  }

  if (request.action === 'PASTE_TO_ACTIVE_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'TRIGGER_PASTE',
          clip: request.clip,
          text: request.text,
        }).then(() => {
          sendResponse({ success: true });
        }).catch((err) => {
          sendResponse({ success: false, error: err.message });
        });
      } else {
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });
    return true;
  }
});
