// Popup UI Controller - Modern Liquid Glass Edition with Image & Rich Clipboard Support

let allClips = [];
let searchQuery = '';

// DOM Elements
const clipsList = document.getElementById('clips-list');
const emptyState = document.getElementById('empty-state');
const clipCountBadge = document.getElementById('clip-count');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const clearAllBtn = document.getElementById('clear-all-btn');

// Format relative timestamp
function formatTime(timestamp) {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

// Format file size
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Convert data URL to Blob
async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return await res.blob();
}

// Escape HTML for safe rendering
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// Synchronize latest system clipboard item into history on popup open
async function syncFromSystemClipboard() {
  try {
    if (!navigator.clipboard) return;

    // Check for images
    if (navigator.clipboard.read) {
      try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              const reader = new FileReader();
              reader.onload = async () => {
                const dataUrl = reader.result;
                if (allClips.length === 0 || allClips[0].dataUrl !== dataUrl) {
                  await chrome.runtime.sendMessage({
                    action: 'SAVE_IMAGE_CLIP',
                    dataUrl,
                    mimeType: type,
                    sizeBytes: blob.size,
                  });
                  loadClips();
                }
              };
              reader.readAsDataURL(blob);
              return;
            }
          }
        }
      } catch (e) {}
    }

    // Check for text
    if (navigator.clipboard.readText) {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        const clean = text.trim();
        if (allClips.length === 0 || allClips[0].text !== clean) {
          await chrome.runtime.sendMessage({ action: 'SAVE_CLIP', text: clean });
          loadClips();
        }
      }
    }
  } catch (err) {}
}

