// Background Service Worker for ClipBoarder

const MAX_CLIPS = 100;

// Helper to save a clip into storage
async function saveClip(text) {
  if (!text || !text.trim()) return null;
  const cleanText = text.trim();

  const data = await chrome.storage.local.get({ clips: [] });
  let clips = data.clips || [];

  // Check if text already exists in recent entries
  const existingIndex = clips.findIndex((c) => c.text === cleanText);
  let newClip;

  if (existingIndex !== -1) {
    // Move existing to top, preserve pin status
    newClip = { ...clips[existingIndex], timestamp: Date.now() };
    clips.splice(existingIndex, 1);
  } else {
    newClip = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      text: cleanText,
      timestamp: Date.now(),
      pinned: false,
    };
  }

  // Put new / updated clip at the top
  clips.unshift(newClip);

  // Keep list bounded to MAX_CLIPS while retaining pinned items
  if (clips.length > MAX_CLIPS) {
    const unpinned = clips.filter((c) => !c.pinned);
    if (unpinned.length > 0) {
      const toRemove = unpinned[unpinned.length - 1];
      clips = clips.filter((c) => c.id !== toRemove.id);
    }
  }

  await chrome.storage.local.set({ clips });

  // Update badge for feedback
  chrome.action.setBadgeText({ text: '✓' });
  chrome.action.setBadgeBackgroundColor({ color: '#10B981' });
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
      const clipToPaste = clips[0].text;
      try {
        await chrome.tabs.sendMessage(activeTab.id, {
          action: 'TRIGGER_PASTE',
          text: clipToPaste,
        });
      } catch (e) {
        console.warn('Could not communicate with tab:', e);
      }
    }
  }
});

// Handle runtime messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SAVE_CLIP') {
    saveClip(request.text).then((clip) => {
      sendResponse({ success: true, clip });
    });
    return true; // async response
  }

  if (request.action === 'PASTE_TO_ACTIVE_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'TRIGGER_PASTE',
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
    return true; // async response
  }
});
