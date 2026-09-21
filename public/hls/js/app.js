(() => {
  const expected = (window.HLS_CONFIG && window.HLS_CONFIG.accessToken) || "";
  const parts = location.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  let got = "";
  if (parts[0] === "hls" && parts[1] && parts[1].indexOf(".") === -1) got = parts[1];
  if (!got) got = new URLSearchParams(location.search).get("t") || "";
  if (!expected || got !== expected) return;

  const $ = (id) => document.getElementById(id);
  const app = $("app");
  app.hidden = false;

  const PREF = {
    theme: "hls.theme",
    measure: "hls.measure",
    size: "hls.size",
    lead: "hls.lead",
    justify: "hls.justify",
    nav: "hls.nav",
    refs: "hls.refLibrary",
    model: "hls.model",
  };

  const state = {
    store: "editing",
    view: "edit",
    tree: [],
    articles: [],
    permanent: [],
    selectedId: "",
    expanded: new Set(),
    search: "",
    dirty: false,
    saving: false,
    saveTimer: 0,
    saveSeq: 0,
    lastSaved: { title: "", body: "" },
    connected: true,
    prefs: {
      theme: document.documentElement.dataset.theme || "dark",
      measure: 64,
      size: 21,
      lead: 162,
      justify: true,
    },
    citeEl: null,
    refs: [],
    ai: { open: false, busy: false, messages: [], model: "", clips: [], turn: 0 },
  };

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  function readPref(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null || raw === "" ? fallback : raw;
    } catch (e) {
      return fallback;
    }
  }

  function writePref(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (e) {}
  }

  function compareNumbers(a, b) {
    const pa = String(a || "0").split(".").map(Number);
    const pb = String(b || "0").split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
      const d = (pa[i] || 0) - (pb[i] || 0);
      if (d) return d;
    }
    return 0;
  }

  function sortNodes(nodes) {
    (nodes || []).sort((a, b) => (a.sort_index || 0) - (b.sort_index || 0) || compareNumbers(a.number, b.number));
    (nodes || []).forEach((node) => sortNodes(node.children));
  }

  function treeFrom(articles) {
    const byId = {};
    (articles || []).forEach((row) => {
      byId[row.id] = Object.assign({}, row, { children: [] });
    });
    const roots = [];
    (articles || []).forEach((row) => {
      if (row.parent_id && byId[row.parent_id]) byId[row.parent_id].children.push(byId[row.id]);
      else roots.push(byId[row.id]);
    });
    sortNodes(roots);
    return roots;
  }

  function flatten(nodes, rows) {
    (nodes || []).forEach((node) => {
      rows.push(node);
      flatten(node.children, rows);
    });
    return rows;
  }

  function findNode(nodes, id) {
    for (const node of nodes || []) {
      if (node.id === id) return node;
      const hit = findNode(node.children, id);
      if (hit) return hit;
    }
    return null;
  }

  function articleById(id) {
    return findNode(state.tree, id) || state.articles.find((row) => row.id === id);
  }

  function kicker(article) {
    if (!article) return "";
    const n = article.number || "";
    return (article.depth || n.split(".").length) === 1 ? `Article ${n}` : `§ ${n}`;
  }

  function wordsOf(html) {
    const text = String(html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
    const parts = text.trim().match(/\S+/g);
    return parts ? parts.length : 0;
  }

  function applyType() {
    const root = document.documentElement;
    root.style.setProperty("--measure", state.prefs.measure + "ch");
    root.style.setProperty("--size", state.prefs.size + "px");
    root.style.setProperty("--lead", String(state.prefs.lead / 100));
    $("leafBody").classList.toggle("justify", state.prefs.justify);
    $("book").classList.toggle("justify", state.prefs.justify);
    $("rngMeasure").value = state.prefs.measure;
    $("rngSize").value = state.prefs.size;
    $("rngLead").value = state.prefs.lead;
    $("chkJustify").checked = state.prefs.justify;
    $("lblMeasure").textContent = state.prefs.measure + "ch";
    $("lblSize").textContent = state.prefs.size + "px";
    $("lblLead").textContent = (state.prefs.lead / 100).toFixed(2);
  }

  function setTheme(theme) {
    state.prefs.theme = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = state.prefs.theme;
    writePref(PREF.theme, state.prefs.theme);
    $("themeColor").setAttribute("content", state.prefs.theme === "light" ? "#e7e0d4" : "#0c0b0a");
    $("btnTheme").innerHTML = state.prefs.theme === "light"
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v2M12 19v2M5 12H3M21 12h-2M6.2 6.2 4.8 4.8M19.2 19.2l-1.4-1.4M17.8 6.2l1.4-1.4M4.8 19.2l1.4-1.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.7"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M16.2 13.2A6.2 6.2 0 0 1 10.8 4.5 7 7 0 1 0 19.5 13a6.1 6.1 0 0 1-3.3.2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
  }

  function setSave(kind, label) {
    $("saveDot").className = "dot " + kind;
    $("saveLabel").textContent = label;
  }

  let toastTimer = 0;
  function toast(msg) {
    const el = $("toast");
    el.hidden = false;
    el.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
  }

  function banner(msg) {
    $("banner").hidden = !msg;
    $("banner").textContent = msg || "";
  }

  function setNav(open) {
    $("shell").classList.toggle("nav-open", Boolean(open));
    $("btnMenu").classList.toggle("on", Boolean(open));
    $("btnMenu").setAttribute("aria-expanded", open ? "true" : "false");
    writePref(PREF.nav, open ? "open" : "closed");
  }

  function loadLibrary() {
    try {
      const raw = JSON.parse(localStorage.getItem(PREF.refs) || "[]");
      state.refs = Array.isArray(raw) ? raw.filter((row) => row && (row.url || row.title)) : [];
    } catch (e) {
      state.refs = [];
    }
    return state.refs;
  }

  function saveLibrary() {
    writePref(PREF.refs, JSON.stringify(state.refs || []));
  }

  function upsertRef(ref) {
    const url = String((ref && ref.url) || "").trim();
    const title = String((ref && ref.title) || "").trim() || url;
    if (!url && !title) return null;
    const existing = state.refs.find((row) => (url && row.url === url) || (ref.id && row.id === ref.id));
    if (existing) {
      if (title) existing.title = title;
      if (url) existing.url = url;
      saveLibrary();
      return existing;
    }
    const row = {
      id: (ref && ref.id) || ("ref-" + Math.random().toString(36).slice(2, 10)),
      title,
      url,
    };
    state.refs.unshift(row);
    saveLibrary();
    return row;
  }

  function harvestRefs(articles) {
    loadLibrary();
    (articles || []).forEach((article) => {
      const wrap = document.createElement("div");
      wrap.innerHTML = article.body || "";
      wrap.querySelectorAll("a.cite").forEach((a) => {
        const url = a.getAttribute("href") || "";
        if (!url || url === "#") return;
        upsertRef({
          id: a.getAttribute("data-ref-id") || "",
          title: a.getAttribute("title") || "",
          url,
        });
      });
    });
  }

  function usedCites() {
    return HlsEditor.collectCites($("leafBody")).filter((row) => row.href && row.href !== "#");
  }

  function syncRefsPanel() {
    const box = $("leafRefs");
    const items = usedCites().map((row) => ({
      n: row.n,
      title: row.title || row.href,
      url: row.href,
    }));
    if (!items.length) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    box.innerHTML = "<h3>References</h3><ol>" + items.map((item) => (
      `<li><a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.title)}</a></li>`
    )).join("") + "</ol>";
  }

  function closeCite() {
    $("citePop").hidden = true;
    state.citeEl = null;
  }

  function renderCiteHits(query) {
    const q = String(query || "").trim().toLowerCase();
    const rows = (state.refs || []).filter((row) => {
      if (!q) return true;
      return `${row.title} ${row.url}`.toLowerCase().includes(q);
    }).slice(0, 12);
    $("citeResults").innerHTML = rows.length
      ? rows.map((row) => (
        `<button type="button" class="cite-hit" data-id="${esc(row.id)}"><b>${esc(row.title || "Untitled")}</b><span>${esc(row.url || "")}</span></button>`
      )).join("")
      : `<div class="tree-empty">${q ? "No matching references." : "No saved references yet."}</div>`;
  }

  function placeCitePop(el) {
    const pop = $("citePop");
    const r = el.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 24);
    let left = r.left;
    if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
    if (left < 12) left = 12;
    let top = r.bottom + 8;
    pop.hidden = false;
    const h = pop.offsetHeight || 220;
    if (top + h > window.innerHeight - 12) top = Math.max(12, r.top - h - 8);
    pop.style.left = left + "px";
    pop.style.top = top + "px";
  }

  function openCite(el) {
    if (!el) return;
    loadLibrary();
    state.citeEl = el;
    $("citeNum").textContent = el.getAttribute("data-n") || "";
    $("citeSearch").value = "";
    $("citeTitle").value = el.getAttribute("title") || "";
    $("citeUrl").value = (el.getAttribute("href") || "").replace(/^#$/, "");
    renderCiteHits("");
    placeCitePop(el);
    setTimeout(() => $("citeSearch").focus(), 20);
  }

  function startCite() {
    if (state.store !== "editing" || !$("leafBody") || $("leaf").hidden) return;
    const el = HlsEditor.insertCite($("leafBody"));
    if (!el) return;
    openCite(el);
    scheduleSave();
  }

  function assignCite(ref) {
    if (!state.citeEl || !ref) return;
    const row = upsertRef(ref);
    HlsEditor.applyCite(state.citeEl, row);
    const n = state.citeEl.getAttribute("data-n") || "";
    syncRefsPanel();
    scheduleSave();
    closeCite();
    toast("Reference " + n + " linked");
  }

  function addCiteFromFields() {
    const title = $("citeTitle").value.trim();
    let url = $("citeUrl").value.trim();
    const q = $("citeSearch").value.trim();
    if (!url && /^https?:\/\//i.test(q)) url = q;
    if (!url && !title) return;
    if (!url) return;
    if (url && !/^https?:\/\//i.test(url) && !url.startsWith("#")) url = "https://" + url;
    assignCite({
      title: title || url,
      url: url || "#",
    });
  }

  function setAi(open) {
    state.ai.open = Boolean(open);
    $("shell").classList.toggle("ai-open", state.ai.open);
    $("btnAi").classList.toggle("on", state.ai.open);
    $("btnAi").setAttribute("aria-expanded", state.ai.open ? "true" : "false");
    if (state.ai.open) setTimeout(() => $("aiPrompt").focus(), 40);
  }

  function newAiChat() {
    state.ai.turn += 1;
    state.ai.busy = false;
    state.ai.messages = [];
    state.ai.clips = [];
    $("aiPrompt").value = "";
    $("aiSend").disabled = false;
    renderAiClips();
    renderAiLog();
    $("aiPrompt").focus();
  }

  function lineCount(text) {
    const t = String(text || "").trim();
    if (!t) return 0;
    const hard = t.split(/\n/).length;
    const est = Math.max(1, Math.ceil(t.length / 68));
    return Math.max(hard, est);
  }

  function clipLabel(clip) {
    const n = clip.lines || 1;
    const metric = n === 1 ? "1 line" : n + " lines";
    return (clip.where ? clip.where + " · " : "") + metric;
  }

  function clipBody(clip) {
    return (clip.where ? `From ${clip.where}:\n\n` : "") + `"${clip.text}"`;
  }

  function renderAiClips() {
    const box = $("aiClips");
    const clips = state.ai.clips || [];
    if (!clips.length) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    box.innerHTML = clips.map((clip) => (
      `<span class="ai-clip-wrap">` +
      `<a class="ai-clip" href="${esc(clip.href || "#passage")}" data-id="${esc(clip.id)}" title="${esc(clip.text.slice(0, 240))}">${esc(clipLabel(clip))}</a>` +
      `<button type="button" class="ai-clip-remove" data-id="${esc(clip.id)}" aria-label="Remove passage">×</button>` +
      `</span>`
    )).join("");
  }

  function dropSelectionIntoPrompt() {
    const sel = window.getSelection();
    const text = sel && sel.rangeCount ? String(sel.toString() || "").trim() : "";
    if (!text) {
      toast("Highlight a passage first");
      return;
    }
    const article = articleById(state.selectedId);
    const where = article ? `${kicker(article)} ${article.title || ""}`.trim() : "";
    if (state.ai.clips.some((clip) => clip.text === text && clip.where === where)) {
      setAi(true);
      return;
    }
    state.ai.clips.push({
      id: "clip-" + Math.random().toString(36).slice(2, 8),
      where,
      text,
      lines: lineCount(text),
      href: article ? "#article-" + article.number : "#",
    });
    renderAiClips();
    setAi(true);
    $("aiPrompt").focus();
  }

  function paintMarkdown(el, text) {
    const raw = String(text || "");
    if (!el) return;
    if (!raw.trim()) {
      el.textContent = "";
      return;
    }
    if (typeof marked === "undefined" || typeof DOMPurify === "undefined") {
      el.textContent = raw;
      return;
    }
    try {
      marked.setOptions({ gfm: true, breaks: true });
      el.innerHTML = DOMPurify.sanitize(marked.parse(raw), {
        USE_PROFILES: { html: true },
        ADD_ATTR: ["target", "rel"],
      });
      el.querySelectorAll('a[href^="http"]').forEach((a) => {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      });
    } catch (err) {
      el.textContent = raw;
    }
  }

  function scheduleMarkdown(el, getText) {
    if (!el) return;
    if (el._mdTimer) return;
    el._mdTimer = setTimeout(() => {
      el._mdTimer = null;
      paintMarkdown(el, typeof getText === "function" ? getText() : getText);
    }, 50);
  }

  function isHttpUrl(s) {
    try {
      const u = new URL(String(s || ""));
      return u.protocol === "http:" || u.protocol === "https:";
    } catch (err) {
      return false;
    }
  }

  function toolLabel(name) {
    const labels = {
      web_search: "Web search",
      web_fetch: "Open page",
      image_search: "Image search",
    };
    return labels[name] || name || "Tool";
  }

  function hintFromArgs(args) {
    if (!args || typeof args !== "object") return "";
    return String(args.about || args.query || args.q || args.url || "").trim();
  }

  function renderImageGallery(parent, images) {
    if (!parent || !Array.isArray(images) || !images.length) return;
    const gal = document.createElement("div");
    gal.className = "img-gallery";
    images.slice(0, 8).forEach((item) => {
      if (!item || typeof item !== "object") return;
      const thumb = String(item.thumbnail || item.image_url || "").trim();
      const href = String(item.page_url || item.url || item.image_url || thumb).trim();
      if (!isHttpUrl(thumb)) return;
      const a = document.createElement("a");
      a.className = "img-tile";
      a.href = isHttpUrl(href) ? href : thumb;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.title = item.title || item.source || "";
      const img = document.createElement("img");
      img.src = thumb;
      img.alt = item.title || "image";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      a.appendChild(img);
      const cap = document.createElement("span");
      cap.className = "img-cap";
      cap.textContent = item.source || item.title || "";
      a.appendChild(cap);
      gal.appendChild(a);
    });
    if (gal.childElementCount) parent.appendChild(gal);
  }

  function renderArticleCards(parent, articles) {
    if (!parent || !Array.isArray(articles) || !articles.length) return;
    const wrap = document.createElement("div");
    wrap.className = "article-cards";
    const rows = articles.slice(0, 3);
    const heroIdx = rows.findIndex((item) => isHttpUrl(item && (item.thumbnail || item.image_url)));
    rows.forEach((item, i) => {
      if (!item || typeof item !== "object") return;
      const href = String(item.url || item.page_url || "").trim();
      const thumb = String(item.thumbnail || item.image_url || "").trim();
      const card = document.createElement(isHttpUrl(href) ? "a" : "div");
      card.className = "article-card";
      if (i === (heroIdx >= 0 ? heroIdx : 0) && isHttpUrl(thumb)) card.classList.add("hero");
      if (!isHttpUrl(thumb)) card.classList.add("no-thumb");
      if (card.tagName === "A") {
        card.href = href;
        card.target = "_blank";
        card.rel = "noopener noreferrer";
      }
      if (isHttpUrl(thumb)) {
        const media = document.createElement("div");
        media.className = "article-thumb";
        const img = document.createElement("img");
        img.src = thumb;
        img.alt = item.title || "Article";
        img.loading = "lazy";
        img.referrerPolicy = "no-referrer";
        img.addEventListener("error", () => {
          media.remove();
          card.classList.remove("hero");
          card.classList.add("no-thumb");
        });
        media.appendChild(img);
        card.appendChild(media);
      }
      const body = document.createElement("div");
      body.className = "article-body";
      const kicker = document.createElement("div");
      kicker.className = "article-kicker";
      kicker.textContent = item.source || (item.number ? "Article " + item.number : "Source");
      body.appendChild(kicker);
      const title = document.createElement("div");
      title.className = "article-title";
      title.textContent = item.title || href || "Article";
      body.appendChild(title);
      if (item.snippet || item.body) {
        const snip = document.createElement("div");
        snip.className = "article-snip";
        snip.textContent = item.snippet || String(item.body || "").replace(/<[^>]+>/g, " ").trim();
        body.appendChild(snip);
      }
      card.appendChild(body);
      wrap.appendChild(card);
    });
    if (wrap.childElementCount) parent.appendChild(wrap);
  }

  function chatToolStart(msg, row) {
    if (!msg || !msg._tools) return;
    msg._tools.hidden = false;
    const name = row.name || "tool";
    const el = document.createElement("div");
    el.className = "tool-row running";
    el.innerHTML =
      '<span class="tool-dot"></span>' +
      '<div class="tool-main"><div class="tool-name"></div><div class="tool-detail"></div></div>' +
      '<span class="tool-status">Working</span>';
    el.querySelector(".tool-name").textContent = toolLabel(name);
    const detailEl = el.querySelector(".tool-detail");
    let detail = hintFromArgs(row.arguments);
    if (!detail && name === "web_fetch") detail = "Reading page…";
    if (!detail && name === "web_search") detail = "Searching…";
    if (!detail && name === "image_search") detail = "Finding pictures…";
    if (detail) detailEl.textContent = detail;
    else detailEl.remove();
    el.dataset.arg = detail || "";
    msg._tools.appendChild(el);
    const stack = msg._pendingTools.get(name) || [];
    stack.push(el);
    msg._pendingTools.set(name, stack);
  }

  function chatToolDone(msg, row) {
    if (!msg || !msg._pendingTools) return;
    const name = row.name || "tool";
    const stack = msg._pendingTools.get(name) || [];
    let el = stack.pop();
    const ok = row.ok !== false;
    if (!el) {
      chatToolStart(msg, row);
      el = (msg._pendingTools.get(name) || []).pop();
    }
    if (!el) return;
    el.classList.remove("running");
    el.classList.add(ok ? "ok" : "fail");
    const status = el.querySelector(".tool-status");
    if (status) status.textContent = ok ? "Done" : "Failed";
    const detailEl = el.querySelector(".tool-detail") || (() => {
      const d = document.createElement("div");
      d.className = "tool-detail";
      el.querySelector(".tool-main").appendChild(d);
      return d;
    })();
    const arg = el.dataset.arg || hintFromArgs(row.arguments);
    detailEl.textContent = [arg, row.summary].filter(Boolean).join("\n");
    if (ok && Array.isArray(row.articles) && row.articles.length) {
      renderArticleCards(msg._tools, row.articles);
    }
    if (ok && Array.isArray(row.images) && row.images.length) {
      renderImageGallery(msg._tools, row.images);
    }
  }

  function buildUserBubble(msg) {
    const wrap = document.createElement("div");
    wrap.className = "ai-msg user";
    (msg.clips || []).forEach((clip) => {
      const a = document.createElement("a");
      a.className = "ai-clip";
      a.href = clip.href || "#";
      a.title = (clip.text || "").slice(0, 240);
      a.textContent = clipLabel(clip);
      wrap.appendChild(a);
    });
    const question = msg.question || (!msg.clips || !msg.clips.length ? msg.content : "");
    if (question) {
      const q = document.createElement("div");
      q.className = "ai-q";
      q.textContent = question;
      wrap.appendChild(q);
    }
    return wrap;
  }

  function buildBotBubble(msg) {
    const wrap = document.createElement("div");
    wrap.className = "ai-msg bot" + (msg.err ? " err" : "");
    const tools = document.createElement("div");
    tools.className = "tool-log";
    tools.hidden = true;
    wrap.appendChild(tools);
    wrap._tools = tools;
    wrap._pendingTools = new Map();
    (msg.tools || []).forEach((row) => {
      chatToolStart(wrap, row);
      if (row.status && row.status !== "running") chatToolDone(wrap, row);
    });
    const body = document.createElement("div");
    body.className = "ai-md";
    wrap.appendChild(body);
    wrap._body = body;
    if (msg.content) paintMarkdown(body, msg.content);
    return wrap;
  }

  function renderAiLog() {
    const log = $("aiLog");
    log.innerHTML = "";
    if (!(state.ai.messages || []).length) {
      log.innerHTML = `<div class="tree-empty">Ask the model. It can search the web, pull sources, and show previews — same as LifeOS.</div>`;
      return;
    }
    state.ai.messages.forEach((msg) => {
      log.appendChild(msg.role === "user" ? buildUserBubble(msg) : buildBotBubble(msg));
    });
    log.scrollTop = log.scrollHeight;
  }

  function fillModels(models) {
    const sel = $("aiModel");
    const names = (models || []).map((row) => row.name || row).filter(Boolean);
    sel.innerHTML = names.map((name) => `<option value="${esc(name)}">${esc(name)}</option>`).join("");
    const saved = readPref(PREF.model, "") || state.ai.model;
    if (saved && names.includes(saved)) sel.value = saved;
    else if (names[0]) sel.value = names[0];
    state.ai.model = sel.value;
  }

  async function sendAi() {
    const question = $("aiPrompt").value.trim();
    const clips = (state.ai.clips || []).slice();
    if ((!question && !clips.length) || state.ai.busy) return;
    const turn = state.ai.turn;
    state.ai.busy = true;
    $("aiSend").disabled = true;
    const content = [clips.map(clipBody).join("\n\n"), question].filter(Boolean).join("\n\n");
    state.ai.messages.push({ role: "user", content, question, clips });
    const bot = { role: "bot", content: "", tools: [] };
    state.ai.messages.push(bot);
    $("aiPrompt").value = "";
    state.ai.clips = [];
    renderAiClips();
    renderAiLog();
    const wrap = $("aiLog").querySelector(".ai-msg.bot:last-child");
    const history = state.ai.messages.slice(0, -1).map((msg) => ({
      role: msg.role === "bot" ? "assistant" : "user",
      content: msg.content,
    }));
    try {
      const res = await HlsAPI.ollamaStream({
        model: $("aiModel").value || state.ai.model,
        messages: history,
        article_id: state.selectedId,
        include_tree: true,
        whole: $("aiWhole").checked,
        store: state.store,
      });
      if (!res.ok) throw new Error("Chat failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      const handle = (ev) => {
        if (turn !== state.ai.turn) return;
        if (!ev || typeof ev !== "object") return;
        if (ev.type === "tool_start") {
          bot.tools.push({ name: ev.name, arguments: ev.arguments || {}, status: "running" });
          chatToolStart(wrap, ev);
          $("aiLog").scrollTop = $("aiLog").scrollHeight;
          return;
        }
        if (ev.type === "tool_done") {
          const last = [...bot.tools].reverse().find((t) => t.name === ev.name && t.status === "running");
          if (last) Object.assign(last, ev, { status: ev.ok === false ? "fail" : "ok" });
          else bot.tools.push(Object.assign({ status: ev.ok === false ? "fail" : "ok" }, ev));
          chatToolDone(wrap, ev);
          $("aiLog").scrollTop = $("aiLog").scrollHeight;
          return;
        }
        if (ev.type === "token") bot.content += ev.text || "";
        else if (ev.type === "done" && ev.reply) bot.content = ev.reply;
        else if (ev.type === "error") {
          bot.content = ev.error || "Chat failed";
          bot.err = true;
        } else bot.content += (ev.message && ev.message.content) || ev.response || "";
        scheduleMarkdown(wrap && wrap._body, () => bot.content || "…");
        $("aiLog").scrollTop = $("aiLog").scrollHeight;
      };
      while (true) {
        if (turn !== state.ai.turn) return;
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const part of parts) {
          const line = part.replace(/^data:\s*/, "").trim();
          if (!line) continue;
          try { handle(JSON.parse(line)); } catch (e) {}
        }
      }
      if (turn !== state.ai.turn) return;
      if (buf.trim()) {
        const line = buf.replace(/^data:\s*/, "").trim();
        if (line) {
          try { handle(JSON.parse(line)); } catch (e) {}
        }
      }
      if (!bot.content) bot.content = "No reply.";
      renderAiLog();
    } catch (err) {
      if (turn !== state.ai.turn) return;
      bot.content = (err && err.message) || "Could not reach Ollama.";
      bot.err = true;
      renderAiLog();
    } finally {
      if (turn === state.ai.turn) {
        state.ai.busy = false;
        $("aiSend").disabled = false;
      }
    }
  }

  function applyStore(data, store) {
    const articles = (data && data.articles) || [];
    const tree = treeFrom(articles);
    if (store === state.store) {
      state.articles = articles;
      state.tree = tree;
    }
    if (store === "permanent") state.permanent = articles;
    harvestRefs(articles);
    return tree;
  }

  function publishedMap() {
    const map = {};
    state.permanent.forEach((row) => {
      map[row.number] = row;
      if (row.source_id) map["src:" + row.source_id] = row;
    });
    return map;
  }

  function isStale(article, pub) {
    if (!pub) return true;
    const a = new Date(article.updated_at || 0).getTime();
    const b = new Date(pub.updated_at || pub.published_at || 0).getTime();
    if (!a) return false;
    return a > b + 500 || String(article.title) !== String(pub.title) || String(article.body || "") !== String(pub.body || "");
  }

  function matchesSearch(node) {
    const q = state.search.trim().toLowerCase();
    if (!q) return true;
    const hit = (row) => `${row.number} ${row.title}`.toLowerCase().includes(q);
    if (hit(node)) return true;
    return (node.children || []).some(matchesSearch);
  }

  function renderTree() {
    const root = $("tree");
    const nodes = state.tree.filter(matchesSearch);
    if (!nodes.length) {
      root.innerHTML = `<div class="tree-empty">${state.search ? "No matching articles." : (state.store === "editing" ? "No drafts yet. Begin Article 1." : "The archive is empty.")}</div>`;
      return;
    }
    const pub = publishedMap();
    const html = [];
    const walk = (list) => {
      list.forEach((node) => {
        if (!matchesSearch(node)) return;
        const kids = node.children || [];
        const open = state.expanded.has(node.id) || Boolean(state.search);
        const pad = 8 + Math.max(0, (node.depth || 1) - 1) * 14;
        const published = pub[node.number] || pub["src:" + node.id];
        const stale = state.store === "editing" && isStale(node, published);
        html.push(
          `<div role="treeitem" aria-selected="${node.id === state.selectedId}">` +
          `<button type="button" class="row${node.id === state.selectedId ? " on" : ""}" data-id="${esc(node.id)}" style="padding-left:${pad}px">` +
          `<span class="twist${kids.length ? "" : " leaf"}" data-twist="${esc(node.id)}">${kids.length ? (open ? "▾" : "▸") : "·"}</span>` +
          `<span class="num">${esc(node.number)}</span>` +
          `<span class="name">${esc(node.title || "Untitled")}</span>` +
          `${stale ? '<span class="stale" title="Unpublished changes"></span>' : ""}` +
          `</button>`
        );
        if (kids.length && open) walk(kids);
        html.push("</div>");
      });
    };
    walk(nodes);
    root.innerHTML = html.join("");
  }

  function renderBook(nodes) {
    const out = [];
    const walk = (list) => {
      list.forEach((node) => {
        out.push(
          `<section class="chapter d${node.depth || 1}">` +
          `<p class="leaf-kicker">${esc(kicker(node))}</p>` +
          `<h2 class="leaf-title">${esc(node.title || "Untitled")}</h2>` +
          `<div class="leaf-body">${HlsEditor.toHTML(node.body)}</div>` +
          `</section>`
        );
        walk(node.children || []);
      });
    };
    const start = state.selectedId ? [findNode(state.tree, state.selectedId)].filter(Boolean) : nodes;
    walk(start.length ? start : nodes);
    return out.join("") || `<div class="empty"><b>Nothing to set.</b>Select an article or write one first.</div>`;
  }

  function currentDraft() {
    const items = usedCites().map((row) => ({ n: row.n, title: row.title || row.href, url: row.href }));
    return {
      title: $("leafTitle").innerText.replace(/\s+/g, " ").trim(),
      body: HlsEditor.joinRefs(HlsEditor.sanitize($("leafBody").innerHTML), items),
    };
  }

  function updateMeta(article) {
    const n = flatten(state.tree, []).length;
    $("metaWhere").textContent = state.store === "editing" ? "Drafts" : "Archive";
    $("metaCount").textContent = n ? n + (n === 1 ? " article" : " articles") : "";
    $("metaWords").textContent = article ? wordsOf(article.body || $("leafBody").innerHTML) + " words" : "";
    $("metaTime").textContent = article && article.updated_at
      ? "Saved " + new Date(article.updated_at.replace(" ", "T")).toLocaleString()
      : "";
  }

  function showEditor(article) {
    const canEdit = state.store === "editing";
    $("toolbar").hidden = !(canEdit && state.view === "edit" && article);
    $("btnPublish").disabled = !canEdit || !state.articles.length;
    $("btnDelete").hidden = !canEdit || !article;
    $("btnChild").disabled = !canEdit || !article;
    $("btnNew").disabled = !canEdit;
    $("navFoot").style.display = canEdit ? "grid" : "none";

    if (state.view === "book") {
      $("empty").hidden = true;
      $("leaf").hidden = true;
      $("book").hidden = false;
      $("book").innerHTML = renderBook(state.tree);
      updateMeta(article);
      return;
    }

    $("book").hidden = true;
    $("empty").hidden = Boolean(article);
    $("leaf").hidden = !article;

    if (!article) {
      const empty = $("empty");
      if (state.store === "editing") {
        empty.innerHTML = `<b>The archive is waiting.</b>Begin with Article 1 — a heading for a body of doctrine.<br><button type="button" id="emptyNew">New article</button>${state.permanent.length ? '<div style="margin-top:18px"><button type="button" class="text-btn" id="emptyImport">Load archive into drafts</button></div>' : ""}`;
      } else {
        empty.innerHTML = `<b>The permanent record is empty.</b>Publish a draft to write it here.`;
      }
      updateMeta(null);
      return;
    }

    $("leafKicker").textContent = kicker(article);
    $("leafTitle").innerText = article.title || "";
    $("leafBody").innerHTML = HlsEditor.toHTML(HlsEditor.splitRefs(article.body));
    HlsEditor.convertDeepLists($("leafBody"));
    $("leafTitle").contentEditable = canEdit ? "true" : "false";
    $("leafBody").contentEditable = canEdit ? "true" : "false";
    syncRefsPanel();
    const live = currentDraft();
    state.lastSaved = { title: live.title, body: live.body };
    state.dirty = false;
    updateMeta(article);
  }

  function select(id, opts) {
    const article = articleById(id);
    if (!article) {
      state.selectedId = "";
      showEditor(null);
      renderTree();
      return;
    }
    const already = state.selectedId === article.id && state.view === "edit";
    state.selectedId = article.id;
    if (article.children && article.children.length) state.expanded.add(article.id);
    let node = article;
    while (node && node.parent_id) {
      state.expanded.add(node.parent_id);
      node = articleById(node.parent_id);
    }
    if ((!opts || !opts.keep) && (!already || (opts && opts.force))) showEditor(article);
    renderTree();
  }

  function collectPayload() {
    const live = currentDraft();
    return {
      id: state.selectedId,
      title: live.title || "Untitled",
      body: live.body,
    };
  }

  async function saveNow(reason) {
    if (state.store !== "editing" || !state.selectedId) return;
    const payload = collectPayload();
    if (payload.title === state.lastSaved.title && payload.body === state.lastSaved.body) {
      state.dirty = false;
      setSave("saved", reason === "auto" ? "Saved" : "Saved");
      return;
    }
    const seq = ++state.saveSeq;
    state.saving = true;
    setSave("saving", "Saving…");
    try {
      const data = await HlsAPI.saveEditing(payload);
      if (seq !== state.saveSeq) return;
      applyStore(data, "editing");
      const article = data.article || articleById(state.selectedId);
      state.lastSaved = { title: payload.title, body: payload.body };
      state.dirty = false;
      setSave("saved", "Saved");
      if (article) {
        $("leafKicker").textContent = kicker(article);
        updateMeta(article);
      }
      renderTree();
    } catch (err) {
      if (seq !== state.saveSeq) return;
      setSave("error", (err && err.message) || "Save failed");
      banner("Autosave failed. Check the tunnel.");
    } finally {
      if (seq === state.saveSeq) state.saving = false;
    }
  }

  function scheduleSave() {
    if (state.store !== "editing" || !state.selectedId) return;
    state.dirty = true;
    setSave("saving", "Editing…");
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => saveNow("auto"), 700);
    updateMeta(articleById(state.selectedId));
  }

  async function flushSave() {
    clearTimeout(state.saveTimer);
    if (state.dirty) await saveNow("flush");
  }

  async function refresh(store) {
    const which = store || state.store;
    const data = which === "permanent"
      ? await HlsAPI.retrievePermanent()
      : await HlsAPI.retrieveEditing();
    applyStore(data, which);
    if (which === "editing") {
      try { applyStore(await HlsAPI.retrievePermanent(), "permanent"); } catch (e) {}
    }
    if (state.selectedId && !articleById(state.selectedId)) state.selectedId = "";
    const first = flatten(state.tree, [])[0];
    const id = state.selectedId || (first && first.id) || "";
    if (id) select(id, { force: true });
    else {
      showEditor(null);
      renderTree();
    }
  }

  function modal(opts) {
    return new Promise((resolve) => {
      const box = $("modal");
      $("modalTitle").textContent = opts.title || "";
      $("modalBody").textContent = opts.body || "";
      $("modalOk").textContent = opts.ok || "Confirm";
      const input = $("modalInput");
      input.hidden = !opts.input;
      input.value = opts.value || "";
      box.hidden = false;
      if (opts.input) setTimeout(() => { input.focus(); input.select(); }, 20);
      const done = (value) => {
        box.hidden = true;
        $("modalOk").onclick = null;
        $("modalCancel").onclick = null;
        input.onkeydown = null;
        resolve(value);
      };
      $("modalCancel").onclick = () => done(null);
      $("modalOk").onclick = () => done(opts.input ? input.value : true);
      input.onkeydown = (e) => {
        if (e.key === "Enter") done(input.value);
        if (e.key === "Escape") done(null);
      };
    });
  }

  async function createArticle(parent) {
    const title = await modal({
      title: parent ? "New sub-article" : "New article",
      body: parent ? `Nested under ${parent.number} ${parent.title}.` : "This becomes the next root article.",
      input: true,
      value: "",
      ok: "Create",
    });
    if (title == null) return;
    const name = String(title).trim() || "Untitled";
    await flushSave();
    const data = parent
      ? await HlsAPI.createSubArticle(parent, { title: name, body: "" })
      : await HlsAPI.createArticle({ title: name, body: "" });
    applyStore(data, "editing");
    if (parent) state.expanded.add(parent.id);
    const created = data.article;
    toast((created && created.number ? created.number + " " : "") + name);
    if (created) select(created.id);
    else await refresh("editing");
  }

  async function deleteSelected() {
    const article = articleById(state.selectedId);
    if (!article) return;
    const ok = await modal({
      title: `Delete ${article.number}?`,
      body: `“${article.title}” and its descendants will be removed from drafts. The permanent archive is untouched.`,
      ok: "Delete",
    });
    if (!ok) return;
    const parentId = article.parent_id;
    await HlsAPI.deleteEditing({ id: article.id });
    await refresh("editing");
    if (parentId && articleById(parentId)) select(parentId);
    else {
      const first = flatten(state.tree, [])[0];
      if (first) select(first.id);
    }
    toast("Deleted from drafts");
  }

  async function importArchive() {
    const ok = await modal({
      title: "Load archive into drafts?",
      body: "Copies the permanent record into the editing database so you can revise it.",
      ok: "Copy",
    });
    if (!ok) return;
    const data = await HlsAPI.retrievePermanent();
    const rows = ((data && data.articles) || []).slice().sort((a, b) => compareNumbers(a.number, b.number));
    const map = {};
    let last = null;
    for (const row of rows) {
      const payload = { title: row.title || "Untitled", body: row.body || "" };
      if (row.parent_id && map[row.parent_id]) payload.parent_id = map[row.parent_id];
      const saved = await HlsAPI.saveEditing(payload);
      if (saved.article) {
        map[row.id] = saved.article.id;
        last = saved.article;
        applyStore(saved, "editing");
      }
    }
    if (last) select(flatten(state.tree, [])[0].id);
    toast("Archive copied into drafts");
  }

  async function publish(mode) {
    if (state.store !== "editing") return;
    await flushSave();
    const article = articleById(state.selectedId);
    $("btnPublish").disabled = true;
    setSave("saving", "Publishing…");
    try {
      if (mode === "all") {
        const ok = await modal({
          title: "Publish entire archive?",
          body: "Every draft article is written into the permanent record.",
          ok: "Publish all",
        });
        if (!ok) {
          $("btnPublish").disabled = false;
          setSave("saved", "Saved");
          return;
        }
        await HlsAPI.publishAll();
      } else if (mode === "tree" && article) {
        const walk = async (node) => {
          await HlsAPI.publishPermanent({ id: node.id });
          for (const child of node.children || []) await walk(child);
        };
        await walk(article);
      } else if (article) {
        await HlsAPI.publishPermanent({ id: article.id });
      } else {
        throw new Error("Select an article first");
      }
      try { applyStore(await HlsAPI.retrievePermanent(), "permanent"); } catch (e) {}
      renderTree();
      setSave("saved", "Published");
      toast(mode === "all" ? "Archive published" : "Article published");
    } catch (err) {
      setSave("error", (err && err.message) || "Publish failed");
      toast((err && err.message) || "Publish failed");
    } finally {
      $("btnPublish").disabled = false;
    }
  }

  function bind() {
    HlsEditor.bind($("toolbar"), $("leafBody"), {
      change: () => {
        syncRefsPanel();
        scheduleSave();
      },
      askLink() {
        const href = window.prompt("Link URL", "https://");
        return href && href.trim();
      },
      cite: startCite,
      editCite: openCite,
    });

    $("leafTitle").addEventListener("input", scheduleSave);
    $("leafBody").addEventListener("input", scheduleSave);
    $("leafTitle").addEventListener("paste", (e) => {
      e.preventDefault();
      const text = (e.clipboardData.getData("text/plain") || "").replace(/\s+/g, " ").trim();
      document.execCommand("insertText", false, text);
    });
    $("leafTitle").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        $("leafBody").focus();
      }
    });

    $("tree").addEventListener("click", async (e) => {
      const twist = e.target.closest(".twist");
      if (twist && !twist.classList.contains("leaf")) {
        const id = twist.getAttribute("data-twist");
        if (state.expanded.has(id)) state.expanded.delete(id);
        else state.expanded.add(id);
        renderTree();
        return;
      }
      const row = e.target.closest("[data-id]");
      if (!row) return;
      await flushSave();
      select(row.getAttribute("data-id"));
      setNav(false);
    });

    $("search").addEventListener("input", (e) => {
      state.search = e.target.value;
      renderTree();
    });

    $("tabDrafts").addEventListener("click", async () => {
      await flushSave();
      state.store = "editing";
      $("tabDrafts").classList.add("on");
      $("tabArchive").classList.remove("on");
      await refresh("editing");
    });
    $("tabArchive").addEventListener("click", async () => {
      await flushSave();
      state.store = "permanent";
      $("tabArchive").classList.add("on");
      $("tabDrafts").classList.remove("on");
      await refresh("permanent");
    });

    $("btnNew").addEventListener("click", () => createArticle(null));
    $("btnDelete").addEventListener("click", () => deleteSelected());
    $("btnChild").addEventListener("click", () => {
      const article = articleById(state.selectedId);
      if (article) createArticle(article);
    });
    $("empty").addEventListener("click", (e) => {
      if (e.target.id === "emptyNew") createArticle(null);
      if (e.target.id === "emptyImport") importArchive();
    });

    $("viewSeg").addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-view]");
      if (!btn) return;
      await flushSave();
      state.view = btn.dataset.view;
      $("viewSeg").querySelectorAll("button").forEach((el) => el.classList.toggle("on", el === btn));
      showEditor(articleById(state.selectedId));
    });

    $("btnMenu").addEventListener("click", () => {
      setNav(!$("shell").classList.contains("nav-open"));
    });
    $("btnNavClose").addEventListener("click", () => setNav(false));
    $("navScrim").addEventListener("click", () => setNav(false));
    $("btnAi").addEventListener("click", () => setAi(!state.ai.open));
    $("btnAiClose").addEventListener("click", () => setAi(false));
    $("btnAiNew").addEventListener("click", () => newAiChat());
    $("aiSend").addEventListener("click", () => sendAi());
    $("aiLog").addEventListener("click", (e) => {
      if (e.target.closest(".ai-clip") && !e.target.closest(".article-card")) e.preventDefault();
    });
    $("aiClips").addEventListener("click", (e) => {
      const kill = e.target.closest(".ai-clip-remove");
      if (kill) {
        const id = kill.getAttribute("data-id");
        state.ai.clips = state.ai.clips.filter((clip) => clip.id !== id);
        renderAiClips();
        return;
      }
      const link = e.target.closest(".ai-clip");
      if (link) e.preventDefault();
    });
    $("aiPrompt").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        sendAi();
      }
    });
    $("aiModel").addEventListener("change", () => {
      state.ai.model = $("aiModel").value;
      writePref(PREF.model, state.ai.model);
    });
    $("citeResults").addEventListener("click", (e) => {
      const hit = e.target.closest(".cite-hit");
      if (!hit) return;
      const row = state.refs.find((item) => item.id === hit.getAttribute("data-id"));
      if (row) assignCite(row);
    });
    $("citeSearch").addEventListener("input", (e) => renderCiteHits(e.target.value));
    $("citeSearch").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const first = $("citeResults").querySelector(".cite-hit");
        if (first) first.click();
        else addCiteFromFields();
      }
    });
    $("citeAdd").addEventListener("click", () => addCiteFromFields());
    $("citeUrl").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addCiteFromFields();
      }
    });
    $("btnTheme").addEventListener("click", () => {
      setTheme(state.prefs.theme === "dark" ? "light" : "dark");
    });
    $("btnType").addEventListener("click", (e) => {
      e.stopPropagation();
      $("typePop").hidden = !$("typePop").hidden;
    });
    $("btnPrint").addEventListener("click", () => window.print());
    $("btnPublish").addEventListener("click", (e) => {
      e.stopPropagation();
      if (state.store !== "editing") return;
      $("publishMenu").hidden = !$("publishMenu").hidden;
    });
    $("publishMenu").addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-pub]");
      if (!btn) return;
      $("publishMenu").hidden = true;
      await publish(btn.dataset.pub);
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".publish-wrap")) $("publishMenu").hidden = true;
      if (!e.target.closest("#typePop") && !e.target.closest("#btnType")) $("typePop").hidden = true;
      if (!e.target.closest("#citePop") && !e.target.closest("a.cite") && !e.target.closest("#toolbar")) closeCite();
    });

    ["rngMeasure", "rngSize", "rngLead"].forEach((id) => {
      $(id).addEventListener("input", () => {
        state.prefs.measure = Number($("rngMeasure").value);
        state.prefs.size = Number($("rngSize").value);
        state.prefs.lead = Number($("rngLead").value);
        writePref(PREF.measure, state.prefs.measure);
        writePref(PREF.size, state.prefs.size);
        writePref(PREF.lead, state.prefs.lead);
        applyType();
      });
    });
    $("chkJustify").addEventListener("change", () => {
      state.prefs.justify = $("chkJustify").checked;
      writePref(PREF.justify, state.prefs.justify ? "1" : "0");
      applyType();
    });

    document.addEventListener("keydown", async (e) => {
      const key = e.key.toLowerCase();
      const meta = e.metaKey || e.ctrlKey;
      if (meta && key === "s") {
        e.preventDefault();
        await saveNow("manual");
      }
      if (meta && key === "k") {
        if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
        e.preventDefault();
        startCite();
      }
      if (meta && e.shiftKey && key === "j") {
        e.preventDefault();
        dropSelectionIntoPrompt();
      }
      if (meta && !e.shiftKey && key === "j") {
        e.preventDefault();
        setAi(!state.ai.open);
      }
      if (meta && key === "p") {
        e.preventDefault();
        window.print();
      }
      if (e.key === "Backspace" && meta && state.store === "editing" && document.activeElement === document.body) {
        e.preventDefault();
        await deleteSelected();
      }
      if (e.key === "Delete" && state.store === "editing" && (e.metaKey || e.altKey)) {
        e.preventDefault();
        await deleteSelected();
      }
      if (e.key === "Escape") {
        if (!$("citePop").hidden) {
          closeCite();
          return;
        }
        $("publishMenu").hidden = true;
        $("typePop").hidden = true;
        $("modal").hidden = true;
        setNav(false);
        setAi(false);
      }
    });

    window.addEventListener("beforeunload", (e) => {
      if (state.dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) flushSave();
    });
  }

  async function boot() {
    state.prefs.measure = Number(readPref(PREF.measure, 64)) || 64;
    state.prefs.size = Number(readPref(PREF.size, 21)) || 21;
    state.prefs.lead = Number(readPref(PREF.lead, 162)) || 162;
    state.prefs.justify = readPref(PREF.justify, "1") !== "0";
    if (readPref(PREF.nav, "closed") === "open" || readPref(PREF.nav, "closed") === "on") setNav(true);
    else setNav(false);
    setTheme(state.prefs.theme);
    applyType();
    bind();
    loadLibrary();
    renderAiLog();
    try {
      const status = await HlsAPI.status();
      state.connected = true;
      banner("");
      fillModels(((status && status.ollama && status.ollama.models) || []));
      await refresh("editing");
      state.tree.forEach((node) => state.expanded.add(node.id));
      renderTree();
      setSave("", "Ready");
    } catch (err) {
      state.connected = false;
      banner((err && err.message) || "Tunnel is down");
      showEditor(null);
      setSave("error", "Offline");
    }
  }

  boot();
})();
