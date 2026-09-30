# ClipBoarder - Multi-Item Clipboard History Extension

A Chrome extension that provides a persistent clipboard history and quick-paste utility (ideal for macOS users who want a native-feeling multi-entry clipboard history).

## Key Features

- **Shortcut Capture (`Alt + Shift + C` / `Option + Shift + C`)**: Select any text on a webpage or within inputs and press `Alt + Shift + C` to store it into your clipboard history.
- **Quick Paste (`Alt + Shift + V` / `Option + Shift + V`)**: Focus any text input, textarea, or content-editable field and press `Alt + Shift + V` to insert your most recent clip.
- **Open Clipboard Popup (`Alt + Shift + P` / `Option + Shift + P`)**: Instantly open the clipboard history popup from anywhere in Chrome.
- **Storage Capacity**: Stores up to **100 clips** by default, with pinned clips preserved at the top.
- **Interactive Popup**:
  - View all stored clippings with timestamps and character counts.
  - **Click to copy** any clipping back to your system clipboard.
  - **Paste directly** into active webpage fields via the "Paste" button.
  - **Pin clippings** so important snippets stay locked at the top.
  - **Search & filter** instantly through your saved clips.
  - **Delete or clear** clips as needed.
- **Visual Feedback**: Sleek, non-intrusive floating toast notifications and extension badge alerts when items are saved or pasted.
- **Manifest V3 Compliant**: Uses modern Chrome Extension APIs with local storage (`chrome.storage.local`).

## Keyboard Shortcuts

| Action | Shortcut (Mac) | Shortcut (Windows/Linux) | Description |
|---|---|---|---|
| **Open Clipboard Popup** | `Option + Shift + P` | `Alt + Shift + P` | Opens the full clipboard history popup |
| **Save selected text** | `Option + Shift + C` | `Alt + Shift + C` | Stores highlighted text into the history |
| **Paste most recent** | `Option + Shift + V` | `Alt + Shift + V` | Pastes the latest clip into the active input |

> You can customize any of these shortcuts anytime by visiting `chrome://extensions/shortcuts` in Chrome.
