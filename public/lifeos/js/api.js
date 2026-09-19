const LifeAPI = (() => {
  const KEYS = {
    token: "lifeos.token",
    apiBase: "lifeos.apiBase",
  };

  function config() {
    return window.LIFEOS_CONFIG || {};
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

  function clear() {
    localStorage.removeItem(KEYS.token);
    localStorage.removeItem(KEYS.apiBase);
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
    const wait = options.timeoutMs || (options.stream ? 180000 : 12000);
    const timer = setTimeout(() => ac.abort(), wait);
    try {
      const res = await fetch(base + path, Object.assign({}, options, { headers, signal: ac.signal }));
      if (options.stream) return res;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.error || res.statusText || "Request failed");
        err.status = res.status;
        throw err;
      }
      return data;
    } catch (err) {
      if (err && err.name === "AbortError") {
        throw new Error("PC did not answer. Is the tunnel up?");
      }
      if (String(err && err.message).includes("Failed to fetch") || String(err && err.message).includes("NetworkError")) {
        throw new Error("lifeos-api.suppleautomotive.com is not in DNS yet. Add the Vercel CNAME.");
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    KEYS,
    apiBase,
    token,
    setCreds,
    clear,
    health: () => request("/health"),
    status: () => request("/v1/status"),
    life: () => request("/v1/life"),
    food: () => request("/v1/food"),
    models: () => request("/v1/ollama/models"),
    receipt(body) {
      return request("/v1/food/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        timeoutMs: 180000,
      });
    },
    stock(body) {
      return request("/v1/food/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    macros(date) {
      const q = date ? `?date=${encodeURIComponent(date)}` : "";
      return request("/v1/macros" + q);
    },
    macroLog(body) {
      return request("/v1/macros/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    macroSettings(body) {
      return request("/v1/macros/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    macroDelete(body) {
      return request("/v1/macros/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    meals() {
      return request("/v1/meals");
    },
    mealSave(body) {
      return request("/v1/meals/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    mealLog(body) {
      return request("/v1/meals/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    mealDelete(body) {
      return request("/v1/meals/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    mealItem(body) {
      return request("/v1/meals/item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    chatStream(body) {
      return request("/v1/ollama/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        stream: true,
        timeoutMs: 300000,
      });
    },
  };
})();
