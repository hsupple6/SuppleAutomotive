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
    ollamaModels() {
      return get("/v1/doctrine/ollama");
    },
    ollama(body) {
      return post(
        "/v1/doctrine/ollama",
        Object.assign({ stream: false }, body || {}),
        300000
      );
    },
    ollamaStream(body) {
      return request("/v1/doctrine/ollama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.assign({ stream: true }, body || {})),
        stream: true,
        timeoutMs: 300000,
      });
    },
  };
})();
