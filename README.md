# ClipBoarder - Multi-Item Clipboard History Extension

A Chrome extension that provides a persistent clipboard history and quick-paste utility (ideal for macOS users who want a native-feeling multi-entry clipboard history).

## Key Features

- **Shortcut Capture (`Alt + Shift + C`)**: Select any text on a webpage or within inputs and press `Alt + Shift + C` to store it into your clipboard history.
- **Quick Paste (`Alt + Shift + V`)**: Focus any text input, textarea, or content-editable field and press `Alt + Shift + V` to insert your most recent clip.
- **Interactive Popup**:
  - View all stored clippings with timestamps and character counts.
  - **Click to copy** any clipping back to your system clipboard.
  - **Paste directly** into active webpage fields via the "Paste" button.
  - **Pin clippings** so important snippets stay locked at the top.
  - **Search & filter** instantly through your saved clips.
  - **Delete or clear** clips as needed.
- **Visual Feedback**: Sleek, non-intrusive floating toast notifications and extension badge alerts when items are saved or pasted.
- **Manifest V3 Compliant**: Uses modern Chrome Extension APIs with local storage (`chrome.storage.local`).

## Installation Instructions

1. Open Google Chrome.
2. Navigate to `chrome://extensions/` in the address bar.
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the extension directory:
   `/google/src/cloud/rrrahulkmrr/extension/google3/experimental/rrrahulkmrr/clipboard_manager`
6. Pin **ClipBoarder** to your Chrome toolbar for one-click access to your history.

## Keyboard Shortcuts

| Action | Shortcut | Description |
|---|---|---|
| **Save selected text** | `Alt + Shift + C` | Stores highlighted text into the history |
| **Paste most recent** | `Alt + Shift + V` | Pastes the latest clip into the active input |
| **Open History Popup** | Click toolbar icon | Opens full history, search, and pinned clips |
