// Popup UI Controller

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

// Render clips list based on current filters and search
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
      emptyState.querySelector('p').textContent = 'Try adjusting your search terms.';
    } else {
      emptyState.querySelector('h3').textContent = 'No clips yet';
      emptyState.querySelector('p').innerHTML = 'Select any text and press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> to save it here.';
    }
    return;
  }

  emptyState.classList.add('hidden');
  clipsList.innerHTML = '';

  // Sort pinned first, then by timestamp descending
  filtered.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.timestamp - a.timestamp;
  });

  filtered.forEach((clip) => {
    const card = document.createElement('div');
    card.className = `clip-card ${clip.pinned ? 'pinned' : ''}`;
    card.dataset.id = clip.id;

    const charCount = clip.text.length;
    const lineCount = clip.text.split('\n').length;
    const metaStats = `${charCount} chars${lineCount > 1 ? ` • ${lineCount} lines` : ''}`;

    card.innerHTML = `
      <div class="clip-content">${escapeHtml(clip.text)}</div>
      <div class="clip-meta">
        <span>${formatTime(clip.timestamp)} • ${metaStats}</span>
        <div class="clip-actions">
          <button class="btn-action paste" title="Paste into active webpage input">
            <span>Paste</span>
          </button>
          <button class="btn-action pin ${clip.pinned ? 'active' : ''}" title="${clip.pinned ? 'Unpin' : 'Pin to top'}">
            <span>${clip.pinned ? '📌 Pinned' : '📌 Pin'}</span>
          </button>
          <button class="btn-action delete" title="Delete clip">
            <span>🗑️</span>
          </button>
        </div>
      </div>
    `;

    // Clicking card body copies to clipboard
    card.addEventListener('click', async (e) => {
      // Ignore if clicking action buttons directly
      if (e.target.closest('.clip-actions')) return;

      await navigator.clipboard.writeText(clip.text);
      card.classList.add('flash-copied');
      const metaSpan = card.querySelector('.clip-meta span');
      const originalText = metaSpan.textContent;
      metaSpan.textContent = '✓ Copied to clipboard!';
      setTimeout(() => {
        metaSpan.textContent = originalText;
        card.classList.remove('flash-copied');
      }, 1000);
    });

    // Paste button action
    const pasteBtn = card.querySelector('.btn-action.paste');
    pasteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.runtime.sendMessage({
        action: 'PASTE_TO_ACTIVE_TAB',
        text: clip.text,
      }, (res) => {
        pasteBtn.innerHTML = '<span>✓ Done</span>';
        setTimeout(() => {
          pasteBtn.innerHTML = '<span>Paste</span>';
        }, 1200);
      });
    });

    // Pin button action
    const pinBtn = card.querySelector('.btn-action.pin');
    pinBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      clip.pinned = !clip.pinned;
      await chrome.storage.local.set({ clips: allClips });
      renderClips();
    });

    // Delete button action
    const deleteBtn = card.querySelector('.btn-action.delete');
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

// Search input handling
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

// Clear all clips button
clearAllBtn.addEventListener('click', async () => {
  if (allClips.length === 0) return;
  const hasPinned = allClips.some((c) => c.pinned);

  if (confirm(hasPinned ? 'Clear all unpinned clips?' : 'Clear all clips from history?')) {
    allClips = hasPinned ? allClips.filter((c) => c.pinned) : [];
    await chrome.storage.local.set({ clips: allClips });
    renderClips();
  }
});

// Auto-refresh when storage updates in the background
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.clips) {
    allClips = changes.clips.newValue || [];
    renderClips();
  }
});

// Initial load
loadClips();
