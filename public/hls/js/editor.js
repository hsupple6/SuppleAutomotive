const HlsEditor = (() => {
  const ALLOW = {
    P: [],
    BR: [],
    DIV: ["class"],
    SPAN: ["class", "style"],
    H1: [],
    H2: [],
    H3: [],
    H4: [],
    BLOCKQUOTE: [],
    UL: [],
    OL: ["type", "start"],
    LI: ["id"],
    A: ["href", "title", "class", "id", "data-n", "data-ref-id", "target", "rel"],
    STRONG: [],
    B: [],
    EM: [],
    I: [],
    U: [],
    S: [],
    STRIKE: [],
    SUB: [],
    SUP: [],
    HR: [],
    MARK: [],
    SECTION: ["class"],
  };

  const OK_CLASS = { sc: true, cite: true, refs: true };

  function cleanStyle(value) {
    return String(value || "")
      .split(";")
      .map((part) => part.trim())
      .filter((part) => /^(text-align|font-style|font-weight|font-variant|letter-spacing)\s*:/i.test(part))
      .join("; ");
  }

  function sanitize(html) {
    const wrap = document.createElement("div");
    wrap.innerHTML = String(html || "");
    const scrub = (child) => {
      if (child.nodeType === 3) return;
      if (child.nodeType !== 1) {
        child.remove();
        return;
      }
      const tag = child.tagName;
      if (!ALLOW[tag]) {
        const parent = child.parentNode;
        const next = child.nextSibling;
        const moved = Array.from(child.childNodes);
        child.remove();
        moved.forEach((node) => {
          parent.insertBefore(node, next);
          scrub(node);
        });
        return;
      }
      Array.from(child.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        if (!ALLOW[tag].includes(name) || /^on/i.test(name) || name === "srcdoc") {
          child.removeAttribute(attr.name);
          return;
        }
        if (name === "class") {
          const keep = attr.value.split(/\s+/).filter((c) => OK_CLASS[c]);
          if (keep.length) child.setAttribute("class", keep.join(" "));
          else child.removeAttribute("class");
        }
        if (name === "href" && !/^(https?:|mailto:|#)/i.test(attr.value)) {
          child.removeAttribute(attr.name);
        }
        if (name === "style") {
          const next = cleanStyle(attr.value);
          if (next) child.setAttribute("style", next);
          else child.removeAttribute("style");
        }
      });
      Array.from(child.childNodes).forEach(scrub);
    };
    Array.from(wrap.childNodes).forEach(scrub);
    convertDeepLists(wrap);
    return wrap.innerHTML;
  }

  function toHTML(raw) {
    const text = String(raw || "");
    if (!text.trim()) return "";
    if (/<[a-z][\s\S]*>/i.test(text)) return sanitize(text);
    return text
      .split(/\n{2,}/)
      .map((block) => `<p>${block.replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  function exec(name, value) {
    document.execCommand(name, false, value === undefined ? null : value);
  }

  function wrapSmallCaps() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const text = sel.toString();
    exec("insertHTML", `<span class="sc">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</span>`);
  }

  function nodeEl(node) {
    if (!node) return null;
    return node.nodeType === 1 ? node : node.parentElement;
  }

  function listDepth(li) {
    let depth = 0;
    let el = li && li.parentElement;
    while (el) {
      if (el.tagName === "OL" || el.tagName === "UL") depth += 1;
      el = el.parentElement;
    }
    return depth;
  }

  function listContext(node) {
    const el = nodeEl(node);
    const li = el && el.closest && el.closest("li");
    if (!li) return null;
    return { li, depth: listDepth(li), list: li.parentElement };
  }

  function convertDeepLists(root) {
    if (!root) return;
    root.querySelectorAll("ol ol ol").forEach((ol) => {
      const ul = document.createElement("ul");
      while (ol.firstChild) ul.appendChild(ol.firstChild);
      ol.replaceWith(ul);
    });
  }

  function indentLi(li) {
    const prev = li.previousElementSibling;
    if (!prev || prev.tagName !== "LI") return false;
    const depth = listDepth(li);
    const tag = depth >= 2 ? "UL" : "OL";
    let nested = Array.from(prev.children).find((n) => n.tagName === "OL" || n.tagName === "UL");
    if (!nested) {
      nested = document.createElement(tag.toLowerCase());
      prev.appendChild(nested);
    }
    nested.appendChild(li);
    return true;
  }

  function outdentLi(li) {
    const list = li.parentElement;
    if (!list || (list.tagName !== "OL" && list.tagName !== "UL")) return false;
    const parentLi = list.parentElement && list.parentElement.closest("li");
    if (!parentLi) {
      const p = document.createElement("p");
      p.innerHTML = li.innerHTML;
      list.parentElement.insertBefore(p, list);
      li.remove();
      if (!list.children.length) list.remove();
      return true;
    }
    parentLi.after(li);
    if (!list.children.length) list.remove();
    return true;
  }

  function handleTab(e, body) {
    if (e.key !== "Tab") return false;
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode || !body.contains(sel.anchorNode)) return false;
    e.preventDefault();
    const ctx = listContext(sel.anchorNode);
    if (!ctx) {
      if (!e.shiftKey) exec("insertOrderedList");
      return true;
    }
    if (e.shiftKey) outdentLi(ctx.li);
    else indentLi(ctx.li);
    convertDeepLists(body);
    return true;
  }

  function nextCiteNumber(root) {
    let max = 0;
    root.querySelectorAll("a.cite").forEach((a) => {
      const n = Number(a.getAttribute("data-n") || (a.querySelector("sub") && a.querySelector("sub").textContent) || 0);
      if (n > max) max = n;
    });
    return max + 1;
  }

  function insertCite(body) {
    body.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount && !sel.isCollapsed) sel.collapseToEnd();
    const n = nextCiteNumber(body);
    const id = "cite-" + n + "-" + Math.random().toString(36).slice(2, 8);
    exec("insertHTML", `<a class="cite" id="${id}" data-n="${n}" href="#"><sub>${n}</sub></a>`);
    return body.querySelector("#" + id);
  }

  function collectCites(root) {
    return Array.from(root.querySelectorAll("a.cite")).map((a) => ({
      el: a,
      n: Number(a.getAttribute("data-n") || 0),
      id: a.getAttribute("data-ref-id") || "",
      href: a.getAttribute("href") || "",
      title: a.getAttribute("title") || "",
    }));
  }

  function applyCite(el, ref) {
    if (!el || !ref) return;
    el.setAttribute("href", ref.url || "#");
    el.setAttribute("title", ref.title || ref.url || "");
    if (ref.id) el.setAttribute("data-ref-id", ref.id);
    if (ref.url && /^https?:/i.test(ref.url)) {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
    }
  }

  function splitRefs(html) {
    const wrap = document.createElement("div");
    wrap.innerHTML = String(html || "");
    const section = wrap.querySelector("section.refs");
    if (section) section.remove();
    convertDeepLists(wrap);
    return wrap.innerHTML;
  }

  function joinRefs(html, items) {
    const body = splitRefs(html);
    if (!items || !items.length) return body;
    const lis = items.map((item) => {
      const label = item.title || item.url || "Reference";
      const href = item.url || "#";
      return `<li id="ref-${item.n}"><a href="${href.replace(/"/g, "&quot;")}">${label.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</a></li>`;
    }).join("");
    return `${body}<section class="refs"><h3>References</h3><ol>${lis}</ol></section>`;
  }

  const TOOLS = [
    { cmd: "undo", label: "↶", title: "Undo" },
    { cmd: "redo", label: "↷", title: "Redo" },
    { gap: true },
    { cmd: "formatBlock", value: "H1", label: "H1", title: "Heading 1" },
    { cmd: "formatBlock", value: "H2", label: "H2", title: "Heading 2" },
    { cmd: "formatBlock", value: "H3", label: "H3", title: "Heading 3" },
    { cmd: "formatBlock", value: "P", label: "¶", title: "Paragraph" },
    { gap: true },
    { cmd: "bold", label: "B", title: "Bold", hot: true },
    { cmd: "italic", label: "I", title: "Italic", em: true },
    { cmd: "underline", label: "U", title: "Underline", un: true },
    { cmd: "strikeThrough", label: "S", title: "Strikethrough" },
    { gap: true },
    { cmd: "superscript", label: "x²", title: "Superscript" },
    { cmd: "subscript", label: "x₂", title: "Subscript" },
    { cmd: "smallcaps", label: "Sc", title: "Small caps" },
    { cmd: "cite", label: "n₁", title: "Citation (⌘K)" },
    { gap: true },
    { cmd: "formatBlock", value: "BLOCKQUOTE", label: "“ ”", title: "Quote" },
    { cmd: "insertUnorderedList", label: "•", title: "Bulleted list" },
    { cmd: "insertOrderedList", label: "1.", title: "Numbered list" },
    { cmd: "indent", label: "»", title: "Indent" },
    { cmd: "outdent", label: "«", title: "Outdent" },
    { gap: true },
    { cmd: "justifyLeft", label: "⇤", title: "Align left" },
    { cmd: "justifyCenter", label: "↔", title: "Center" },
    { cmd: "justifyRight", label: "⇥", title: "Align right" },
    { cmd: "justifyFull", label: "☰", title: "Justify" },
    { gap: true },
    { cmd: "insertHorizontalRule", label: "―", title: "Rule" },
    { cmd: "createLink", label: "Link", title: "Link" },
    { cmd: "unlink", label: "Unlink", title: "Remove link" },
    { cmd: "removeFormat", label: "Tx", title: "Clear formatting" },
  ];

  function renderToolbar(el) {
    el.innerHTML = TOOLS.map((tool) => {
      if (tool.gap) return '<span class="tool-gap"></span>';
      const style = [
        tool.hot ? "font-weight:700" : "",
        tool.em ? "font-style:italic" : "",
        tool.un ? "text-decoration:underline" : "",
      ].filter(Boolean).join(";");
      return `<button type="button" class="tool" data-cmd="${tool.cmd}" data-value="${tool.value || ""}" title="${tool.title}" style="${style}">${tool.label}</button>`;
    }).join("");
  }

  function blockTag() {
    const value = (document.queryCommandValue("formatBlock") || "").replace(/[<>]/g, "").toUpperCase();
    return value;
  }

  function syncToolbar(el) {
    el.querySelectorAll(".tool").forEach((btn) => {
      const cmd = btn.dataset.cmd;
      const value = btn.dataset.value;
      let on = false;
      if (cmd === "formatBlock" && value) on = blockTag() === value;
      else if (cmd === "smallcaps") {
        const node = window.getSelection() && window.getSelection().anchorNode;
        const eln = nodeEl(node);
        on = Boolean(eln && eln.closest && eln.closest(".sc"));
      } else if (["undo", "redo", "createLink", "unlink", "removeFormat", "insertHorizontalRule", "indent", "outdent", "cite"].includes(cmd)) {
        on = false;
      } else {
        try { on = document.queryCommandState(cmd); } catch (e) { on = false; }
      }
      btn.classList.toggle("on", on);
    });
  }

  function bind(toolbar, body, hooks) {
    renderToolbar(toolbar);
    toolbar.addEventListener("mousedown", (e) => {
      if (e.target.closest(".tool")) e.preventDefault();
    });
    toolbar.addEventListener("click", (e) => {
      const btn = e.target.closest(".tool");
      if (!btn || body.getAttribute("contenteditable") === "false") return;
      const cmd = btn.dataset.cmd;
      const value = btn.dataset.value;
      body.focus();
      if (cmd === "smallcaps") wrapSmallCaps();
      else if (cmd === "cite") {
        if (hooks.cite) hooks.cite();
      } else if (cmd === "indent") {
        const ctx = listContext(window.getSelection() && window.getSelection().anchorNode);
        if (ctx) indentLi(ctx.li);
        else exec("indent");
        convertDeepLists(body);
      } else if (cmd === "outdent") {
        const ctx = listContext(window.getSelection() && window.getSelection().anchorNode);
        if (ctx) outdentLi(ctx.li);
        else exec("outdent");
      } else if (cmd === "createLink") {
        const href = (hooks.askLink && hooks.askLink()) || "";
        if (href) exec("createLink", href);
      } else if (cmd === "formatBlock") {
        if (!document.execCommand("formatBlock", false, value)) {
          exec("formatBlock", "<" + value + ">");
        }
      } else exec(cmd, value || null);
      syncToolbar(toolbar);
      if (hooks.change) hooks.change();
    });
    body.addEventListener("keydown", (e) => {
      if (handleTab(e, body) && hooks.change) hooks.change();
    });
    body.addEventListener("keyup", () => syncToolbar(toolbar));
    body.addEventListener("mouseup", () => syncToolbar(toolbar));
    document.addEventListener("selectionchange", () => {
      if (document.activeElement === body) syncToolbar(toolbar);
    });
    body.addEventListener("paste", (e) => {
      e.preventDefault();
      const html = e.clipboardData.getData("text/html");
      const text = e.clipboardData.getData("text/plain");
      if (html) exec("insertHTML", sanitize(html));
      else exec("insertText", text);
      convertDeepLists(body);
      if (hooks.change) hooks.change();
    });
    body.addEventListener("click", (e) => {
      const cite = e.target.closest && e.target.closest("a.cite");
      if (cite && hooks.editCite && body.getAttribute("contenteditable") === "true") {
        e.preventDefault();
        hooks.editCite(cite);
      }
    });
  }

  return {
    sanitize,
    toHTML,
    exec,
    bind,
    syncToolbar,
    wrapSmallCaps,
    insertCite,
    applyCite,
    collectCites,
    splitRefs,
    joinRefs,
    convertDeepLists,
    nextCiteNumber,
  };
})();
