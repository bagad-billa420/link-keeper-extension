const $ = (id) => document.getElementById(id);
let links = [];
let relatedMap = new Map(); // link id -> other links on the same site/page
let editingId = null;
let toastTimer;

// ---------- helpers ----------

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function parseTags(str) {
  return str
    .split(",")
    .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
    .filter(Boolean);
}

// Nickname if set, otherwise the title.
const label = (link) => link.nickname || link.title;

function toast(message, ms = 2200) {
  const el = $("toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), ms);
}

// ---------- data ----------

async function load() {
  links = await LinkStore.getLinks();
  relatedMap = new Map(links.map((l) => [l.id, LinkStore.sameSiteLinks(links, l)]));
  renderFolders();
  render();
}

async function updateLink(id, changes) {
  links = links.map((l) => (l.id === id ? { ...l, ...changes } : l));
  await LinkStore.setLinks(links);
  await load();
}

async function addAndRefresh(data) {
  try {
    const { duplicate, link, similar } = await LinkStore.addLink(data);
    await load();
    if (duplicate) {
      toast(`Already saved as “${label(link)}”`, 3500);
    } else if (similar.length) {
      const names = similar.slice(0, 2).map(label).join(", ");
      toast(`Saved. Similar to: ${names}`, 4000);
    } else {
      toast("Saved ✔");
    }
    return !duplicate;
  } catch (err) {
    toast(err.message, 3000);
    return false;
  }
}

// ---------- rendering ----------

function renderFolders() {
  const current = $("folderFilter").value;
  const folders = [...new Set(links.map((l) => l.folder).filter(Boolean))].sort();

  $("folderFilter").innerHTML =
    '<option value="">All folders</option>' +
    folders.map((f) => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join("");
  $("folderFilter").value = folders.includes(current) ? current : "";

  $("folderList").innerHTML = folders.map((f) => `<option value="${escapeHtml(f)}"></option>`).join("");
}

function filtered() {
  const q = $("search").value.trim().toLowerCase();
  const status = $("statusFilter").value;
  const folder = $("folderFilter").value;

  return links
    .filter((l) => {
      if (status === "to-visit" && l.status !== "to-visit") return false;
      if (status === "visited" && l.status !== "visited") return false;
      if (status === "pinned" && !l.pinned) return false;
      if (status === "similar" && !(relatedMap.get(l.id) || []).length) return false;
      if (folder && l.folder !== folder) return false;
      if (q) {
        const haystack = [l.nickname, l.title, l.url, l.notes, l.folder, ...(l.tags || [])]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    })
    .sort(
      (a, b) =>
        Number(!!b.pinned) - Number(!!a.pinned) || (b.createdAt || 0) - (a.createdAt || 0)
    );
}

function render() {
  const items = filtered();
  const list = $("list");
  list.innerHTML = "";
  items.forEach((link) => list.appendChild(renderItem(link)));

  $("empty").hidden = items.length > 0;

  const toVisit = links.filter((l) => l.status === "to-visit").length;
  $("stats").textContent = `${links.length} saved · ${toVisit} to visit`;
}

function renderItem(link) {
  if (editingId === link.id) return renderEditor(link);

  const li = document.createElement("li");
  li.className = "item" + (link.status === "visited" ? " visited" : "");

  const related = relatedMap.get(link.id) || [];
  const favicon = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(
    link.url
  )}&size=32`;

  const subtitle = link.nickname ? `<div class="sub">${escapeHtml(link.title)}</div>` : "";
  const folder = link.folder ? ` · 📁 ${escapeHtml(link.folder)}` : "";
  const badge = related.length
    ? `<span class="badge" title="${escapeHtml("Related: " + related.map(label).join(", "))}">≈ ${related.length}</span>`
    : "";
  const tags = link.tags?.length
    ? `<div class="tags">${link.tags.map((t) => `<span>#${escapeHtml(t)}</span>`).join("")}</div>`
    : "";
  const notes = link.notes ? `<div class="notes">${escapeHtml(link.notes)}</div>` : "";

  li.innerHTML = `
    <div class="item-main">
      <img class="fav" src="${favicon}" alt="" />
      <div class="text">
        <a class="title" href="${escapeHtml(link.url)}" title="${escapeHtml(link.url)}">${escapeHtml(label(link))}</a>
        ${subtitle}
        <div class="url">${escapeHtml(hostOf(link.url))}${folder} ${badge}</div>
        ${tags}
        ${notes}
      </div>
    </div>
    <div class="actions">
      <button data-act="pin" title="${link.pinned ? "Unpin" : "Pin to top"}">${link.pinned ? "★" : "☆"}</button>
      <button data-act="toggle" title="${link.status === "visited" ? "Mark as to visit" : "Mark as visited"}">${link.status === "visited" ? "↩" : "✓"}</button>
      <button data-act="edit" title="Edit nickname, tags and more">✎</button>
      <button data-act="delete" title="Delete">🗑</button>
    </div>`;

  li.querySelector(".fav").addEventListener("error", (e) => e.target.remove());

  // Clicking the title opens the link and marks it visited.
  li.querySelector(".title").addEventListener("click", async (e) => {
    e.preventDefault();
    await updateLink(link.id, { status: "visited", visitedAt: Date.now() });
    chrome.tabs.create({ url: link.url });
  });

  li.querySelectorAll("button[data-act]").forEach((btn) =>
    btn.addEventListener("click", () => handleAction(btn.dataset.act, link.id, btn))
  );

  return li;
}

function renderEditor(link) {
  const li = document.createElement("li");
  li.className = "item editing";
  li.innerHTML = `
    <div class="editor">
      <input data-field="nickname" placeholder="Nickname (short name)" maxlength="40" value="${escapeHtml(link.nickname || "")}" />
      <input data-field="title" placeholder="Title" value="${escapeHtml(link.title)}" />
      <input data-field="folder" placeholder="Folder" list="folderList" value="${escapeHtml(link.folder || "")}" />
      <input data-field="tags" placeholder="Tags, comma separated" value="${escapeHtml((link.tags || []).join(", "))}" />
      <textarea data-field="notes" rows="2" placeholder="Notes">${escapeHtml(link.notes || "")}</textarea>
      <div class="row">
        <button class="primary" data-save>Save changes</button>
        <button data-cancel>Cancel</button>
      </div>
    </div>`;

  const field = (name) => li.querySelector(`[data-field="${name}"]`).value;

  li.querySelector("[data-save]").addEventListener("click", async () => {
    editingId = null;
    await updateLink(link.id, {
      nickname: field("nickname").trim().slice(0, 40),
      title: field("title").trim() || link.url,
      folder: field("folder").trim(),
      tags: parseTags(field("tags")),
      notes: field("notes").trim()
    });
    toast("Updated ✔");
  });

  li.querySelector("[data-cancel]").addEventListener("click", () => {
    editingId = null;
    render();
  });

  return li;
}

// ---------- actions ----------

async function handleAction(act, id, btn) {
  const link = links.find((l) => l.id === id);
  if (!link) return;

  if (act === "pin") {
    return updateLink(id, { pinned: !link.pinned });
  }

  if (act === "toggle") {
    return updateLink(
      id,
      link.status === "visited"
        ? { status: "to-visit", visitedAt: null }
        : { status: "visited", visitedAt: Date.now() }
    );
  }

  if (act === "edit") {
    editingId = id;
    render();
    document.querySelector("#list .editor input")?.focus();
    return;
  }

  if (act === "delete") {
    // Two-step confirmation without using confirm() inside the popup.
    if (!btn.dataset.armed) {
      btn.dataset.armed = "1";
      btn.textContent = "Sure?";
      setTimeout(() => {
        delete btn.dataset.armed;
        btn.textContent = "🗑";
      }, 2500);
      return;
    }
    links = links.filter((l) => l.id !== id);
    await LinkStore.setLinks(links);
    await load();
    toast("Deleted");
  }
}

// ---------- event wiring ----------

// The tab waiting for a nickname before it is saved.
let pendingTab = null;

$("saveCurrent").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return toast("No active tab found");
  if (!LinkStore.parse(tab.url)) return toast("This page can't be saved");

  const key = LinkStore.canonicalUrl(tab.url);
  const exact = links.find((l) => LinkStore.canonicalUrl(l.url) === key);
  if (exact) return toast(`Already saved as “${label(exact)}”`, 3500);

  // Not saved yet: ask for a nickname first.
  pendingTab = tab;
  $("previewUrl").textContent = tab.url;
  $("quickNickname").value = "";
  $("quickSaveForm").hidden = false;
  $("saveCurrent").hidden = true;
  $("quickNickname").focus();
});

function closeQuickSave() {
  pendingTab = null;
  $("quickSaveForm").hidden = true;
  $("saveCurrent").hidden = false;
}

$("quickCancel").addEventListener("click", closeQuickSave);

$("quickSaveForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!pendingTab) return;
  const tab = pendingTab;
  const nickname = $("quickNickname").value;
  closeQuickSave();
  await addAndRefresh({ url: tab.url, title: tab.title, nickname });
});

$("addForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const saved = await addAndRefresh({
    url: $("url").value,
    nickname: $("nickname").value,
    title: $("title").value,
    folder: $("folder").value,
    tags: parseTags($("tags").value),
    notes: $("notes").value
  });
  if (saved) e.target.reset();
});

$("search").addEventListener("input", render);
$("statusFilter").addEventListener("change", render);
$("folderFilter").addEventListener("change", render);

$("random").addEventListener("click", async () => {
  const pool = links.filter((l) => l.status === "to-visit");
  if (!pool.length) return toast("Nothing left to visit 🎉");
  const pick = pool[Math.floor(Math.random() * pool.length)];
  await updateLink(pick.id, { status: "visited", visitedAt: Date.now() });
  chrome.tabs.create({ url: pick.url });
});

$("tidy").addEventListener("click", async () => {
  const { links: merged, removed } = LinkStore.mergeExactDuplicates(links);
  if (!removed) return toast("No exact duplicates found ✔");
  links = merged;
  await LinkStore.setLinks(links);
  await load();
  toast(`Merged ${removed} duplicate${removed === 1 ? "" : "s"}`);
});

$("exportBtn").addEventListener("click", () => {
  const payload = { app: "link-keeper", version: 2, exportedAt: new Date().toISOString(), links };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `link-keeper-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`Exported ${links.length} links`);
});

$("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const incoming = Array.isArray(data) ? data : data.links;
    if (!Array.isArray(incoming)) throw new Error("Not a Link Keeper file");

    const known = new Set(links.map((l) => LinkStore.canonicalUrl(l.url)));
    let added = 0;
    for (const item of incoming) {
      // Drop the old id so imported links never collide with existing ones.
      const link = LinkStore.makeLink({ ...item, id: undefined });
      if (!link) continue;
      const key = LinkStore.canonicalUrl(link.url);
      if (known.has(key)) continue;
      known.add(key);
      links.push(link);
      added++;
    }
    await LinkStore.setLinks(links);
    await load();
    toast(`Imported ${added} new link${added === 1 ? "" : "s"}`);
  } catch (err) {
    toast(err.message || "Import failed", 3000);
  } finally {
    e.target.value = "";
  }
});

load();
