// Popup UI Controller - Modern Liquid Glass Edition

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

// Escape HTML for safe rendering
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Render clips list
function renderClips() {
  const filtered = allClips.filter((clip) =>
    clip.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  clipCountBadge.textContent = `${allClips.length} ${allClips.length === 1 ? 'item' : 'items'}`;

  if (filtered.length === 0) {
    clipsList.innerHTML = '';
    emptyState.classList.remove('hidden');
    if (searchQuery) {
      emptyState.querySelector('h3').textContent = 'No matching clips';
      emptyState.querySelector('p').textContent = 'Try searching with different keywords.';
    } else {
      emptyState.querySelector('h3').textContent = 'No clips saved';
      emptyState.querySelector('p').innerHTML = 'Select any text and press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> to copy it to your clipboard history.';
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
    card.className = `clip-card ${clip.pinned ? 'pinned' : ''}`;
    card.dataset.id = clip.id;
    card.title = 'Click to paste directly into webpage & copy to Mac clipboard';

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
            <span>${clip.pinned ? '📌' : '📌'}</span>
          </button>
          <button class="glass-btn delete" title="Delete snippet">
            <span>🗑️</span>
          </button>
        </div>
      </div>
    `;

    // 1. CLICKING THE CARD BODY DIRECTLY PASTES AND COPIES
    card.addEventListener('click', async (e) => {
      if (e.target.closest('.clip-actions')) return;

      // Copy to Mac system clipboard so Cmd+V also works
      await navigator.clipboard.writeText(clip.text);

      // Directly paste into active input in web tab
      chrome.runtime.sendMessage({
        action: 'PASTE_TO_ACTIVE_TAB',
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

    // 2. PASTE BUTTON
    const pasteBtn = card.querySelector('.glass-btn.paste');
    pasteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(clip.text);
      chrome.runtime.sendMessage({
        action: 'PASTE_TO_ACTIVE_TAB',
        text: clip.text,
      });
      pasteBtn.innerHTML = '<span>✓ Done</span>';
      setTimeout(() => {
        pasteBtn.innerHTML = '<span>Paste</span>';
      }, 1200);
    });

    // 3. COPY BUTTON (Direct Mac copy for Cmd+V)
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

    // 4. PIN BUTTON
    const pinBtn = card.querySelector('.glass-btn.pin');
    pinBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      clip.pinned = !clip.pinned;
      await chrome.storage.local.set({ clips: allClips });
      renderClips();
    });

    // 5. DELETE BUTTON
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

loadClips();
