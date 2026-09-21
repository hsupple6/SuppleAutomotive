const HlsAPI = (() => {
  const KEYS = {
    token: "hls.token",
    apiBase: "hls.apiBase",
  };

  function config() {
    return window.HLS_CONFIG || window.LIFEOS_CONFIG || {};
  }

  function apiBase() {
    const stored = localStorage.getItem(KEYS.apiBase) || "";
    return (stored || config().apiBase || "").replace(/\/+$/, "");
  }

  function token() {
    return (config().accessToken || localStorage.getItem(KEYS.token) || "").trim();
  }

  function setCreds({ api, secret }) {
    if (typeof api === "string") localStorage.setItem(KEYS.apiBase, api.replace(/\/+$/, ""));
    if (typeof secret === "string") localStorage.setItem(KEYS.token, secret.trim());
  }

  async function request(path, options = {}) {
    const base = apiBase();
    if (!base) {
      const err = new Error("Set the tunnel URL first");
      err.code = "noconfig";
      throw err;
    }
    const headers = Object.assign(
      { Accept: "application/json" },
      options.headers || {}
    );
    const secret = token();
    if (secret) {
      headers.Authorization = "Bearer " + secret;
      headers["X-LifeOS-Token"] = secret;
    }
    const ac = new AbortController();
    const wait = options.timeoutMs || (options.stream ? 300000 : 20000);
    const timer = setTimeout(() => ac.abort(), wait);
    try {
      const res = await fetch(base + path, Object.assign({}, options, { headers, signal: ac.signal }));
      if (options.stream) return res;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.error || res.statusText || "Request failed");
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return data;
    } catch (err) {
      if (err && err.name === "AbortError") {
        throw new Error("PC did not answer. Is the tunnel up?");
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  function get(path) {
    return request(path);
  }

  function post(path, body, timeoutMs) {
    return request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
      timeoutMs,
    });
  }

  function lookupPath(store, query) {
    const q = query || {};
    if (q.id) return `/v1/doctrine/${store}?id=${encodeURIComponent(q.id)}`;
    if (q.number) return `/v1/doctrine/${store}/${encodeURIComponent(q.number)}`;
    return `/v1/doctrine/${store}`;
  }

  function walkTree(nodes, rows) {
    (nodes || []).forEach((node) => {
      if (node && !rows.some((row) => row.id === node.id)) rows.push(node);
      walkTree(node.children, rows);
    });
  }

  function formatArticles(data, whole) {
    const rows = [];
    if (!whole && data && data.article) {
      rows.push(data.article);
      walkTree(data.tree, rows);
    } else {
      ((data && data.articles) || []).forEach((row) => {
        if (!rows.some((r) => r.id === row.id)) rows.push(row);
      });
    }
    if (!rows.length) return "";
    return rows
      .map((row) => {
        const title = `Article ${row.number}  ${row.title || ""}`.trim();
        const body = String(row.body || "").trim();
        return body ? `${title}\n${body}` : title;
      })
      .join("\n\n");
  }

  async function chatPayload(body, stream) {
    const src = Object.assign({}, body || {});
    const prompt = String(src.prompt || src.text || "").trim();
    const messages = Array.isArray(src.messages) ? src.messages.slice() : [];
    if (prompt) messages.push({ role: "user", content: prompt });

    const articleId = String(src.article_id || (!src.messages && src.id) || "").trim();
    const number = String(src.number || "").trim();
    const whole = Boolean(src.whole || src.include_tree || src.include_article);
    if (articleId || number || whole) {
      const store = src.store === "permanent" ? "permanent" : "editing";
      const query = articleId || number ? { id: articleId, number } : null;
      const data = await get(lookupPath(store, query || {}));
      const context = formatArticles(data, whole);
      if (context) {
        messages.unshift({
          role: "user",
          content: "Current articles of the HLS Doctrine:\n\n" + context,
        });
      }
    }

    if (!messages.length) {
      const err = new Error("messages or prompt required");
      err.status = 400;
      throw err;
    }

    const payload = { stream };
    if (src.model) payload.model = src.model;
    payload.messages = messages;
    return payload;
  }

  return {
    KEYS,
    apiBase,
    token,
    setCreds,
    request,
    status: () => get("/v1/doctrine"),
    retrievePermanent(query) {
      return get(lookupPath("permanent", query));
    },
    retrieveEditing(query) {
      return get(lookupPath("editing", query));
    },
    saveEditing(body) {
      return post("/v1/doctrine/editing", body);
    },
    createArticle(body) {
      return post("/v1/doctrine/editing", body);
    },
    createSubArticle(parent, body) {
      const payload = Object.assign({}, body || {});
      if (typeof parent === "string") {
        if (parent.indexOf(".") !== -1 || /^\d+$/.test(parent)) payload.parent_number = parent;
        else payload.parent_id = parent;
      } else if (parent && typeof parent === "object") {
        if (parent.id) payload.parent_id = parent.id;
        if (parent.number) payload.parent_number = parent.number;
      }
      return post("/v1/doctrine/editing", payload);
    },
    deleteEditing(body) {
      return post("/v1/doctrine/editing/delete", body);
    },
    publishPermanent(body) {
      return post("/v1/doctrine/permanent", body);
    },
    publishAll() {
      return post("/v1/doctrine/permanent", { all: true });
    },
    ollamaModels() {
      return get("/v1/ollama/models");
    },
    async ollama(body) {
      const payload = await chatPayload(body, false);
      return post("/v1/ollama/chat", payload, 300000);
    },
    async ollamaStream(body) {
      const payload = await chatPayload(body, true);
      return request("/v1/ollama/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        stream: true,
        timeoutMs: 300000,
      });
    },
  };
})();