// Render clips list
function renderClips() {
  const filtered = allClips.filter((clip) => {
    if (clip.type === 'image') {
      return (
        searchQuery === '' ||
        'image'.includes(searchQuery.toLowerCase()) ||
        'picture'.includes(searchQuery.toLowerCase()) ||
        'screenshot'.includes(searchQuery.toLowerCase())
      );
    }
    return (clip.text || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  clipCountBadge.textContent = `${allClips.length} ${allClips.length === 1 ? 'item' : 'items'}`;

  if (filtered.length === 0) {
    clipsList.innerHTML = '';
    emptyState.classList.remove('hidden');
    if (searchQuery) {
      emptyState.querySelector('h3').textContent = 'No matching clips';
      emptyState.querySelector('p').textContent = 'Try searching with different keywords.';
    } else {
      emptyState.querySelector('h3').textContent = 'No clips saved';
      emptyState.querySelector('p').innerHTML = 'Select any text/image and press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> or <kbd>Cmd</kbd>+<kbd>C</kbd> to save it here.';
    }
    return;
  }

  emptyState.classList.add('hidden');
  clipsList.innerHTML = '';

  // Sort: pinned first, then newest first
  filtered.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.timestamp - a.timestamp;
  });

  filtered.forEach((clip) => {
    const card = document.createElement('div');
    card.className = `clip-card ${clip.pinned ? 'pinned' : ''} ${clip.type === 'image' ? 'is-image' : ''}`;
    card.dataset.id = clip.id;

    if (clip.type === 'image') {
      // IMAGE CARD
      const sizeStr = formatBytes(clip.sizeBytes);
      card.innerHTML = `
        <div class="clip-image-preview-wrapper">
          <img src="${clip.dataUrl}" class="clip-image-preview" alt="Clip Image" />
          <span class="clip-type-tag">🖼️ Image ${sizeStr ? `• ${sizeStr}` : ''}</span>
        </div>
        <div class="clip-meta">
          <div class="clip-meta-info">
            <span class="meta-label">${formatTime(clip.timestamp)}</span>
          </div>
          <div class="clip-actions">
            <button class="glass-btn copy" title="Copy image to Mac clipboard for Cmd+V">
              <span>Copy</span>
            </button>
            <button class="glass-btn pin ${clip.pinned ? 'active' : ''}" title="${clip.pinned ? 'Unpin' : 'Pin'}">
              <span>📌</span>
            </button>
            <button class="glass-btn delete" title="Delete image">
              <span>🗑️</span>
            </button>
          </div>
        </div>
      `;

      // Click card to copy image
      card.addEventListener('click', async (e) => {
        if (e.target.closest('.clip-actions')) return;
        try {
          const blob = await dataUrlToBlob(clip.dataUrl);
          await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
          card.classList.add('flash-copied');
          const metaLabel = card.querySelector('.meta-label');
          const orig = metaLabel.textContent;
          metaLabel.textContent = '✓ Copied for Cmd+V!';
          setTimeout(() => {
            metaLabel.textContent = orig;
            card.classList.remove('flash-copied');
          }, 1200);
        } catch (err) {
          console.warn('Could not write image to clipboard:', err);
        }
      });

      // Copy button for image
      const copyBtn = card.querySelector('.glass-btn.copy');
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          const blob = await dataUrlToBlob(clip.dataUrl);
          await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
          card.classList.add('flash-copied');
          copyBtn.innerHTML = '<span>✓ Copied</span>';
          const metaLabel = card.querySelector('.meta-label');
          const orig = metaLabel.textContent;
          metaLabel.textContent = '✓ Ready for Cmd+V';
          setTimeout(() => {
            copyBtn.innerHTML = '<span>Copy</span>';
            metaLabel.textContent = orig;
            card.classList.remove('flash-copied');
          }, 1400);
        } catch (err) {}
      });

    } else {
      // TEXT CARD
      const charCount = clip.text.length;
      const lineCount = clip.text.split('\n').length;
      const metaStats = `${charCount}c${lineCount > 1 ? ` • ${lineCount}L` : ''}`;

      card.innerHTML = `
        <div class="clip-content">${escapeHtml(clip.text)}</div>
        <div class="clip-meta">
          <div class="clip-meta-info">
            <span class="meta-label">${formatTime(clip.timestamp)}</span>
            <span>•</span>
            <span>${metaStats}</span>
          </div>
          <div class="clip-actions">
            <button class="glass-btn paste" title="Paste directly into webpage field">
              <span>Paste</span>
            </button>
            <button class="glass-btn copy" title="Copy to Mac clipboard for Cmd+V">
              <span>Copy</span>
            </button>
            <button class="glass-btn pin ${clip.pinned ? 'active' : ''}" title="${clip.pinned ? 'Unpin snippet' : 'Pin snippet'}">
              <span>📌</span>
            </button>
            <button class="glass-btn delete" title="Delete snippet">
              <span>🗑️</span>
            </button>
          </div>
        </div>
      `;

      // Click card to paste and copy text
      card.addEventListener('click', async (e) => {
        if (e.target.closest('.clip-actions')) return;
        await navigator.clipboard.writeText(clip.text);
        chrome.runtime.sendMessage({
          action: 'PASTE_TO_ACTIVE_TAB',
          clip,
          text: clip.text,
        });

        card.classList.add('flash-pasted');
        const metaLabel = card.querySelector('.meta-label');
        const orig = metaLabel.textContent;
        metaLabel.textContent = '✓ Pasted & Copied!';
        setTimeout(() => {
          metaLabel.textContent = orig;
          card.classList.remove('flash-pasted');
        }, 1200);
      });

      // Paste button
      const pasteBtn = card.querySelector('.glass-btn.paste');
      pasteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(clip.text);
        chrome.runtime.sendMessage({
          action: 'PASTE_TO_ACTIVE_TAB',
          clip,
          text: clip.text,
        });
        pasteBtn.innerHTML = '<span>✓ Done</span>';
        setTimeout(() => {
          pasteBtn.innerHTML = '<span>Paste</span>';
        }, 1200);
      });

      // Copy button
      const copyBtn = card.querySelector('.glass-btn.copy');
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(clip.text);
        card.classList.add('flash-copied');
        copyBtn.innerHTML = '<span>✓ Copied</span>';
        const metaLabel = card.querySelector('.meta-label');
        const orig = metaLabel.textContent;
        metaLabel.textContent = '✓ Ready for Cmd+V';
        setTimeout(() => {
          copyBtn.innerHTML = '<span>Copy</span>';
          metaLabel.textContent = orig;
          card.classList.remove('flash-copied');
        }, 1400);
      });
    }

    // Pin button (both image and text)
    const pinBtn = card.querySelector('.glass-btn.pin');
    pinBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      clip.pinned = !clip.pinned;
      await chrome.storage.local.set({ clips: allClips });
      renderClips();
    });

    // Delete button (both image and text)
    const deleteBtn = card.querySelector('.glass-btn.delete');
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      allClips = allClips.filter((c) => c.id !== clip.id);
      await chrome.storage.local.set({ clips: allClips });
      renderClips();
    });

    clipsList.appendChild(card);
  });
}

// Load clips from storage
async function loadClips() {
  const data = await chrome.storage.local.get({ clips: [] });
  allClips = data.clips || [];
  renderClips();
}

// Search handling
searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value.trim();
  clearSearchBtn.classList.toggle('hidden', !searchQuery);
  renderClips();
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  clearSearchBtn.classList.add('hidden');
  renderClips();
  searchInput.focus();
});

// Clear all unpinned
clearAllBtn.addEventListener('click', async () => {
  if (allClips.length === 0) return;
  const hasPinned = allClips.some((c) => c.pinned);

  if (confirm(hasPinned ? 'Clear all unpinned clips?' : 'Clear all clips from history?')) {
    allClips = hasPinned ? allClips.filter((c) => c.pinned) : [];
    await chrome.storage.local.set({ clips: allClips });
    renderClips();
  }
});

// Auto-sync storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.clips) {
    allClips = changes.clips.newValue || [];
    renderClips();
  }
});

// Initial load + immediate system clipboard sync
loadClips().then(() => {
  syncFromSystemClipboard();
});
