# 🔖 Link Keeper
 
Link Keeper is a browser extension for saving website links, giving them nicknames, and opening them later. It keeps your list organized, flags links that point to the same page, and lets you back up or move your links with a single file.
 
It works in Chrome, Edge, and Brave (any Chromium-based browser that supports Manifest V3).
 
---
 
## Features
 
**Saving links**
- **Save current tab** with a nickname: click the button, give the link a short name, and save.
- **Keyboard shortcut** `Ctrl+Shift+S` (`Cmd+Shift+S` on Mac) saves the current tab instantly, without asking for a nickname.
- **Right-click menu**: right-click any link and choose *Save link to Link Keeper*, or right-click a page and choose *Save this page to Link Keeper*.
- **Manual entry**: add a link with a nickname, title, folder, tags, and notes.
**Organizing**
- **Nicknames** appear as the main label in your list. The full page title is shown underneath.
- **Folders** group links (for example *Work* or *Study*). Filter by folder from the dropdown.
- **Tags** are comma-separated. Tags are saved in lowercase, and a leading `#` is removed.
- **Notes** let you add a short description.
- **Pin** (☆ / ★) keeps important links at the top.
- **Edit** (✎) changes the nickname, title, folder, tags, and notes of any saved link.
**Finding and opening**
- **Search** looks through nicknames, titles, URLs, notes, folders, and tags.
- **Filters** show All links, To visit, Visited, Pinned, or Has similar links.
- **Click a title** to open the link. It is marked as visited automatically.
- **Mark visited / to visit** with the ✓ and ↩ buttons.
- **🎲 Random** opens a random link you haven't visited yet.
**Duplicates and similar links**
- **Exact duplicates** are not saved twice. If you try, the popup tells you which saved link it matches.
- **Similar links** (the same site and page, with some difference) are saved, and a **≈ N** badge shows how many related links exist. Hover over the badge to see their names.
- **🧹 Tidy** merges exact duplicates that were saved before duplicate detection improved. It keeps the oldest copy and combines the tags, notes, nickname, folder, pinned state, and visited status from the others.
**Backup and transfer**
- **Export** downloads all your links as a JSON file.
- **Import** adds links from a Link Keeper JSON file. Links you already have are skipped.
**Other**
- Delete requires two clicks (🗑 then *Sure?*) to prevent accidents.
- Favicons come from your browser, so website addresses are not sent to a third-party service.
- Light and dark mode follow your system setting.
---
 
## Installation
 
1. Download and unzip `link-keeper.zip`. You should have a `link-keeper` folder.
2. Open the extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
3. Turn on **Developer mode** (usually a switch in the top-right corner).
4. Click **Load unpacked** and select the `link-keeper` folder.
5. Pin the extension from the puzzle-piece menu so it's always visible.
### Updating
 
1. Replace the files in your `link-keeper` folder with the new version.
2. On the extensions page, click the **reload** icon on Link Keeper.
Your saved links are kept when you update.
 
---
 
## How links are compared
 
Link Keeper decides whether two links are the same page using these rules:
 
| Difference | Treated as the same page? |
|---|---|
| `http://` vs `https://` | Yes |
| `www.example.com` vs `example.com` | Yes |
| Trailing slash (`/page/` vs `/page`) | Yes |
| `index.html` at the end of the path | Yes |
| Tracking parameters (`utm_*`, `fbclid`, `gclid`, `ref`, `si`, and similar) | Yes |
| Order of query parameters (`?a=1&b=2` vs `?b=2&a=1`) | Yes |
| Hash route (`#/course/42` vs `#/course/43`) | **No**. Hash routes are often the real page address. |
| Different query values (`?page=2` vs `?page=3`) | Similar, not exact |
 
- **Exact duplicate**: nothing new is saved.
- **Similar link**: saved, and marked with a badge.
---
 
## Data and privacy
 
- All data is stored locally in your browser using `chrome.storage.local`. Nothing is sent to any server.
- Links are **not synced** between computers. Use Export and Import to move them.
- Link Keeper does not check whether links still work.
---
 
## Permissions
 
| Permission | Why it's needed |
|---|---|
| `storage` | Saves your links on your computer |
| `tabs` | Reads the current tab's title and address when you save it, and opens links |
| `contextMenus` | Adds the right-click save options |
| `favicon` | Shows each site's icon in the list |
 
---
 
## Project structure
 
```
link-keeper/
├── manifest.json   Extension settings, permissions, and keyboard shortcut
├── background.js   Right-click menu and keyboard shortcut handling
├── store.js        Saving, comparing, and merging links
├── popup.html      Popup layout
├── popup.css       Styles (light and dark mode)
├── popup.js        Popup behavior: list, search, filters, editing, import/export
└── README.md       This file
```
 
---
 
## Troubleshooting
 
**The popup says a page is "already saved" but it's a different page.**
Make sure you are running the latest version and have clicked reload on the extensions page. Earlier versions ignored the `#` part of some links.
 
**A link I saved is missing.**
If you pressed **Tidy** on an earlier version, it may have merged two links that were treated as the same. Save the missing link again.
 
**Keyboard shortcut does nothing.**
Check for a conflict at `chrome://extensions/shortcuts`, where you can set a different shortcut for Link Keeper.
 
**"This page can't be saved."**
Only `http://` and `https://` pages can be saved. Browser pages such as `chrome://` settings cannot.
 
**Import says "Not a Link Keeper file."**
Import only accepts JSON files created by Link Keeper's Export button.
 
---
 
## Limitations
 
- Chrome, Edge, and Brave only. Firefox needs small code changes.
- No cloud sync. Links stay on the computer where they were saved.
- No broken-link checking.
- The extension uses the default icon. You can add your own icon files later.
---
 
## Ideas for future versions
 
- Edit tags and notes from the list without opening the editor
- A full-page manager for large collections
- Cloud sync across devices
- A broken-link checker
- Reminders to revisit a link
- Shared collections
- A nickname prompt for the keyboard shortcut and right-click menu
- Firefox support
 
