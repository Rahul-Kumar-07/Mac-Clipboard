# ClipBoarder - Multi-Item Clipboard History Extension

A modern, glassmorphic Chrome extension that provides a persistent clipboard history, image support, webpage copy-button interception, PDF text capture, and seamless macOS clipboard integration.

---

## Key Features

- **Full Image & Text Clipboard Support:**
  - Automatically captures copied images (PNG, JPEG, WebP, screenshots) along with text.
  - Image cards display thumbnail previews with file sizes.
  - Clicking any image card or clicking "Copy" writes the actual image blob back to your macOS system clipboard so you can paste it with **`Cmd + V`** into Slack, Docs, Gmail, Figma, etc.
- **Webpage "Copy" Button Interception:**
  - Uses an in-page hook (`page_hook.js`) to intercept programmatic `navigator.clipboard.writeText(...)` calls from "Copy Code", "Copy Link", or markdown copy icons on websites.
  - Automatically saves the clicked code/link into ClipBoarder history with a confirmation toast.
- **PDF & Embedded Viewer Compatibility:**
  - When copying inside Chrome's built-in PDF viewer or shadow DOM where direct DOM selections are hidden, `Option + Shift + C` triggers a native copy command and synchronizes the text directly from the clipboard.
- **Auto-Sync on Popup Open:**
  - Whenever you open ClipBoarder (<kbd>Option</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>), it automatically inspects the system clipboard. Any new clipping copied from another application, PDF, or terminal is instantly added to the top of your history!
- **Liquid Glass / Glassmorphism Design:**
  - Frosted acrylic glass UI with backdrop blur (`backdrop-filter: blur(24px)`), specular border reflections, ambient refraction orbs, and fluid hover animations.
  - Native support for both macOS Dark Mode and Light Mode.
- **Direct Click-to-Paste & Mac Copy Button:**
  - Clicking a text card directly pastes it into the focused input and writes to system clipboard.
  - Dedicated green glass **Copy** button copies text or images directly for **`Cmd + V`**.
- **Persistent Storage & Pinning:**
  - Stores up to **100 clips** (with unlimited storage quota for images).
  - Pin clippings (`📌 Pin`) to keep them permanently locked at the top.
  - Real-time search across text and images (`image`, `screenshot`, keywords).

---

## Keyboard Shortcuts

| Action | Shortcut (Mac) | Shortcut (Windows/Linux) | Description |
|---|---|---|---|
| **Open Clipboard Popup** | `Option + Shift + P` | `Alt + Shift + P` | Instantly displays the clipboard history popup & syncs clipboard |
| **Save selected text/image** | `Option + Shift + C` | `Alt + Shift + C` | Stores highlighted text or PDF selection into history & Mac clipboard |
| **Paste most recent** | `Option + Shift + V` | `Alt + Shift + V` | Pastes the latest clip into the focused field |
| **Standard Paste** | `Cmd + V` | `Ctrl + V` | Pastes the active/last copied clip |

---

## Installation & Setup

1. Open Google Chrome.
2. Ensure you are using a **personal profile** or **Chrome Canary** (corporate managed profiles block unpacked extensions via policy).
3. Navigate to `chrome://extensions/`.
4. Turn on the **Developer mode** toggle in the top-right corner.
5. Click **Load unpacked** (top-left) and select the `clipboard_manager` directory.
6. Pin **ClipBoarder** (📋) to your toolbar for easy access.

---

## Project Structure

```
clipboard_manager/
├── manifest.json      # Manifest V3 configuration, permissions & shortcut commands
├── background.js      # Service worker managing storage, FIFO rotation, & badge updates
├── content.js         # In-page selection extractor, PDF fallback, image reader & glass toast
├── page_hook.js       # Main-world script intercepting page "Copy" button calls
├── popup.html         # Glassmorphic popup interface
├── popup.css          # Liquid glass styling, image previews, ambient glow orbs
├── popup.js           # History rendering, image blobs, direct click-paste, & clipboard sync
├── README.md          # Documentation & usage guide
└── icons/             # 16px, 48px, and 128px extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```
