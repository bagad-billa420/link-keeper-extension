// Shared storage and link-matching logic. Used by popup.js and background.js.

// Query parameters that only track where a click came from, so they don't change the page.
const TRACKING_PARAMS = /^(utm_[a-z0-9_]+|fbclid|gclid|yclid|msclkid|mc_cid|mc_eid|igshid|si|ref|ref_src)$/i;

const LinkStore = {
  async getLinks() {
    const { links } = await chrome.storage.local.get("links");
    return Array.isArray(links) ? links : [];
  },

  async setLinks(links) {
    await chrome.storage.local.set({ links });
  },

  parse(raw) {
    try {
      const url = new URL(String(raw).trim());
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      return url;
    } catch {
      return null;
    }
  },

  // Host, path and hash. Ignores www., trailing slashes and index.html.
  // Links with the same siteKey are "related" (same site and page).
  siteKey(raw) {
    const url = LinkStore.parse(raw);
    if (!url) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = url.pathname.replace(/\/index\.html?$/i, "").replace(/\/+$/, "");
    // Many sites put the page inside the #hash (e.g. "#/course/42"), so the hash
    // is part of the address. Without it, different pages look like duplicates.
    const hash = url.hash.replace(/^#/, "").replace(/\/+$/, "");
    return host + path + (hash ? `#${hash}` : "");
  },

  // Strict key. Two links with the same key are exact duplicates.
  // Ignores http vs https, tracking parameters and query parameter order.
  canonicalUrl(raw) {
    const url = LinkStore.parse(raw);
    if (!url) return null;
    const params = [...url.searchParams.entries()]
      .filter(([key]) => !TRACKING_PARAMS.test(key))
      .map(([key, value]) => `${key}=${value}`)
      .sort();
    const query = params.length ? `?${params.join("&")}` : "";
    return LinkStore.siteKey(raw) + query;
  },

  makeLink(data) {
    const url = LinkStore.parse(data.url);
    if (!url) return null;
    return {
      id: data.id || crypto.randomUUID(),
      url: url.href,
      title: (data.title || "").trim() || url.href,
      nickname: (data.nickname || "").trim().slice(0, 40),
      folder: (data.folder || "").trim(),
      tags: Array.isArray(data.tags) ? data.tags : [],
      notes: (data.notes || "").trim(),
      status: data.status === "visited" ? "visited" : "to-visit",
      pinned: !!data.pinned,
      createdAt: data.createdAt || Date.now(),
      visitedAt: data.visitedAt || null
    };
  },

  // Other saved links on the same site and page (exact duplicates included).
  sameSiteLinks(links, link) {
    const site = LinkStore.siteKey(link.url);
    return links.filter((o) => o.id !== link.id && LinkStore.siteKey(o.url) === site);
  },

  // Returns { duplicate, link, similar }.
  // duplicate: an identical link already exists, so nothing is saved.
  // similar: saved links on the same site/page that differ in some detail.
  async addLink(data) {
    const link = LinkStore.makeLink(data);
    if (!link) throw new Error("Please enter a valid http:// or https:// link.");

    const links = await LinkStore.getLinks();
    const key = LinkStore.canonicalUrl(link.url);
    const exact = links.find((l) => LinkStore.canonicalUrl(l.url) === key);
    if (exact) return { duplicate: true, link: exact, similar: [] };

    const similar = LinkStore.sameSiteLinks(links, link);
    links.unshift(link);
    await LinkStore.setLinks(links);
    return { duplicate: false, link, similar };
  },

  // Merges exact duplicates into one entry, keeping the earliest one
  // and combining tags, notes, nickname, folder, pin and visited status.
  mergeExactDuplicates(links) {
    const groups = new Map();
    for (const l of links) {
      const key = LinkStore.canonicalUrl(l.url) || l.url;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(l);
    }

    const result = [];
    let removed = 0;
    for (const group of groups.values()) {
      if (group.length === 1) {
        result.push(group[0]);
        continue;
      }
      removed += group.length - 1;
      group.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      const keep = { ...group[0] };
      keep.tags = [...new Set(group.flatMap((l) => l.tags || []))];
      keep.nickname = keep.nickname || group.find((l) => l.nickname)?.nickname || "";
      keep.notes = keep.notes || group.find((l) => l.notes)?.notes || "";
      keep.folder = keep.folder || group.find((l) => l.folder)?.folder || "";
      keep.pinned = group.some((l) => l.pinned);
      if (group.some((l) => l.status === "visited")) {
        keep.status = "visited";
        keep.visitedAt = Math.max(...group.map((l) => l.visitedAt || 0)) || null;
      }
      result.push(keep);
    }
    result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return { links: result, removed };
  }
};
