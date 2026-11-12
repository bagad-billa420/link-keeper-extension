importScripts("store.js");

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-link",
    title: "Save link to Link Keeper",
    contexts: ["link"]
  });
  chrome.contextMenus.create({
    id: "save-page",
    title: "Save this page to Link Keeper",
    contexts: ["page"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "save-link" && info.linkUrl) {
    await quickSave({ url: info.linkUrl, title: info.linkUrl });
  } else if (info.menuItemId === "save-page" && tab) {
    await quickSave({ url: tab.url, title: tab.title });
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "save-current-tab") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) await quickSave({ url: tab.url, title: tab.title });
});

async function quickSave(data) {
  try {
    const { duplicate } = await LinkStore.addLink(data);
    if (duplicate) flash("=", "#6b7280");
    else flash("✓", "#2e7d32");
  } catch {
    flash("!", "#c62828");
  }
}

// Briefly show a result on the extension icon badge.
function flash(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2000);
}
