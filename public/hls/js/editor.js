const HlsEditor = (() => {
  const ALLOW = {
    P: [],
    BR: [],
    DIV: [],
    SPAN: ["class", "style"],
    H1: [],
    H2: [],
    H3: [],
    H4: [],
    BLOCKQUOTE: [],
    UL: [],
    OL: [],
    LI: [],
    A: ["href", "title"],
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
  };

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
        if (name === "class" && attr.value !== "sc") child.removeAttribute("class");
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
        const eln = node && (node.nodeType === 1 ? node : node.parentElement);
        on = Boolean(eln && eln.closest && eln.closest(".sc"));
      } else if (["undo", "redo", "createLink", "unlink", "removeFormat", "insertHorizontalRule", "indent", "outdent"].includes(cmd)) {
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
      else if (cmd === "createLink") {
        const href = (hooks.askLink && hooks.askLink()) || "";
        if (href) exec("createLink", href);
      }       else if (cmd === "formatBlock") {
        if (!document.execCommand("formatBlock", false, value)) {
          exec("formatBlock", "<" + value + ">");
        }
      }
      else exec(cmd, value || null);
      syncToolbar(toolbar);
      if (hooks.change) hooks.change();
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
      if (hooks.change) hooks.change();
    });
  }

  return { sanitize, toHTML, exec, bind, syncToolbar, wrapSmallCaps };
})();
